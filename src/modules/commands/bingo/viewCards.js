const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
const { generateBingoCard, getPlayerTasks, getEventId } = require('../../services/bingo/bingoImageGenerator');
const WOMApiClient = require('../../../api/wise_old_man/apiClient');
const { savePlayerDataToDb } = require('../../services/playerDataExtractor');
const { getLastFetchedTime, setLastFetchedTime } = require('../../utils/fetchers/lastFetchedTime');
const { getDataAttributes, getDataColumn, upsertTaskProgress } = require('../../services/bingo/bingoTaskManager');
const getEmoji = require('../../utils/fetchers/getEmoji');
const { computeOverallPercentage, computeTeamPartialPoints } = require('../../services/bingo/bingoCalculations');

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
            const emoji = await getEmoji('emoji_1_loading');
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
                    SELECT rr.player_id, rr.rsn, bt.team_id, bt.team_name
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
                        content: `${emoji} Team **${teamMember.team_name}**: Updating ${member.rsn}...`,
                    });
                    await updatePlayerData(member.rsn, member.player_id, eventId);
                }
                return await generateTeamCard(interaction, boardId, teamMember.team_id, teamMember.team_name);
            } else {
                logger.info('[BingoCards] Updating individual RSN data...');
                for (const row of userRows) {
                    await interaction.editReply({
                        content: `${emoji} Updating data for ${row.rsn}, please wait...`,
                    });
                    await updatePlayerData(row.rsn, row.player_id, eventId);
                }
                return await paginateIndividualCards(interaction, boardId, userRows);
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
 *
 * @param interaction
 * @param boardId
 * @param userRows
 */
async function paginateIndividualCards(interaction, boardId, userRows) {
    let currentIndex = 0;
    const total = userRows.length;

    const showCard = async (index) => {
        if (index < 0 || index >= total) {
            return interaction.editReply({ content: '❌ No more Bingo cards to display.', components: [] });
        }

        const { player_id, rsn } = userRows[index];
        const buffer = await generateBingoCard(boardId, player_id);

        const file = new AttachmentBuilder(buffer, { name: 'bingo_card.png' });
        const embed = new EmbedBuilder()
            .setTitle(`Bingo Card — ${rsn}`)
            .setColor(0x3498db)
            .setImage('attachment://bingo_card.png')
            .setFooter({ text: `Bingo Cards: Individual (${index + 1}/${total})` })
            .setTimestamp();

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

        await interaction.editReply({ content: '\u200b', embeds: [embed], files: [file], components: [row] });
    };

    await showCard(currentIndex);

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

/**
 *
 * @param interaction
 * @param boardId
 * @param teamId
 * @param teamName
 */
async function generateTeamCard(interaction, boardId, teamId, teamName) {
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

        const { partialPointsMap, teamTotalPartial, totalBoardPoints } = await computeTeamPartialPoints(eventId, teamId, true); // "true" => round per task

        // The "Team Overall" is partial_points / totalBoardPoints
        const teamOverallFloat = computeOverallPercentage(teamTotalPartial, totalBoardPoints);
        const teamOverall = teamOverallFloat.toFixed(2);

        // 3) Build the lines listing each member's partial points & share
        //    (unchanged from your old code, but we no longer do the partialPoints calculation here!)
        const teamMembers = await db.getAll(
            `
      SELECT rr.player_id, rr.rsn
      FROM registered_rsn rr
      JOIN bingo_team_members btm ON btm.player_id = rr.player_id
      WHERE btm.team_id = ?
      `,
            [teamId],
        );

        // Sort by highest partial points
        teamMembers.sort((a, b) => partialPointsMap[b.player_id] - partialPointsMap[a.player_id]);

        const memberLines = teamMembers.map((member) => {
            const mPoints = partialPointsMap[member.player_id];
            const ratio = teamTotalPartial > 0 ? ((mPoints / teamTotalPartial) * 100).toFixed(2) : '0.00';
            return `• **${member.rsn}** — \`${mPoints} pts\`, \`${ratio}%\` contribution`;
        });
        const membersList = memberLines.join('\n');

        // 4) Build the embed
        const embed = new EmbedBuilder()
            .setTitle(`Team Card — ${teamName}`)
            .setDescription(`**Finished:** \`${teamOverall}%\`\n` + `**Team's Total Points:** \`${teamTotalPartial}\`\n\n` + `**Team Members:**\n${membersList}`)
            .setColor(0xf1c40f)
            .setImage('attachment://bingo_card_team.png')
            .setFooter({ text: 'Bingo Cards: Team' })
            .setTimestamp();

        return interaction.editReply({
            content: '\u200b',
            embeds: [embed],
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
