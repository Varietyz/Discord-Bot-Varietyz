const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../../../utils/essentials/dbUtils');
const logger = require('../../../../utils/essentials/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bingo-management')
        .setDescription('ADMIN: Manage Bingo progress by RSN and Parameter.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addStringOption((option) => option.setName('rsn').setDescription('Player RSN').setRequired(true).setAutocomplete(true))
        .addStringOption((option) => option.setName('parameter').setDescription('Task parameter').setRequired(true).setAutocomplete(true))
        .addIntegerOption((option) => option.setName('value').setDescription('New progress value to overwrite').setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });

        const rsn = interaction.options.getString('rsn');
        const parameter = interaction.options.getString('parameter');
        const value = interaction.options.getInteger('value');

        try {
            const player = await db.getOne(
                `
                SELECT rr.player_id 
                FROM registered_rsn rr
                JOIN clan_members cm ON rr.player_id = cm.player_id
                WHERE LOWER(rr.rsn) = LOWER(?)
                `,
                [rsn],
            );

            if (!player) {
                return interaction.editReply({ content: `❌ No player found with RSN: **${rsn}**.` });
            }
            const playerId = player.player_id;

            const task = await db.getOne(
                `
                SELECT bbc.task_id
                FROM bingo_board_cells bbc
                JOIN bingo_tasks bt ON bbc.task_id = bt.task_id
                WHERE bt.parameter = ?
                `,
                [parameter],
            );

            if (!task) {
                return interaction.editReply({ content: `❌ No task found with parameter: **${parameter}**.` });
            }
            const taskId = task.task_id;

            await db.runQuery(
                `
                UPDATE bingo_task_progress
                SET progress_value = ?, status = CASE 
                    WHEN ? >= (SELECT value FROM bingo_tasks WHERE task_id = ?) THEN 'completed'
                    WHEN ? > 0 THEN 'in-progress'
                    ELSE 'incomplete'
                END,
                last_updated = CURRENT_TIMESTAMP
                WHERE player_id = ? AND task_id = ?
                `,
                [value, value, taskId, value, playerId, taskId],
            );

            logger.info(`[BingoManagement] Progress updated: RSN=${rsn}, Parameter=${parameter}, Value=${value}`);
            await interaction.editReply({ content: `✅ Progress for **${rsn}** on **${parameter}** updated to **${value}**.` });
        } catch (error) {
            logger.error(`[BingoManagement] Error: ${error.message}`);
            await interaction.editReply({ content: '❌ An error occurred while updating Bingo progress.' });
        }
    },

    /**
     * Handles Autocomplete for RSN and Parameter
     * @param interaction
     */
    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);

        if (focusedOption.name === 'rsn') {
            const input = focusedOption.value.toLowerCase();
            const rsnChoices = await db.getAll(
                `
                SELECT DISTINCT rr.rsn
                FROM registered_rsn rr
                JOIN clan_members cm ON rr.player_id = cm.player_id
                WHERE LOWER(rr.rsn) LIKE ?
                ORDER BY rr.rsn ASC
                `,
                [`%${input}%`],
            );
            await interaction.respond(rsnChoices.map((row) => ({ name: row.rsn, value: row.rsn })).slice(0, 25));
        } else if (focusedOption.name === 'parameter') {
            const input = focusedOption.value.toLowerCase();
            const paramChoices = await db.getAll(
                `
                SELECT DISTINCT bt.parameter
                FROM bingo_tasks bt
                JOIN bingo_board_cells bbc ON bt.task_id = bbc.task_id
                WHERE LOWER(bt.parameter) LIKE ?
                ORDER BY bt.parameter ASC
                `,
                [`%${input}%`],
            );
            await interaction.respond(paramChoices.map((row) => ({ name: row.parameter, value: row.parameter })).slice(0, 25));
        }
    },
};
