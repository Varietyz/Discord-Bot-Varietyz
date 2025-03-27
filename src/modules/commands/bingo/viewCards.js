const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
const { generateBingoCard, getPlayerTasks, getEventId } = require('../../services/bingo/bingoImageGenerator');
const WOMApiClient = require('../../../api/wise_old_man/apiClient');
const { savePlayerDataToDb } = require('../../services/playerDataExtractor');
const { getLastFetchedTime, setLastFetchedTime } = require('../../utils/fetchers/lastFetchedTime');
const { getDataAttributes, getDataColumn, upsertTaskProgress } = require('../../services/bingo/bingoTaskManager');
const { computeOverallPercentage, computeTeamPartialPoints, computeIndividualPartialPoints } = require('../../services/bingo/bingoCalculations');
const getEmojiWithFallback = require('../../utils/fetchers/getEmojiWithFallback');
const { getTeamTaskProgress, getPlayerTaskProgress } = require('../../services/bingo/embeds/bingoEmbedData');
const getPlayerLink = require('../../utils/fetchers/getPlayerLink');
const { buildActivePatternFields } = require('../../services/bingo/embeds/bingoInfoData');

/**
 *
 * @param eventId
 * @param playerId
 */
async function updateProgressForPlayer(eventId, playerId) {
    const tasks = await db.getAll(
        `
    SELECT bbc.task_id, bt.type, bt.parameter, bt.value, bt.description
    FROM bingo_board_cells bbc
    JOIN bingo_tasks bt ON bbc.task_id = bt.task_id
    JOIN bingo_state bs ON bs.board_id = bbc.board_id
    WHERE bs.event_id = ?
    `,
        [eventId],
    );

    for (const task of tasks) {
        const { task_id, type, parameter, value } = task;
        const dataColumn = getDataColumn(type);
        const { dataType, dataMetric } = getDataAttributes(type, parameter);

        const currentRow = await db.getOne(
            `
      SELECT ${dataColumn} AS currentValue
      FROM player_data
      WHERE player_id = ?
        AND type = ?
        AND metric = ?
      `,
            [playerId, dataType, dataMetric],
        );
        const currentValue = currentRow?.currentValue || 0;

        const dataKey = `${dataType}_${dataMetric}_${dataColumn}`;
        const baselineRow = await db.getOne(
            `
      SELECT data_value AS baselineValue
      FROM bingo_event_baseline
      WHERE event_id = ?
        AND player_id = ?
        AND data_key = ?
      `,
            [eventId, playerId, dataKey],
        );
        const baselineValue = baselineRow?.baselineValue || 0;

        const progressIncrement = Math.max(0, currentValue - baselineValue);
        let status = 'incomplete';
        if (progressIncrement >= value) {
            status = 'completed';
        } else if (progressIncrement > 0) {
            status = 'in-progress';
        }
        await upsertTaskProgress(eventId, playerId, task_id, progressIncrement, status);
    }
}

/**
 *
 * @param rsn
 * @param playerId
 * @param eventId
 */
