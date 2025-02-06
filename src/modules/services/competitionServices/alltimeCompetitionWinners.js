// @ts-nocheck
const db = require('../../utils/dbUtils');
const logger = require('../../utils/logger');
const { EmbedBuilder } = require('discord.js');
const { TOP_TEN_CHANNEL_ID } = require('../../../config/constants');

/**
 * 🎯 **Updates the All-Time Leaderboard (Now Uses `player_id`)**
 *
 * Retrieves all-time competition data from the database, formats it with clickable player links,
 * and sends or updates a pinned embed in the designated leaderboard channel.
 *
 * ---
 *
 * 🔹 **How It Works:**
 * - Fetches top 10 players for SOTW and BOTW from the database.
 * - Retrieves the biggest overall gainer and highest single competition gain.
 * - Formats each leaderboard entry as a clickable link to the player's profile.
 * - Sends or updates a pinned embed in the designated channel.
 *
 * ---
 *
 * @async
 * @function updateAllTimeLeaderboard
 * @param {Discord.Client} client - The Discord client instance.
 * @returns {Promise<void>} Resolves when the all-time leaderboard is updated.
 *
 * @example
 * // 📌 Update the all-time leaderboard:
 * await updateAllTimeLeaderboard(client);
 */
const updateAllTimeLeaderboard = async (client) => {
    try {
        const channelId = TOP_TEN_CHANNEL_ID;
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
            SELECT player_id, rsn, (COALESCE(total_metric_gain_sotw, 0) + COALESCE(total_metric_gain_botw, 0)) AS total_gain
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

        /**
         * 🎯 **Formats Leaderboard Entries with Clickable Player Links**
         *
         * @param {Array<Object>} data - Array of player data objects.
         * @param {string} metricEmoji - Emoji representing the metric.
         * @returns {string} A formatted string for the leaderboard.
         */
        const formatLeaderboard = (data, metricEmoji) => {
            return data.length > 0
                ? data
                    .map((player, i) => {
                        const playerLink = `https://wiseoldman.net/players/${player.player_id}`;
                        return `**${i + 1}.** ${metricEmoji} **[${player.rsn}](${playerLink})** — \`${player.total_gain.toLocaleString()}\` XP/KC 🏅 \`${player.total_wins} Wins\``;
                    })
                    .join('\n')
                : '_No data available_';
        };

        const sotwEmoji = '<:Total_Level:1127669463613976636>';
        const botwEmoji = '<:Slayer:1127658069984288919>';

        const sotwLeaderboard = formatLeaderboard(topSOTW, sotwEmoji);
        const botwLeaderboard = formatLeaderboard(topBOTW, botwEmoji);

        const embed = new EmbedBuilder()
            .setTitle('🏆 **All-Time Top 10 SOTW & BOTW Players** 🏆')
            .addFields(
                { name: `${sotwEmoji} **Top 10 SOTW (XP Gained)**`, value: sotwLeaderboard, inline: false },
                { name: `${botwEmoji} **Top 10 BOTW (Boss Kills)**`, value: botwLeaderboard, inline: false },
                {
                    name: '🏅 **Biggest Overall Gainer**',
                    value: biggestOverallGainer
                        ? `**[${biggestOverallGainer.rsn}](https://wiseoldman.net/players/${biggestOverallGainer.player_id})** gained \`${biggestOverallGainer.total_gain.toLocaleString()}\` total XP/KC!`
                        : '_No data available_',
                    inline: false,
                },
                {
                    name: '📈 **Highest Single Competition Gain**',
                    value: highestSingleGain ? `**[${highestSingleGain.rsn}](https://wiseoldman.net/players/${highestSingleGain.player_id})** gained \`${highestSingleGain.metric_gain.toLocaleString()}\` in a single event!` : '_No data available_',
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
