const { EmbedBuilder } = require('discord.js');
const { getTopTeams, getTopPlayers, getPlayerTaskProgress, getTeamTaskProgress } = require('./bingoEmbedData');
const { calculateOverallProgress } = require('./bingoImageGenerator');
const getEmojiWithFallback = require('../../utils/fetchers/getEmojiWithFallback');
const dbUtils = require('../../utils/essentials/dbUtils');
const getPlayerRank = require('../../utils/fetchers/getPlayerRank');
const logger = require('../../utils/essentials/logger');

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
    } else {
        let leaderboardDescription = '';
        const emojiCache = {};
        const playerProgress = [];

        // Process each player asynchronously
        await Promise.all(
            topPlayers.map(async (player) => {
                const overall = await calculateOverallProgress(eventId, player.player_id, false);

                // Only include players with progress greater than 0
                if (parseFloat(overall) > 0) {
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
                        overall: parseFloat(overall),
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
        } else {
            playerProgress.sort((a, b) => b.overall - a.overall);
            playerProgress.forEach((player, index) => {
                leaderboardDescription += `> ### **${index + 1}.** ${player.rankEmoji} **[${player.rsn}](${player.profileLink})**\n`;
                leaderboardDescription += `> ${progressEmoji}Finished: \`${player.overall}%\` \n> ${pointsEmoji}Earned: \`${player.total_points} pts\`\n`;
                leaderboardDescription += `> ${completedEmoji}Tasks Completed: \`${player.completed_tasks}\`\n`;
                leaderboardDescription += `> ${player.taskProgressStr}\n\n`;
            });
            embed.setDescription(leaderboardDescription);
        }
    }

    return embed;
}

/**
 *
 * @param eventId
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

    const topTeams = await getTopTeams(eventId);

    // If no teams were returned, set a default message.
    if (topTeams.length === 0) {
        embed.setDescription('No team completions yet.');
    } else {
        let leaderboardDescription = '';
        const emojiCache = {};
        const teamProgress = [];

        // Process each team asynchronously
        await Promise.all(
            topTeams.map(async (team) => {
                const overall = await calculateOverallProgress(eventId, team.team_id, true);
                if (parseFloat(overall) > 0) {
                    const taskProgress = await getTeamTaskProgress(eventId, team.team_id);
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

                    if (!taskProgressStr) {
                        taskProgressStr = '_No completed tasks yet._';
                    }

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

                    const memberProgress = [];
                    await Promise.all(
                        teamMembers.map(async (member) => {
                            const memberOverall = await calculateOverallProgress(eventId, member.player_id, false);
                            memberProgress.push({
                                rsn: member.rsn,
                                player_id: member.player_id,
                                overall: parseFloat(memberOverall),
                                total_points: team.total_points,
                            });
                        }),
                    );
                    memberProgress.sort((a, b) => b.overall - a.overall);
                    const memberList = await Promise.all(
                        memberProgress.map(async (member) => {
                            const playerRank = await getPlayerRank(member.player_id);
                            let memberEmoji = emojiCache[playerRank];
                            if (!memberEmoji) {
                                memberEmoji = await getEmojiWithFallback(`emoji_${playerRank}`, '👤');
                                emojiCache[playerRank] = memberEmoji;
                            }
                            const playerNameForLink = encodeURIComponent(member.rsn);
                            const profileLink = `https://wiseoldman.net/players/${playerNameForLink}`;
                            return `> - ${memberEmoji}[${member.rsn}](${profileLink}) contributed \`${member.overall}%\`${progressEmoji} & earned \`${member.total_points} pts\`${pointsEmoji}`;
                        }),
                    );
                    const memberSection = memberList.join('\n') || '> _No members found._';
                    teamProgress.push({
                        team_name: team.team_name,
                        overall: parseFloat(overall),
                        total_points: team.total_points,
                        completed_tasks: team.completed_tasks,
                        taskProgressStr,
                        memberSection,
                    });
                }
            }),
        );

        // If no team has progress, set a default message.
        if (teamProgress.length === 0) {
            embed.setDescription('No team completions yet.');
        } else {
            teamProgress.sort((a, b) => b.overall - a.overall);
            teamProgress.forEach((team) => {
                leaderboardDescription += `> ### ${teamEmoji} Team: **\`${team.team_name}\`**\n`;
                leaderboardDescription += `> Finished: **\`${team.overall}%\`${progressEmoji}**\n`;
                leaderboardDescription += `${team.memberSection}\n`;
                leaderboardDescription += `> ${completedEmoji}Tasks Completed: \`${team.completed_tasks}\`\n`;
                leaderboardDescription += `> ${team.taskProgressStr}\n\n`;
            });
            embed.setDescription(leaderboardDescription);
        }
    }

    return embed;
}

module.exports = {
    createProgressEmbed,
    createFinalResultsEmbed,
    createTeamLeaderboardEmbed,
    createIndividualLeaderboardEmbed,
};
