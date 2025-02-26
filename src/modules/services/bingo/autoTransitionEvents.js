// /modules/services/bingo/eventAutoTransition.js
const logger = require('../../utils/essentials/logger');
const db = require('../../utils/essentials/dbUtils');
const { endBingoEvent } = require('./bingoService');
const { generateDynamicTasks, clearDynamicTasks } = require('./dynamicTaskGenerator');
const { rotateBingoTasks, startBingoEvent } = require('./bingoUtils');

/**
 *
 */
async function autoTransitionEvents() {
    const now = new Date();
    const nowIso = now.toISOString();

    // Check if there is an active event with tasks initialized
    // Enhanced check for active event linked to board and tasks initialized
    // Check if there is an ongoing event
    const ongoingEvent = await db.getOne(`
    SELECT event_id
    FROM bingo_state
    WHERE state = 'ongoing'
    LIMIT 1
`);

    if (ongoingEvent) {
        logger.info(`[autoTransitionEvents] Ongoing event found (event_id=${ongoingEvent.event_id}). No new event will be scheduled.`);
        return; // Exit to prevent creating another event
    }
    // Get the last completed event (assuming your event IDs increase)
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

    if (newEventId && newBoardId) {
        const eventDuration = 28 * 24 * 60 * 60 * 1000; // 4 weeks
        const newStart = new Date(now.getTime());
        const newEnd = new Date(newStart.getTime() + eventDuration);

        // Generate Dynamic Tasks BEFORE setting state to 'ongoing'
        logger.info(`[autoTransitionEvents] Generating dynamic tasks for event #${newEventId}, board #${newBoardId}`);

        // Only update the start and end time after tasks are generated
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
    }

    // 1) Auto-start events if their start time has passed.
    await db.runQuery(
        `
        UPDATE bingo_state
        SET state='ongoing'
        WHERE state='upcoming'
          AND start_time <= ?
        `,
        [nowIso],
    );

    // 2) Retrieve ongoing events and process ending conditions...
    const ongoing = await db.getAll(`
        SELECT event_id, start_time, end_time
        FROM bingo_state
        WHERE state='ongoing'
    `);

    for (const evt of ongoing) {
        const eventId = evt.event_id;
        const startTime = new Date(evt.start_time);
        const endTime = evt.end_time ? new Date(evt.end_time) : null;

        // Condition A: 4 weeks have passed
        const fourWeeksLater = new Date(startTime.getTime() + 28 * 24 * 60 * 60 * 1000);
        const timeUp = fourWeeksLater <= now || (endTime && endTime <= now);

        // Condition B: any participant completed 100% tasks
        const fullComplete = await hasFullCompletion(eventId);

        if (timeUp || fullComplete) {
            logger.info(`[autoTransitionEvents] Ending event #${eventId} due to ${timeUp ? 'timeUp' : 'fullCompletion'}`);
            // Mark event as completed and archive data
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
 * Returns true if any participant (player/team) has completed 100% of tasks
 * on the event's board.
 * @param eventId
 */
async function hasFullCompletion(eventId) {
    const st = await db.getOne(
        `
    SELECT board_id
    FROM bingo_state
    WHERE event_id=?
  `,
        [eventId],
    );
    if (!st) return false;

    // Count tasks on that board
    const boardId = st.board_id;

    // Check if board exists
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

    const row = await db.getOne(
        `
    SELECT COUNT(*) AS total
    FROM bingo_board_cells
    WHERE board_id=?
`,
        [boardId],
    );

    // Handle undefined row safely
    const totalTasks = row && row.total ? row.total : 0;
    if (totalTasks === 0) {
        logger.warn(`[hasFullCompletion] No tasks found for board_id=${boardId}.`);
        return false;
    }

    // For each player, check how many are completed
    const completions = await db.getAll(
        `
    SELECT btp.player_id,
           COUNT(*) AS completeCount
    FROM bingo_task_progress btp
    JOIN bingo_board_cells bbc ON bbc.task_id = btp.task_id
    WHERE btp.status='completed'
      AND btp.event_id=?
      AND bbc.board_id=?
    GROUP BY btp.player_id
  `,
        [eventId, boardId],
    );

    for (const c of completions) {
        if (c.completeCount >= totalTasks) {
            return true;
        }
    }
    return false;
}

module.exports = {
    autoTransitionEvents,
};
