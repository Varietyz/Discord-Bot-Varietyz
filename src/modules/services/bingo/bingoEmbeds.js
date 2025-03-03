const { EmbedBuilder } = require('discord.js');
const { getTopTeams, getTopPlayers, getPlayerTaskProgress, getTeamTaskProgress } = require('./bingoEmbedData');
const getEmojiWithFallback = require('../../utils/fetchers/getEmojiWithFallback');
const dbUtils = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
const { computeOverallPercentage, computeIndividualPartialPoints, computeTeamPartialPoints } = require('./bingoCalculations');
const { calculatePatternBonus } = require('./bingoPatternRecognition');
const { calculateProgressPercentage } = require('./bingoImageGenerator');
const getPlayerLink = require('../../utils/fetchers/getPlayerLink');

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
    if (playerProgress.length === 0) {
        embed.setDescription('No individual completions yet.');
        return embed;
    }

    // Sort players by "overall" descending
    playerProgress.sort((a, b) => b.overall - a.overall);

    // Build the embed description
    playerProgress.forEach((player, index) => {
        leaderboardDescription += `> ### **${index + 1}.** **${player.profileLink}**\n`;
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

    // Fetch actual awarded points from the DB for each team
    const teamPointsMap = {};

    // 2. Process each top team.
    await Promise.all(
        topTeams.map(async (team) => {
            const { partialPointsMap, totalBoardPoints, teamTotalOverallPartial, overallPartialPointsMap } = await computeTeamPartialPoints(eventId, team.team_id);

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

                const profileLink = await getPlayerLink(member.rsn);

                memberLines.push(`> - ${profileLink} contributed \`${userShare}%\` ${progressEmoji} & earned \`${userPoints} pts\` ${pointsEmoji}`);
            }
            const pointsResults = await dbUtils.getAll(
                `SELECT team_id, SUM(points_awarded) AS total_points
         FROM bingo_task_progress
         WHERE event_id = ?
         GROUP BY team_id`,
                [eventId],
            );
            pointsResults.forEach((row) => {
                teamPointsMap[row.team_id] = row.total_points || 0;
            });
            const actualPoints = teamPointsMap[team.team_id] || 0;

            const memberSection = memberLines.join('\n') || '> _No members found._';

            // Save the team's data for the leaderboard.
            teamProgress.push({
                team_name: team.team_name,
                overall, // Overall progress % (from any progression)
                partial_points: actualPoints, // Total awarded points from completions
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
 * ✅ Creates a grouped embed showing Bingo task completions per player or team, including percentage contributions.
 *
 * @param {Array} completions - Array of completion objects with player RSN, team name, task info, and progress values.
 */
async function createConsolidatedProgressEmbed(completions) {
    // Retrieve common emojis
    const completedEmoji = await getEmojiWithFallback('emoji_logoa_check', '✅');
    const pointsEmoji = await getEmojiWithFallback('emoji_points', '⭐');
    const progressEmoji = await getEmojiWithFallback('emoji_overall', '📊');

    const embed = new EmbedBuilder().setTitle(`${completedEmoji} Task Completions`).setColor(0x48de6f).setFooter({ text: '🕓 Last Updated' }).setTimestamp(new Date());

    const emojiCache = {};
    const groupedCompletions = {};

    // ✅ Group completions by player or team
    for (const row of completions) {
        // Parse timestamp
        let ts = new Date(row.last_updated);
        if (isNaN(ts.getTime())) {
            logger.warn(`[createConsolidatedProgressEmbed] Invalid timestamp for ${row.rsn || row.team_name}. Using current time.`);
            ts = new Date();
        }

        // Fetch the emoji for the task using row.parameter (or default to ✅)
        let taskEmoji = emojiCache[row.parameter];
        if (!taskEmoji) {
            taskEmoji = await getEmojiWithFallback(`emoji_${row.parameter}`, '✅');
            emojiCache[row.parameter] = taskEmoji;
        }

        // Determine if it's an individual or team task
        const entityName = row.team_name ? row.team_name : row.rsn;
        const profileLink = await getPlayerLink(row.rsn);

        // Group tasks under the player's or team's name
        if (!groupedCompletions[entityName]) {
            groupedCompletions[entityName] = {
                profileLink,
                isTeam: !!row.team_name,
                tasks: [],
            };
        }

        // ✅ Corrected Contribution % Calculation
        let contributionPercentage = '0.00';
        if (row.target && Number(row.target) > 0) {
            const progressValue = Number(row.progress);
            const totalValue = Number(row.target);
            contributionPercentage = calculateProgressPercentage(progressValue, totalValue);
            if (contributionPercentage > Number(100)) {
                contributionPercentage = '100.00';
            }
        }

        // ✅ Improved Points Description with Contribution
        let pointsDescription;
        if (row.points_awarded > 0) {
            pointsDescription = `${pointsEmoji} \`${row.points_awarded} pts\` — ${progressEmoji} \`${contributionPercentage}%\``;
        } else {
            pointsDescription = '*`⚠️ Did not contribute to the task their team completed`*';
        }

        // Convert row.progress to a number once
        const progressNum = Number(row.progress);
        // Format the number with commas (e.g., 1000000 becomes "1,000,000")
        const progressionValue = progressNum.toLocaleString();

        let formattedProgress = '';

        if (row.type === 'Exp') {
            formattedProgress = `${progressionValue} XP contributed`;
        } else if (row.type === 'Kill') {
            // Use ternary operator for singular/plural phrasing
            formattedProgress = progressNum === 1 ? `${progressionValue} Kill contributed` : `${progressionValue} Kills contributed`;
        } else {
            formattedProgress = progressNum === 1 ? `${progressionValue} Completion contributed` : `${progressionValue} Completions contributed`;
        }

        // ✅ Improved Task Formatting for Readability
        groupedCompletions[entityName].tasks.push(`> - **\`${row.taskName}\`**\n> - ${taskEmoji}**\`${formattedProgress}\`**\n>   - ${pointsDescription}`);
    }

    // Build final embed description
    let description = '';
    for (const [, data] of Object.entries(groupedCompletions)) {
        // Use data.profileLink and data.tasks properly
        description += `### **${data.profileLink}**\n`;
        description += data.tasks.join('\n') + '\n\n';
    }

    embed.setDescription(description.trim());
    return embed;
}

/**
 * ✅ Creates a grouped embed showing **Bingo pattern completions** per player.
 * - Dynamically calculates **bonus points** with team adjustments.
 * - Uses **rank emojis**, **profile links**, and **structured formatting**.
 *
 * @param {number} eventId - The Bingo Event ID.
 * @returns {Promise<EmbedBuilder>} - The Discord embed object.
 */
async function createPatternCompletionEmbed(eventId) {
    // Retrieve common emojis
    const patternEmoji = await getEmojiWithFallback('emoji_pattern_bonus', '🎯');
    const pointsEmoji = await getEmojiWithFallback('emoji_points', '⭐');

    const embed = new EmbedBuilder().setTitle(`${patternEmoji} **Pattern Completions**`).setColor(0xffc107).setFooter({ text: '🕓 Last Updated' }).setTimestamp(new Date());

    const groupedCompletions = {};

    if (eventId === -1 || eventId === 0) {
        logger.warn(`[createPatternCompletionEmbed] Invalid event id ${eventId}.`);
        return;
    }
    // ✅ Fetch all pattern completions for this event
    const patternCompletions = await dbUtils.getAll(
        `
        SELECT bpa.player_id, rr.rsn, bpa.pattern_key, bpa.awarded_at, 
               (SELECT team_id FROM bingo_team_members WHERE player_id = bpa.player_id) AS team_id
        FROM bingo_patterns_awarded bpa
        JOIN registered_rsn rr ON rr.player_id = bpa.player_id
        WHERE bpa.event_id = ?
        ORDER BY bpa.awarded_at DESC
        `,
        [eventId],
    );

    if (patternCompletions.length === 0) {
        embed.setDescription('No pattern completions yet.');
        return embed;
    }

    // ✅ Group completions by player
    for (const row of patternCompletions) {
        // Calculate base bonus points
        let bonusPoints = calculatePatternBonus(row.pattern_key);

        // Check if the player is in a team and adjust points accordingly
        if (row.team_id) {
            const teamSizeRow = await dbUtils.getOne('SELECT COUNT(*) AS teamSize FROM bingo_team_members WHERE team_id = ?', [row.team_id]);
            const teamSize = teamSizeRow ? teamSizeRow.teamSize : 1;
            bonusPoints = Math.floor(bonusPoints / teamSize); // Distribute points across team members
        }

        // Parse timestamp
        let timestamp = new Date(row.awarded_at);
        if (isNaN(timestamp.getTime())) {
            logger.warn(`[createPatternCompletionEmbed] Invalid timestamp for ${row.rsn}. Using current time.`);
            timestamp = new Date();
        }

        // Prepare player profile link
        const profileLink = await getPlayerLink(row.rsn);

        // Group patterns under the player's name
        if (!groupedCompletions[row.rsn]) {
            groupedCompletions[row.rsn] = {
                profileLink,
                patterns: [],
            };
        }

        // Add pattern details
        groupedCompletions[row.rsn].patterns.push(`> - 🎲 **${row.pattern_key.replace(/_/g, ' ')}** \n>   - ${pointsEmoji} **Bonus:** \`${bonusPoints} pts\``);
    }

    let description = '';
    for (const [, data] of Object.entries(groupedCompletions)) {
        description += `### **${data.profileLink}**\n`;
        description += data.patterns.join('\n') + '\n\n';
    }

    embed.setDescription(description.trim());
    return embed;
}

module.exports = {
    createProgressEmbed,
    createFinalResultsEmbed,
    createTeamLeaderboardEmbed,
    createIndividualLeaderboardEmbed,
    createConsolidatedProgressEmbed,
    createPatternCompletionEmbed,
};
