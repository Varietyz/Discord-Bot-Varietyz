const { sendNewCompletions, sendOrUpdateLeaderboardEmbeds, sendPatternCompletions } = require('../../../../../services/bingo/embeds/handling/bingoEmbedHelper');
const { purgeStaleEmbeds } = require('../../../../../services/bingo/embeds/handling/bingoEmbedManager');
const { updateLeaderboard } = require('../../../../../services/bingo/bingoLeaderboard');
const { checkPatterns } = require('../../../../../services/bingo/bingoPatternRecognition');
const { consolidateTeamTaskProgress } = require('../../../../../services/bingo/bingoTaskManager');
const db = require('../../../../essentials/dbUtils');
const logger = require('../../../../essentials/logger');

/**
 *
 * @param eventId
 * @param playerId
 * @param newTeamId
 */
async function reassignTeamProgress(eventId, playerId, newTeamId = 0) {
    logger.info(`[TeamProgress] Re-assigning progress for Player ${playerId} in Event ${eventId} to Team ${newTeamId}`);

    await db.runQuery('BEGIN TRANSACTION');

    try {
        await db.runQuery(
            `
        UPDATE bingo_task_progress
        SET team_id = ?
        WHERE event_id = ?
          AND player_id = ?
    `,
            [newTeamId, eventId, playerId],
        );

        await db.runQuery('COMMIT');
        logger.info(`[TeamProgress] Successfully updated team_id to ${newTeamId} for Player ${playerId} in Event ${eventId}`);
    } catch (err) {
        await db.runQuery('ROLLBACK');
        logger.error(`[TeamProgress] Failed to update team_id for Player ${playerId} in Event ${eventId}: ${err.message}`);
    }

    logger.info(`[TeamProgress] Updated team_id to ${newTeamId} for Player ${playerId} in Event ${eventId}`);
}

/**
 *
 */
async function getOngoingEventId() {
    const ongoing = await db.getOne(`
        SELECT event_id
        FROM bingo_state
        WHERE state = 'ongoing'
        LIMIT 1
    `);
    return ongoing ? ongoing.event_id : null;
}

/**
 *
 * @param discordId
 */
async function getActivePlayer(discordId) {
    const playerRow = await db.getOne(
        `
        SELECT rr.player_id, rr.rsn
        FROM registered_rsn rr
        JOIN clan_members cm ON rr.player_id = cm.player_id
        WHERE rr.discord_id = ?
          AND LOWER(rr.rsn) = LOWER(cm.rsn)
        LIMIT 1
        `,
        [discordId],
    );
    return playerRow ? { playerId: playerRow.player_id, rsn: playerRow.rsn } : null;
}

/**
 *
 * @param client
 */
async function appendBingoProgression(client) {
    logger.info('[BingoService] appendBingoProgress() → Starting...');
    let ongoingEvents;
    try {
        ongoingEvents = await db.getAll(`
            SELECT event_id
            FROM bingo_state
            WHERE state = 'ongoing'
        `);
    } catch (err) {
        logger.error(`[BingoService] Failed to fetch ongoing events: ${err.message}`);
        throw err;
    }

    for (const { event_id } of ongoingEvents) {
        try {
            await consolidateTeamTaskProgress(event_id);
        } catch (err) {
            logger.error(`[BingoService] consolidateTeamTaskProgress(eventId: ${event_id}) error: ${err.message}`);
        }
    }

    try {
        await checkPatterns();
    } catch (err) {
        logger.error(`[BingoService] checkPatterns() error: ${err.message}`);
    }

    try {
        await updateLeaderboard(client);
    } catch (err) {
        logger.error(`[BingoService] updateLeaderboard() error: ${err.message}`);
    }

    for (const { event_id } of ongoingEvents) {
        try {
            await sendOrUpdateLeaderboardEmbeds(client, event_id);
            await sendNewCompletions(client);
            await sendPatternCompletions(client, event_id);
        } catch (err) {
            logger.error(`[BingoService] sendOrUpdateLeaderboardEmbeds(eventId: ${event_id}) error: ${err.message}`);
        }
    }

    try {
        await purgeStaleEmbeds(client);
    } catch (err) {
        logger.error(`[BingoService] purgeStaleEmbeds() error: ${err.message}`);
    }

    logger.info('[BingoService] appendBingoProgress() → Complete.');
}

module.exports = { reassignTeamProgress, getActivePlayer, getOngoingEventId, appendBingoProgression };
