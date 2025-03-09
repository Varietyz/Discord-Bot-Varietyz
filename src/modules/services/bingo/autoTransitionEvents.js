// /modules/services/bingo/eventAutoTransition.js
const logger = require('../../utils/essentials/logger');
const db = require('../../utils/essentials/dbUtils');
const { endBingoEvent } = require('./bingoService');
const { generateDynamicTasks, clearDynamicTasks } = require('./dynamicTaskGenerator');
const { rotateBingoTasks, startBingoEvent } = require('./bingoUtils');
const { getFullBoardPattern } = require('./bingoPatterns');
const { setEventState } = require('./bingoStateManager');

/**
 * 📅 Auto Transition Events
 * - Transitions events between states (upcoming, ongoing, completed).
 * - Clears and generates tasks before rotating to a new event.
 */
async function autoTransitionEvents() {
    const now = new Date();
    const nowIso = now.toISOString();

    try {
        // 🔍 **Check if any event exists**
        const existingEvent = await db.getOne('SELECT event_id FROM bingo_state LIMIT 1');

        if (!existingEvent) {
            logger.info('[autoTransitionEvents] No existing events found. Creating the first event...');
            await generateDynamicTasks();
            // 🔄 ✅ Rotate and start a new event properly
            await rotateAndStartNewEvent(now, null);

            logger.info('[autoTransitionEvents] First event created successfully.');
            return; // No need to continue further as a new event was just created.
        }

        // ✅ Transition Upcoming to Ongoing
        await transitionUpcomingToOngoing(nowIso);

        // ✅ Retrieve all ongoing events
        const ongoingEvents = await getOngoingEvents();

        for (const event of ongoingEvents) {
            const eventId = event.event_id;
            const timeUp = checkEventTimeout(event.start_time, event.end_time);
            const fullComplete = await hasFullCompletion(eventId);

            if (timeUp || fullComplete) {
                // ✅ End Event if Timeout or Full Completion
                logger.info(`[autoTransitionEvents] Ending event #${eventId} due to ${timeUp ? 'timeUp' : 'fullCompletion'}`);
                await handleEventCompletion(eventId);

                // 🔄 Rotate and Start New Event
                await rotateAndStartNewEvent(now, eventId);
            }
        }
    } catch (err) {
        logger.error(`[autoTransitionEvents] Error: ${err.message}`);
    }
}

/**
 * ✅ Transition Upcoming to Ongoing
 * - Transitions events that have passed their start time to 'ongoing'.
 * @param nowIso
 */
async function transitionUpcomingToOngoing(nowIso) {
    await db.runQuery(
        `
        UPDATE bingo_state
        SET state='ongoing'
        WHERE state='upcoming'
          AND start_time <= ?
        `,
        [nowIso],
    );
    logger.info('[autoTransitionEvents] Transitioned upcoming events to ongoing.');
}

/**
 * ✅ Get Ongoing Events
 * - Retrieves all events currently marked as 'ongoing'.
 * @returns {Array} List of ongoing events.
 */
async function getOngoingEvents() {
    return await db.getAll(`
        SELECT event_id, start_time, end_time
        FROM bingo_state
        WHERE state='ongoing'
    `);
}

/**
 * ✅ Check Event Timeout
 * - Determines if an event has timed out based on start time or end time.
 * @param {string} startTime - Event start time.
 * @param {string} endTime - Event end time.
 * @returns {boolean} True if event timed out.
 */
function checkEventTimeout(startTime, endTime) {
    const now = new Date();
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : null;

    const fourWeeksLater = new Date(start.getTime() + 28 * 24 * 60 * 60 * 1000);
    return fourWeeksLater <= now || (end && end <= now);
}

/**
 * ✅ Handle Event Completion
 * - Ends the event, updates state, and clears/generates tasks.
 * @param {number} eventId - Event ID to complete.
 */
async function handleEventCompletion(eventId) {
    try {
        await endBingoEvent(eventId); // ✅ Centralized Event Ending
        await setEventState(eventId, 'completed'); // ✅ Consistent State Update

        // 🔄 Clear and Generate Tasks for New Event
        await clearDynamicTasks();
        await generateDynamicTasks();
        logger.info(`[autoTransitionEvents] Cleared and generated tasks for event #${eventId}.`);
    } catch (err) {
        logger.error(`[handleEventCompletion] Error: ${err.message}`);
    }
}

/**
 * 🔄 Rotate and Start New Event
 * - Rotates tasks and schedules the next event.
 * @param {Date} now - Current date and time.
 * @param oldEventId
 */
async function rotateAndStartNewEvent(now, oldEventId) {
    try {
        const { newEventId, newBoardId } = await rotateBingoTasks();
        if (!newEventId || !newBoardId) {
            logger.error('[autoTransitionEvents] Failed to create new event or board.');
            return;
        }

        const eventDuration = 28 * 24 * 60 * 60 * 1000;
        const newStart = new Date(now.getTime());
        const newEnd = new Date(newStart.getTime() + eventDuration);

        await db.runQuery(
            `
            UPDATE bingo_state
            SET start_time=?, end_time=?, state='upcoming', last_updated=CURRENT_TIMESTAMP
            WHERE event_id=? AND board_id=?
            `,
            [newStart.toISOString(), newEnd.toISOString(), newEventId, newBoardId],
        );

        await db.runQuery(
            `
            UPDATE bingo_teams
            SET event_id=?
            WHERE event_id=?
            `,
            [newEventId, oldEventId],
        );

        await startBingoEvent(newEventId, newStart.toISOString());
        logger.info(`[autoTransitionEvents] New event #${newEventId} with board #${newBoardId} scheduled to start.`);
    } catch (err) {
        logger.error(`[rotateAndStartNewEvent] Error: ${err.message}`);
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
    handleEventCompletion,
    rotateAndStartNewEvent,
};
