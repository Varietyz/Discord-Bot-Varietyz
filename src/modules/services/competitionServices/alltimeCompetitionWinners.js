const db = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
const { EmbedBuilder } = require('discord.js');
const updateAllTimeLeaderboard = async (client) => {
    try {
        const row = await db.guild.getOne('SELECT channel_id FROM ensured_channels WHERE channel_key = ?', ['top_10_channel']);
        if (!row) {
            logger.info('⚠️ No channel_id is configured in ensured_channels for top_10_channel.');
            return;
        }
        const channelId = row.channel_id;
        const channel = await client.channels.fetch(channelId);
        if (!channel) {
            logger.warn(`🚫 **Warning:** Could not find leaderboard channel with ID \`${channelId}\`.`);
            return;
        }
        logger.info('🔄 **Fetching all-time competition data...**');
        const topSOTW = await db.getAll(`
            SELECT player_id, rsn, COALESCE(total_metric_gain_sotw, 0) AS total_gain, COALESCE(total_wins, 0) AS total_wins
            FROM users
            WHERE total_metric_gain_sotw > 0
            ORDER BY total_metric_gain_sotw DESC
            LIMIT 10
        `);
        const topBOTW = await db.getAll(`
            SELECT player_id, rsn, COALESCE(total_metric_gain_botw, 0) AS total_gain, COALESCE(total_wins, 0) AS total_wins
            FROM users
            WHERE total_metric_gain_botw > 0
            ORDER BY total_metric_gain_botw DESC
            LIMIT 10
        `);
        const biggestOverallGainer = await db.getOne(`
    SELECT player_id, rsn, 
           COALESCE(total_metric_gain_sotw, 0) AS sotw_gain, 
           COALESCE(total_metric_gain_botw, 0) AS botw_gain,
           (COALESCE(total_metric_gain_sotw, 0) + COALESCE(total_metric_gain_botw, 0)) AS total_gain
    FROM users
    ORDER BY total_gain DESC
    LIMIT 1
`);
        const highestSingleGain = await db.getOne(`
            SELECT player_id, rsn, metric_gain
            FROM winners
            ORDER BY metric_gain DESC
            LIMIT 1
        `);
        let overallMetricLabel = 'XP/KC';
        if (biggestOverallGainer) {
            if (biggestOverallGainer.sotw_gain > biggestOverallGainer.botw_gain) {
                overallMetricLabel = 'XP';
            } else if (biggestOverallGainer.botw_gain > biggestOverallGainer.sotw_gain) {
                overallMetricLabel = 'KC';
            }
        }
        const formatLeaderboard = (data, metricEmoji, metricLabel) => {
            return data.length > 0
                ? data
                    .map((player, i) => {
                        const playerLink = `https://wiseoldman.net/players/${player.player_id}`;
                        return `> **${i + 1}.** **[${player.rsn}](${playerLink})** — \`${player.total_wins} Wins🏅\`\n>  ${metricEmoji}\`${player.total_gain.toLocaleString()} ${metricLabel}\``;
                    })
                    .join('\n\n')
                : '_No data available_';
        };
        const sotwEmojiRow = await db.guild.getOne('SELECT emoji_format FROM guild_emojis WHERE emoji_key = ?', ['emoji_overall']);
        const botwEmojiRow = await db.guild.getOne('SELECT emoji_format FROM guild_emojis WHERE emoji_key = ?', ['emoji_slayer']);
        const sotwEmoji = sotwEmojiRow ? sotwEmojiRow.emoji_format : '';
        const botwEmoji = botwEmojiRow ? botwEmojiRow.emoji_format : '';
        const sotwLeaderboard = formatLeaderboard(topSOTW, sotwEmoji, 'XP');
        const botwLeaderboard = formatLeaderboard(topBOTW, botwEmoji, 'KC');
        const embed = new EmbedBuilder()
            .setTitle('🏆 **All-Time Top 10 Players** 🏆')
            .addFields(
                { name: `__**${sotwEmoji} Skill Of The Week**__`, value: sotwLeaderboard, inline: true },
                { name: '\u200b', value: '\u200b', inline: true },
                { name: `__**${botwEmoji} Boss Of The Week**__`, value: botwLeaderboard, inline: true },
                {
                    name: '\u200b',
                    value: `🏅 **Biggest Overall Gainer**\n${
                        biggestOverallGainer
                            ? `**[${biggestOverallGainer.rsn}](https://wiseoldman.net/players/${biggestOverallGainer.player_id})** gained \`${biggestOverallGainer.total_gain.toLocaleString()} ${overallMetricLabel}\` in total.`
                            : '_No data available_'
                    }`,
                    inline: false,
                },
                {
                    name: '\u200b',
                    value: `📈 **Highest Single Competition Gain**\n${
                        highestSingleGain
                            ? `**[${highestSingleGain.rsn}](https://wiseoldman.net/players/${highestSingleGain.player_id})** gained \`${highestSingleGain.metric_gain.toLocaleString()} ${overallMetricLabel}\` in a single event!`
                            : '_No data available_'
                    }`,
                    inline: false,
                },
            )
            .setColor(0xffd700)
            .setFooter({ text: 'Updated after each competition' })
            .setTimestamp();
        const pinnedMessages = await channel.messages.fetchPinned();
        const existingMessage = pinnedMessages.find((msg) => msg.author.id === client.user.id);
        if (existingMessage) {
            await existingMessage.edit({ embeds: [embed] });
            logger.info(`✅ **Success:** Updated pinned all-time leaderboard in channel \`${channelId}\`.`);
        } else {
            const newMessage = await channel.send({ embeds: [embed] });
            await newMessage.pin();
            logger.info(`✅ **Success:** Created and pinned new all-time leaderboard in channel \`${channelId}\`.`);
        }
    } catch (err) {
        logger.error(`❌ Error updating all-time leaderboard: ${err.message}`);
    }
};
module.exports = {
    updateAllTimeLeaderboard,
};
