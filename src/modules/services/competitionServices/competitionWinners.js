const db = require('../../utils/dbUtils');
const logger = require('../../utils/logger');
const WOMApiClient = require('../../../api/wise_old_man/apiClient');
const { EmbedBuilder } = require('discord.js');
const constants = require('../../../config/constants');

/**
 * 🎯 **Records the Competition Winner**
 *
 * Determines the real winner of a competition based on in-game performance (not votes)
 * by retrieving competition details from the WOM API. If a valid winner is found,
 * the function records the winner in the `winners` table and updates the cumulative stats
 * for the user in the `users` table. Each win increments `total_wins` and adds the metric gain
 * to the respective total for either SOTW or BOTW.
 *
 * @async
 * @function recordCompetitionWinner
 * @param {Object} competition - The ended competition object containing at least `id` and `type`.
 *
 * @example
 * // Record the winner for an ended competition:
 * await recordCompetitionWinner({ id: 123, type: 'SOTW', title: 'Weekly Skill Competition' });
 */
const recordCompetitionWinner = async (competition) => {
    try {
        logger.info(`Fetching final leaderboard for competition ID ${competition.id} (${competition.type})...`);
        const details = await WOMApiClient.request('competitions', 'getCompetitionDetails', competition.id);
        if (!details || !Array.isArray(details.participations) || details.participations.length === 0) {
            logger.info(`No valid participants found for competition ID ${competition.id}.`);
            return;
        }
        const topParticipant = details.participations.sort((a, b) => b.progress.gained - a.progress.gained)[0];
        if (!topParticipant || topParticipant.progress.gained <= 0) {
            logger.info(`No valid winner found for competition ID ${competition.id}.`);
            return;
        }
        const winnerRSN = topParticipant.player.displayName;
        const normalizedRSN = winnerRSN.trim().toLowerCase();
        const winnerScore = topParticipant.progress.gained;

        // Look up user by username (directly, since username is primary)
        let user = await db.getOne('SELECT username FROM users WHERE LOWER(username) = ?', [normalizedRSN]);
        if (!user) {
            logger.warn(`No user found for RSN: ${normalizedRSN}. Creating a new entry in users.`);
            await db.runQuery(
                `INSERT OR IGNORE INTO users (username, total_wins, total_metric_gain_sotw, total_metric_gain_botw)
                 VALUES (?, 0, 0, 0)`,
                [normalizedRSN],
            );
            user = await db.getOne('SELECT username FROM users WHERE LOWER(username) = ?', [normalizedRSN]);
            if (!user) {
                logger.error(`🚨 Failed to create/retrieve user for RSN: ${normalizedRSN}. Skipping winner insertion.`);
                return;
            }
        }

        // Check if this competition already recorded a winner for this username
        const existingWinner = await db.getOne('SELECT * FROM winners WHERE competition_id = ? AND LOWER(username) = ?', [competition.id, normalizedRSN]);
        if (!existingWinner) {
            // Insert the winner record for the current competition
            await db.runQuery('INSERT INTO winners (competition_id, username, metric_gain) VALUES (?, ?, ?)', [competition.id, normalizedRSN, winnerScore]);

            // Update cumulative stats: Always increment total_wins by 1 and add the metric gain.
            await db.runQuery(
                `UPDATE users 
                 SET total_wins = total_wins + 1, 
                     ${competition.type === 'SOTW' ? 'total_metric_gain_sotw' : 'total_metric_gain_botw'} =
                     ${competition.type === 'SOTW' ? 'total_metric_gain_sotw' : 'total_metric_gain_botw'} + ?
                 WHERE LOWER(username) = ?`,
                [winnerScore, normalizedRSN],
            );
            logger.info(`🏆 Recorded winner ${normalizedRSN} with score ${winnerScore} for competition ID ${competition.id}.`);
        } else {
            logger.info(`🏆 Winner ${normalizedRSN} already recorded for competition ID ${competition.id}. Skipping.`);
        }
    } catch (error) {
        logger.error(`Error recording winner for competition ${competition.id}: ${error.message}`);
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
 * // Update the final leaderboard for a competition:
 * await updateFinalLeaderboard(competition, client);
 */
const updateFinalLeaderboard = async (competition, client) => {
    try {
        // Retrieve competition details from the WOM API.
        const details = await WOMApiClient.request('competitions', 'getCompetitionDetails', competition.id);

        if (!details || !Array.isArray(details.participations) || details.participations.length === 0) {
            logger.info(`No valid participants found for competition ID ${competition.id}.`);
            return;
        }

        // Filter participants with a positive gain and sort them descending by progress gained.
        const sortedParticipants = details.participations.filter((p) => p.progress.gained > 0).sort((a, b) => b.progress.gained - a.progress.gained);

        // Biggest Gainer: The participant with the highest progress.
        const biggestGainer = sortedParticipants.length > 0 ? sortedParticipants[0] : null;
        // Fetch the designated Hall of Fame channel.
        const channelId = constants.HALL_OF_FAME_CHANNEL_ID;
        const channel = await client.channels.fetch(channelId);
        if (!channel) {
            logger.warn(`Could not find Hall of Fame channel for ${competition.type}.`);
            return;
        }

        // Build the top 10 leaderboard text with clickable player links.
        const leaderboardText =
            sortedParticipants.length > 0
                ? sortedParticipants
                    .slice(0, 10)
                    .map((p, i) => {
                        const playerLink = `https://wiseoldman.net/players/${encodeURIComponent(p.player.displayName)}`;
                        return `**${i + 1}.** **[${p.player.displayName}](${playerLink})** — \`${p.progress.gained.toLocaleString()}\``;
                    })
                    .join('\n')
                : '_No participants._';

        // Format the Biggest Gainer field with a clickable player link.
        const biggestGainerField = biggestGainer
            ? `**[${biggestGainer.player.displayName}](https://wiseoldman.net/players/${encodeURIComponent(biggestGainer.player.displayName)})** gained \`${biggestGainer.progress.gained.toLocaleString()}\``
            : '_No significant gains._';

        // Prepare the competition title and URL for a clickable embed title.
        const competitionName = competition.title;
        const competitionUrl = `https://wiseoldman.net/competitions/${competition.id}`;

        // Build the embed with the updated visual styling.
        const embed = new EmbedBuilder()
            .setTitle(`🏆 ${competitionName} - Final Results`)
            .setURL(competitionUrl) // Makes the title clickable.
            .addFields({ name: '🏅 **Top 10 Players**', value: leaderboardText, inline: false }, { name: '🚀 **Biggest Gainer**', value: biggestGainerField, inline: true })
            .setColor(0xffd700) // Gold color for final results.
            .setFooter({ text: 'Final results based on WOM data' })
            .setTimestamp();

        // Send the updated embed.
        await channel.send({ embeds: [embed] });
        logger.info(`✅ Sent new final leaderboard message in ${channelId}`);
    } catch (err) {
        logger.error(`❌ Error updating final leaderboard: ${err.message}`);
    }
};

module.exports = {
    recordCompetitionWinner,
    updateFinalLeaderboard,
};
