// /modules/services/bingo/bingoService.js
const logger = require('../../utils/essentials/logger');
const db = require('../../utils/essentials/dbUtils');
const bingoTaskManager = require('./bingoTaskManager');
const { appendBingoProgression } = require('../../utils/helpers/commands/bingo/teams/teamCommandHelpers');
const { sendFinalResultsEmbed } = require('./embeds/handling/bingoEmbedHelper');
const client = require('../../../main');

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
 * Ends a Bingo event by archiving data, clearing progress, and notifying users.
 * @param {number} eventId - The ID of the event to end.
 */
async function endBingoEvent(eventId) {
    try {
        logger.info(`[BingoService] endBingoEvent(#${eventId}) → Start`);

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
           btp.points_awarded,
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
        await sendFinalResultsEmbed(client, eventId);
        logger.info(`[BingoService] Bingo event #${eventId} ended & archived.`);
    } catch (err) {
        logger.error(`[BingoService] endBingoEvent() error: ${err.message}`);
    }
}

module.exports = {
    updateBingoProgress,
    endBingoEvent,
};
