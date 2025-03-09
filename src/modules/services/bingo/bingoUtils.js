// /modules/services/bingo/bingoUtils.js
const logger = require('../../utils/essentials/logger');
const db = require('../../utils/essentials/dbUtils');
const bingoTaskManager = require('./bingoTaskManager');
const bingoStateManager = require('./bingoStateManager');
const { updateBingoProgress } = require('./bingoService');
const client = require('../../../main');
const { selectPatternsForEvent } = require('./bingoPatternRecognition');
const { fixMismatchedTeamIds } = require('../../utils/essentials/syncTeamData');
const { refreshBingoInfoEmbed } = require('./embeds/bingoInfoData');

/**
 *
 * @param eventId
 * @param startTime
 */
async function startBingoEvent(eventId, startTime = null) {
    try {
        logger.info(`[BingoUtils] startBingoEvent(#${eventId})...`);

        const existingState = await db.getOne(
            `
            SELECT event_id
            FROM bingo_state
            WHERE event_id = ?
            `,
            [eventId],
        );

        if (!existingState) {
            logger.info(`No row in bingo_state for event #${eventId}, creating...`);
            await db.runQuery(
                `
                INSERT INTO bingo_state (event_id, board_id, state, start_time)
                VALUES (?, 0, 'upcoming', NULL)
                `,
                [eventId],
            );
        }

        if (startTime) {
            await bingoStateManager.setEventState(eventId, 'ongoing');
            await bingoTaskManager.recordEventBaseline(eventId);
            await bingoTaskManager.initializeTaskProgress(eventId);
            await refreshBingoInfoEmbed(eventId, client);
            await fixMismatchedTeamIds();
            await updateBingoProgress(client);
        }

        logger.info(`[BingoUtils] Bingo event #${eventId} setup complete.`);
    } catch (err) {
        logger.error(`[BingoUtils] startBingoEvent() error: ${err.message}`);
    }
}

/**
 * Update or insert the task rotation for a given task.
 * @param {object} task - The task object containing type and parameter.
 * @param {number} eventId - The event ID for the current rotation.
 */
async function updateTaskRotation(task, eventId) {
    // We'll update the rotation history regardless of type now,
    // so that every task parameter is tracked.
    await db.runQuery(
        `
    INSERT INTO bingo_task_rotation (event_id, parameter, last_selected)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(parameter) DO UPDATE SET
      event_id = excluded.event_id,
      last_selected = CURRENT_TIMESTAMP
    `,
        [eventId, task.parameter],
    );
}

/**
 *
 */
async function rotateBingoTasks() {
    try {
        const { lastID } = await db.runQuery(
            `
            INSERT INTO bingo_events (event_name, description, created_by)
            VALUES (?, ?, ?)
            `,
            ['Auto-Bingo', 'Auto-generated Bingo event', 'system'],
        );
        const newEventId = lastID;

        await db.runQuery(
            `
            INSERT INTO bingo_state (event_id, board_id, state)
            VALUES (?, 0, 'upcoming')
            `,
            [newEventId],
        );

        const boardRes = await db.runQuery(
            `
            INSERT INTO bingo_boards (board_name, grid_size, is_active, event_id, created_by)
            VALUES (?, 5, 1, ?, 'system')
            `,
            [`Auto-Bingo #${newEventId}`, newEventId],
        );
        const newBoardId = boardRes.lastID;

        await db.runQuery(
            `
            UPDATE bingo_state
            SET board_id=?
            WHERE event_id=?
            `,
            [newBoardId, newEventId],
        );

        await selectPatternsForEvent(newEventId);

        const totalTasks = 15;
        const bingoBoard = await generateBalancedBingoBoard(totalTasks);

        let row = 0,
            col = 0;
        for (const task of bingoBoard.cells) {
            await db.runQuery(
                `
                INSERT INTO bingo_board_cells (board_id, row, column, task_id)
                VALUES (?, ?, ?, ?)
                `,
                [newBoardId, row, col, task.task_id],
            );

            await updateTaskLastSelected(task);
            await updateTaskRotation(task, newEventId);

            col++;
            if (col >= 5) {
                col = 0;
                row++;
            }
        }

        logger.info(`[rotateBingoTasks] Created new event #${newEventId}, board #${newBoardId}.`);
        return {
            newEventId: newEventId || null,
            newBoardId: newBoardId || null,
        };
    } catch (err) {
        logger.error(`[rotateBingoTasks] Error: ${err.message}`);
        return null;
    }
}

