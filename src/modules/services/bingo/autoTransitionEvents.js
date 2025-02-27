// /modules/services/bingo/eventAutoTransition.js
const logger = require('../../utils/essentials/logger');
const db = require('../../utils/essentials/dbUtils');
const { endBingoEvent } = require('./bingoService');
const { generateDynamicTasks, clearDynamicTasks } = require('./dynamicTaskGenerator');
const { rotateBingoTasks, startBingoEvent } = require('./bingoUtils');
const { getFullBoardPattern } = require('./bingoPatterns');

/**
 *
 */
async function autoTransitionEvents() {
    const now = new Date();
    const nowIso = now.toISOString();

    // Retrieve any ongoing event
    const ongoingEvent = await db.getOne(`
        SELECT event_id
        FROM bingo_state
        WHERE state = 'ongoing'
        LIMIT 1
    `);

    if (!ongoingEvent) {
        // No ongoing event: schedule a new event.
        const lastCompletedEvent = await db.getOne(`
            SELECT event_id
            FROM bingo_state
            WHERE state = 'completed'
            ORDER BY event_id DESC
            LIMIT 1
        `);

        await clearDynamicTasks();
        await generateDynamicTasks();

        const { newEventId, newBoardId } = await rotateBingoTasks();
        if (!newEventId || !newBoardId) {
            logger.error('[autoTransitionEvents] Failed to create new event or board.');
            return;
        }

        if (lastCompletedEvent) {
            await db.runQuery('UPDATE bingo_teams SET event_id = ? WHERE event_id = ?', [newEventId, lastCompletedEvent.event_id]);
        }

        const eventDuration = 28 * 24 * 60 * 60 * 1000;
        const newStart = new Date(now.getTime());
        const newEnd = new Date(newStart.getTime() + eventDuration);

        logger.info(`[autoTransitionEvents] Generating dynamic tasks for event #${newEventId}, board #${newBoardId}`);

        await db.runQuery(
            `
            UPDATE bingo_state
            SET start_time=?, end_time=?, state='upcoming', last_updated=CURRENT_TIMESTAMP
            WHERE event_id=? AND board_id=?
            `,
            [newStart.toISOString(), newEnd.toISOString(), newEventId, newBoardId],
        );

        await startBingoEvent(newEventId, newStart.toISOString());
        logger.info(`[autoTransitionEvents] New event #${newEventId} with board #${newBoardId} scheduled to start.`);
    } else {
        logger.info(`[autoTransitionEvents] Ongoing event found (event_id=${ongoingEvent.event_id}).`);
    }

    // Update upcoming events whose start time has passed to ongoing.
    await db.runQuery(
        `
        UPDATE bingo_state
        SET state='ongoing'
        WHERE state='upcoming'
          AND start_time <= ?
        `,
        [nowIso],
    );

    // Retrieve all ongoing events and check if any should be completed.
    const ongoing = await db.getAll(`
        SELECT event_id, start_time, end_time
        FROM bingo_state
        WHERE state='ongoing'
    `);

    for (const evt of ongoing) {
        const eventId = evt.event_id;
        const startTime = new Date(evt.start_time);
        const endTime = evt.end_time ? new Date(evt.end_time) : null;

        const fourWeeksLater = new Date(startTime.getTime() + 28 * 24 * 60 * 60 * 1000);
        const timeUp = fourWeeksLater <= now || (endTime && endTime <= now);

        // Check if any player has completed the board.
        const fullComplete = await hasFullCompletion(eventId);

        if (timeUp || fullComplete) {
            logger.info(`[autoTransitionEvents] Ending event #${eventId} due to ${timeUp ? 'timeUp' : 'fullCompletion'}`);
            await db.runQuery(
                `
                UPDATE bingo_state
                SET state='completed'
                WHERE event_id=?
                `,
                [eventId],
            );
            await endBingoEvent(eventId);
        }
    }
}

/**
 *
 * @param eventId
 */
async function hasFullCompletion(eventId) {
    // Retrieve the current board for the event.
    const st = await db.getOne(
        `
        SELECT board_id
        FROM bingo_state
        WHERE event_id=?
        `,
        [eventId],
    );
    if (!st) return false;
    const boardId = st.board_id;

    // Verify the board exists.
    const boardExists = await db.getOne(
        `
        SELECT board_id 
        FROM bingo_boards
        WHERE board_id = ?
        `,
        [boardId],
    );
    if (!boardExists) {
        logger.warn(`[hasFullCompletion] Board ID ${boardId} does not exist yet. Skipping task count.`);
        return false;
    }

    // Since your board is a 3x5 grid, set the dimensions explicitly.
    const numRows = 3;
    const numCols = 5;

    // Generate the full board pattern using the fixed dimensions.
    const fullBoardPattern = getFullBoardPattern(numRows, numCols);
    // Create cell identifiers in the format "row-col"
    const cellIdentifiers = fullBoardPattern.cells.map((c) => `${c.row}-${c.col}`);

    // Query the number of completed tasks per player for only the cells in the full board pattern.
    const completions = await db.getAll(
        `
        SELECT btp.player_id,
               COUNT(*) AS completeCount
        FROM bingo_board_cells bbc
        JOIN bingo_task_progress btp 
            ON bbc.task_id = btp.task_id
        WHERE bbc.board_id = ?
          AND btp.event_id = ?
          AND (bbc.row || '-' || bbc.column) IN (${cellIdentifiers.map(() => '?').join(',')})
          AND btp.status = 'completed'
        GROUP BY btp.player_id
        `,
        [boardId, eventId, ...cellIdentifiers],
    );

    // If any player has completed all cells, the board is fully completed.
    for (const c of completions) {
        if (c.completeCount >= fullBoardPattern.cells.length) {
            return true;
        }
    }
    return false;
}

module.exports = {
    autoTransitionEvents,
};
