const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../../../utils/essentials/dbUtils');
const logger = require('../../../../utils/essentials/logger');
const { autoTransitionEvents } = require('../../../../services/bingo/autoTransitionEvents');

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
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });
        const subcommand = interaction.options.getSubcommand();
        const rsn = interaction.options.getString('rsn');

        try {
            // Fetch the player ID
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
                await interaction.editReply({ content: `✅ Task **${taskParam}** completed **(${percent}% - ${completionValue}/${targetValue})** for **${rsn}**.` });
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
                await autoTransitionEvents();
            }

            if (subcommand === 'set-progress') {
                const taskParam = interaction.options.getString('task');
                const progressValue = interaction.options.getInteger('progress_value');

                // Step 1: Fetch the active board's task using the event_id
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

                // Step 2: Determine which column to update based on the type from bingo_tasks
                let updateColumn = 'exp'; // Default column is 'exp'
                if (type.toLowerCase() === 'kill') {
                    updateColumn = 'kills';
                } else if (type.toLowerCase() === 'score') {
                    updateColumn = 'score';
                }

                // Step 3: Ensure that player_data has the matching metric (parameter)
                const playerMetric = await db.getOne('SELECT metric FROM player_data WHERE player_id = ? AND metric = ?', [playerId, parameter]);

                if (!playerMetric) {
                    return interaction.editReply({ content: `❌ No metric found in player data for **${parameter}**.` });
                }

                // Step 4: Update the player_data row by adjusting the correct column
                await db.runQuery(
                    `UPDATE player_data
         SET ${updateColumn} = ${updateColumn} + ?,
             last_changed = CURRENT_TIMESTAMP,
             last_updated = CURRENT_TIMESTAMP
         WHERE player_id = ? AND metric = ?`,
                    [progressValue, playerId, parameter],
                );

                logger.info(`[BingoManagement] Set progress for ${taskParam} to ${progressValue} under metric "${parameter}" (${updateColumn}) for RSN=${rsn}`);
                await interaction.editReply({ content: `✅ Progress for **${taskParam}** set to **${progressValue}** under metric **${parameter}** (${Math.floor((progressValue / targetValue) * 100)}%) for **${rsn}**.` });

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
                // 🔍 Fetch current active board
                const board = await db.getOne('SELECT board_id FROM bingo_state WHERE state = \'ongoing\' LIMIT 1');

                if (!board) {
                    await interaction.respond([]);
                    return;
                }

                // 🎯 Fetch tasks from the active board only
                const rows = await db.getAll(
                    `SELECT DISTINCT bt.parameter
                     FROM bingo_board_cells bbc
                     JOIN bingo_tasks bt ON bbc.task_id = bt.task_id
                     WHERE bbc.board_id = ? AND LOWER(bt.parameter) LIKE ? 
                     COLLATE NOCASE `,
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
