// /modules/services/bingo/bingoService.js
const logger = require('../../utils/essentials/logger');
const db = require('../../utils/essentials/dbUtils');
const bingoTaskManager = require('./bingoTaskManager');
const bingoEmbedHelper = require('./bingoEmbedHelper');
const bingoStateManager = require('./bingoStateManager');
const { appendBingoProgression } = require('../../utils/helpers/commands/bingo/teams/teamCommandHelpers');
const { endEvent } = require('./bingoEventUtils');

/**
 *
 * @param client
 */
async function updateBingoProgress(client) {
    logger.info('[BingoService] updateBingoProgress() → Starting...');
    try {
        await bingoTaskManager.updateAllTasks();
    } catch (err) {
        logger.error(`[BingoService] updateAllTasks() error: ${err.message}`);
    }

    await appendBingoProgression(client);

    logger.info('[BingoService] updateBingoProgress() → Complete.');
}

/**
 *
 * @param eventId
 */
async function endBingoEvent(eventId) {
    try {
        logger.info(`[BingoService] endBingoEvent(#${eventId})...`);

        // Archive event data into bingo_history.
        await db.runQuery(
            `
            INSERT INTO bingo_history (event_id, board_id, player_id, team_id, task_id, status, points_awarded, completed_at)
            SELECT btp.event_id,
                   (SELECT board_id FROM bingo_state WHERE event_id = btp.event_id),
                   btp.player_id,
                   COALESCE(btp.team_id, 0),
                   btp.task_id,
                   btp.status,
                   DATETIME('now')
            FROM bingo_task_progress btp
            WHERE btp.event_id = ?
            `,
            [eventId],
        );

        // Clear the progress for the event.
        await db.runQuery(
            `
            DELETE FROM bingo_task_progress
            WHERE event_id = ?
            `,
            [eventId],
        );

        // Send out final results.
        await bingoEmbedHelper.sendFinalResults(eventId);
        logger.info(`[BingoService] Bingo event #${eventId} ended & archived.`);

        // Mark the event as completed.
        await bingoStateManager.setEventState(eventId, 'completed');
        logger.info(`[BingoService] Event #${eventId} marked as completed.`);

        await endEvent();
        // (Removed redundant new event scheduling from here.)
    } catch (err) {
        logger.error(`[BingoService] endBingoEvent() error: ${err.message}`);
    }
}

module.exports = {
    updateBingoProgress,
    endBingoEvent,
};
