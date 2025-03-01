const { EmbedBuilder } = require('discord.js');
const { getTopTeams, getTopPlayers, getPlayerTaskProgress, getTeamTaskProgress } = require('./bingoEmbedData');
const getEmojiWithFallback = require('../../utils/fetchers/getEmojiWithFallback');
const dbUtils = require('../../utils/essentials/dbUtils');
const getPlayerRank = require('../../utils/fetchers/getPlayerRank');
const logger = require('../../utils/essentials/logger');
const { computeOverallPercentage, computeIndividualPartialPoints, computeTeamPartialPoints } = require('./bingoCalculations');

/**
 *
 * @param root0
 * @param root0.rsn
 * @param root0.taskName
 * @param root0.points
 * @param root0.lastUpdated
 */
async function createProgressEmbed({ rsn, taskName, points, lastUpdated }) {
    const taskEmoji = await getEmojiWithFallback('emoji_completed', '✅');
    // Attempt to parse the timestamp
    let timestamp = new Date(lastUpdated);
    // If the parsed timestamp is invalid, log a warning and use the current time
    if (isNaN(timestamp.getTime())) {
        logger.warn(`[BingoEmbedHelper] Invalid lastUpdated value: ${lastUpdated}. Using current time instead.`);
        timestamp = new Date();
    }
    return new EmbedBuilder()
        .setTitle(`${taskEmoji} Task Completed!`)
        .setColor(0x48de6f)
        .setTimestamp(timestamp)
        .setDescription(`**${rsn}** has just completed a task!`)
        .addFields({ name: '📝 Task', value: `\`\`\`fix\n${taskName}\n\`\`\``, inline: true }, { name: '⭐ Points', value: `\`\`\`\n${points ?? 'N/A'}\n\`\`\``, inline: true });
}

/**
 *
 * @param root0
 * @param root0.eventId
 * @param root0.topPlayers
 * @param root0.topTeams
 */
async function createFinalResultsEmbed({ eventId, topPlayers, topTeams }) {
    const embed = new EmbedBuilder().setTitle(`🏁 **Final Results: Bingo #${eventId}**`).setColor(0xffc107).setTimestamp();

    if (topPlayers.length > 0) {
        const playersDesc = topPlayers.map((p, i) => `**${i + 1}.** \`${p.rsn}\`: **${p.total_points} pts** (Tasks: \`${p.completed_tasks}\`, Bonus: \`${p.pattern_bonus}\`)`).join('\n');
        embed.addFields({ name: '👤 Top Players', value: `**Top ${topPlayers.length} Players**:\n${playersDesc}` });
    }

    if (topTeams.length > 0) {
        const teamsDesc = topTeams.map((t, i) => `**${i + 1}.** \`${t.team_name}\`: **${t.total_points} pts** (Tasks: \`${t.completed_tasks}\`, Bonus: \`${t.pattern_bonus}\`)`).join('\n');
        embed.addFields({ name: '👥 Teams', value: `**Top 3 Teams**:\n${teamsDesc}` });
    }

    return embed;
}

/**
 *
 * @param eventId
 */
