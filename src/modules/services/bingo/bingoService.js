// /modules/services/bingo/bingoService.js
const logger = require('../../utils/essentials/logger');
const db = require('../../utils/essentials/dbUtils');
const bingoTaskManager = require('./bingoTaskManager');
const bingoPatternRecognition = require('./bingoPatternRecognition');
const bingoLeaderboard = require('./bingoLeaderboard');
const bingoNotifications = require('./bingoNotifications');
const bingoStateManager = require('./bingoStateManager');
const { startBingoEvent, rotateBingoTasks } = require('./bingoUtils');
const { purgeStaleEmbeds } = require('./bingoEmbedManager');

/**
 * This is called every 30 mins (or on slash command).
 * @param client
 */
async function updateBingoProgress(client) {
    try {
        logger.info('[BingoService] updateBingoProgress() → Starting...');

        await bingoTaskManager.updateAllTasks();
        const ongoingEvents = await db.getAll(`
            SELECT event_id
            FROM bingo_state
            WHERE state = 'ongoing'
        `);
        for (const { event_id } of ongoingEvents) {
            await bingoTaskManager.consolidateTeamTaskProgress(event_id);
        }
        await purgeStaleEmbeds(client);
        await bingoPatternRecognition.checkPatterns();
        await bingoLeaderboard.updateLeaderboard(client);
        await bingoNotifications.sendProgressUpdates(client);

        logger.info('[BingoService] updateBingoProgress() → Complete.');
    } catch (err) {
        logger.error(`[BingoService] updateBingoProgress() error: ${err.message}`);
    }
}

/**
 * Called automatically from autoTransitionEvents when time is up or card fully completed.
 * @param eventId
 */
async function endBingoEvent(eventId) {
    try {
        logger.info(`[BingoService] endBingoEvent(#${eventId})...`);

        // Step 1: Archive tasks
        await db.runQuery(
            `
            INSERT INTO bingo_history (event_id, board_id, player_id, team_id, task_id, status, points_awarded, completed_at)
            SELECT btp.event_id,
                (SELECT board_id FROM bingo_state WHERE event_id = btp.event_id),
                btp.player_id,
                COALESCE(btp.team_id, 0),
                btp.task_id,
                btp.status,
                btp.extra_points,
                DATETIME('now')
            FROM bingo_task_progress btp
            WHERE btp.event_id=?
            `,
            [eventId],
        );

        // Step 2: Clear tasks from progress
        await db.runQuery(
            `
            DELETE FROM bingo_task_progress
            WHERE event_id=?
            `,
            [eventId],
        );

        // Step 4: Announce final results
        await bingoNotifications.sendFinalResults(eventId);
        logger.info(`[BingoService] Bingo event #${eventId} ended & archived.`);

        // ✅ Step 5: Now set the state to completed
        await bingoStateManager.setEventState(eventId, 'completed');
        logger.info(`[BingoService] Event #${eventId} marked as completed.`);

        // Step 6: Check for no ongoing event and auto-start the next event
        const ongoingCheck = await db.getOne(`
            SELECT event_id
            FROM bingo_state
            WHERE state = 'ongoing'
            LIMIT 1
        `);

        if (!ongoingCheck) {
            // Only create a new event if no ongoing event exists
            const { newEventId, newBoardId } = await rotateBingoTasks();
            if (newEventId && newBoardId) {
                // Auto-start the new event immediately
                const newStart = new Date().toISOString();
                await startBingoEvent(newEventId, newStart);
                logger.info(`[BingoService] Automatically started new event #${newEventId}`);
            }
        } else {
            logger.info('[BingoService] Ongoing event already present. No new event will be created.');
        }
    } catch (err) {
        logger.error(`[BingoService] endBingoEvent() error: ${err.message}`);
    }
}

module.exports = {
    updateBingoProgress,
    endBingoEvent,
};
