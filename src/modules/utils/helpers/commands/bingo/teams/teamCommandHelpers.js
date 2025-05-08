const { sendNewCompletions, sendOrUpdateLeaderboardEmbeds } = require('../../../../../services/bingo/embeds/handling/bingoEmbedHelper');
const { purgeStaleEmbeds } = require('../../../../../services/bingo/embeds/handling/bingoEmbedManager');
const { checkPatterns } = require('../../../../../services/bingo/bingoPatternRecognition');
const { consolidateTeamTaskProgress } = require('../../../../../services/bingo/bingoTaskManager');
const db = require('../../../../essentials/dbUtils');
const logger = require('../../../../essentials/logger');
const { synchronizeTaskCompletion } = require('../../../../essentials/syncTeamData');
const { updateLeaderboard } = require('../../../../../services/bingo/bingoLeaderboard');
const { notifyPatternAwards } = require('../../../../../services/bingo/embeds/bingoPatternNotifications');

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

async function getOngoingEventId() {
    const ongoing = await db.getOne(`
        SELECT event_id
        FROM bingo_state
        WHERE state = 'ongoing'
        LIMIT 1
    `);
    return ongoing ? ongoing.event_id : null;
}

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

            const teams = await db.getAll(
                `
            SELECT team_id
            FROM bingo_teams
            WHERE event_id = ?
            `,
                [event_id],
            );

            for (const team of teams) {
                const teamMembers = await db.getAll(
                    `
                SELECT rr.rsn, rr.player_id
                FROM bingo_team_members btm
                JOIN registered_rsn rr ON btm.player_id = rr.player_id
                WHERE btm.team_id = ?
                ORDER BY rr.rsn COLLATE NOCASE ASC
                `,
                    [team.team_id],
                );

                for (const member of teamMembers) {
                    await synchronizeTaskCompletion(event_id, team.team_id, member.player_id);
                }
            }

            await consolidateTeamTaskProgress(event_id);
            await updateLeaderboard();
            try {
                await checkPatterns();
            } catch (err) {
                logger.error(`[BingoService] updateLeaderboard() error: ${err.message}`);
            }

            try {
                await sendOrUpdateLeaderboardEmbeds(client, event_id);
                try {
                    await sendNewCompletions(client);
                    await notifyPatternAwards(client, event_id);
                } catch (err) {
                    logger.error(`[BingoService] newCompletion Notifications() error: ${err.message}`);
                }
            } catch (err) {
                logger.error(`[BingoService] sendOrUpdateLeaderboardEmbeds(eventId: ${event_id}) error: ${err.message}`);
            }

            try {
                await purgeStaleEmbeds(client);
            } catch (err) {
                logger.error(`[BingoService] purgeStaleEmbeds() error: ${err.message}`);
            }
        } catch (err) {
            logger.error(`[BingoService] consolidateTeamTaskProgress(eventId: ${event_id}) error: ${err.message}`);
        }
    }

    logger.info('[BingoService] appendBingoProgress() → Complete.');
}

module.exports = { reassignTeamProgress, getActivePlayer, getOngoingEventId, appendBingoProgression };
