const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../../utils/essentials/dbUtils');
const logger = require('../../../utils/essentials/logger');
const { autoTransitionEvents } = require('../../../services/bingo/autoTransitionEvents');
const { updateBingoProgress } = require('../../../services/bingo/bingoService');
const client = require('../../../../main');
const { updateEventBaseline } = require('../../../services/bingo/bingoTaskManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bingo-management')
        .setDescription('ADMIN: Manage Bingo progress, tasks, and points.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)

        // Subcommand: Complete Task (Now with optional %)
        .addSubcommand((sub) =>
            sub
                .setName('complete-task')
                .setDescription('Complete a specific task for a player (optionally by percentage).')
                .addStringOption((option) => option.setName('rsn').setDescription('Player RSN').setRequired(true).setAutocomplete(true))
                .addStringOption((option) => option.setName('task').setDescription('Task Parameter').setRequired(true).setAutocomplete(true))
                .addIntegerOption((option) => option.setName('percent').setDescription('Completion percentage (optional, 1-100)').setMinValue(1).setMaxValue(100)),
        )
        // Subcommand: Manage Points
        .addSubcommand((sub) =>
            sub
                .setName('manage-points')
                .setDescription('Manually adjust points for a player.')
                .addStringOption((option) => option.setName('rsn').setDescription('Player RSN').setRequired(true).setAutocomplete(true))
                .addStringOption((option) => option.setName('point_type').setDescription('Type of Points').setRequired(true).setAutocomplete(true))
                .addIntegerOption((option) => option.setName('value').setDescription('Points Value').setRequired(true).setMinValue(-1000000).setMaxValue(1000000)),
        )
        // Subcommand: Set Progress Value
        .addSubcommand((sub) =>
            sub
                .setName('set-progress')
                .setDescription('Set a specific progress value for a player\'s task.')
                .addStringOption((option) => option.setName('rsn').setDescription('Player RSN').setRequired(true).setAutocomplete(true))
                .addStringOption((option) => option.setName('task').setDescription('Task Parameter').setRequired(true).setAutocomplete(true))
                .addIntegerOption((option) => option.setName('progress_value').setDescription('New Progress Value').setRequired(true).setMinValue(0).setMaxValue(1000000000)),
        )
        // Subcommand: Reset Baseline & Progress
        .addSubcommand((sub) =>
            sub
                .setName('reset-baseline')
                .setDescription('Reset baseline progression and clear related data for a player.')
                .addStringOption((option) => option.setName('rsn').setDescription('Player RSN').setRequired(true).setAutocomplete(true)),
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });
        const subcommand = interaction.options.getSubcommand();
        const rsn = interaction.options.getString('rsn');

        try {
            // Fetch the player ID using the provided RSN
            const player = await db.getOne(
                `SELECT rr.player_id 
                 FROM registered_rsn rr
                 JOIN clan_members cm ON rr.player_id = cm.player_id
                 WHERE LOWER(rr.rsn) = LOWER(?)`,
                [rsn],
            );

            if (!player) {
                return interaction.editReply({ content: `❌ No player found with RSN: **${rsn}**.` });
            }
            const playerId = player.player_id;

            // Fetch the active event
            const event = await db.getOne('SELECT event_id FROM bingo_state WHERE state = \'ongoing\' LIMIT 1');
            if (!event) {
                return interaction.editReply({ content: '❌ No active Bingo event found.' });
            }
            const eventId = event.event_id;

            // Handle subcommands
            if (subcommand === 'complete-task') {
                const taskParam = interaction.options.getString('task');
                const percent = interaction.options.getInteger('percent') || 100;

                const task = await db.getOne(
                    `SELECT bbc.task_id, bt.value AS targetValue
                     FROM bingo_board_cells bbc
                     JOIN bingo_tasks bt ON bbc.task_id = bt.task_id
                     WHERE bbc.board_id = (SELECT board_id FROM bingo_state WHERE event_id = ?) 
                     AND bt.parameter = ?`,
                    [eventId, taskParam],
                );

                if (!task) {
                    return interaction.editReply({ content: `❌ No active task found with parameter: **${taskParam}**.` });
                }
                const { task_id, targetValue } = task;

                // Calculate progress based on percentage
                const completionValue = Math.floor((percent / 100) * targetValue);

                await db.runQuery(
                    `UPDATE bingo_task_progress
                     SET progress_value = ?, status = 'completed', last_updated = CURRENT_TIMESTAMP
                     WHERE player_id = ? AND task_id = ?`,
                    [completionValue, playerId, task_id],
                );

                logger.info(`[BingoManagement] Completed task ${taskParam} (${percent}%) for RSN=${rsn}`);
                await interaction.editReply({
                    content: `✅ Task **${taskParam}** completed **(${percent}% - ${completionValue}/${targetValue})** for **${rsn}**.`,
                });
                await updateBingoProgress(client);
                await autoTransitionEvents();
            }

            if (subcommand === 'manage-points') {
                const pointType = interaction.options.getString('point_type');
                const value = interaction.options.getInteger('value');

                const validColumns = {
                    pattern_bonus: 'pattern_bonus',
                    base_points: 'base_points',
                    extra_points: 'extra_points',
                };

                if (!validColumns[pointType]) {
                    return interaction.editReply({ content: `❌ Invalid point type: **${pointType}**.` });
                }

                await db.runQuery(
                    `UPDATE bingo_leaderboard
                     SET ${validColumns[pointType]} = ${validColumns[pointType]} + ?
                     WHERE player_id = ?`,
                    [value, playerId],
                );

                logger.info(`[BingoManagement] Adjusted ${pointType} by ${value} for RSN=${rsn}`);
                await interaction.editReply({ content: `✅ ${pointType} adjusted by ${value} for **${rsn}**.` });
                await updateBingoProgress(client);
                await autoTransitionEvents();
            }

            if (subcommand === 'set-progress') {
                const taskParam = interaction.options.getString('task');
                const progressValue = interaction.options.getInteger('progress_value');

                // Fetch the active board's task using the event_id
                const task = await db.getOne(
                    `SELECT bbc.task_id, bt.parameter, bt.type, bt.value AS targetValue
                     FROM bingo_board_cells bbc
                     JOIN bingo_tasks bt ON bbc.task_id = bt.task_id
                     WHERE bbc.board_id = (SELECT board_id FROM bingo_state WHERE event_id = ?)
                     AND bt.parameter = ?`,
                    [eventId, taskParam],
                );

                if (!task) {
                    return interaction.editReply({ content: `❌ No active task found with parameter: **${taskParam}**.` });
                }
                const { parameter, type, targetValue } = task;

                // Determine which column to update based on the task type
                let updateColumn = 'exp'; // Default metric column
                if (type.toLowerCase() === 'kill') {
                    updateColumn = 'kills';
                } else if (type.toLowerCase() === 'score') {
                    updateColumn = 'score';
                }

                // Ensure the player's data contains the matching metric
                const playerMetric = await db.getOne('SELECT metric FROM player_data WHERE player_id = ? AND metric = ?', [playerId, parameter]);

                if (!playerMetric) {
                    return interaction.editReply({ content: `❌ No metric found in player data for **${parameter}**.` });
                }

                // Update the player's metric in player_data
                await db.runQuery(
                    `UPDATE player_data
                     SET ${updateColumn} = ${updateColumn} + ?,
                         last_changed = CURRENT_TIMESTAMP,
                         last_updated = CURRENT_TIMESTAMP
                     WHERE player_id = ? AND metric = ?`,
                    [progressValue, playerId, parameter],
                );

                logger.info(`[BingoManagement] Set progress for ${taskParam} to ${progressValue} under metric "${parameter}" (${updateColumn}) for RSN=${rsn}`);
                await interaction.editReply({
                    content: `✅ Progress for **${taskParam}** set to **${progressValue}** under metric **${parameter}** (${Math.floor((progressValue / targetValue) * 100)}%) for **${rsn}**.`,
                });

                await updateBingoProgress(client);
                await autoTransitionEvents();
            }

            if (subcommand === 'reset-baseline') {
                // RESET BASELINE AND RELATED DATA

                // 1. Delete the baseline entries for the player from the bingo_event_baseline table.
                await db.runQuery('DELETE FROM bingo_event_baseline WHERE event_id = ? AND player_id = ?', [eventId, playerId]);

                // 2. Re-insert baseline data from player_data.
                // The updateEventBaseline function will add missing baseline entries for the player.
                await updateEventBaseline(client);

                // 3. Reset the player's task progress in bingo_task_progress.
                //    Set extra_points, points_awarded, and progress_value to zero.
                await db.runQuery(
                    `UPDATE bingo_task_progress
                     SET extra_points = 0,
                         points_awarded = 0,
                         progress_value = 0,
                         status = 'incomplete',
                         last_updated = CURRENT_TIMESTAMP
                     WHERE event_id = ? AND player_id = ?`,
                    [eventId, playerId],
                );

                // 4. Reset the player's leaderboard data.
                //    Zero out total_points, completed_tasks, and pattern_bonus.
                await db.runQuery(
                    `UPDATE bingo_leaderboard
                     SET total_points = 0,
                         completed_tasks = 0,
                         pattern_bonus = 0,
                         last_updated = CURRENT_TIMESTAMP
                     WHERE event_id = ? AND player_id = ?`,
                    [eventId, playerId],
                );

                // 5. Delete any awarded bingo patterns for the player.
                await db.runQuery('DELETE FROM bingo_patterns_awarded WHERE event_id = ? AND player_id = ?', [eventId, playerId]);

                logger.info(`[BingoManagement] Reset baseline and related Bingo data for RSN=${rsn}`);
                await interaction.editReply({ content: `✅ Baseline progression and related Bingo data have been reset for **${rsn}**.` });

                // Optionally, refresh the overall Bingo progress and event state.
                await updateBingoProgress(client);
                await autoTransitionEvents();
            }
        } catch (error) {
            logger.error(`[BingoManagement] Error: ${error.message}`);
            await interaction.editReply({ content: '❌ An error occurred while managing Bingo.' });
        }
    },

    /**
     * Autocomplete handler for dynamic and static option suggestions.
     *
     * This function checks which option is being autocompleted and:
     * - Queries the database for dynamic options (RSN and task)
     * - Provides static arrays for pattern, point types, and progress values
     * @param interaction
     */
    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        const optionName = focusedOption.name;
        const query = focusedOption.value;
        let choices = [];

        try {
            switch (optionName) {
            case 'rsn': {
                const rows = await db.getAll(
                    `SELECT rr.rsn FROM registered_rsn rr
                         JOIN clan_members cm ON rr.player_id = cm.player_id
                         WHERE LOWER(rr.rsn) LIKE ?`,
                    [`%${query.toLowerCase()}%`],
                );
                choices = rows.map((row) => row.rsn);
                break;
            }
            case 'task': {
                // Fetch current active board
                const board = await db.getOne('SELECT board_id FROM bingo_state WHERE state = \'ongoing\' LIMIT 1');

                if (!board) {
                    await interaction.respond([]);
                    return;
                }

                // Fetch tasks from the active board only
                const rows = await db.getAll(
                    `SELECT DISTINCT bt.parameter
                         FROM bingo_board_cells bbc
                         JOIN bingo_tasks bt ON bbc.task_id = bt.task_id
                         WHERE bbc.board_id = ? AND LOWER(bt.parameter) LIKE ? 
                         COLLATE NOCASE`,
                    [board.board_id, `%${query.toLowerCase()}%`],
                );

                choices = rows.map((row) => row.parameter);
                break;
            }
            case 'point_type': {
                const pointTypes = ['pattern_bonus', 'base_points', 'extra_points'];
                choices = pointTypes.filter((pt) => pt.toLowerCase().startsWith(query.toLowerCase()));
                break;
            }
            case 'progress_value': {
                const progressValues = [100000, 1000000, 10000000];
                choices = progressValues.filter((val) => String(val).startsWith(query));
                break;
            }
            default:
                choices = [];
            }

            const formatted = choices.map((choice) => ({
                name: String(choice),
                value: typeof choice === 'number' ? choice : String(choice),
            }));
            await interaction.respond(formatted.slice(0, 25));
        } catch (error) {
            console.error('Autocomplete error:', error);
            await interaction.respond([]);
        }
    },
};
