const { EmbedBuilder } = require('discord.js');
const logger = require('../../utils/essentials/logger');
const WOMApiClient = require('../../../api/wise_old_man/apiClient');
const db = require('../../utils/essentials/dbUtils');
const { getMetricEmoji } = require('../../utils/fetchers/getCompMetricEmoji');
/**
 *
 * @param competitionType
 * @param db
 * @param client
 */
async function updateLeaderboard(competitionType, db, client) {
    try {
        let channelKey;
        if (competitionType === 'SOTW') {
            channelKey = 'sotw_channel';
        } else if (competitionType === 'BOTW') {
            channelKey = 'botw_channel';
        } else {
            logger.info(`⚠️ Unknown competition type: ${competitionType}.`);
            return;
        }
        const row = await db.guild.getOne('SELECT channel_id FROM ensured_channels WHERE channel_key = ?', [channelKey]);
        if (!row) {
            logger.info(`⚠️ No channel_id is configured in ensured_channels for ${channelKey}.`);
            return;
        }
        const channelId = row.channel_id;
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
 *
 * @param competitionType
 * @param db
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
 *
 * @param participants
 * @param competitionType
 * @param metric
 * @param guild
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
 *
 * @param competitionType
 * @param description
 * @param competitionId
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
 *
 * @param channel
 * @param competition
 * @param embed
 * @param db
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
