const db = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
const WOMApiClient = require('../../../api/wise_old_man/apiClient');
const { EmbedBuilder } = require('discord.js');
const { getMetricEmoji } = require('../../utils/fetchers/getCompMetricEmoji');
const getPlayerLink = require('../../utils/fetchers/getPlayerLink');
const { updatePlayerPoints } = require('../../utils/essentials/updatePlayerPoints');
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

            let winnerPoints = 0;

            if (competition.type === 'SOTW') {
                winnerPoints = Math.max(1, Math.ceil(topParticipant.progress.gained / 10000));
            } else if (competition.type === 'BOTW') {
                winnerPoints = Math.max(1, Math.ceil(topParticipant.progress.gained * 5));
            }

            await updatePlayerPoints(playerId, competition.type, winnerPoints);
            logger.info(`🏆 **Winner Recorded:** \`${normalizedRSN}\` (playerId: \`${playerId}\`) with score \`${winnerScore}\` & obtained ${winnerPoints} for competition ID \`${competition.competition_id}\`.`);
        } else {
            logger.info(`🏆 **Already Recorded:** \`${normalizedRSN}\` (playerId: \`${playerId}\`) is already recorded for competition ID \`${competition.competition_id}\`. Skipping insertion.`);
        }
    } catch (error) {
        logger.error(`❌ Error recording winner for competition ID \`${competition.competition_id}\`: ${error.message}`);
    }
};
const updateFinalLeaderboard = async (competition, client) => {
    try {
        const details = await WOMApiClient.request('competitions', 'getCompetitionDetails', competition.competition_id);
        if (!details || !Array.isArray(details.participations) || details.participations.length === 0) {
            logger.info(`ℹ️ No valid participants found for competition ID \`${competition.competition_id}\`.`);
            return;
        }
        const sortedParticipants = details.participations.filter((p) => p.progress.gained > 0).sort((a, b) => b.progress.gained - a.progress.gained);
        const row = await db.guild.getOne('SELECT channel_id FROM ensured_channels WHERE channel_key = ?', ['results_channel']);
        if (!row) {
            logger.info('⚠️ No channel_id is configured in ensured_channels for results_channel.');
            return;
        }
        const channelId = row.channel_id;
        const channel = await client.channels.fetch(channelId);
        if (!channel) {
            logger.warn(`⚠️ Could not find Hall of Fame channel for \`${competition.type}\`.`);
            return;
        }
        const guild = channel.guild;
        let metricEmoji = await getMetricEmoji(guild, competition.metric, competition.type);
        if (!metricEmoji) {
            logger.warn(`⚠️ **Warning:** Metric emoji is undefined for \`${competition.metric}\`.`);
            metricEmoji = competition.type === 'SOTW' ? '📊' : '🐲';
        }
        const leaderboardText =
            sortedParticipants.length > 0
                ? await Promise.all(
                    sortedParticipants.slice(0, 10).map(async (p, i) => {
                        const playerLink = await getPlayerLink(p.player.displayName);
                        return `**${i + 1}.** **${playerLink}**\n>  ${metricEmoji} \`${p.progress.gained.toLocaleString()}\``;
                    }),
                ).then((lines) => lines.join('\n\n'))
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
