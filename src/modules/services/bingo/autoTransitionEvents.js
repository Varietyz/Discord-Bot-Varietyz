const logger = require('../../utils/essentials/logger');
const db = require('../../utils/essentials/dbUtils');
const { endBingoEvent } = require('./bingoService');
const {
    generateDynamicTasks,
    clearDynamicTasks,
} = require('./dynamicTaskGenerator');
const { rotateBingoTasks, startBingoEvent } = require('./bingoUtils');
const { getFullBoardPattern } = require('./bingoPatterns');
const { setEventState } = require('./bingoStateManager');

async function autoTransitionEvents() {
    const now = new Date();
    const nowIso = now.toISOString();

    try {

        const existingEvent = await db.getOne(
            'SELECT event_id FROM bingo_state LIMIT 1'
        );

        if (!existingEvent) {
            logger.info(
                '[autoTransitionEvents] No existing events found. Creating the first event...'
            );
            await generateDynamicTasks();

            await rotateAndStartNewEvent(now, null);

            logger.info('[autoTransitionEvents] First event created successfully.');
            return; 
        }

        await transitionUpcomingToOngoing(nowIso);

        const ongoingEvents = await getOngoingEvents();

        for (const event of ongoingEvents) {
            const eventId = event.event_id;
            const timeUp = checkEventTimeout(event.start_time, event.end_time);
            const fullComplete = await hasFullCompletion(eventId);

            if (timeUp || fullComplete) {

                logger.info(
                    `[autoTransitionEvents] Ending event #${eventId} due to ${timeUp ? 'timeUp' : 'fullCompletion'}`
                );
                await handleEventCompletion(eventId);

                await rotateAndStartNewEvent(now, eventId);
            }
        }
    } catch (err) {
        logger.error(`[autoTransitionEvents] Error: ${err.message}`);
    }
}

async function transitionUpcomingToOngoing(nowIso) {
    await db.runQuery(
        `
        UPDATE bingo_state
        SET state='ongoing'
        WHERE state='upcoming'
          AND (start_time IS NULL OR start_time <= ?)
        `,
        [nowIso]
    );
    logger.info(
        '[autoTransitionEvents] Transitioned upcoming events to ongoing, including those with no start_time.'
    );
}

async function getOngoingEvents() {
    return await db.getAll(`
        SELECT event_id, start_time, end_time
        FROM bingo_state
        WHERE state='ongoing'
    `);
}

function checkEventTimeout(startTime, endTime) {
    const now = new Date();
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : null;

    const fourWeeksLater = new Date(start.getTime() + 28 * 24 * 60 * 60 * 1000);
    return fourWeeksLater <= now || (end && end <= now);
}

async function handleEventCompletion(eventId) {
    try {
        await endBingoEvent(eventId); 
        await setEventState(eventId, 'completed'); 

        await clearDynamicTasks();
        await generateDynamicTasks();
        logger.info(
            `[autoTransitionEvents] Cleared and generated tasks for event #${eventId}.`
        );
    } catch (err) {
        logger.error(`[handleEventCompletion] Error: ${err.message}`);
    }
}

async function rotateAndStartNewEvent(now, oldEventId) {
    try {
        const { newEventId, newBoardId } = await rotateBingoTasks();
        if (!newEventId || !newBoardId) {
            logger.error(
                '[autoTransitionEvents] Failed to create new event or board.'
            );
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
            [newStart.toISOString(), newEnd.toISOString(), newEventId, newBoardId]
        );

        await db.runQuery(
            `
            UPDATE bingo_teams
            SET event_id=?
            WHERE event_id=?
            `,
            [newEventId, oldEventId]
        );

        await startBingoEvent(newEventId, newStart.toISOString());
        logger.info(
            `[autoTransitionEvents] New event #${newEventId} with board #${newBoardId} scheduled to start.`
        );
    } catch (err) {
        logger.error(`[rotateAndStartNewEvent] Error: ${err.message}`);
    }
}

async function hasFullCompletion(eventId) {

    const st = await db.getOne(
        `
        SELECT board_id
        FROM bingo_state
        WHERE event_id=?
        `,
        [eventId]
    );
    if (!st) return false;
    const boardId = st.board_id;

    const boardExists = await db.getOne(
        `
        SELECT board_id 
        FROM bingo_boards
        WHERE board_id = ?
        `,
        [boardId]
    );
    if (!boardExists) {
        logger.warn(
            `[hasFullCompletion] Board ID ${boardId} does not exist yet. Skipping task count.`
        );
        return false;
    }

    const numRows = 3;
    const numCols = 5;

    const fullBoardPattern = getFullBoardPattern(numRows, numCols);

    const cellIdentifiers = fullBoardPattern.cells.map(
        (c) => `${c.row}-${c.col}`
    );

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
        [boardId, eventId, ...cellIdentifiers]
    );

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
