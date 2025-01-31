// @ts-nocheck
const { EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const WOMApiClient = require('../../../api/wise_old_man/apiClient');

/**
 * Updates the leaderboard for a given competition type.
 * @param {string} competitionType - 'SOTW' or 'BOTW'.
 * @param {Object} db - The database utility.
 * @param {Object} client - The Discord client.
 * @param {Object} constants - Configuration constants.
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

        // ✅ Sort participants based on progress gained
        const sortedParticipants = participations.sort((a, b) => b.progress.gained - a.progress.gained);

        // ✅ Format leaderboard with metric emoji
        const embedDescription = formatLeaderboardDescription(sortedParticipants, competitionType, metric, channel.guild);

        const embed = buildLeaderboardEmbed(competitionType, embedDescription, competition.id);

        await sendOrUpdateEmbed(channel, competition, embed, db);
        logger.info(`Updated ${competitionType} leaderboard with WOM data.`);
    } catch (err) {
        logger.error(`Error in updateLeaderboard: ${err.message}`);
    }
}

/**
 * Fetch the active competition from the database.
 * @param {string} competitionType - 'SOTW' or 'BOTW'.
 * @param {Object} db - The database utility.
 * @returns {Object|null}
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
 * Formats the leaderboard description with player names, links, progress, and dynamic metric emojis.
 * @param {Array} participants - The competition participants.
 * @param {string} competitionType - 'SOTW' or 'BOTW'.
 * @param {string} metric - The competition metric (e.g., "Mining", "Agility").
 * @param {Guild} guild - The Discord guild object to fetch emojis.
 * @returns {string} - The formatted leaderboard description.
 */
function formatLeaderboardDescription(participants, competitionType, metric, guild) {
    // Normalize the metric name to match emoji names in the guild
    const normalizedMetric = metric.toLowerCase().replace(/\s+/g, '_');

    // Fetch the correct emoji from the guild
    const metricEmoji = guild.emojis.cache.find((e) => e.name.toLowerCase() === normalizedMetric) || '';

    let desc = '';

    participants.slice(0, 10).forEach((p, i) => {
        const playerNameForLink = encodeURIComponent(p.player.displayName);
        const profileLink = `https://wiseoldman.net/players/${playerNameForLink}`;

        desc += `**${i + 1}.** **[${p.player.displayName}](${profileLink})**\n${metricEmoji}\`${p.progress.gained.toLocaleString()}\`\n\n`;
    });

    return desc || 'No participants yet.';
}

/**
 * Build the leaderboard embed with a clickable title linking to Wise Old Man.
 * @param {string} competitionType - 'SOTW' or 'BOTW'.
 * @param {string} description - The leaderboard description.
 * @param {number} competitionId - The ID of the competition.
 * @returns {EmbedBuilder}
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
 * Send a new embed or update the existing one.
 * @param {Channel} channel
 * @param {Object} competition
 * @param {EmbedBuilder} embed
 * @param {Object} db - The database utility.
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
