const db = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
const { EmbedBuilder } = require('discord.js');
const getPlayerLink = require('../../utils/fetchers/getPlayerLink');
const getEmojiWithFallback = require('../../utils/fetchers/getEmojiWithFallback');

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

        // Refactored async leaderboard formatter.
        const formatLeaderboard = async (data, metricEmoji, metricLabel) => {
            if (!data || data.length === 0) return '_No data available_';
            // Process each player asynchronously.
            const formattedPlayers = await Promise.all(
                data.map(async (player, i) => {
                    const profileLink = await getPlayerLink(player.rsn);
                    return `> **${i + 1}.** ${profileLink} — \`${player.total_wins} Wins🏅\`\n> - ${metricEmoji}\`${player.total_gain.toLocaleString()} ${metricLabel}\``;
                }),
            );
            return formattedPlayers.join('\n\n');
        };

        const sotwEmoji = await getEmojiWithFallback('emoji_overall', '📊');
        const botwEmoji = await getEmojiWithFallback('emoji_slayer', '🐲');
        const notifEmoji = await getEmojiWithFallback('emoji_animatedarrowyellow', '-');
        const notifEmojiTwo = await getEmojiWithFallback('emoji_animatedarrowwhite', '-');

        // Await the formatter functions.
        const sotwLeaderboard = await formatLeaderboard(topSOTW, sotwEmoji, 'XP');
        const botwLeaderboard = await formatLeaderboard(topBOTW, botwEmoji, 'KC');

        const profileLinkGain = await getPlayerLink(highestSingleGain.rsn);
        const profileLinkGainer = await getPlayerLink(biggestOverallGainer.rsn);

        const embed = new EmbedBuilder()
            .setTitle('🏆 **All-Time Top 10 Players** 🏆')
            .addFields(
                { name: `__**${sotwEmoji} Skill Of The Week**__`, value: sotwLeaderboard, inline: true },
                { name: '\u200b', value: '\u200b', inline: true },
                { name: `__**${botwEmoji} Boss Of The Week**__`, value: botwLeaderboard, inline: true },
                {
                    name: '\u200b',
                    value: `🏅 **Biggest Overall Gainer**\n${biggestOverallGainer ? `> ${notifEmoji} **${profileLinkGainer}** gained \`${biggestOverallGainer.total_gain.toLocaleString()} ${overallMetricLabel}\` in total.` : '_No data available_'}`,
                    inline: false,
                },
                {
                    name: '\u200b',
                    value: `📈 **Highest Single Competition Gain**\n${
                        highestSingleGain ? `> ${notifEmojiTwo} **${profileLinkGain}** gained \`${highestSingleGain.metric_gain.toLocaleString()} ${overallMetricLabel}\` in a single event!` : '_No data available_'
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
