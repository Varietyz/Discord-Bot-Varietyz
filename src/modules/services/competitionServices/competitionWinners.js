const db = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
const WOMApiClient = require('../../../api/wise_old_man/apiClient');
const { EmbedBuilder } = require('discord.js');
const { getMetricEmoji } = require('../../utils/fetchers/getCompMetricEmoji');

/**
 * 🎯 **Records the Competition Winner (Includes `player_id`)**
 *
 * Determines the real winner based on in-game performance by retrieving final results from the WOM API.
 * If a valid winner is found, their `player_id` and `rsn` are recorded in the `winners` table,
 * and their cumulative stats in the `users` table are updated.
 *
 * @async
 * @function recordCompetitionWinner
 * @param {Object} competition - The ended competition object containing at least `competition_id` and `type`.
 *
 * @example
 * // 📌 Record the winner for a competition:
 * await recordCompetitionWinner(competition);
 */
const recordCompetitionWinner = async (competition) => {
    try {
        logger.info(`🔍 Fetching final leaderboard for competition ID \`${competition.competition_id}\` (${competition.type})...`);

        const details = await WOMApiClient.request('competitions', 'getCompetitionDetails', competition.competition_id);
        if (!details || !Array.isArray(details.participations) || details.participations.length === 0) {
            logger.info(`ℹ️ No valid participants found for competition ID \`${competition.competition_id}\`.`);
            return;
        }

        const topParticipant = details.participations.sort((a, b) => b.progress.gained - a.progress.gained)[0];
        if (!topParticipant || topParticipant.progress.gained <= 0) {
            logger.info(`ℹ️ No valid winner found for competition ID \`${competition.competition_id}\`.`);
            return;
        }

        const playerId = topParticipant.player.id;
        const winnerRSN = topParticipant.player.displayName;
        const normalizedRSN = winnerRSN.trim().toLowerCase();
        const winnerScore = topParticipant.progress.gained;

        let user = await db.getOne('SELECT player_id, rsn FROM users WHERE player_id = ?', [playerId]);

        if (!user) {
            logger.warn(`⚠️ No user found for playerId: \`${playerId}\` (RSN: \`${normalizedRSN}\`). Creating a new entry.`);
            await db.runQuery(
                `INSERT OR IGNORE INTO users (player_id, rsn, total_wins, total_metric_gain_sotw, total_metric_gain_botw)
                 VALUES (?, ?, 0, 0, 0)`,
                [playerId, normalizedRSN],
            );
            user = await db.getOne('SELECT player_id FROM users WHERE player_id = ?', [playerId]);

            if (!user) {
                logger.error(`❌ Failed to create/retrieve user for playerId: \`${playerId}\` (RSN: \`${normalizedRSN}\`). Skipping winner insertion.`);
                return;
            }
        } else if (user.rsn.toLowerCase() !== normalizedRSN) {
            await db.runQuery('UPDATE users SET rsn = ? WHERE player_id = ?', [normalizedRSN, playerId]);
        }

        const existingWinner = await db.getOne('SELECT * FROM winners WHERE competition_id = ? AND player_id = ?', [competition.competition_id, playerId]);

        if (!existingWinner) {
            await db.runQuery('INSERT INTO winners (competition_id, player_id, rsn, metric_gain, timestamp) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)', [competition.competition_id, playerId, normalizedRSN, winnerScore]);

            await db.runQuery(
                `UPDATE users 
                 SET total_wins = total_wins + 1, 
                     ${competition.type === 'SOTW' ? 'total_metric_gain_sotw' : 'total_metric_gain_botw'} =
                     ${competition.type === 'SOTW' ? 'total_metric_gain_sotw' : 'total_metric_gain_botw'} + ?
                 WHERE player_id = ?`,
                [winnerScore, playerId],
            );

            logger.info(`🏆 **Winner Recorded:** \`${normalizedRSN}\` (playerId: \`${playerId}\`) with score \`${winnerScore}\` for competition ID \`${competition.competition_id}\`.`);
        } else {
            logger.info(`🏆 **Already Recorded:** \`${normalizedRSN}\` (playerId: \`${playerId}\`) is already recorded for competition ID \`${competition.competition_id}\`. Skipping insertion.`);
        }
    } catch (error) {
        logger.error(`❌ Error recording winner for competition ID \`${competition.competition_id}\`: ${error.message}`);
    }
};

