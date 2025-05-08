const { EmbedBuilder } = require('discord.js');
const {
    getPlayerTaskProgress,
    getTeamTaskProgress,
} = require('./bingoEmbedData');
const getEmojiWithFallback = require('../../../utils/fetchers/getEmojiWithFallback');
const dbUtils = require('../../../utils/essentials/dbUtils');
const logger = require('../../../utils/essentials/logger');
const {
    computeOverallPercentage,
    computeIndividualPartialPoints,
    computeTeamPartialPoints,
} = require('../bingoCalculations');
const { calculateProgressPercentage } = require('../bingoImageGenerator');
const getPlayerLink = require('../../../utils/fetchers/getPlayerLink');

async function createProgressEmbed({ rsn, taskName, points, lastUpdated }) {
    const taskEmoji = await getEmojiWithFallback('emoji_completed', '✅');

    let timestamp = new Date(lastUpdated);

    if (isNaN(timestamp.getTime())) {
        logger.warn(
            `[BingoEmbedHelper] Invalid lastUpdated value: ${lastUpdated}. Using current time instead.`
        );
        timestamp = new Date();
    }
    return new EmbedBuilder()
        .setTitle(`${taskEmoji} Task Completed!`)
        .setColor(0x48de6f)
        .setTimestamp(timestamp)
        .setDescription(`**${rsn}** has just completed a task!`)
        .addFields(
            {
                name: '📝 Task',
                value: `\`\`\`fix\n${taskName}\n\`\`\``,
                inline: true,
            },
            {
                name: '⭐ Points',
                value: `\`\`\`\n${points ?? 'N/A'}\n\`\`\``,
                inline: true,
            }
        );
}

async function createFinalResultsEmbed({ eventId, topPlayers, topTeams }) {
    const embed = new EmbedBuilder()
        .setTitle(`🏁 **Final Results: Bingo #${eventId}**`)
        .setColor(0xffc107)
        .setTimestamp();

    if (topPlayers.length > 0) {
        const playersDesc = topPlayers
            .map(
                (p, i) =>
                    `**${i + 1}.** \`${p.rsn}\`: **${p.total_points} pts** (Tasks: \`${p.completed_tasks}\`, Bonus: \`${p.pattern_bonus}\`)`
            )
            .join('\n');
        embed.addFields({
            name: '👤 Top Players',
            value: `**Top ${topPlayers.length} Players**:\n${playersDesc}`,
        });
    }

    if (topTeams.length > 0) {
        const teamsDesc = topTeams
            .map(
                (t, i) =>
                    `**${i + 1}.** \`${t.team_name}\`: **${t.total_points} pts** (Tasks: \`${t.completed_tasks}\`, Bonus: \`${t.pattern_bonus}\`)`
            )
            .join('\n');
        embed.addFields({
            name: '👥 Teams',
            value: `**Top 3 Teams**:\n${teamsDesc}`,
        });
    }

    return embed;
}

