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
 * Seeds a brand-new event with random tasks.
 * Returns the new event_id or null if error.
 */
async function rotateBingoTasks() {
    try {
        // 1) Insert a row in "bingo_events"
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

        // 3) Create a new board
        const boardRes = await db.runQuery(
            `
            INSERT INTO bingo_boards (board_name, grid_size, is_active, event_id, created_by)
            VALUES (?, 5, 1, ?, 'system')
            `,
            [`Auto-Bingo #${newEventId}`, newEventId],
        );
        const newBoardId = boardRes.lastID;

        // Link that board to the event
        await db.runQuery(
            `
            UPDATE bingo_state
            SET board_id=?
            WHERE event_id=?
            `,
            [newBoardId, newEventId],
        );

        // 4) Get 15 tasks not used recently
        let candidateTasks = await db.getAll(
            `
            SELECT task_id
            FROM bingo_tasks
            WHERE is_dynamic=1
            ORDER BY RANDOM()
            LIMIT 15
            `,
        );

        // Fallback: Include repeats if not enough unused tasks
        if (candidateTasks.length < 15) {
            const needed = 15 - candidateTasks.length;
            const additionalTasks = await db.getAll(
                `
                SELECT task_id
                FROM bingo_tasks
                WHERE is_dynamic=1
                ORDER BY RANDOM()
                LIMIT ?
            `,
                [needed],
            );

            candidateTasks = [...candidateTasks, ...additionalTasks];
        }

        // 5) Insert them into bingo_board_cells
        let row = 0,
            col = 0;
        for (const t of candidateTasks) {
            await db.runQuery(
                `
                INSERT INTO bingo_board_cells (board_id, row, column, task_id)
                VALUES (?, ?, ?, ?)
                `,
                [newBoardId, row, col, t.task_id],
            );

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

module.exports = {
    startBingoEvent,
    rotateBingoTasks,
};
