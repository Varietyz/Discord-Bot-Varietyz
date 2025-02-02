// @ts-nocheck
const { EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const WOMApiClient = require('../../../api/wise_old_man/apiClient');

/**
 * 🎯 **Updates the Competition Leaderboard**
 *
 * Retrieves active competition details, fetches competition data from the WOM API,
 * sorts participants by progress gained, formats the leaderboard, and sends or updates
 * the leaderboard embed in the corresponding Discord channel.
 *
 * @async
 * @function updateLeaderboard
 * @param {string} competitionType - The competition type, either `SOTW` or `BOTW`.
 * @param {Object} db - The database utility object.
 * @param {Object} client - The Discord client instance.
 * @param {Object} constants - Configuration constants (e.g., channel IDs).
 * @returns {Promise<void>} Resolves when the leaderboard has been updated.
 *
 * @example
 * // Update the SOTW leaderboard:
 * await updateLeaderboard('SOTW', db, client, constants);
 */
async function updateLeaderboard(competitionType, db, client, constants) {
    try {
        const channelId = competitionType === 'SOTW' ? constants.SOTW_CHANNEL_ID : constants.BOTW_CHANNEL_ID;
        const channel = await client.channels.fetch(channelId);

        if (!channel) {
            logger.error(`No channel found for type ${competitionType}`);
            return;
        }

        const competition = await getActiveCompetition(competitionType, db);
        if (!competition) {
            logger.warn(`No active competition found for ${competitionType}`);
            return;
        }

        // ✅ Fetch full competition details (metric + participants)
        const competitionDetails = await WOMApiClient.request('competitions', 'getCompetitionDetails', competition.id);

        if (!competitionDetails) {
            logger.error(`Failed to fetch competition details for ID ${competition.id}`);
            return;
        }

        const { metric, participations } = competitionDetails; // Extract metric & participants

        if (!metric || !participations) {
            logger.warn(`Competition ID ${competition.id} is missing metric or participants.`);
            return;
        }

        // ✅ Sort participants based on progress gained (descending order)
        const sortedParticipants = participations.sort((a, b) => b.progress.gained - a.progress.gained);

        // ✅ Format leaderboard description with metric emoji and participant data
        const embedDescription = formatLeaderboardDescription(sortedParticipants, competitionType, metric, channel.guild);

        const embed = buildLeaderboardEmbed(competitionType, embedDescription, competition.id);

        await sendOrUpdateEmbed(channel, competition, embed, db);
        logger.info(`Updated ${competitionType} leaderboard with WOM data.`);
    } catch (err) {
        logger.error(`Error in updateLeaderboard: ${err.message}`);
    }
}

/**
 * 🎯 **Fetches the Active Competition**
 *
 * Retrieves the active competition from the database based on the current timestamp.
 *
 * @async
 * @function getActiveCompetition
 * @param {string} competitionType - The competition type, either `SOTW` or `BOTW`.
 * @param {Object} db - The database utility object.
 * @returns {Promise<Object|null>} Returns the active competition object or `null` if not found.
 *
 * @example
 * const activeComp = await getActiveCompetition('BOTW', db);
 */
async function getActiveCompetition(competitionType, db) {
    return await db.getOne(
        `
        SELECT *
        FROM competitions
        WHERE type = ?
          AND starts_at <= ?
          AND ends_at >= ?
        `,
        [competitionType, new Date().toISOString(), new Date().toISOString()],
    );
}

/**
 * 🎯 **Formats the Leaderboard Description**
 *
 * Constructs a formatted description string for the leaderboard embed, including player names,
 * progress, and dynamically fetched metric emojis.
 *
 * @function formatLeaderboardDescription
 * @param {Array<Object>} participants - Array of participant objects with progress details.
 * @param {string} competitionType - The competition type, either `SOTW` or `BOTW`.
 * @param {string} metric - The competition metric (e.g., "Mining", "Agility").
 * @param {Guild} guild - The Discord guild object used to fetch custom emojis.
 * @returns {string} A formatted string containing the leaderboard description.
 *
 * @example
 * const description = formatLeaderboardDescription(participants, 'SOTW', 'Mining', guild);
 */
function formatLeaderboardDescription(participants, competitionType, metric, guild) {
    // Normalize the metric name to match emoji names in the guild
    const normalizedMetric = metric.toLowerCase().replace(/\s+/g, '_');

    // Fetch the correct emoji from the guild
    let metricEmoji = '';
    if (guild) {
        const foundEmoji = guild.emojis.cache.find((e) => e.name.toLowerCase() === normalizedMetric);
        if (foundEmoji && foundEmoji.available) {
            metricEmoji = foundEmoji.toString(); // Use custom emoji if available
        } else {
            // Use fallback emojis based on competition type
            metricEmoji = competitionType === 'SOTW' ? '<:Total_Level:1127669463613976636>' : '⚔️';
            logger.warn(`⚠️ Custom emoji "${normalizedMetric}" not found or unavailable. Using fallback ${metricEmoji}`);
        }
    } else {
        logger.warn(`⚠️ Guild is undefined; cannot fetch emoji for metric: ${metric}`);
        metricEmoji = competitionType === 'SOTW' ? '<:Total_Level:1127669463613976636>' : '⚔️'; // Default fallback when guild is null
    }

    let desc = '';

    participants.slice(0, 10).forEach((p, i) => {
        const playerNameForLink = encodeURIComponent(p.player.displayName);
        const profileLink = `https://wiseoldman.net/players/${playerNameForLink}`;

        desc += `**${i + 1}.** **[${p.player.displayName}](${profileLink})**\n${metricEmoji}\`${p.progress.gained.toLocaleString()}\`\n\n`;
    });

    return desc || 'No participants yet.';
}

/**
 * 🎯 **Builds the Leaderboard Embed**
 *
 * Creates a Discord embed for the leaderboard with a clickable title linking to the Wise Old Man website.
 *
 * @function buildLeaderboardEmbed
 * @param {string} competitionType - The competition type, either `SOTW` or `BOTW`.
 * @param {string} description - The formatted leaderboard description.
 * @param {number} competitionId - The ID of the competition.
 * @returns {EmbedBuilder} A Discord EmbedBuilder instance representing the leaderboard.
 *
 * @example
 * const embed = buildLeaderboardEmbed('BOTW', description, competition.id);
 */
function buildLeaderboardEmbed(competitionType, description, competitionId) {
    const typeEmoji = competitionType === 'SOTW' ? '<:Total_Level:1127669463613976636>' : '<:Slayer:1127658069984288919>';

    return new EmbedBuilder()
        .setTitle(`${typeEmoji} ${competitionType} Leaderboard`)
        .setURL(`https://wiseoldman.net/competitions/${competitionId}/top-5`) // ✅ Clickable Title Link
        .setColor(competitionType === 'SOTW' ? 0x3498db : 0xe74c3c)
        .setDescription(description)
        .setFooter({ text: '🕓Last Updated' })
        .setTimestamp();
}

/**
 * 🎯 **Sends or Updates the Leaderboard Embed**
 *
 * If the competition already has a leaderboard message, this function attempts to fetch and edit it.
 * If it fails (e.g., message not found), a new message is sent and the competition record is updated.
 *
 * @async
 * @function sendOrUpdateEmbed
 * @param {Channel} channel - The Discord channel where the leaderboard is posted.
 * @param {Object} competition - The competition object containing leaderboard information.
 * @param {EmbedBuilder} embed - The embed to send or update.
 * @param {Object} db - The database utility object.
 * @returns {Promise<void>} Resolves when the message has been sent or updated.
 *
 * @example
 * await sendOrUpdateEmbed(channel, competition, embed, db);
 */
async function sendOrUpdateEmbed(channel, competition, embed, db) {
    if (competition.leaderboard_message_id) {
        try {
            const msg = await channel.messages.fetch(competition.leaderboard_message_id);
            await msg.edit({ embeds: [embed] });
        } catch (err) {
            logger.error(`Failed to fetch or edit message ID ${competition.leaderboard_message_id}: ${err.message}`);
            // Send new embed if updating fails
            const newMsg = await channel.send({ embeds: [embed] });
            await db.runQuery(
                `
                UPDATE competitions
                SET leaderboard_message_id = ?
                WHERE id = ?
                `,
                [newMsg.id, competition.id],
            );
        }
    } else {
        const newMsg = await channel.send({ embeds: [embed] });
        await db.runQuery(
            `
            UPDATE competitions
            SET leaderboard_message_id = ?
            WHERE id = ?
            `,
            [newMsg.id, competition.id],
        );
    }
}

module.exports = {
    updateLeaderboard,
    buildLeaderboardEmbed,
};
