const { EmbedBuilder } = require('discord.js');
const logger = require('../../utils/essentials/logger');
const WOMApiClient = require('../../../api/wise_old_man/apiClient');
const leaderboardCache = require('../../utils/essentials/leaderboardCache');
const db = require('../../utils/essentials/dbUtils');
const { getMetricEmoji } = require('../../utils/fetchers/getCompMetricEmoji');
const getPlayerLink = require('../../utils/fetchers/getPlayerLink');

async function fetchCachedLeaderboard(competitionId) {
    const cached = leaderboardCache.get(competitionId);
    if (cached) {
        logger.debug(`🧊 Cache hit for competition ID \`${competitionId}\`.`);
        return cached;
    }

    const fresh = await WOMApiClient.request(
        'competitions',
        'getCompetitionDetails',
        competitionId
    );
    if (fresh) {
        leaderboardCache.set(competitionId, fresh);
        logger.debug(
            `📥 Cached new leaderboard for competition ID \`${competitionId}\`.`
        );
    }

    return fresh;
}

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

        const row = await db.guild.getOne(
            'SELECT channel_id FROM ensured_channels WHERE channel_key = ?',
            [channelKey]
        );
        if (!row) {
            logger.info(
                `⚠️ No channel_id is configured in ensured_channels for ${channelKey}.`
            );
            return;
        }

        const channelId = row.channel_id;
        const channel = await client.channels.fetch(channelId);
        if (!channel) {
            logger.error(
                `🚫 **Error:** No channel found for type \`${competitionType}\`. Please verify the configuration.`
            );
            return;
        }

        const competition = await getActiveCompetition(competitionType, db);
        if (!competition) {
            logger.warn(
                `⚠️ **Warning:** No active competition found for \`${competitionType}\`. Skipping leaderboard update.`
            );
            return;
        }

        const competitionDetails = await fetchCachedLeaderboard(
            competition.competition_id
        );
        if (!competitionDetails) {
            logger.error(
                `🚫 **Error:** Failed to fetch competition details for ID \`${competition.competition_id}\`.`
            );
            return;
        }

        const { metric, participations } = competitionDetails;
        if (!metric || !participations) {
            logger.warn(
                `⚠️ **Warning:** Competition ID \`${competition.competition_id}\` is missing metric or participant data.`
            );
            return;
        }

        const sortedParticipants = participations.sort(
            (a, b) => b.progress.gained - a.progress.gained
        );
        const embedFields = await formatLeaderboardFields(
            sortedParticipants,
            competitionType,
            metric,
            channel.guild
        );
        const embed = await buildLeaderboardEmbed(
            competitionType,
            embedFields,
            competition.competition_id
        );
        await sendOrUpdateEmbed(channel, competition, embed, db);

        logger.info(
            `✅ **Success:** Updated \`${competitionType}\` leaderboard with WOM data.`
        );
    } catch (err) {
        logger.error(`🚫 **Error in updateLeaderboard:** ${err.message}`);
    }
}

async function getActiveCompetition(competitionType, db) {
    return await db.getOne(
        `
    SELECT *
    FROM competitions
    WHERE type = ?
      AND starts_at <= ?
      AND ends_at >= ?
    `,
        [competitionType, new Date().toISOString(), new Date().toISOString()]
    );
}

async function formatLeaderboardFields(
    participants,
    competitionType,
    metric,
    guild
) {
    try {
        let metricEmoji = await getMetricEmoji(guild, metric, competitionType);
        if (!metricEmoji) {
            logger.warn(
                `⚠️ **Warning:** Metric emoji is undefined for \`${metric}\`.`
            );
            metricEmoji = competitionType === 'SOTW' ? '📊' : '🐲';
        }

        if (!participants || participants.length === 0) {
            return [
                {
                    name: 'No Participants Yet',
                    value: '_No players have participated._',
                    inline: false,
                },
            ];
        }

        let field1 = '',
            field2 = '',
            field3 = '',
            field4 = '';

        for (let i = 0; i < Math.min(20, participants.length); i++) {
            const p = participants[i];
            const profileLink = await getPlayerLink(p.player.displayName);
            const line = `**${i + 1}.** ${profileLink}\n> - \`${p.progress.gained.toLocaleString()}\` ${metricEmoji}`;
            if (i < 5) field1 += line + '\n\n';
            else if (i < 10) field2 += line + '\n\n';
            else if (i < 15) field3 += line + '\n\n';
            else field4 += line + '\n\n';
        }

        return [
            {
                name: '🏆 **Current Top 10**',
                value: field1 || '_No players in this range._',
                inline: true,
            },
            { name: '\u200b', value: '\u200b', inline: true },
            {
                name: '\u200b',
                value: field3 || '_No players in this range._',
                inline: true,
            },
            {
                name: '\u200b',
                value: field2 || '_No players in this range._',
                inline: true,
            },
            { name: '\u200b', value: '\u200b', inline: true },
            {
                name: '\u200b',
                value: field4 || '_No players in this range._',
                inline: true,
            },
        ];
    } catch (error) {
        logger.error(`🚫 **Error in formatLeaderboardFields:** ${error.message}`);
        return [
            {
                name: '⚠️ Error',
                value: '_Error generating leaderboard._',
                inline: false,
            },
        ];
    }
}

async function buildLeaderboardEmbed(competitionType, fields, competitionId) {
    let emojiFormat;
    if (competitionType === 'SOTW') {
        const overallEmojis = await db.guild.getAll(
            'SELECT emoji_format FROM guild_emojis WHERE emoji_key = ?',
            ['emoji_overall']
        );
        emojiFormat = overallEmojis.length > 0 ? overallEmojis[0].emoji_format : '';
    } else {
        const slayerEmojis = await db.guild.getAll(
            'SELECT emoji_format FROM guild_emojis WHERE emoji_key = ?',
            ['emoji_slayer']
        );
        emojiFormat = slayerEmojis.length > 0 ? slayerEmojis[0].emoji_format : '';
    }

    return new EmbedBuilder()
        .setTitle(`${emojiFormat} ${competitionType} Leaderboard`)
        .setURL(`https://wiseoldman.net/competitions/${competitionId}/top-5`)
        .setColor(competitionType === 'SOTW' ? 0x3498db : 0xe74c3c)
        .addFields(fields)
        .setFooter({ text: '🕓 Last Updated' })
        .setTimestamp();
}

async function sendOrUpdateEmbed(channel, competition, embed, db) {
    try {
        if (competition.leaderboard_message_id) {
            const msg = await channel.messages.fetch(
                competition.leaderboard_message_id
            );
            await msg.edit({ embeds: [embed] });
        } else {
            const newMsg = await channel.send({ embeds: [embed] });
            await db.runQuery(
                'UPDATE competitions SET leaderboard_message_id = ? WHERE competition_id = ?',
                [newMsg.id, competition.competition_id]
            );
        }
    } catch (err) {
        logger.error(
            `🚫 Failed to update or resend leaderboard embed: ${err.message}`
        );
    }
}

module.exports = {
    updateLeaderboard,
    buildLeaderboardEmbed,
};
