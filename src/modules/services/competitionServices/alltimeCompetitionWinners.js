// @ts-nocheck
const db = require('../../utils/dbUtils');
const logger = require('../../utils/logger');
const { EmbedBuilder } = require('discord.js');

/**
 * @fileoverview
 * **All-Time Leaderboard Updater** 🏆
 *
 * This module exports a function that updates the all-time leaderboard for SOTW & BOTW competitions.
 * It fetches top players and gain data from the database, formats the leaderboard with clickable
 * player links, and then either updates an existing pinned message or creates a new pinned message
 * in the designated leaderboard channel.
 *
 * The leaderboard displays:
 * - Top 10 SOTW (XP Gained)
 * - Top 10 BOTW (Boss Kills)
 * - The Biggest Overall Gainer (combined XP/KC)
 * - The Highest Single Competition Gain
 *
 * @module competitionService/updateAllTimeLeaderboard
 */

/**
 * 🎯 **Updates the All-Time Leaderboard**
 *
 * Fetches all-time competition data from the database, formats it with clickable player links,
 * and sends or updates a pinned embed in the designated leaderboard channel.
 *
 * @async
 * @function updateAllTimeLeaderboard
 * @param {Discord.Client} client - The Discord client instance.
 * @returns {Promise<void>} Resolves when the leaderboard has been successfully updated.
 *
 * @example
 * // Update the all-time leaderboard:
 * await updateAllTimeLeaderboard(client);
 */
const updateAllTimeLeaderboard = async (client) => {
    try {
        const channelId = '1282383006291591188'; // 🔥 Top Scores Channel
        const channel = await client.channels.fetch(channelId);

        if (!channel) {
            logger.warn(`❌ Could not find leaderboard channel: ${channelId}`);
            return;
        }

        logger.info('🔄 Fetching all-time competition data...');

        // Fetch competition leaderboards for SOTW and BOTW
        const topSOTW = await db.getAll(`
            SELECT username, COALESCE(total_metric_gain_sotw, 0) AS total_gain, COALESCE(total_wins, 0) AS total_wins
            FROM users
            WHERE total_metric_gain_sotw > 0
            ORDER BY total_metric_gain_sotw DESC
            LIMIT 10
        `);

        const topBOTW = await db.getAll(`
            SELECT username, COALESCE(total_metric_gain_botw, 0) AS total_gain, COALESCE(total_wins, 0) AS total_wins
            FROM users
            WHERE total_metric_gain_botw > 0
            ORDER BY total_metric_gain_botw DESC
            LIMIT 10
        `);

        // Biggest Overall Gainer (combined gain from SOTW and BOTW)
        const biggestOverallGainer = await db.getOne(`
            SELECT username, (COALESCE(total_metric_gain_sotw, 0) + COALESCE(total_metric_gain_botw, 0)) AS total_gain
            FROM users
            ORDER BY total_gain DESC
            LIMIT 1
        `);

        // Highest Single Competition Gain
        const highestSingleGain = await db.getOne(`
            SELECT username, metric_gain
            FROM winners
            ORDER BY metric_gain DESC
            LIMIT 1
        `);

        /**
         * Formats leaderboard entries with clickable player links.
         *
         * @param {Array<Object>} data - Array of player data objects.
         * @param {string} metricEmoji - Emoji representing the metric.
         * @returns {string} A formatted string for the leaderboard.
         */
        const formatLeaderboard = (data, metricEmoji) => {
            return data.length > 0
                ? data
                    .map((player, i) => {
                        const playerLink = `https://wiseoldman.net/players/${encodeURIComponent(player.username)}`;
                        return `**${i + 1}.** ${metricEmoji} **[${player.username}](${playerLink})** — \`${player.total_gain.toLocaleString()}\` XP/KC 🏅 \`${player.total_wins} Wins\``;
                    })
                    .join('\n')
                : '_No data available_';
        };

        // Emojis for each competition type.
        const sotwEmoji = '<:Total_Level:1127669463613976636>';
        const botwEmoji = '<:Slayer:1127658069984288919>';

        const sotwLeaderboard = formatLeaderboard(topSOTW, sotwEmoji);
        const botwLeaderboard = formatLeaderboard(topBOTW, botwEmoji);

        // Build the embed with leaderboard information.
        const embed = new EmbedBuilder()
            .setTitle('🏆 **All-Time Top 10 SOTW & BOTW Players** 🏆')
            .addFields(
                { name: `${sotwEmoji} **Top 10 SOTW (XP Gained)**`, value: sotwLeaderboard, inline: false },
                { name: `${botwEmoji} **Top 10 BOTW (Boss Kills)**`, value: botwLeaderboard, inline: false },
                { name: '🏅 **Biggest Overall Gainer**', value: biggestOverallGainer ? `**${biggestOverallGainer.username}** gained \`${biggestOverallGainer.total_gain.toLocaleString()}\` total XP/KC!` : '_No data available_', inline: false },
                { name: '📈 **Highest Single Competition Gain**', value: highestSingleGain ? `**${highestSingleGain.username}** gained \`${highestSingleGain.metric_gain.toLocaleString()}\` in a single event!` : '_No data available_', inline: false },
            )
            .setColor(0xffd700)
            .setFooter({ text: 'Updated after each competition' })
            .setTimestamp();

        // Attempt to fetch pinned messages and update the existing one if found.
        const pinnedMessages = await channel.messages.fetchPinned();
        const existingMessage = pinnedMessages.find((msg) => msg.author.id === client.user.id);
        if (existingMessage) {
            await existingMessage.edit({ embeds: [embed] });
            logger.info(`✅ Updated pinned all-time leaderboard in ${channelId}`);
        } else {
            const newMessage = await channel.send({ embeds: [embed] });
            await newMessage.pin();
            logger.info(`✅ Created new pinned all-time leaderboard in ${channelId}`);
        }
    } catch (err) {
        logger.error(`❌ Error updating all-time leaderboard: ${err.message}`);
    }
};

module.exports = {
    updateAllTimeLeaderboard,
};