/**
 *
 * @param task
 */
async function updateTaskLastSelected(task) {
    if (task.type === 'Exp' || task.type === 'Kill') {
        await db.runQuery(
            `
            UPDATE skills_bosses
            SET last_selected_at = CURRENT_TIMESTAMP
            WHERE name = ?
            `,
            [task.parameter],
        );
    } else if (task.type === 'Score') {
        await db.runQuery(
            `
            UPDATE hiscores_activities
            SET last_selected_at = CURRENT_TIMESTAMP
            WHERE name = ?
            `,
            [task.parameter],
        );
    }
}

/**
 * Select balanced bingo tasks ensuring we favor tasks that haven't been selected recently.
 * @param {number} totalTasks - Total number of tasks to select.
 * @returns {Array} - Array of selected task objects.
 */
async function selectBalancedBingoTasks(totalTasks) {
    // Join with the rotation table; tasks that have never been selected
    // will have a NULL last_selected which we can coalesce to a very old date.
    const tasks = await db.getAll(
        `
    SELECT bt.task_id, bt.type, bt.parameter, bt.value, bt.description, bt.base_points,
           COALESCE(btr.last_selected, '1970-01-01') AS last_selected
    FROM bingo_tasks bt
    LEFT JOIN bingo_task_rotation btr ON bt.parameter = btr.parameter
    WHERE bt.is_dynamic = 1
    ORDER BY last_selected ASC
    `,
    );

    if (!tasks.length) {
        logger.warn('[BingoTaskManager] No dynamic tasks available for board generation.');
        return [];
    }

    // Group tasks by type as before
    const groupedTasks = tasks.reduce((groups, task) => {
        if (!groups[task.type]) groups[task.type] = [];
        groups[task.type].push(task);
        return groups;
    }, {});

    const types = Object.keys(groupedTasks);
    const tasksPerType = Math.floor(totalTasks / types.length);
    let selectedTasks = [];

    for (const type of types) {
        // The tasks are already ordered by last_selected, so no need for extra shuffling here
        // unless you want additional randomization among tasks with similar last_selected times.
        let limit = tasksPerType;
        if (type === 'Score') {
            limit = Math.min(limit, 3);
        }
        selectedTasks = selectedTasks.concat(groupedTasks[type].slice(0, limit));
    }

    // If we still need more tasks, pick from the remainder by selecting the oldest ones first.
    while (selectedTasks.length < totalTasks) {
        const candidate = tasks.find((task) => !selectedTasks.some((t) => t.task_id === task.task_id) && (task.type !== 'Score' || selectedTasks.filter((t) => t.type === 'Score').length < 3));
        if (!candidate) break; // in case there are not enough unique tasks available
        selectedTasks.push(candidate);
    }

    return selectedTasks.slice(0, totalTasks);
}

/**
 *
 * @param totalTasks
 */
async function generateBalancedBingoBoard(totalTasks) {
    const balancedTasks = await selectBalancedBingoTasks(totalTasks);
    if (!balancedTasks.length) {
        throw new Error('No tasks available to generate a bingo board.');
    }

    balancedTasks.sort(() => Math.random() - 0.5);

    const bingoBoard = {
        cells: balancedTasks,
    };

    logger.info(
        '[BingoTaskManager] Generated balanced bingo board with tasks:',
        balancedTasks.map((t) => t.task_id),
    );
    return bingoBoard;
}

module.exports = {
    startBingoEvent,
    rotateBingoTasks,
};
