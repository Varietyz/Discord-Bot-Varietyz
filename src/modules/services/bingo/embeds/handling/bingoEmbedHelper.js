const { createProgressEmbed, createFinalResultsEmbed, createIndividualLeaderboardEmbed, createTeamLeaderboardEmbed, createConsolidatedProgressEmbed, createPatternCompletionEmbed } = require('../../bingoEmbeds');
const { createEmbedRecord, getActiveEmbeds, editEmbed } = require('./bingoEmbedManager');
const { getProgressEmbedData, getFinalResultsEmbedData, getNewCompletions } = require('../../bingoEmbedData');
const getChannelId = require('../../../../utils/fetchers/getChannel');
const logger = require('../../../../utils/essentials/logger');

/**
 *
 * @param client
 * @param channelKey
 */
async function fetchChannel(client, channelKey) {
    const channelId = await getChannelId(channelKey);
    if (!channelId) throw new Error(`No ${channelKey} configured.`);
    const channel = client.channels.cache.get(channelId);
    if (!channel) throw new Error(`Channel #${channelId} not found in guild.`);
    return channel;
}

/**
 *
 * @param client
 * @param eventId
 */
async function sendNewCompletions(client, eventId) {
    const newCompletions = await getNewCompletions(eventId);
    if (newCompletions.length === 0) {
        logger.info('[BingoEmbedHelper] No new completions to notify.');
        return;
    }
    const channel = await fetchChannel(client, 'bingo_notification_channel');

    // Create a single consolidated embed using our helper.
    const embed = await createConsolidatedProgressEmbed(newCompletions);
    const message = await channel.send({ embeds: [embed] });

    // Record the embed for each completion.
    for (const row of newCompletions) {
        await createEmbedRecord(row.event_id, row.player_id, null, row.task_id, message.id, channel.id, 'progress');
    }
}

/**
 *
 * @param client
 * @param eventId
 * @param playerId
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
    if (!eventId || isNaN(eventId)) {
        console.error('❌ Invalid eventId:', eventId);
        return;
    }

    const channelId = await getChannelId('bingo_leaderboard_channel');
    if (!channelId) return;
    const channel = await client.channels.fetch(channelId);

    const teamEmbed = await createTeamLeaderboardEmbed(eventId);

    const GLOBAL_LEADERBOARD_ID = -1;

    const existingTeam = await getActiveEmbeds(eventId, 'team_leaderboard');
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

    const individualEmbed = await createIndividualLeaderboardEmbed(eventId);

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
}

/**
 * ✅ Sends or updates a **Pattern Completion Notification** in the Bingo channel.
 * - Edits the existing embed if found, otherwise creates a new one.
 *
 * @param {Client} client - The Discord bot client.
 * @param {number} eventId - The Bingo Event ID.
 */
async function sendPatternCompletions(client, eventId) {
    try {
        const patternCompletions = await createPatternCompletionEmbed(eventId);
        if (!patternCompletions) {
            logger.info('[BingoEmbedHelper] No pattern completions to notify.');
            return;
        }

        const channel = await fetchChannel(client, 'bingo_patterns_channel');

        // ✅ Check if an active pattern completion embed exists
        const existingEmbeds = await getActiveEmbeds(eventId, 'pattern_completion');

        if (existingEmbeds.length > 0) {
            try {
                const embedToUpdate = existingEmbeds[0]; // Get the first active embed
                await editEmbed(client, embedToUpdate.channel_id, embedToUpdate.message_id, patternCompletions);
                logger.info(`[BingoEmbedHelper] Updated existing pattern completion embed: ${embedToUpdate.message_id}`);
            } catch (error) {
                logger.error(`[BingoEmbedHelper] Failed to update pattern completion embed: ${error.message}`);
            }
        } else {
            // ✅ No existing embed, send a new one
            const message = await channel.send({ embeds: [patternCompletions] });

            // ✅ Create an embed record for tracking
            await createEmbedRecord(eventId, null, null, null, message.id, channel.id, 'pattern_completion');

            logger.info(`[BingoEmbedHelper] Created new pattern completion embed for event #${eventId}`);
        }
    } catch (error) {
        logger.error(`[BingoEmbedHelper] Failed to send or update pattern completion embed: ${error.message}`);
    }
}

module.exports = {
    sendProgressEmbed,
    sendFinalResultsEmbed,
    sendNewCompletions,
    sendOrUpdateLeaderboardEmbeds,
    sendPatternCompletions,
};
