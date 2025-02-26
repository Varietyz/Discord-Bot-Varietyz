// /modules/services/bingo/bingoUtils.js
const logger = require('../../utils/essentials/logger');
const db = require('../../utils/essentials/dbUtils');
const bingoTaskManager = require('./bingoTaskManager');
const bingoStateManager = require('./bingoStateManager');

/**
 * Starts a new Bingo event.
 * @param {number} eventId - The ID of the event.
 * @param {string} startTime - ISO string for the start time.
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
        }

        logger.info(`[BingoUtils] Bingo event #${eventId} setup complete.`);
    } catch (err) {
        logger.error(`[BingoUtils] startBingoEvent() error: ${err.message}`);
    }
}

/**
 * Seeds a brand-new event with balanced random tasks.
 * Returns the new event_id and board_id or null if an error occurs.
 */
async function rotateBingoTasks() {
    try {
        // 1) Insert a new row in "bingo_events"
        const { lastID } = await db.runQuery(
            `
            INSERT INTO bingo_events (event_name, description, created_by)
            VALUES (?, ?, ?)
            `,
            ['Auto-Bingo', 'Auto-generated Bingo event', 'system'],
        );
        const newEventId = lastID;

        // 2) Insert into bingo_state with state='upcoming'
        await db.runQuery(
            `
            INSERT INTO bingo_state (event_id, board_id, state)
            VALUES (?, 0, 'upcoming')
            `,
            [newEventId],
        );

        // 3) Create a new board (grid size is set to 5)
        const boardRes = await db.runQuery(
            `
            INSERT INTO bingo_boards (board_name, grid_size, is_active, event_id, created_by)
            VALUES (?, 5, 1, ?, 'system')
            `,
            [`Auto-Bingo #${newEventId}`, newEventId],
        );
        const newBoardId = boardRes.lastID;

        // Link the board to the event
        await db.runQuery(
            `
            UPDATE bingo_state
            SET board_id=?
            WHERE event_id=?
            `,
            [newBoardId, newEventId],
        );

        // 4) Generate a balanced board with a fixed number of tasks (e.g., 15)
        const totalTasks = 15;
        const bingoBoard = await generateBalancedBingoBoard(totalTasks);

        // 5) Insert tasks into bingo_board_cells in a grid pattern (5 columns per row)
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

            col++;
            if (col >= 5) {
                // Reset column after 5 tasks and increment row.
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
 * Updates the last_selected_at timestamp for a task based on its type.
 * For Skill/Boss tasks, updates the skills_bosses table.
 * For Activity tasks, updates the hiscores_activities table.
 *
 * @param {Object} task - The task object (should include task.type and task.parameter).
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
    // Extend here for other task types if needed.
}

/**
 * Selects a balanced set of dynamic tasks (excluding 'Drop') for board generation.
 * It groups tasks by type (e.g., 'Kill', 'Exp', 'Level', 'Score') and selects
 * an equal number from each group. Additionally, it limits tasks of type 'Score'
 * (activities) to a maximum of 2 per board.
 *
 * @param {number} totalTasks - Total number of tasks needed.
 * @returns {Promise<Array>} - Array of task objects.
 */
async function selectBalancedBingoTasks(totalTasks) {
    // Fetch all dynamic tasks (excluding 'Drop')
    const tasks = await db.getAll(`
        SELECT task_id, type, parameter, value, description, base_points
        FROM bingo_tasks
        WHERE is_dynamic = 1
    `);

    if (!tasks.length) {
        logger.warn('[BingoTaskManager] No dynamic tasks available for board generation.');
        return [];
    }

    // Group tasks by their type.
    const groupedTasks = tasks.reduce((groups, task) => {
        if (!groups[task.type]) groups[task.type] = [];
        groups[task.type].push(task);
        return groups;
    }, {});

    const types = Object.keys(groupedTasks);
    const tasksPerType = Math.floor(totalTasks / types.length);
    let selectedTasks = [];

    // For each type, shuffle and select a fixed number.
    // If the type is 'Score' (activities), limit the selection to a maximum of 2.
    for (const type of types) {
        const shuffled = groupedTasks[type].sort(() => Math.random() - 0.5);
        let limit = tasksPerType;
        if (type === 'Score') {
            limit = Math.min(limit, 3);
        }
        if (type === 'Drop') {
            limit = Math.min(limit, 1);
        }
        selectedTasks = selectedTasks.concat(shuffled.slice(0, limit));
    }

    // Fill any remaining slots with random tasks (avoiding duplicates)
    // and ensuring that we don't add more than 2 'Score' tasks.
    while (selectedTasks.length < totalTasks) {
        const randomTask = tasks[Math.floor(Math.random() * tasks.length)];
        // Skip if task is already selected.
        if (selectedTasks.some((task) => task.task_id === randomTask.task_id)) {
            continue;
        }
        // If the random task is an activity (Score) and we already have 2, skip it.
        if (randomTask.type === 'Score') {
            const currentActivityCount = selectedTasks.filter((task) => task.type === 'Score').length;
            if (currentActivityCount >= 3) {
                continue;
            }
        }
        selectedTasks.push(randomTask);
    }

    return selectedTasks.slice(0, totalTasks);
}

/**
 * Generates a bingo board object with a balanced distribution of tasks.
 *
 * @param {number} totalTasks - Total number of tasks to include on the board.
 * @returns {Promise<Object>} - An object representing the bingo board.
 */
async function generateBalancedBingoBoard(totalTasks) {
    const balancedTasks = await selectBalancedBingoTasks(totalTasks);
    if (!balancedTasks.length) {
        throw new Error('No tasks available to generate a bingo board.');
    }

    // Optionally, re-shuffle for extra randomness.
    balancedTasks.sort(() => Math.random() - 0.5);

    // Build the board structure. In this example, we simply use a "cells" array.
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
