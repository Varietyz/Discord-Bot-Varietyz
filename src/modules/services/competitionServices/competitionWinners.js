const db = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
const WOMApiClient = require('../../../api/wise_old_man/apiClient');
const leaderboardCache = require('../../utils/essentials/leaderboardCache'); 
const { EmbedBuilder } = require('discord.js');
const { getMetricEmoji } = require('../../utils/fetchers/getCompMetricEmoji');
const getPlayerLink = require('../../utils/fetchers/getPlayerLink');
const {
    updatePlayerPoints,
} = require('../../utils/essentials/updatePlayerPoints');

const fetchCachedLeaderboard = async (competitionId) => {
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
};

const recordCompetitionWinner = async (competition) => {
    try {
        logger.info(
            `🔍 Fetching final leaderboard for competition ID \`${competition.competition_id}\` (${competition.type})...`
        );
        const details = await fetchCachedLeaderboard(competition.competition_id);

        if (
            !details ||
      !Array.isArray(details.participations) ||
      details.participations.length === 0
        ) {
            logger.info(
                `ℹ️ No valid participants found for competition ID \`${competition.competition_id}\`.`
            );
            return;
        }

        const topParticipant = details.participations.sort(
            (a, b) => b.progress.gained - a.progress.gained
        )[0];
        if (!topParticipant || topParticipant.progress.gained <= 0) {
            logger.info(
                `ℹ️ No valid winner found for competition ID \`${competition.competition_id}\`.`
            );
            return;
        }

        const playerId = topParticipant.player.id;
        const winnerRSN = topParticipant.player.displayName;
        const normalizedRSN = winnerRSN.trim().toLowerCase();
        const winnerScore = topParticipant.progress.gained;

        let user = await db.getOne(
            'SELECT player_id, rsn FROM users WHERE player_id = ?',
            [playerId]
        );
        if (!user) {
            logger.warn(
                `⚠️ No user found for playerId: \`${playerId}\`. Creating a new entry.`
            );
            await db.runQuery(
                `INSERT OR IGNORE INTO users (player_id, rsn, total_wins, total_metric_gain_sotw, total_metric_gain_botw)
         VALUES (?, ?, 0, 0, 0)`,
                [playerId, normalizedRSN]
            );
            user = await db.getOne(
                'SELECT player_id FROM users WHERE player_id = ?',
                [playerId]
            );
            if (!user) {
                logger.error(
                    `❌ Failed to create user for playerId: \`${playerId}\`. Skipping.`
                );
                return;
            }
        } else if (user.rsn.toLowerCase() !== normalizedRSN) {
            await db.runQuery('UPDATE users SET rsn = ? WHERE player_id = ?', [
                normalizedRSN,
                playerId,
            ]);
        }

        const existingWinner = await db.getOne(
            'SELECT * FROM winners WHERE competition_id = ? AND player_id = ?',
            [competition.competition_id, playerId]
        );

        if (!existingWinner) {
            await db.runQuery(
                'INSERT INTO winners (competition_id, player_id, rsn, metric_gain, timestamp) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
                [competition.competition_id, playerId, normalizedRSN, winnerScore]
            );

            await db.runQuery(
                `UPDATE users 
         SET total_wins = total_wins + 1,
             ${competition.type === 'SOTW' ? 'total_metric_gain_sotw' : 'total_metric_gain_botw'} =
             ${competition.type === 'SOTW' ? 'total_metric_gain_sotw' : 'total_metric_gain_botw'} + ?
         WHERE player_id = ?`,
                [winnerScore, playerId]
            );

            const winnerPoints =
        competition.type === 'SOTW'
            ? Math.max(1, Math.ceil(winnerScore / 10000))
            : Math.max(1, Math.ceil(winnerScore * 5));

            await updatePlayerPoints(playerId, competition.type, winnerPoints);
            logger.info(
                `🏆 Winner recorded: \`${normalizedRSN}\` (Score: \`${winnerScore}\`, Points: \`${winnerPoints}\`).`
            );
        } else {
            logger.info(
                `🏆 Already recorded: \`${normalizedRSN}\` for competition ID \`${competition.competition_id}\`.`
            );
        }
    } catch (error) {
        logger.error(
            `❌ Error recording winner for competition ID \`${competition.competition_id}\`: ${error.message}`
        );
    }
};

const updateFinalLeaderboard = async (competition, client) => {
    try {
        const details = await fetchCachedLeaderboard(competition.competition_id);

        if (
            !details ||
      !Array.isArray(details.participations) ||
      details.participations.length === 0
        ) {
            logger.info(
                `ℹ️ No valid participants found for competition ID \`${competition.competition_id}\`.`
            );
            return;
        }

        const sortedParticipants = details.participations
            .filter((p) => p.progress.gained > 0)
            .sort((a, b) => b.progress.gained - a.progress.gained);

        const row = await db.guild.getOne(
            'SELECT channel_id FROM ensured_channels WHERE channel_key = ?',
            ['results_channel']
        );
        if (!row) {
            logger.info('⚠️ No channel_id configured for results_channel.');
            return;
        }

        const channel = await client.channels.fetch(row.channel_id);
        if (!channel) {
            logger.warn(`⚠️ Could not find results channel (ID: ${row.channel_id})`);
            return;
        }

        const guild = channel.guild;
        let metricEmoji = await getMetricEmoji(
            guild,
            competition.metric,
            competition.type
        );
        if (!metricEmoji) {
            logger.warn(`⚠️ Metric emoji undefined for \`${competition.metric}\``);
            metricEmoji = competition.type === 'SOTW' ? '📊' : '🐲';
        }

        const leaderboardText = sortedParticipants.length
            ? (
                await Promise.all(
                    sortedParticipants.slice(0, 10).map(async (p, i) => {
                        const playerLink = await getPlayerLink(p.player.displayName);
                        return `**${i + 1}.** **${playerLink}**\n>  ${metricEmoji} \`${p.progress.gained.toLocaleString()}\``;
                    })
                )
            ).join('\n\n')
            : '_No participants._';

        const embed = new EmbedBuilder()
            .setTitle(`🏆 ${competition.title}`)
            .setURL(
                `https://wiseoldman.net/competitions/${competition.competition_id}`
            )
            .addFields({ name: '🏅 **Top 10 Players**', value: leaderboardText })
            .setColor(0xffd700)
            .setFooter({ text: 'Final results' })
            .setTimestamp();

        await channel.send({ embeds: [embed] });
        logger.info(
            `✅ Final leaderboard sent to channel ID \`${row.channel_id}\`.`
        );
    } catch (err) {
        logger.error(
            `❌ Error updating leaderboard for competition ID \`${competition.competition_id}\`: ${err.message}`
        );
    }
};

module.exports = {
    recordCompetitionWinner,
    updateFinalLeaderboard,
};
