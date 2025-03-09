const { EmbedBuilder } = require('discord.js');
const { getPlayerTaskProgress, getTeamTaskProgress } = require('./bingoEmbedData');
const getEmojiWithFallback = require('../../../utils/fetchers/getEmojiWithFallback');
const dbUtils = require('../../../utils/essentials/dbUtils');
const logger = require('../../../utils/essentials/logger');
const { computeOverallPercentage, computeIndividualPartialPoints, computeTeamPartialPoints } = require('../bingoCalculations');
const { calculateProgressPercentage } = require('../bingoImageGenerator');
const getPlayerLink = require('../../../utils/fetchers/getPlayerLink');

/**
 *
 * @param root0
 * @param root0.rsn
 * @param root0.taskName
 * @param root0.points
 * @param root0.lastUpdated
 * @returns
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
 * @returns
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
 * @param topPlayers
 * @returns
 */
async function createIndividualLeaderboardEmbed(eventId, topPlayers) {
    const id = Number(eventId);
    const safeEventId = !isNaN(id) ? id : 'Unknown';

    const trophyEmoji = await getEmojiWithFallback('emoji_league_points', '🏆');
    const pointsEmoji = await getEmojiWithFallback('emoji_points', '⭐');
    const completedEmoji = await getEmojiWithFallback('emoji_completed', '📝');
    const progressEmoji = await getEmojiWithFallback('emoji_overall', '📊');

    const embed = new EmbedBuilder().setTitle(`${trophyEmoji} **Individual Leaderboard** - Bingo Event #${safeEventId}`).setColor(0x3498db).setFooter({ text: '🕓 Last Updated' }).setTimestamp();

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
            if (overall >= 0) {
                const taskProgress = await getPlayerTaskProgress(eventId, player.player_id);

                const profileLink = await getPlayerLink(player.rsn);

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

                // Fetch actual awarded points from the DB for each player
                const playerPointsMap = {};
                const pointsResults = await dbUtils.getAll(
                    `SELECT player_id, SUM(points_awarded) AS total_points
         FROM bingo_task_progress
         WHERE event_id = ?
         GROUP BY player_id`,
                    [eventId],
                );
                pointsResults.forEach((row) => {
                    playerPointsMap[row.player_id] = row.total_points || 0;
                });

                const actualPoints = playerPointsMap[player.player_id] || 0;
                playerProgress.push({
                    rsn: player.rsn,
                    profileLink,
                    overall,
                    total_points: actualPoints,
                    completed_tasks: player.completed_tasks,
                    taskProgressStr,
                });
            }
        }),
    );

    // If no players had progress > 0, set a default description
    //if (playerProgress.length === 0) {
    //    embed.setDescription('No individual completions yet.');
    //    return embed;
    //}

    // Sort players to match the SQL query's ordering
    playerProgress.sort((a, b) => {
        // Compare by total_points (highest points first)
        if (b.total_points !== a.total_points) {
            return b.total_points - a.total_points;
        }
        // If tied, compare by completed_tasks (most tasks completed first)
        if (b.completed_tasks !== a.completed_tasks) {
            return b.completed_tasks - a.completed_tasks;
        }
        // If still tied, compare by total_progress (most progress first)
        return b.total_progress - a.total_progress;
    });

    // Build the embed description
    playerProgress.forEach((player, index) => {
        leaderboardDescription += `### **${index + 1}.** **${player.profileLink}**\n`;
        leaderboardDescription += `> ${progressEmoji}Finished: \`${player.overall}%\` \n> ${pointsEmoji}Earned: \`${player.total_points} pts\`\n`;
        leaderboardDescription += `> ${completedEmoji}Tasks Completed: \`${player.completed_tasks}\`\n`;
        leaderboardDescription += `> ${player.taskProgressStr}\n\n`;
    });

    embed.setDescription(leaderboardDescription);
    return embed;
}

/**
 * Generates the Team Leaderboard Embed for the Bingo event.
 *
 * @param {number} eventId - The event ID.
 * @param topTeams
 * @returns {Promise<EmbedBuilder>} - The Discord embed object.
 */
