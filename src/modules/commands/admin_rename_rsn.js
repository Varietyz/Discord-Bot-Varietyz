// @ts-nocheck
// File: admin_rename_rsn.js
/**
 * @fileoverview Defines the `/admin_rename_rsn` slash command for the Varietyz Bot.
 * This command allows administrators to rename a registered RuneScape Name (RSN)
 * of a guild member. It includes validation, database interactions,
 * and an autocomplete feature for RSN suggestions.
 *
 * @module modules/commands/admin_rename_rsn
 */

const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits } = require('discord.js');
const logger = require('../functions/logger');
const { runQuery, getAll } = require('../../utils/dbUtils'); // Importing dbUtils functions
const { normalizeRsn } = require('../../utils/normalizeRsn'); // Importing normalizeRsn function
const { validateRsn } = require('../../utils/validateRsn'); // Importing validateRsn function

/**
 * Defines the `/admin_rename_rsn` slash command using Discord's SlashCommandBuilder.
 *
 * @constant {SlashCommandBuilder}
 * @example
 * // This command can be registered with Discord's API
 * const adminRenameRsnCommand = module.exports.data;
 */
const data = new SlashCommandBuilder()
    .setName('admin_rename_rsn')
    .setDescription('Rename a registered RSN of a guild member.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((option) => option.setName('target').setDescription('The guild member whose RSN you want to rename.').setRequired(true))
    .addStringOption((option) => option.setName('current_rsn').setDescription('The current RSN to rename.').setRequired(true).setAutocomplete(true))
    .addStringOption((option) => option.setName('new_rsn').setDescription('The new RSN to associate with the user.').setRequired(true));

/**
 * Executes the `/admin_rename_rsn` command, allowing administrators to rename an RSN of a guild member.
 * It handles user input, validation, interacts with the database, and provides feedback.
 *
 * @async
 * @function execute
 * @param {Discord.CommandInteraction} interaction - The interaction object representing the command execution.
 * @returns {Promise<void>} - Resolves when the command has been executed.
 * @example
 * // Handler in your bot's command execution logic
 * if (commandName === 'admin_rename_rsn') {
 * await commands.admin_rename_rsn.execute(interaction);
 * }
 */
const execute = async (interaction) => {
    try {
        const targetUser = interaction.options.getUser('target');
        const currentRsn = interaction.options.getString('current_rsn');
        const newRsn = interaction.options.getString('new_rsn');

        // Log the command execution
        logger.info(`Administrator ${interaction.user.id} attempting to rename RSN '${currentRsn}' to '${newRsn}' for user ${targetUser.id}`);

        // Validate new RSN format
        const validation = validateRsn(newRsn);
        if (!validation.valid) {
            return await interaction.reply({
                content: `❌ ${validation.message} Please check your input and try again. 🛠️`,
                flags: 64,
            });
        }

        // Normalize RSNs
        const normalizedCurrentRsn = normalizeRsn(currentRsn);

        // Update the RSN in the database
        const updateQuery = `
            UPDATE registered_rsn
            SET rsn = ?
            WHERE discord_id = ? AND LOWER(REPLACE(REPLACE(rsn, '-', ' '), '_', ' ')) = ?
        `;
        const result = await runQuery(updateQuery, [newRsn, targetUser.id, normalizedCurrentRsn]);

        if (result.changes === 0) {
            return await interaction.reply({
                content: `⚠️ **No Changes Made:** The RSN \`${currentRsn}\` was not found for <@${targetUser.id}>. 🛡️`,
                flags: 64,
            });
        }

        // Respond to the administrator
        await interaction.reply({
            content: `✅ **Success!** RSN for <@${targetUser.id}> has been renamed from \`${currentRsn}\` to \`${newRsn}\`. 🎉`,
            flags: 64,
        });
    } catch (error) {
        logger.error(`Error executing /admin_rename_rsn command: ${error.message}`);
        await interaction.reply({
            content: '❌ An error occurred while processing your request. Please try again later. 🛠️',
            flags: 64,
        });
    }
};

/**
 * Handles the autocomplete functionality for the `/admin_rename_rsn` command.
 * Provides suggestions for RSNs that the specified user has registered and match the current input.
 *
 * @async
 * @function autocomplete
 * @param {Discord.AutocompleteInteraction} interaction - The interaction object representing the autocomplete event.
 * @returns {Promise<void>} - Resolves when autocomplete suggestions have been sent.
 * @example
 * // Handler in your bot's command execution logic
 * if (commandName === 'admin_rename_rsn') {
 * await commands.admin_rename_rsn.autocomplete(interaction);
 * }
 */
const autocomplete = async (interaction) => {
    const focusedOption = interaction.options.getFocused(true);
    const optionName = focusedOption.name;

    try {
        if (optionName === 'current_rsn') {
            const targetUser = interaction.options.getUser('target');
            if (!targetUser) {
                await interaction.respond([]);
                return;
            }

            const normalizedInput = normalizeRsn(focusedOption.value);
            const rsnResults = await getAll(
                `
                SELECT rsn FROM registered_rsn
                WHERE discord_id = ? AND LOWER(REPLACE(REPLACE(rsn, '-', ' '), '_', ' ')) LIKE ?
                LIMIT 25;
                `,
                [targetUser.id, `%${normalizedInput}%`],
            );

            const rsnChoices = rsnResults.map((row) => ({
                name: row.rsn,
                value: row.rsn,
            }));

            await interaction.respond(rsnChoices);
        }
    } catch (error) {
        logger.error(`Error in autocomplete for /admin_rename_rsn: ${error.message}`);
        await interaction.respond([]);
    }
};

module.exports = {
    data,
    execute,
    autocomplete,
};
