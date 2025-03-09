const { createProgressEmbed, createFinalResultsEmbed, createIndividualLeaderboardEmbed, createTeamLeaderboardEmbed, createConsolidatedProgressEmbed } = require('../bingoEmbeds');
const { createEmbedRecord, getActiveEmbeds, editEmbed } = require('./bingoEmbedManager');
const { getProgressEmbedData, getFinalResultsEmbedData, getNewCompletions, getTopTeams, getTopPlayers } = require('../bingoEmbedData');
const getChannelId = require('../../../../utils/fetchers/getChannel');
const logger = require('../../../../utils/essentials/logger');

/**
 *
 * @param client
 * @param channelKey
 * @returns
 */
async function fetchChannel(client, channelKey) {
    const channelId = await getChannelId(channelKey);
    if (!channelId) throw new Error(`No ${channelKey} configured.`);
    const channel = client.channels.cache.get(channelId);
    if (!channel) throw new Error(`Channel #${channelId} not found in guild.`);
    return channel;
}

/**
 * ✅ Sends new Bingo task completion notifications, ensuring embed size limits are respected.
 *
 * @param {Client} client - The Discord client instance.
 * @param {number} eventId - The Bingo event ID.
 */
async function sendNewCompletions(client, eventId) {
    const newCompletions = await getNewCompletions(eventId);
    if (newCompletions.length === 0) {
        logger.info('[BingoEmbedHelper] No new completions to notify.');
        return;
    }

    const channel = await fetchChannel(client, 'bingo_notification_channel');
    if (!channel) {
        logger.error('[BingoEmbedHelper] Failed to fetch notification channel.');
        return;
    }

    // Generate embeds based on the new completions
    const embeds = await createConsolidatedProgressEmbed(newCompletions);
    const messages = [];

    for (const embed of embeds) {
        const message = await channel.send({ embeds: [embed] });
        messages.push(message.id); // ✅ Store message IDs
    }

    // ✅ Store embed records properly (1 per task completion)
    for (let i = 0; i < newCompletions.length; i++) {
        const row = newCompletions[i];

        // ✅ Ensure we assign the correct message to each task
        const messageId = messages[i] || messages[messages.length - 1]; // Assign the correct message or fallback to last one

        await createEmbedRecord(row.event_id, row.player_id, null, row.task_id, messageId, channel.id, 'progress');
    }

    logger.info(`[BingoEmbedHelper] Sent ${embeds.length} embed(s) for event ${eventId}.`);
}

/**
 *
 * @param client
 * @param eventId
 * @param playerId
 * @returns
 */
async function sendProgressEmbed(client, eventId, playerId) {
    try {
        const data = await getProgressEmbedData(eventId, playerId);
        if (!data) return;

        const channel = await fetchChannel(client, 'bingo_notification_channel');
        const embed = await createProgressEmbed(data);
        const message = await channel.send({ embeds: [embed] });

        await createEmbedRecord(eventId, playerId, null, null, message.id, channel.id, 'progress');
        return message.id;
    } catch (err) {
        logger.error(`[sendProgressEmbed] Error: ${err.message}`);
    }
}

/**
 *
 * @param client
 * @param eventId
 */
async function sendFinalResultsEmbed(client, eventId) {
    try {
        const data = await getFinalResultsEmbedData(eventId);
        if (!data) return;

        const channel = await fetchChannel(client, 'bingo_notification_channel');
        const embed = await createFinalResultsEmbed(data);
        await channel.send({ embeds: [embed] });
    } catch (err) {
        logger.error(`[sendFinalResultsEmbed] Error: ${err.message}`);
    }
}

/**
 *
 * @param client
 * @param eventId
 */
async function sendOrUpdateLeaderboardEmbeds(client, eventId) {
    const topTeams = await getTopTeams(eventId);
    const topPlayers = await getTopPlayers(eventId);

    if (!eventId || isNaN(eventId)) {
        logger.error('❌ Invalid eventId:', eventId);
        return;
    }

    const channelId = await getChannelId('bingo_leaderboard_channel');
    if (!channelId) return;
    const channel = await client.channels.fetch(channelId);

    const individualEmbed = await createIndividualLeaderboardEmbed(eventId, topPlayers);
    const teamEmbed = await createTeamLeaderboardEmbed(eventId, topTeams);

    const GLOBAL_LEADERBOARD_ID = -1;

    const existingTeam = await getActiveEmbeds(eventId, 'team_leaderboard');

    const existingIndividual = await getActiveEmbeds(eventId, 'individual_leaderboard');

    if (existingIndividual.length > 0) {
        try {
            const embedToUpdate = existingIndividual[0];
            await editEmbed(client, embedToUpdate.channel_id, embedToUpdate.message_id, individualEmbed);
            logger.info(`[BingoEmbedHelper] Updated individual_leaderboard embed: ${embedToUpdate.message_id}`);
        } catch (error) {
            logger.error(`[BingoEmbedHelper] Failed to update individual_leaderboard embed: ${error.message}`);
        }
    } else {
        const individualMessage = await channel.send({ embeds: [individualEmbed] });
        await createEmbedRecord(GLOBAL_LEADERBOARD_ID, null, null, null, individualMessage.id, channel.id, 'individual_leaderboard');
        logger.info(`[BingoEmbedHelper] Created new individual_leaderboard embed for event #${eventId}`);
    }

    if (existingTeam.length > 0) {
        try {
            const embedToUpdate = existingTeam[0];
            await editEmbed(client, embedToUpdate.channel_id, embedToUpdate.message_id, teamEmbed);
            logger.info(`[BingoEmbedHelper] Updated team_leaderboard embed: ${embedToUpdate.message_id}`);
        } catch (error) {
            logger.error(`[BingoEmbedHelper] Failed to update team_leaderboard embed: ${error.message}`);
        }
    } else {
        const teamMessage = await channel.send({ embeds: [teamEmbed] });
        await createEmbedRecord(GLOBAL_LEADERBOARD_ID, null, null, null, teamMessage.id, channel.id, 'team_leaderboard');
        logger.info(`[BingoEmbedHelper] Created new team_leaderboard embed for event #${eventId}`);
    }
}

module.exports = {
    sendProgressEmbed,
    sendFinalResultsEmbed,
    sendNewCompletions,
    sendOrUpdateLeaderboardEmbeds,
    fetchChannel,
};