async function createIndividualLeaderboardEmbed(eventId) {
    const id = Number(eventId);
    const safeEventId = !isNaN(id) ? id : 'Unknown';

    const trophyEmoji = await getEmojiWithFallback('emoji_league_points', '🏆');
    const pointsEmoji = await getEmojiWithFallback('emoji_points', '⭐');
    const completedEmoji = await getEmojiWithFallback('emoji_completed', '📝');
    const progressEmoji = await getEmojiWithFallback('emoji_overall', '📊');

    const embed = new EmbedBuilder().setTitle(`${trophyEmoji} **Individual Leaderboard** - Bingo Event #${safeEventId}`).setColor(0x3498db).setFooter({ text: '🕓 Last Updated' }).setTimestamp();

    const topPlayers = await getTopPlayers(eventId);

    // If no players were returned, set a default message.
    if (topPlayers.length === 0) {
        embed.setDescription('No individual completions yet.');
        return embed;
    }

    let leaderboardDescription = '';
    const emojiCache = {};
    const playerProgress = [];

    // Process each player asynchronously
    await Promise.all(
        topPlayers.map(async (player) => {
            // -- NEW: Instead of calculateOverallProgress:
            const { partialPoints, totalBoardPoints } = await computeIndividualPartialPoints(eventId, player.player_id, true);
            const overallFloat = computeOverallPercentage(partialPoints, totalBoardPoints);
            const overall = parseFloat(overallFloat.toFixed(2));

            // Only include players with progress greater than 0
            if (overall > 0) {
                const taskProgress = await getPlayerTaskProgress(eventId, player.player_id);

                const playerNameForLink = encodeURIComponent(player.rsn);
                const profileLink = `https://wiseoldman.net/players/${playerNameForLink}`;

                let taskProgressStr = '';
                for (const task of taskProgress) {
                    // ✅ Check if the task is completed
                    if (task.status === 'completed') {
                        let taskEmoji = emojiCache[task.parameter];
                        if (!taskEmoji) {
                            taskEmoji = await getEmojiWithFallback(`emoji_${task.parameter}`, '✅');
                            emojiCache[task.parameter] = taskEmoji;
                        }
                        taskProgressStr += `${taskEmoji} `;
                    }
                }

                // If no tasks have reached 100%, show a default message
                if (!taskProgressStr) {
                    taskProgressStr = '_No completed tasks yet._';
                }

                const playerRank = await getPlayerRank(player.player_id);
                let rankEmoji = emojiCache[playerRank];
                if (!rankEmoji) {
                    rankEmoji = await getEmojiWithFallback(`emoji_${playerRank}`, '👤');
                    emojiCache[playerRank] = rankEmoji;
                }

                playerProgress.push({
                    rsn: player.rsn,
                    profileLink,
                    rankEmoji,
                    overall,
                    total_points: player.total_points,
                    completed_tasks: player.completed_tasks,
                    taskProgressStr,
                });
            }
        }),
    );

    // If no players had progress > 0, set a default description
    if (playerProgress.length === 0) {
        embed.setDescription('No individual completions yet.');
        return embed;
    }

    // Sort players by "overall" descending
    playerProgress.sort((a, b) => b.overall - a.overall);

    // Build the embed description
    playerProgress.forEach((player, index) => {
        leaderboardDescription += `> ### **${index + 1}.** ${player.rankEmoji} **[${player.rsn}](${player.profileLink})**\n`;
        leaderboardDescription += `> ${progressEmoji}Finished: \`${player.overall}%\` \n> ${pointsEmoji}Earned: \`${player.total_points} pts\`\n`;
        leaderboardDescription += `> ${completedEmoji}Tasks Completed: \`${player.completed_tasks}\`\n`;
        leaderboardDescription += `> ${player.taskProgressStr}\n\n`;
    });

    embed.setDescription(leaderboardDescription);
    return embed;
}

/**
 *
 * @param {number} eventId
 */