async function updatePlayerData(rsn, playerId, eventId) {
    try {
        logger.info(`🔄 Updating data for ${rsn} (player: ${playerId})...`);
        const lastFetched = await getLastFetchedTime(playerId);
        const now = new Date();
        let playerData;
        if (lastFetched) {
            const minutesSinceLastFetch = (now.getTime() - lastFetched.getTime()) / (1000 * 60);
            if (minutesSinceLastFetch > 10) {
                logger.info(`🔄 Updating player ${rsn} on WOM API...`);
                playerData = await WOMApiClient.request('players', 'updatePlayer', rsn);
                await setLastFetchedTime(playerId);
            } else {
                logger.info(`📌 No update needed for ${rsn}.`);
                playerData = await WOMApiClient.request('players', 'getPlayerDetails', rsn);
            }
        } else {
            logger.info(`🔄 First-time update for ${rsn} on WOM API...`);
            playerData = await WOMApiClient.request('players', 'updatePlayer', rsn);
            await setLastFetchedTime(playerId);
        }
        await savePlayerDataToDb(rsn, playerData);
        await updateProgressForPlayer(eventId, playerId);
        logger.info(`✅ Updated data for ${rsn}`);
    } catch (err) {
        logger.error(`❌ Error updating data for ${rsn}: ${err.message}`);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bingo-cards')
        .setDescription('View your Bingo Card (Individual or Team) automatically.')
        .addStringOption((option) => option.setName('rsn').setDescription('The RSN to view (optional).').setAutocomplete(true).setRequired(false)),
    async execute(interaction) {
        try {
            const emojiTeam = await getEmojiWithFallback('emoji_clan_loading_team', 'Loading...');
            const emojiSolo = await getEmojiWithFallback('emoji_clan_loading_solo', 'Loading...');
            await interaction.deferReply({ flags: 64 });

            const ongoing = await db.getOne(`
                SELECT board_id, event_id
                FROM bingo_state
                WHERE state = 'ongoing'
                LIMIT 1
            `);
            if (!ongoing) {
                return interaction.editReply({ content: '❌ No ongoing Bingo event found.' });
            }
            const { board_id: boardId, event_id: eventId } = ongoing;

            const providedRsn = interaction.options.getString('rsn');
            let userRows;
            if (providedRsn) {
                const userRow = await db.getOne(
                    `
                    SELECT rr.player_id, rr.rsn, bt.team_id, bt.team_name
                    FROM registered_rsn rr
                    JOIN clan_members cm ON rr.player_id = cm.player_id
                    LEFT JOIN bingo_team_members btm ON btm.player_id = rr.player_id
                    LEFT JOIN (
                        SELECT * FROM bingo_teams WHERE event_id = ?
                    ) bt ON bt.team_id = btm.team_id
                    WHERE LOWER(rr.rsn) = LOWER(?)
                    COLLATE NOCASE
                    `,
                    [eventId, providedRsn],
                );
                if (!userRow) {
                    return interaction.editReply({
                        content: `❌ The RSN **${providedRsn}** is not registered or not an active clan member.`,
                        flags: 64,
                    });
                }
                userRows = [userRow];
            } else {
                userRows = await db.getAll(
                    `
    SELECT 
        rr.player_id, 
        rr.rsn, 
        COALESCE(bt.team_id, 0) AS team_id, 
        COALESCE(bt.team_name, '') AS team_name
    FROM registered_rsn rr
    JOIN clan_members cm ON rr.player_id = cm.player_id
    LEFT JOIN bingo_team_members btm ON btm.player_id = rr.player_id
    LEFT JOIN (
        SELECT * FROM bingo_teams WHERE event_id = ?
    ) bt ON bt.team_id = btm.team_id
    WHERE rr.discord_id = ?
      AND LOWER(rr.rsn) = LOWER(cm.rsn) COLLATE NOCASE
    `,
                    [eventId, interaction.user.id],
                );

                if (userRows.length === 0) {
                    return interaction.editReply({
                        content: '❌ You are either not registered or not an active clan member. Join the clan and register your RSN to participate in Bingo.',
                        flags: 64,
                    });
                }
            }

            const teamMember = userRows.find((row) => row.team_id);
            if (teamMember) {
                logger.info(`[BingoCards] RSN ${teamMember.rsn} is in a team (${teamMember.team_name}). Updating team member data...`);
                const teamMembers = await db.getAll(
                    `
                    SELECT rr.player_id, rr.rsn
                    FROM registered_rsn rr
                    JOIN bingo_team_members btm ON btm.player_id = rr.player_id
                    JOIN bingo_teams bt ON bt.team_id = btm.team_id
                    WHERE btm.team_id = ? AND bt.event_id = ?
                    `,
                    [teamMember.team_id, eventId],
                );
                for (const member of teamMembers) {
                    await interaction.editReply({
                        content: `${emojiTeam} Team **${teamMember.team_name}**: Updating ${member.rsn}...`,
                    });
                    await updatePlayerData(member.rsn, member.player_id, eventId);
                }
                return await generateTeamCard(interaction, boardId, teamMember.team_id, teamMember.team_name);
            } else {
                logger.info('[BingoCards] Updating individual RSN data...');
                for (const row of userRows) {
                    await interaction.editReply({
                        content: `${emojiSolo} Updating data for ${row.rsn}, please wait...`,
                    });
                    await updatePlayerData(row.rsn, row.player_id, eventId);
                }
                // Use userRows directly.
                if (userRows.length === 0) {
                    return interaction.editReply({
                        content: '❌ You are not registered or not an active clan member.',
                        flags: 64,
                    });
                }

                await handleBingoCardDisplay(interaction, boardId, userRows);
            }
        } catch (err) {
            logger.error('Error executing /bingo-cards command:', err);
            await interaction.editReply({
                content: '❌ An error occurred while displaying your Bingo card.',
            });
        }
    },
    async autocomplete(interaction) {
        try {
            const focusedValue = interaction.options.getFocused();
            const results = await db.getAll(
                `
                SELECT DISTINCT rr.rsn
                FROM registered_rsn rr
                JOIN clan_members cm ON rr.player_id = cm.player_id
                WHERE LOWER(rr.rsn) LIKE ?
                COLLATE NOCASE
                `,
                [`%${focusedValue}%`],
            );
            const choices = results.map((row) => ({ name: row.rsn, value: row.rsn })).slice(0, 25);
            await interaction.respond(choices);
        } catch (error) {
            logger.error(`❌ Autocomplete error: ${error.message}`);
            await interaction.respond([]);
        }
    },
};

/**
 * Builds an embed displaying the active Bingo patterns for a given event.
 * @param {number} eventId - The event identifier.
 * @param {number} [numRows=3] - The number of rows for the pattern grid.
 * @param {number} [numCols=5] - The number of columns for the pattern grid.
 * @returns {Promise<EmbedBuilder>} The embed containing active pattern fields.
 */
async function buildActivePatternsEmbed(eventId, numRows = 3, numCols = 5) {
    // Fetch active patterns from the database.
    const patternRows = await db.getAll('SELECT pattern_key, created_at FROM bingo_pattern_rotation WHERE event_id=?', [eventId]);
    // Build dynamic pattern fields using your helper.
    const dynamicPatternFields = await buildActivePatternFields(patternRows, numRows, numCols);

    // Create and configure the embed.
    const embed = new EmbedBuilder().setTitle('🎯 Active Patterns').setColor(0x00ff00).setTimestamp();

    // Append each dynamic field.
    dynamicPatternFields.forEach((field) => embed.addFields(field));

    return embed;
}

/**
 * Generates a formatted Bingo card embed for an individual player.
 * @param {number} boardId - The board identifier.
 * @param {Object} player - Player object containing { player_id, rsn }.
 * @returns {Promise<{ embed: EmbedBuilder, file: AttachmentBuilder }>} - The formatted embed and attachment.
 */
const generateBingoEmbed = async (boardId, player) => {
    const trophyEmoji = await getEmojiWithFallback('emoji_league_points', '🏆');
    const pointsEmoji = await getEmojiWithFallback('emoji_points', '⭐');
    const completedEmoji = await getEmojiWithFallback('emoji_completed', '📝');
    const progressEmoji = await getEmojiWithFallback('emoji_overall', '📊');

    const emojiCache = {};

    const fetchPlayerLeaderboardData = async (player) => {
        const { player_id, rsn } = player;

        const { partialPoints, totalBoardPoints } = await computeIndividualPartialPoints(boardId, player_id, true);
        const overallFloat = computeOverallPercentage(partialPoints, totalBoardPoints);
        const overall = parseFloat(overallFloat.toFixed(2));

        // Retrieve awarded points for this player
        const pointsRow = await db.getOne(
            `SELECT SUM(points_awarded) AS total_points
             FROM bingo_task_progress
             WHERE event_id = ? AND player_id = ?`,
            [boardId, player_id],
        );
        const total_points = pointsRow?.total_points || 0;

        // Retrieve count of **only completed** tasks
        const completedTasksRow = await db.getOne(
            `SELECT COUNT(*) AS completed_tasks
             FROM bingo_task_progress
             WHERE event_id = ? AND player_id = ? AND status = 'completed'`,
            [boardId, player_id],
        );
        const completed_tasks = completedTasksRow?.completed_tasks || 0;

        // Retrieve task progress for emojis
        const taskProgress = await getPlayerTaskProgress(boardId, player_id);
        let taskProgressStr = '';

        for (const task of taskProgress) {
            if (task.status === 'completed') {
                if (!emojiCache[task.parameter]) {
                    emojiCache[task.parameter] = await getEmojiWithFallback(`emoji_${task.parameter}`, '✅');
                }
                taskProgressStr += `${emojiCache[task.parameter]} `;
            }
        }
        if (!taskProgressStr) {
            taskProgressStr = '_No completed tasks yet._';
        }

        return {
            rsn,
            overall,
            total_points,
            completed_tasks,
            taskProgressStr,
        };
    };
    // Fetch player leaderboard data
    const playerData = await fetchPlayerLeaderboardData(player, boardId);

    // Generate Bingo card image
    const buffer = await generateBingoCard(boardId, player.player_id);
    const file = new AttachmentBuilder(buffer, { name: 'bingo_card.png' });

    const profileLink = await getPlayerLink(playerData.rsn);

    // Create embed with centralized structure
    const embed = new EmbedBuilder()
        .setTitle(`${trophyEmoji} Bingo Card — ${playerData.rsn}`)
        .setColor(0x3498db)
        .setImage('attachment://bingo_card.png')
        .setFooter({ text: 'Bingo Card: Individual' })
        .setTimestamp()
        .setDescription(
            `> ### ${profileLink}\n` +
                `> ${progressEmoji} Finished: \`${playerData.overall}%\`\n` +
                `> ${pointsEmoji} Earned: \`${playerData.total_points} pts\`\n` +
                `> ${completedEmoji} Tasks Completed: \`${playerData.completed_tasks}\`\n` +
                `> ### ${playerData.taskProgressStr}\n`,
        );

    const patternsEmbed = await buildActivePatternsEmbed(boardId, 3, 5);

    return { embeds: [embed, patternsEmbed], file };
};

/**
 * Handles displaying the Bingo card(s), with pagination if needed.
 * @param {Object} interaction - The Discord interaction.
 * @param {number} boardId - The board identifier.
 * @param {Array} userRows - Array of objects, each containing { player_id, rsn }.
 */
const handleBingoCardDisplay = async (interaction, boardId, userRows) => {
    if (userRows.length === 1) {
        // ✅ Single RSN: No pagination, display card directly.
        const {
            embeds: [embed, patternsEmbed],
            file,
        } = await generateBingoEmbed(boardId, userRows[0]);
        return await interaction.editReply({ content: '\u200b', embeds: [embed, patternsEmbed], files: [file] });
    } else if (userRows.length > 1) {
        // ✅ Multiple RSNs: Use pagination.
        return await paginateIndividualCards(interaction, boardId, userRows);
    }
};

/**
 * Paginate individual Bingo cards with leaderboard embed structure.
 * @param {Object} interaction - The Discord interaction.
 * @param {number} boardId - The board identifier.
 * @param {Array} userRows - Array of objects, each containing { player_id, rsn }.
 */
async function paginateIndividualCards(interaction, boardId, userRows) {
    let currentIndex = 0;
    const total = userRows.length;

    /**
     * Display a single Bingo card for a player.
     * @param {number} index - Index of the player in userRows.
     */
    const showCard = async (index) => {
        if (index < 0 || index >= total) {
            return interaction.editReply({ content: '❌ No more Bingo cards to display.', components: [] });
        }

        const player = userRows[index];
        const { embed, file } = await generateBingoEmbed(boardId, player);

        const components = [];
        if (total > 1) {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('prev')
                    .setLabel('⬅️ Previous')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(index === 0),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('➡️ Next')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(index === total - 1),
            );
            components.push(row);
        }

        await interaction.editReply({ content: '\u200b', embeds: [embed], files: [file], components });
    };

    // Show the first card
    await showCard(currentIndex);

    // Set up pagination only if there is more than one RSN
    if (total > 1) {
        const collector = interaction.channel.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async (i) => {
            await i.deferUpdate();
            if (i.customId === 'prev' && currentIndex > 0) {
                currentIndex--;
            } else if (i.customId === 'next' && currentIndex < total - 1) {
                currentIndex++;
            }
            await showCard(currentIndex);
        });

        collector.on('end', async () => {
            await interaction.editReply({ content: '\u200b', components: [] });
        });
    }
}

