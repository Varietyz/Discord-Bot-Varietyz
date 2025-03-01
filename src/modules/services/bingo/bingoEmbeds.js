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
    // Retrieve emojis for display.
    const trophyEmoji = await getEmojiWithFallback('emoji_league_points', '🏆');
    const pointsEmoji = await getEmojiWithFallback('emoji_points', '⭐');
    const completedEmoji = await getEmojiWithFallback('emoji_completed', '📝');
    const progressEmoji = await getEmojiWithFallback('emoji_overall', '📊');
    const teamEmoji = await getEmojiWithFallback('emoji_clan_logo', '👥');

    const id = Number(eventId);
    const safeEventId = !isNaN(id) ? id : 'Unknown';

    const embed = new EmbedBuilder().setTitle(`${trophyEmoji} **Team Leaderboard** - Bingo Event #${safeEventId}`).setColor(0xf39c12).setFooter({ text: '🕓 Last Updated' }).setTimestamp();

    // 1. Fetch the top teams from your DB.
    const topTeams = await getTopTeams(eventId);
    if (topTeams.length === 0) {
        embed.setDescription('No team completions yet.');
        return embed;
    }

    let leaderboardDescription = '';
    const emojiCache = []; // Cache for emoji lookups.
    const teamProgress = [];

    // 2. Process each top team.
    await Promise.all(
        topTeams.map(async (team) => {
            const { partialPointsMap, teamTotalPartial, totalBoardPoints, teamTotalOverallPartial, overallPartialPointsMap } = await computeTeamPartialPoints(eventId, team.team_id);

            // Calculate overall progress percentage (using any progression).
            const overallFloat = computeOverallPercentage(teamTotalOverallPartial, totalBoardPoints);
            const overall = parseFloat(overallFloat.toFixed(2));

            // Skip teams with no overall progress.
            if (overall <= 0) {
                return;
            }

            // Build a row of emojis for tasks that the team has fully completed.
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

            // "Tasks Completed" count based on tasks with status 'completed'.
            const completedTasks = taskProgress.filter((tp) => tp.status === 'completed').length;

            // Retrieve team members.
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

            // For each member, compute their contribution % based on overall progress (partial progress).
            const memberLines = [];
            // Sort members by their overall partial progress (from overallPartialPointsMap).
            teamMembers.sort((a, b) => (overallPartialPointsMap[b.player_id] || 0) - (overallPartialPointsMap[a.player_id] || 0));
            for (const member of teamMembers) {
                // Display earned points based solely on completions.
                const userPoints = partialPointsMap[member.player_id] || 0;
                // Now compute contribution % based on overall progress.
                const userOverallPoints = overallPartialPointsMap[member.player_id] || 0;
                const userShare = teamTotalOverallPartial > 0 ? ((userOverallPoints / teamTotalOverallPartial) * 100).toFixed(2) : '0.00';

                // Optionally fetch rank emoji.
                const playerRank = await getPlayerRank(member.player_id);
                let memberEmoji = emojiCache[playerRank];
                if (!memberEmoji) {
                    memberEmoji = await getEmojiWithFallback(`emoji_${playerRank}`, '👤');
                    emojiCache[playerRank] = memberEmoji;
                }

                const playerNameForLink = encodeURIComponent(member.rsn);
                const profileLink = `https://wiseoldman.net/players/${playerNameForLink}`;

                memberLines.push(`> - ${memberEmoji}[${member.rsn}](${profileLink}) contributed \`${userShare}%\` ${progressEmoji} & earned \`${userPoints} pts\` ${pointsEmoji}`);
            }

            const memberSection = memberLines.join('\n') || '> _No members found._';

            // Save the team's data for the leaderboard.
            teamProgress.push({
                team_name: team.team_name,
                overall, // Overall progress % (from any progression)
                partial_points: teamTotalPartial, // Total awarded points from completions
                completed_tasks: completedTasks,
                taskProgressStr,
                memberSection,
            });
        }),
    );

    // Filter out any teams with 0 completion points.
    const filteredTeams = teamProgress.filter((t) => t.partial_points > 0);
    if (filteredTeams.length === 0) {
        embed.setDescription('No team completions yet.');
        return embed;
    }

    // 4. Sort teams by overall progress descending.
    filteredTeams.sort((a, b) => b.overall - a.overall);

    // 5. Build the final embed description.
    filteredTeams.forEach((team) => {
        leaderboardDescription += `> ### ${teamEmoji} Team: **\`${team.team_name}\`**\n`;
        leaderboardDescription += `> Finished: **\`${team.overall.toFixed(2)}%\` ${progressEmoji}**\n`;
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
        description += `>   - ${pointsEmoji} Points: \`${row.points_awarded ?? 'N/A'} pts\`\n\n`;
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