async function createTeamLeaderboardEmbed(eventId) {
    const trophyEmoji = await getEmojiWithFallback('emoji_league_points', '🏆');
    const pointsEmoji = await getEmojiWithFallback('emoji_points', '⭐');
    const completedEmoji = await getEmojiWithFallback('emoji_completed', '📝');
    const progressEmoji = await getEmojiWithFallback('emoji_overall', '📊');
    const teamEmoji = await getEmojiWithFallback('emoji_clan_logo', '👥');

    const id = Number(eventId);
    const safeEventId = !isNaN(id) ? id : 'Unknown';

    const embed = new EmbedBuilder().setTitle(`${trophyEmoji} **Team Leaderboard** - Bingo Event #${safeEventId}`).setColor(0xf39c12).setFooter({ text: '🕓 Last Updated' }).setTimestamp();

    // 1. Fetch the "top teams" from your DB (currently from bingo_leaderboard)
    const topTeams = await getTopTeams(eventId);
    if (topTeams.length === 0) {
        embed.setDescription('No team completions yet.');
        return embed;
    }

    let leaderboardDescription = '';
    const emojiCache = [];
    const teamProgress = [];

    // 2. For each top team, gather partial points from the new function
    await Promise.all(
        topTeams.map(async (team) => {
            // Use computeTeamPartialPoints to get partialPointsMap & total
            const { partialPointsMap, teamTotalPartial, totalBoardPoints } = await computeTeamPartialPoints(eventId, team.team_id, true);

            // Overall completion for this team
            const overallFloat = computeOverallPercentage(teamTotalPartial, totalBoardPoints);
            const overall = parseFloat(overallFloat.toFixed(2));

            // If no progress, skip them
            if (overall <= 0) {
                return;
            }

            // Make a row of emojis for tasks the team *fully completed*
            // (If `status === 'completed'`, it's done)
            const taskProgress = await getTeamTaskProgress(eventId, team.team_id);
            let taskProgressStr = '';
            for (const t of taskProgress) {
                if (t.status === 'completed') {
                    let taskEmoji = emojiCache[t.parameter];
                    if (!taskEmoji) {
                        taskEmoji = await getEmojiWithFallback(`emoji_${t.parameter}`, '✅');
                        emojiCache[t.parameter] = taskEmoji;
                    }
                    taskProgressStr += `${taskEmoji} `;
                }
            }
            if (!taskProgressStr) {
                taskProgressStr = '_No completed tasks yet._';
            }

            // "Tasks Completed" is the number of tasks with status=completed
            const completedTasks = taskProgress.filter((tp) => tp.status === 'completed').length;

            // Now retrieve the actual team members
            const teamMembers = await dbUtils.getAll(
                `
                SELECT rr.rsn, rr.player_id
                FROM bingo_team_members btm
                JOIN registered_rsn rr ON btm.player_id = rr.player_id
                WHERE btm.team_id = ?
                ORDER BY rr.rsn COLLATE NOCASE ASC
                `,
                [team.team_id],
            );

            // For each member, figure out partial points & share
            const memberLines = [];
            teamMembers.sort((a, b) => partialPointsMap[b.player_id] - partialPointsMap[a.player_id]);
            for (const member of teamMembers) {
                const userPoints = partialPointsMap[member.player_id] || 0;
                const userShare = teamTotalPartial > 0 ? ((userPoints / teamTotalPartial) * 100).toFixed(2) : '0.00';

                // Optionally fetch rank
                const playerRank = await getPlayerRank(member.player_id);
                let memberEmoji = emojiCache[playerRank];
                if (!memberEmoji) {
                    memberEmoji = await getEmojiWithFallback(`emoji_${playerRank}`, '👤');
                    emojiCache[playerRank] = memberEmoji;
                }

                const playerNameForLink = encodeURIComponent(member.rsn);
                const profileLink = `https://wiseoldman.net/players/${playerNameForLink}`;

                memberLines.push(`> - ${memberEmoji}[${member.rsn}](${profileLink}) contributed \`${userShare}%\`${progressEmoji} & earned \`${userPoints} pts\`${pointsEmoji}`);
            }

            const memberSection = memberLines.join('\n') || '> _No members found._';

            // Save final structured data for the embed
            teamProgress.push({
                team_name: team.team_name,
                overall,
                partial_points: teamTotalPartial,
                completed_tasks: completedTasks,
                taskProgressStr,
                memberSection,
            });
        }),
    );

    // Filter out any teams that ended up with 0
    const filteredTeams = teamProgress.filter((t) => t.partial_points > 0);
    if (filteredTeams.length === 0) {
        embed.setDescription('No team completions yet.');
        return embed;
    }

    // 4. Sort teams by "overall" descending
    filteredTeams.sort((a, b) => b.overall - a.overall);

    // 5. Build your embed description
    filteredTeams.forEach((team) => {
        leaderboardDescription += `> ### ${teamEmoji} Team: **\`${team.team_name}\`**\n`;
        leaderboardDescription += `> Finished: **\`${team.overall.toFixed(2)}%\`${progressEmoji}**\n`;
        leaderboardDescription += `${team.memberSection}\n`;
        leaderboardDescription += `> ${completedEmoji}Tasks Completed: \`${team.completed_tasks}\`\n`;
        leaderboardDescription += `> ${team.taskProgressStr}\n\n`;
    });

    embed.setDescription(leaderboardDescription);
    return embed;
}

/**
 *
 * @param completions
 */
async function createConsolidatedProgressEmbed(completions) {
    // Retrieve common emojis
    const completedEmoji = await getEmojiWithFallback('emoji_completed', '✅');
    const pointsEmoji = await getEmojiWithFallback('emoji_points', '⭐');

    const embed = new EmbedBuilder().setTitle(`${completedEmoji} Task Completions`).setColor(0x48de6f).setFooter({ text: '🕓 Last Updated' }).setTimestamp(new Date());

    let description = '';
    const emojiCache = {};

    for (const row of completions) {
        // Parse timestamp
        let ts = new Date(row.last_updated);
        if (isNaN(ts.getTime())) {
            logger.warn(`[createConsolidatedProgressEmbed] Invalid timestamp for ${row.rsn}. Using current time.`);
            ts = new Date();
        }
        // Fetch the emoji for the task using row.parameter (or default to ✅)
        let taskEmoji = emojiCache[row.parameter];
        if (!taskEmoji) {
            taskEmoji = await getEmojiWithFallback(`emoji_${row.parameter}`, '✅');
            emojiCache[row.parameter] = taskEmoji;
        }

        const playerNameForLink = encodeURIComponent(row.rsn);
        const profileLink = `https://wiseoldman.net/players/${playerNameForLink}`;

        // Format each completion entry
        description += `> - **[${row.rsn}](${profileLink})**\n>   - ${taskEmoji} \`${row.taskName}\`\n`;
        description += `>   - ${pointsEmoji} Points: \`${row.points ?? 'N/A'} pts\`\n\n`;
    }
    embed.setDescription(description);
    return embed;
}

module.exports = {
    createProgressEmbed,
    createFinalResultsEmbed,
    createTeamLeaderboardEmbed,
    createIndividualLeaderboardEmbed,
    createConsolidatedProgressEmbed,
};