/**
 *
 * @param interaction
 * @param boardId
 * @param teamId
 * @param teamName
 */
async function generateTeamCard(interaction, boardId, teamId, teamName) {
    const trophyEmoji = await getEmojiWithFallback('emoji_league_points', '🏆');
    const pointsEmoji = await getEmojiWithFallback('emoji_points', '⭐');
    const completedEmoji = await getEmojiWithFallback('emoji_completed', '📝');
    const progressEmoji = await getEmojiWithFallback('emoji_overall', '📊');
    const teamEmoji = await getEmojiWithFallback('emoji_clan_logo', '👥');
    try {
        // 1) Generate the Bingo card image (unchanged).
        const tasks = await getPlayerTasks(boardId, teamId, true);
        if (!tasks || tasks.length === 0) {
            return interaction.editReply({ content: `❌ No tasks found for Team **${teamName}**.`, flags: 64 });
        }
        const buffer = await generateBingoCard(boardId, teamId, true);
        if (!buffer) {
            return interaction.editReply({ content: `❌ Could not generate card for Team **${teamName}**.`, flags: 64 });
        }
        const file = new AttachmentBuilder(buffer, { name: 'bingo_card_team.png' });

        const eventId = await getEventId(boardId);

        let leaderboardDescription = '';
        const emojiCache = []; // Cache for emoji lookups.
        const teamProgress = [];

        // Fetch actual awarded points from the DB for each team
        const teamPointsMap = {};
        const pointsResults = await db.getAll(
            `SELECT team_id, SUM(points_awarded) AS total_points
                 FROM bingo_task_progress
                 WHERE event_id = ?
                 GROUP BY team_id`,
            [eventId],
        );
        pointsResults.forEach((row) => {
            teamPointsMap[row.team_id] = row.total_points || 0;
        });

        const { totalBoardPoints, teamTotalOverallPartial, overallPartialPointsMap } = await computeTeamPartialPoints(eventId, teamId);
        const actualTeamPoints = teamPointsMap[teamId] || 0;

        // The "Team Overall" is partial_points / totalBoardPoints
        const overallFloat = computeOverallPercentage(teamTotalOverallPartial, totalBoardPoints);
        const overall = parseFloat(overallFloat.toFixed(2));

        // Build a row of emojis for tasks that the team has fully completed.
        const taskProgress = await getTeamTaskProgress(eventId, teamId);
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
        const teamMembers = await db.getAll(
            `
                SELECT rr.rsn, rr.player_id
                FROM bingo_team_members btm
                JOIN registered_rsn rr ON btm.player_id = rr.player_id
                WHERE btm.team_id = ?
                ORDER BY rr.rsn COLLATE NOCASE ASC
                `,
            [teamId],
        );

        // For each member, compute their contribution % based on overall progress (partial progress).
        const memberLines = [];
        // Sort members by their overall partial progress (from overallPartialPointsMap).
        teamMembers.sort((a, b) => (overallPartialPointsMap[b.player_id] || 0) - (overallPartialPointsMap[a.player_id] || 0));
        for (const member of teamMembers) {
            const playerPointsMap = {};
            const pointsResults = await db.getAll(
                `SELECT player_id, SUM(points_awarded) AS total_points
                     FROM bingo_task_progress
                     WHERE event_id = ?
                     GROUP BY player_id`,
                [eventId],
            );
            pointsResults.forEach((row) => {
                playerPointsMap[row.player_id] = row.total_points || 0;
            });

            // Display earned points based solely on completions.
            const actualPoints = playerPointsMap[member.player_id] || 0;
            // Now compute contribution % based on overall progress.
            const userOverallPoints = overallPartialPointsMap[member.player_id] || 0;
            const userShare = teamTotalOverallPartial > 0 ? ((userOverallPoints / teamTotalOverallPartial) * 100).toFixed(2) : '0.00';

            const profileLink = await getPlayerLink(member.rsn);

            memberLines.push(`> - ${profileLink} — \`${userShare}%\` ${progressEmoji} — \`${actualPoints} pts\` ${pointsEmoji}`);
        }

        const memberSection = memberLines.join('\n') || '> _No members found._';

        // Save the team's data for the leaderboard.
        teamProgress.push({
            team_name: teamName,
            overall, // Overall progress % (from any progression)
            partial_points: actualTeamPoints, // Total awarded points from completions
            completed_tasks: completedTasks,
            taskProgressStr,
            memberSection,
        });

        // 4) Build the embed
        const embed = new EmbedBuilder().setTitle(`${trophyEmoji} Team Card — Bingo Event #${eventId}`).setColor(0xf1c40f).setImage('attachment://bingo_card_team.png').setFooter({ text: 'Bingo Cards: Team' }).setTimestamp();
        leaderboardDescription += `> ### ${teamEmoji} Team: **\`${teamName}\`**\n`;
        leaderboardDescription += `> Finished: **\`${overall.toFixed(2)}%\` ${progressEmoji}**\n> Team Points: \`${actualTeamPoints} pts\` ${pointsEmoji}\n`;
        leaderboardDescription += `${memberSection}\n`;
        leaderboardDescription += `> ${completedEmoji}Tasks Completed: \`${completedTasks}\`\n`;
        leaderboardDescription += `> ### ${taskProgressStr}\n\n`;

        embed.setDescription(leaderboardDescription);
        const patternsEmbed = await buildActivePatternsEmbed(boardId, 3, 5);

        return interaction.editReply({
            content: '\u200b',
            embeds: [embed, patternsEmbed],
            files: [file],
            flags: 64,
        });
    } catch (err) {
        logger.error(`[BingoCards] Error generating team card: ${err.message}`);
        return interaction.editReply({
            content: '❌ An error occurred while generating your Team Bingo card.',
            flags: 64,
        });
    }
}
