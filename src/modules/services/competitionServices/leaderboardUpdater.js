// @ts-nocheck
/**
 * @fileoverview
 * 🚀 **Module Purpose:**
 * This module handles updating the competition leaderboard on Discord by:
 * - Fetching active competition details from the database.
 * - Retrieving competition data from the Wise Old Man API.
 * - Sorting participants by progress.
 * - Formatting and sending/updating a Discord embed in the corresponding channel.
 *
 * 📦 **Key Exports:**
 * - `updateLeaderboard(competitionType, db, client, constants)`
 * - `buildLeaderboardEmbed(competitionType, description, competitionId)`
 *
 * 🛠️ **Dependencies:**
 * - `discord.js` (for building and sending embeds)
 * - Custom `logger` utility for logging messages
 * - `WOMApiClient` for interacting with the Wise Old Man API
 */

const { EmbedBuilder } = require('discord.js');
const logger = require('../../utils/essentials/logger');
const WOMApiClient = require('../../../api/wise_old_man/apiClient');
const db = require('../../utils/essentials/dbUtils');
const { getMetricEmoji } = require('../../utils/fetchers/getCompMetricEmoji');

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
 * // 📌 Update the SOTW leaderboard:
 * await updateLeaderboard('SOTW', db, client, constants);
 */
async function updateLeaderboard(competitionType, db, client, constants) {
    try {
        const channelId = competitionType === 'SOTW' ? constants.SOTW_CHANNEL_ID : constants.BOTW_CHANNEL_ID;
        const channel = await client.channels.fetch(channelId);

        if (!channel) {
            logger.error(`🚫 **Error:** No channel found for type \`${competitionType}\`. Please verify the configuration.`);
            return;
        }

        const competition = await getActiveCompetition(competitionType, db);
        if (!competition) {
            logger.warn(`⚠️ **Warning:** No active competition found for \`${competitionType}\`. Skipping leaderboard update.`);
            return;
        }

        const competitionDetails = await WOMApiClient.request('competitions', 'getCompetitionDetails', competition.competition_id);

        if (!competitionDetails) {
            logger.error(`🚫 **Error:** Failed to fetch competition details for ID \`${competition.competition_id}\`.`);
            return;
        }

        const { metric, participations } = competitionDetails;

        if (!metric || !participations) {
            logger.warn(`⚠️ **Warning:** Competition ID \`${competition.competition_id}\` is missing metric or participant data.`);
            return;
        }

        const sortedParticipants = participations.sort((a, b) => b.progress.gained - a.progress.gained);

        const embedDescription = await formatLeaderboardDescription(sortedParticipants, competitionType, metric, channel.guild);

        const embed = await buildLeaderboardEmbed(competitionType, embedDescription, competition.competition_id);

        await sendOrUpdateEmbed(channel, competition, embed, db);
        logger.info(`✅ **Success:** Updated \`${competitionType}\` leaderboard with WOM data.`);
    } catch (err) {
        logger.error(`🚫 **Error in updateLeaderboard:** ${err.message}`);
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
 * // 📌 Retrieve the active BOTW competition:
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
 * @param {Object} guild - The Discord guild object used to fetch custom emojis.
 * @returns {string} A formatted string containing the leaderboard description.
 *
 * @example
 * // 📌 Format the leaderboard description:
 * const description = formatLeaderboardDescription(participants, 'SOTW', 'Mining', guild);
 */
async function formatLeaderboardDescription(participants, competitionType, metric, guild) {
    try {
        let metricEmoji = await getMetricEmoji(guild, metric, competitionType); // ✅ Await the function

        if (!metricEmoji) {
            logger.warn(`⚠️ **Warning:** Metric emoji is undefined for \`${metric}\`.`);
            metricEmoji = competitionType === 'SOTW' ? '📊' : '🐲'; // Default fallbacks
        }

        let desc = '';

        if (!participants || participants.length === 0) {
            logger.warn(`⚠️ **Warning:** No participants found for \`${competitionType}\`.`);
            return 'No participants yet.';
        }

        participants.slice(0, 10).forEach((p, i) => {
            const playerNameForLink = encodeURIComponent(p.player.displayName);
            const profileLink = `https://wiseoldman.net/players/${playerNameForLink}`;

            desc += `> **${i + 1}.** **[${p.player.displayName}](${profileLink})**\n>  ${metricEmoji}\`${p.progress.gained.toLocaleString()}\`\n\n`;
        });

        return desc || 'No participants yet.';
    } catch (error) {
        logger.error(`🚫 **Error in formatLeaderboardDescription:** ${error.message}`);
        return '⚠️ Error generating leaderboard.';
    }
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
 * // 📌 Build a BOTW leaderboard embed:
 * const embed = buildLeaderboardEmbed('BOTW', description, competition.competition_id);
 */
async function buildLeaderboardEmbed(competitionType, description, competitionId) {
    let emojiFormat;
    if (competitionType === 'SOTW') {
        // getAll returns an array; extract the first result.
        const overallEmojis = await db.guild.getAll('SELECT emoji_format FROM guild_emojis WHERE emoji_key = ?', ['emoji_overall']);
        emojiFormat = overallEmojis.length > 0 ? overallEmojis[0].emoji_format : '';
    } else {
        const slayerEmojis = await db.guild.getAll('SELECT emoji_format FROM guild_emojis WHERE emoji_key = ?', ['emoji_slayer']);
        emojiFormat = slayerEmojis.length > 0 ? slayerEmojis[0].emoji_format : '';
    }

    return new EmbedBuilder()
        .setTitle(`${emojiFormat} ${competitionType} Leaderboard`)
        .setURL(`https://wiseoldman.net/competitions/${competitionId}/top-5`)
        .setColor(competitionType === 'SOTW' ? 0x3498db : 0xe74c3c)
        .setDescription(description)
        .setFooter({ text: '🕓 Last Updated' })
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
 * @param {Object} channel - The Discord channel where the leaderboard is posted.
 * @param {Object} competition - The competition object containing leaderboard information.
 * @param {EmbedBuilder} embed - The embed to send or update.
 * @param {Object} db - The database utility object.
 * @returns {Promise<void>} Resolves when the message has been sent or updated.
 *
 * @example
 * // 📌 Send or update the leaderboard embed:
 * await sendOrUpdateEmbed(channel, competition, embed, db);
 */
async function sendOrUpdateEmbed(channel, competition, embed, db) {
    if (competition.leaderboard_message_id) {
        try {
            const msg = await channel.messages.fetch(competition.leaderboard_message_id);
            await msg.edit({ embeds: [embed] });
        } catch (err) {
            logger.error(`🚫 **Error:** Failed to fetch or edit message ID \`${competition.leaderboard_message_id}\`: ${err.message}. Sending a new message.`);
            const newMsg = await channel.send({ embeds: [embed] });
            await db.runQuery(
                `
                UPDATE competitions
                SET leaderboard_message_id = ?
                WHERE competition_id = ?
                `,
                [newMsg.id, competition.competition_id],
            );
        }
    } else {
        const newMsg = await channel.send({ embeds: [embed] });
        await db.runQuery(
            `
            UPDATE competitions
            SET leaderboard_message_id = ?
            WHERE competition_id = ?
            `,
            [newMsg.id, competition.competition_id],
        );
    }
}

module.exports = {
    updateLeaderboard,
    buildLeaderboardEmbed,
};