async function createTeamLeaderboardEmbed(eventId, topTeams) {
    // Retrieve emojis for display.
    const trophyEmoji = await getEmojiWithFallback('emoji_league_points', '🏆');
    const pointsEmoji = await getEmojiWithFallback('emoji_points', '⭐');
    const completedEmoji = await getEmojiWithFallback('emoji_completed', '📝');
    const progressEmoji = await getEmojiWithFallback('emoji_overall', '📊');
    const teamEmoji = await getEmojiWithFallback('emoji_clan_logo', '👥');

    const id = Number(eventId);
    const safeEventId = !isNaN(id) ? id : 'Unknown';

    const embed = new EmbedBuilder().setTitle(`${trophyEmoji} **Team Leaderboard** - Bingo Event #${safeEventId}`).setColor(0xf39c12).setFooter({ text: '🕓 Last Updated' }).setTimestamp();

    if (topTeams.length === 0) {
        embed.setDescription('No team completions yet.');
        return embed;
    }

    let leaderboardDescription = '';
    const emojiCache = {}; // Cache for emoji lookups.
    const teamProgress = [];

    // Fetch actual awarded points from the DB for each team
    const teamPointsMap = {};

    // 4️⃣ **Process each team and calculate their contributions**
    await Promise.all(
        topTeams.map(async (team) => {
            const { partialPointsMap, totalBoardPoints, teamTotalOverallPartial, overallPartialPointsMap } = await computeTeamPartialPoints(eventId, team.team_id);

            // Calculate overall progress percentage
            const overallFloat = computeOverallPercentage(teamTotalOverallPartial, totalBoardPoints);
            const overall = parseFloat(overallFloat.toFixed(2));

            // Retrieve team members.
            const teamMembers = await dbUtils.getAll(
                `SELECT rr.rsn, rr.player_id
                 FROM bingo_team_members btm
                 JOIN registered_rsn rr ON btm.player_id = rr.player_id
                 WHERE btm.team_id = ?
                 ORDER BY rr.rsn COLLATE NOCASE ASC`,
                [team.team_id],
            );

            // Retrieve task progress
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
            const actualPoints = teamPointsMap[team.team_id] || 0;

            // Calculate member contributions
            const memberLines = [];
            teamMembers.sort((a, b) => (overallPartialPointsMap[b.player_id] || 0) - (overallPartialPointsMap[a.player_id] || 0));
            for (const member of teamMembers) {
                const userPoints = partialPointsMap[member.player_id] || 0;
                const userOverallPoints = overallPartialPointsMap[member.player_id] || 0;
                const iniuserShare = teamTotalOverallPartial > 0 ? Math.min((userOverallPoints / teamTotalOverallPartial) * 100, 100) : 0;
                const userShare = parseFloat(iniuserShare.toFixed(2));

                // ✅ Log actual values to debug
                logger.info(`[TeamContribution] ${member.rsn} contributed ${userShare.toFixed(2)}% (${userOverallPoints}/${teamTotalOverallPartial})`);

                const profileLink = await getPlayerLink(member.rsn);
                memberLines.push(`> - ${profileLink} contributed \`${userShare}%\` ${progressEmoji} & earned \`${userPoints} pts\` ${pointsEmoji}`);
            }
            const memberSection = memberLines.join('\n') || '> _No members found._';

            // Save the team's data for the leaderboard.
            teamProgress.push({
                team_name: team.team_name,
                overall,
                partial_points: actualPoints,
                completed_tasks: completedTasks,
                taskProgressStr,
                memberSection,
            });
        }),
    );

    // 🚀 Sort teams by total points (highest first), then by completed tasks, then by overall progress
    teamProgress.sort((a, b) => {
        if (b.partial_points !== a.partial_points) return b.partial_points - a.partial_points;
        if (b.completed_tasks !== a.completed_tasks) return b.completed_tasks - a.completed_tasks;
        return b.overall - a.overall;
    });

    if (teamProgress.length === 0) {
        embed.setDescription('No team progress yet.');
        return embed;
    }

    // 5️⃣ Build the final embed description
    teamProgress.forEach((team) => {
        leaderboardDescription += `### ${teamEmoji} Team: **\`${team.team_name}\`**\n`;
        leaderboardDescription += `> Finished: **\`${team.overall.toFixed(2)}%\` ${progressEmoji}**\n`;
        leaderboardDescription += `${team.memberSection}\n`;
        leaderboardDescription += `> ${completedEmoji}Tasks Completed: \`${team.completed_tasks}\`\n`;
        leaderboardDescription += `> ${team.taskProgressStr}\n\n`;
    });

    embed.setDescription(leaderboardDescription);
    return embed;
}

/**
 * ✅ Creates grouped embeds showing Bingo task completions, listing all players under each task.
 * ✅ Automatically splits embeds if the total character limit is exceeded.
 *
 * @param {Array} completions - Array of completion objects with RSN, task info, and progress values.
 * @returns {Promise<EmbedBuilder[]>} - Array of formatted embeds.
 */
