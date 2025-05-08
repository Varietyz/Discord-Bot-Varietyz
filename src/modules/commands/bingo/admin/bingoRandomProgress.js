const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../../utils/essentials/dbUtils');
const logger = require('../../../utils/essentials/logger');
const {
    synchronizeTaskCompletion,
} = require('../../../utils/essentials/syncTeamData');
const { updateBingoProgress } = require('../../../services/bingo/bingoService');
const client = require('../../../discordClient');

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('random-progression')
        .setDescription(
            'ADMIN: Set random progression for all active tasks, skipping already completed ones.'
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addStringOption((option) =>
            option
                .setName('what')
                .setDescription('Select target mode: individual, team')
                .setRequired(true)
                .addChoices(
                    { name: 'RSN', value: 'individual' },
                    { name: 'Team', value: 'team' }
                )
        )
        .addStringOption((option) =>
            option
                .setName('who')
                .setDescription(
                    'RSN (individual) or team identifier (team) for the update'
                )
                .setRequired(true)
                .setAutocomplete(true)
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });
        const mode = interaction.options.getString('what');
        const target = interaction.options.getString('who');

        const eventRow = await db.getOne(
            'SELECT event_id FROM bingo_state WHERE state = \'ongoing\' LIMIT 1'
        );
        if (!eventRow) {
            return interaction.editReply({
                content: '❌ No active Bingo event found.',
            });
        }
        const eventId = eventRow.event_id;

        const tasks = await db.getAll(
            `SELECT bbc.task_id, bt.parameter, bt.type, bt.value AS targetValue
             FROM bingo_board_cells bbc
             JOIN bingo_tasks bt ON bbc.task_id = bt.task_id
             WHERE bbc.board_id = (SELECT board_id FROM bingo_state WHERE event_id = ?)`,
            [eventId]
        );

        if (!tasks.length) {
            return interaction.editReply({
                content: '❌ No active tasks found for the current board.',
            });
        }

        let playerIds = [];
        if (mode === 'individual') {
            if (!target) {
                return interaction.editReply({
                    content: '❌ You must provide an RSN when mode is Individual.',
                });
            }
            const player = await db.getOne(
                `SELECT rr.player_id 
                 FROM registered_rsn rr
                 JOIN clan_members cm ON rr.player_id = cm.player_id
                 WHERE LOWER(rr.rsn) = LOWER(?)`,
                [target]
            );
            if (!player) {
                return interaction.editReply({
                    content: `❌ No player found with RSN: **${target}**.`,
                });
            }
            playerIds.push(player.player_id);
        } else if (mode === 'team') {
            if (!target) {
                return interaction.editReply({
                    content: '❌ You must provide a team identifier when mode is Team.',
                });
            }
            const team = await db.getOne(
                'SELECT team_id FROM bingo_teams WHERE LOWER(team_name) = LOWER(?) AND event_id = ?',
                [target, eventId]
            );

            if (!team) {
                return interaction.editReply({
                    content: `❌ No team found with identifier: **${target}**.`,
                });
            }
            const teamMembers = await db.getAll(
                'SELECT player_id FROM bingo_team_members WHERE team_id = ?',
                [team.team_id]
            );
            playerIds = teamMembers.map((m) => m.player_id);
            for (const member of teamMembers) {
                await synchronizeTaskCompletion(
                    eventId,
                    member.player_id,
                    team.team_id
                );
            }
        } else {
            return interaction.editReply({ content: '❌ Invalid mode specified.' });
        }

        if (playerIds.length === 0) {
            return interaction.editReply({
                content: `❌ No players found for **${mode}** ${target ? `(${target})` : ''}.`,
            });
        }

        for (const playerId of playerIds) {
            for (const task of tasks) {
                const { task_id, parameter, type, targetValue } = task;

                const existingTask = await db.getOne(
                    `SELECT progress_id, status FROM bingo_task_progress
                     WHERE event_id = ? AND player_id = ? AND task_id = ?`,
                    [eventId, playerId, task_id]
                );

                if (existingTask?.status === 'completed') {
                    logger.info(
                        `[SetRandomProgression] Skipping player ${playerId} for task ${parameter} (already completed).`
                    );
                    continue;
                }

                const randomValue = getRandomInt(
                    Math.max(1, Math.floor(targetValue * 0.1)), 
                    targetValue 
                );

                let updateColumn = 'exp';
                if (type.toLowerCase() === 'kill') updateColumn = 'kills';
                else if (type.toLowerCase() === 'score') updateColumn = 'score';

                const playerMetric = await db.getOne(
                    'SELECT metric FROM player_data WHERE player_id = ? AND metric = ?',
                    [playerId, parameter]
                );
                if (!playerMetric) {
                    logger.warn(
                        `[SetRandomProgression] No metric found in player_data for player ${playerId} with metric ${parameter}.`
                    );
                    continue;
                }

                await db.runQuery(
                    `UPDATE player_data
                     SET ${updateColumn} = ${updateColumn} + ?,
                         last_changed = CURRENT_TIMESTAMP,
                         last_updated = CURRENT_TIMESTAMP
                     WHERE player_id = ? AND metric = ?`,
                    [randomValue, playerId, parameter]
                );

                logger.info(
                    `[SetRandomProgression] Added ${randomValue} ${updateColumn} to player ${playerId} for task ${parameter}.`
                );
            }
        }
        await updateBingoProgress(client);
        return interaction.editReply({
            content: `✅ Random progression applied to all active tasks for **${mode}** ${target ? `(${target})` : ''}.`,
        });
    },

    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        const optionName = focusedOption.name;
        const query = focusedOption.value;
        let choices = [];
        try {
            if (optionName === 'who') {
                const mode = interaction.options.getString('what');
                if (mode === 'individual') {
                    const rows = await db.getAll(
                        `SELECT rr.rsn FROM registered_rsn rr
                         JOIN clan_members cm ON rr.player_id = cm.player_id
                         WHERE LOWER(rr.rsn) LIKE ?`,
                        [`%${query.toLowerCase()}%`]
                    );
                    choices = rows.map((row) => row.rsn);
                } else if (mode === 'team') {
                    const rows = await db.getAll(
                        `SELECT team_name FROM bingo_teams
                         WHERE LOWER(team_name) LIKE ? AND event_id = (SELECT event_id FROM bingo_state WHERE state = 'ongoing' LIMIT 1)`,
                        [`%${query.toLowerCase()}%`]
                    );
                    choices = rows.map((row) => row.team_name);
                }
            }
            const formatted = choices.map((choice) => ({
                name: String(choice),
                value: String(choice),
            }));
            await interaction.respond(formatted.slice(0, 25));
        } catch (error) {
            logger.error('Autocomplete error:', error);
            await interaction.respond([]);
        }
    },
};