/**
 * 🎯 **Updates the Final Competition Leaderboard**
 *
 * Retrieves the final standings for an ended competition from the WOM API, formats the top 10 leaderboard
 * and the "Biggest Gainer" field with clickable player links, and sends an embed to the designated
 * Hall of Fame channel in Discord. The embed title is clickable and links to the competition page on WOM.
 *
 * @async
 * @function updateFinalLeaderboard
 * @param {Object} competition - The ended competition object.
 * @param {Object} client - The Discord client instance.
 *
 * @example
 * // 📌 Update the final leaderboard for a competition:
 * await updateFinalLeaderboard(competition, client);
 */
const updateFinalLeaderboard = async (competition, client) => {
    try {
        const details = await WOMApiClient.request('competitions', 'getCompetitionDetails', competition.competition_id);

        if (!details || !Array.isArray(details.participations) || details.participations.length === 0) {
            logger.info(`ℹ️ No valid participants found for competition ID \`${competition.competition_id}\`.`);
            return;
        }

        const sortedParticipants = details.participations.filter((p) => p.progress.gained > 0).sort((a, b) => b.progress.gained - a.progress.gained);

        const row = await db.guild.getOne('SELECT channel_id FROM comp_channels WHERE comp_key = ?', ['results_channel']);
        if (!row) {
            logger.info('⚠️ No channel_id is configured in comp_channels for results_channel.');
            return;
        }

        const channelId = row.channel_id;
        const channel = await client.channels.fetch(channelId);
        if (!channel) {
            logger.warn(`⚠️ Could not find Hall of Fame channel for \`${competition.type}\`.`);
            return;
        }

        const guild = channel.guild; // Get the guild from the fetched channel
        let metricEmoji = await getMetricEmoji(guild, competition.metric, competition.type);

        if (!metricEmoji) {
            logger.warn(`⚠️ **Warning:** Metric emoji is undefined for \`${competition.metric}\`.`);
            metricEmoji = competition.type === 'SOTW' ? '📊' : '🐲'; // Default fallbacks
        }

        const leaderboardText =
            sortedParticipants.length > 0
                ? sortedParticipants
                    .slice(0, 10)
                    .map((p, i) => {
                        const playerLink = `https://wiseoldman.net/players/${encodeURIComponent(p.player.displayName)}`;
                        return `> **${i + 1}.** **[${p.player.displayName}](${playerLink})**\n>  ${metricEmoji}\`${p.progress.gained.toLocaleString()}\``;
                    })
                    .join('\n\n')
                : '_No participants._';

        const competitionName = competition.title;
        const competitionUrl = `https://wiseoldman.net/competitions/${competition.competition_id}`;

        const embed = new EmbedBuilder()
            .setTitle(`🏆 ${competitionName}`)
            .setURL(competitionUrl)
            .addFields({ name: '🏅 **Top 10 Players**', value: leaderboardText, inline: false })
            .setColor(0xffd700)
            .setFooter({ text: 'Final results' })
            .setTimestamp();

        await channel.send({ embeds: [embed] });
        logger.info(`✅ **Success:** Sent final leaderboard embed to channel ID \`${channelId}\`.`);
    } catch (err) {
        logger.error(`❌ Error updating final leaderboard for competition ID \`${competition.competition_id}\`: ${err.message}`);
    }
};

module.exports = {
    recordCompetitionWinner,
    updateFinalLeaderboard,
};