async function createConsolidatedProgressEmbed(completions) {
    // Retrieve common emojis
    const completedEmoji = await getEmojiWithFallback('emoji_logoa_check', '✅');
    const pointsEmoji = await getEmojiWithFallback('emoji_points', '⭐');
    const progressEmoji = await getEmojiWithFallback('emoji_overall', '📊');

    const emojiCache = {};
    const groupedTasks = {};

    // ✅ Group completions by Task Type first
    for (const row of completions) {
        let taskEmoji = emojiCache[row.parameter];
        if (!taskEmoji) {
            taskEmoji = await getEmojiWithFallback(`emoji_${row.parameter}`, '✅');
            emojiCache[row.parameter] = taskEmoji;
        }

        let statEmoji;
        if (row.type === 'Exp') {
            statEmoji = await getEmojiWithFallback('emoji_overall', '📊');
        } else if (row.type === 'Kill') {
            statEmoji = await getEmojiWithFallback('emoji_slayer', '⚔️');
        } else {
            statEmoji = await getEmojiWithFallback('emoji_league_points', '🏆');
        }
        // Construct Task Identifier
        const taskIdentifier = `${statEmoji} **\`${row.taskName}\`**`;

        // Ensure task entry exists
        if (!groupedTasks[taskIdentifier]) {
            groupedTasks[taskIdentifier] = [];
        }

        // Get Player Profile Link
        const profileLink = await getPlayerLink(row.rsn);

        // ✅ Contribution % Calculation
        let contributionPercentage = '—';
        if (row.target && Number(row.target) > 0) {
            const progressValue = Number(row.progress);
            const totalValue = Number(row.target);
            contributionPercentage = calculateProgressPercentage(progressValue, totalValue);
            if (contributionPercentage > Number(100)) {
                contributionPercentage = '100.00';
            } else {
                contributionPercentage += '%';
            }
        }

        // Convert progress to a formatted number (e.g., 1000000 → "1,000,000")
        const progressNum = Number(row.progress);
        const formattedProgress = progressNum > 0 ? progressNum.toLocaleString() : '—';

        let progressDisplay = '';
        if (row.type === 'Exp') {
            progressDisplay = progressNum > 0 ? `${formattedProgress} XP` : '—';
        } else if (row.type === 'Kill') {
            progressDisplay = progressNum > 0 ? (progressNum === 1 ? `${formattedProgress} Kill` : `${formattedProgress} Kills`) : '—';
        } else {
            progressDisplay = progressNum > 0 ? (progressNum === 1 ? `${formattedProgress} Completion` : `${formattedProgress} Completions`) : '—';
        }

        // ✅ Format Player Progress Line (Inline)
        let pointsDescription;
        if (row.points_awarded > 0) {
            pointsDescription = `- ${profileLink} — ${taskEmoji} **\`${progressDisplay}\`** — ${pointsEmoji} \`${row.points_awarded} pts\` — ${progressEmoji} \`${contributionPercentage}\``;
        } else {
            pointsDescription = `- ${profileLink} — ${taskEmoji} **\`${progressDisplay}\`** — ${pointsEmoji} \`— pts\` — ${progressEmoji} \`${contributionPercentage}\``;
        }

        groupedTasks[taskIdentifier].push(pointsDescription);
    }

    // ✅ Generate multiple embeds if necessary
    const embeds = [];
    let currentEmbedContent = '';
    let currentEmbed = new EmbedBuilder().setTitle(`${completedEmoji} Task Completions`).setColor(0x48de6f);

    for (const [taskName, playerData] of Object.entries(groupedTasks)) {
        const taskContent = `${taskName}\n${playerData.join('\n')}\n\n`;

        // If adding this task exceeds Discord’s 4096 character limit, create a new embed
        if (currentEmbedContent.length + taskContent.length > 4096) {
            currentEmbed.setDescription(currentEmbedContent.trim());
            embeds.push(currentEmbed);

            // Start a new embed
            currentEmbed = new EmbedBuilder().setTitle(`${completedEmoji} Task Completions (Continued)`).setColor(0x48de6f);
            currentEmbedContent = '';
        }

        currentEmbedContent += taskContent;
    }

    // Add the final embed (if there's remaining content)
    if (currentEmbedContent.length > 0) {
        currentEmbed.setDescription(currentEmbedContent.trim());
        embeds.push(currentEmbed);
    }

    // ✅ Add timestamp to the last embed
    if (embeds.length > 0) {
        embeds[embeds.length - 1].setFooter({ text: '🕓 Last Updated' }).setTimestamp(new Date());
    }

    return embeds;
}

module.exports = {
    createProgressEmbed,
    createFinalResultsEmbed,
    createTeamLeaderboardEmbed,
    createIndividualLeaderboardEmbed,
    createConsolidatedProgressEmbed,
};