async function createIndividualLeaderboardEmbed(eventId, topPlayers) {
    const id = Number(eventId);
    const safeEventId = !isNaN(id) ? id : 'Unknown';

    const trophyEmoji = await getEmojiWithFallback('emoji_league_points', '🏆');
    const pointsEmoji = await getEmojiWithFallback('emoji_points', '⭐');
    const completedEmoji = await getEmojiWithFallback('emoji_completed', '📝');
    const progressEmoji = await getEmojiWithFallback('emoji_overall', '📊');

    const embed = new EmbedBuilder()
        .setTitle(
            `${trophyEmoji} **Individual Leaderboard** - Bingo Event #${safeEventId}`
        )
        .setColor(0x3498db)
        .setFooter({ text: '🕓 Last Updated' })
        .setTimestamp();

    if (topPlayers.length === 0) {
        embed.setDescription('No individual completions yet.');
        return embed;
    }

    let leaderboardDescription = '';
    const emojiCache = {};
    const playerProgress = [];

    await Promise.all(
        topPlayers.map(async (player) => {

            const { partialPoints, totalBoardPoints } =
        await computeIndividualPartialPoints(eventId, player.player_id, true);
            const overallFloat = computeOverallPercentage(
                partialPoints,
                totalBoardPoints
            );
            const overall = parseFloat(overallFloat.toFixed(2));

            if (overall >= 0) {
                const taskProgress = await getPlayerTaskProgress(
                    eventId,
                    player.player_id
                );

                const profileLink = await getPlayerLink(player.rsn);

                let taskProgressStr = '';
                for (const task of taskProgress) {

                    if (task.status === 'completed') {
                        let taskEmoji = emojiCache[task.parameter];
                        if (!taskEmoji) {
                            taskEmoji = await getEmojiWithFallback(
                                `emoji_${task.parameter}`,
                                '✅'
                            );
                            emojiCache[task.parameter] = taskEmoji;
                        }
                        taskProgressStr += `${taskEmoji} `;
                    }
                }

                if (!taskProgressStr) {
                    taskProgressStr = '_No completed tasks yet._';
                }

                const playerPointsMap = {};
                const pointsResults = await dbUtils.getAll(
                    `SELECT player_id, SUM(points_awarded) AS total_points
         FROM bingo_task_progress
         WHERE event_id = ?
         GROUP BY player_id`,
                    [eventId]
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
        })
    );

    playerProgress.sort((a, b) => {

        if (b.total_points !== a.total_points) {
            return b.total_points - a.total_points;
        }

        if (b.completed_tasks !== a.completed_tasks) {
            return b.completed_tasks - a.completed_tasks;
        }

        return b.total_progress - a.total_progress;
    });

    playerProgress.forEach((player, index) => {
        leaderboardDescription += `### **${index + 1}.** **${player.profileLink}**\n`;
        leaderboardDescription += `> ${progressEmoji}Finished: \`${player.overall}%\` \n> ${pointsEmoji}Earned: \`${player.total_points} pts\`\n`;
        leaderboardDescription += `> ${completedEmoji}Tasks Completed: \`${player.completed_tasks}\`\n`;
        leaderboardDescription += `> ${player.taskProgressStr}\n\n`;
    });

    embed.setDescription(leaderboardDescription);
    return embed;
}

async function createTeamLeaderboardEmbed(eventId, topTeams) {

    const trophyEmoji = await getEmojiWithFallback('emoji_league_points', '🏆');
    const pointsEmoji = await getEmojiWithFallback('emoji_points', '⭐');
    const completedEmoji = await getEmojiWithFallback('emoji_completed', '📝');
    const progressEmoji = await getEmojiWithFallback('emoji_overall', '📊');
    const teamEmoji = await getEmojiWithFallback('emoji_clan_icon', '👥');

    const id = Number(eventId);
    const safeEventId = !isNaN(id) ? id : 'Unknown';

    const embed = new EmbedBuilder()
        .setTitle(
            `${trophyEmoji} **Team Leaderboard** - Bingo Event #${safeEventId}`
        )
        .setColor(0xf39c12)
        .setFooter({ text: '🕓 Last Updated' })
        .setTimestamp();

    if (topTeams.length === 0) {
        embed.setDescription('No team completions yet.');
        return embed;
    }

    let leaderboardDescription = '';
    const emojiCache = {}; 
    const teamProgress = [];

    const teamPointsMap = {};

    await Promise.all(
        topTeams.map(async (team) => {
            const {
                partialPointsMap,
                totalBoardPoints,
                teamTotalOverallPartial,
                overallPartialPointsMap,
            } = await computeTeamPartialPoints(eventId, team.team_id);

            const overallFloat = computeOverallPercentage(
                teamTotalOverallPartial,
                totalBoardPoints
            );
            const overall = parseFloat(overallFloat.toFixed(2));

            const teamMembers = await dbUtils.getAll(
                `SELECT rr.rsn, rr.player_id
                 FROM bingo_team_members btm
                 JOIN registered_rsn rr ON btm.player_id = rr.player_id
                 WHERE btm.team_id = ?
                 ORDER BY rr.rsn COLLATE NOCASE ASC`,
                [team.team_id]
            );

            const taskProgress = await getTeamTaskProgress(eventId, team.team_id);
            let taskProgressStr = '';
            for (const t of taskProgress) {
                if (t.status === 'completed') {
                    let taskEmoji = emojiCache[t.parameter];
                    if (!taskEmoji) {
                        taskEmoji = await getEmojiWithFallback(
                            `emoji_${t.parameter}`,
                            '✅'
                        );
                        emojiCache[t.parameter] = taskEmoji;
                    }
                    taskProgressStr += `${taskEmoji} `;
                }
            }
            if (!taskProgressStr) {
                taskProgressStr = '_No completed tasks yet._';
            }

            const completedTasks = taskProgress.filter(
                (tp) => tp.status === 'completed'
            ).length;
            const actualPoints = teamPointsMap[team.team_id] || 0;

            const memberLines = [];
            teamMembers.sort(
                (a, b) =>
                    (overallPartialPointsMap[b.player_id] || 0) -
          (overallPartialPointsMap[a.player_id] || 0)
            );
            for (const member of teamMembers) {
                const userPoints = partialPointsMap[member.player_id] || 0;
                const userOverallPoints =
          overallPartialPointsMap[member.player_id] || 0;
                const iniuserShare =
          teamTotalOverallPartial > 0
              ? Math.min((userOverallPoints / teamTotalOverallPartial) * 100, 100)
              : 0;
                const userShare = parseFloat(iniuserShare.toFixed(2));

                logger.info(
                    `[TeamContribution] ${member.rsn} contributed ${userShare.toFixed(2)}% (${userOverallPoints}/${teamTotalOverallPartial})`
                );

                const profileLink = await getPlayerLink(member.rsn);
                memberLines.push(
                    `> - ${profileLink} contributed \`${userShare}%\` ${progressEmoji} & earned \`${userPoints} pts\` ${pointsEmoji}`
                );
            }
            const memberSection = memberLines.join('\n') || '> _No members found._';

            teamProgress.push({
                team_name: team.team_name,
                overall,
                partial_points: actualPoints,
                completed_tasks: completedTasks,
                taskProgressStr,
                memberSection,
            });
        })
    );

    teamProgress.sort((a, b) => {
        if (b.partial_points !== a.partial_points)
            return b.partial_points - a.partial_points;
        if (b.completed_tasks !== a.completed_tasks)
            return b.completed_tasks - a.completed_tasks;
        return b.overall - a.overall;
    });

    if (teamProgress.length === 0) {
        embed.setDescription('No team progress yet.');
        return embed;
    }

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

async function createConsolidatedProgressEmbed(completions) {

    const completedEmoji = await getEmojiWithFallback('emoji_logoa_check', '✅');
    const pointsEmoji = await getEmojiWithFallback('emoji_points', '⭐');
    const progressEmoji = await getEmojiWithFallback('emoji_overall', '📊');

    const emojiCache = {};
    const groupedTasks = {};

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

        const taskIdentifier = `${statEmoji} **\`${row.taskName}\`**`;

        if (!groupedTasks[taskIdentifier]) {
            groupedTasks[taskIdentifier] = [];
        }

        const profileLink = await getPlayerLink(row.rsn);

        let contributionPercentage = '—';
        if (row.target && Number(row.target) > 0) {
            const progressValue = Number(row.progress);
            const totalValue = Number(row.target);
            contributionPercentage = calculateProgressPercentage(
                progressValue,
                totalValue
            );
            if (contributionPercentage > Number(100)) {
                contributionPercentage = '100.00';
            } else {
                contributionPercentage += '%';
            }
        }

        const progressNum = Number(row.progress);
        const formattedProgress =
      progressNum > 0 ? progressNum.toLocaleString() : '—';

        let progressDisplay = '';
        if (row.type === 'Exp') {
            progressDisplay = progressNum > 0 ? `${formattedProgress} XP` : '—';
        } else if (row.type === 'Kill') {
            progressDisplay =
        progressNum > 0
            ? progressNum === 1
                ? `${formattedProgress} Kill`
                : `${formattedProgress} Kills`
            : '—';
        } else {
            progressDisplay =
        progressNum > 0
            ? progressNum === 1
                ? `${formattedProgress} Completion`
                : `${formattedProgress} Completions`
            : '—';
        }

        let pointsDescription;
        if (row.points_awarded > 0) {
            pointsDescription = `- ${profileLink} — ${taskEmoji} **\`${progressDisplay}\`** — ${pointsEmoji} \`${row.points_awarded} pts\` — ${progressEmoji} \`${contributionPercentage}\``;
        } else {
            pointsDescription = `- ${profileLink} — ${taskEmoji} **\`${progressDisplay}\`** — ${pointsEmoji} \`— pts\` — ${progressEmoji} \`${contributionPercentage}\``;
        }

        groupedTasks[taskIdentifier].push(pointsDescription);
    }

    const embeds = [];
    let currentEmbedContent = '';
    let currentEmbed = new EmbedBuilder()
        .setTitle(`${completedEmoji} Task Completions`)
        .setColor(0x48de6f);

    for (const [taskName, playerData] of Object.entries(groupedTasks)) {
        const taskContent = `${taskName}\n${playerData.join('\n')}\n\n`;

        if (currentEmbedContent.length + taskContent.length > 4096) {
            currentEmbed.setDescription(currentEmbedContent.trim());
            embeds.push(currentEmbed);

            currentEmbed = new EmbedBuilder()
                .setTitle(`${completedEmoji} Task Completions (Continued)`)
                .setColor(0x48de6f);
            currentEmbedContent = '';
        }

        currentEmbedContent += taskContent;
    }

    if (currentEmbedContent.length > 0) {
        currentEmbed.setDescription(currentEmbedContent.trim());
        embeds.push(currentEmbed);
    }

    if (embeds.length > 0) {
        embeds[embeds.length - 1]
            .setFooter({ text: '🕓 Last Updated' })
            .setTimestamp(new Date());
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
