// @ts-nocheck
/**
 * @fileoverview Defines the `/admin_remove_rsn` slash command for the Varietyz Bot.
 * This admin command allows administrators to remove a registered RuneScape Name (RSN) from a specified guild member.
 * The command includes validation, database interactions, autocomplete functionality, and a confirmation prompt to prevent accidental removals.
 *
 * Core Features: (Administrator-only command)
 * - Removes a registered RSN from a specified guild member's account.
 * - Validation and conflict checks before removing the RSN.
 * - Provides a confirmation prompt to avoid accidental removals.
 * - Autocomplete functionality for selecting target users and RSNs.
 * - Database updates to ensure the RSN is successfully removed.
 *
 * External Dependencies:
 * - **Discord.js**: For handling slash commands, creating embeds, and managing interactive buttons.
 * - **SQLite**: For interacting with the registered RSN database.
 *
 * @module modules/commands/admin_remove_rsn
 */

const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const logger = require('../utils/logger');
const { runQuery, getAll } = require('../utils/dbUtils');
const { normalizeRsn } = require('../utils/normalizeRsn');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin_remove_rsn')
        .setDescription('Remove a registered RSN from a guild member.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addStringOption((option) => option.setName('target').setDescription('The guild member whose RSN you want to remove.').setRequired(true).setAutocomplete(true))
        .addStringOption((option) => option.setName('rsn').setDescription('The RSN to remove.').setRequired(true).setAutocomplete(true)),

    /**
     * Executes the `/admin_remove_rsn` command to remove an RSN from a specified guild member.
     * Validates inputs, fetches database records, and provides a confirmation prompt before executing the removal.
     *
     * @async
     * @function execute
     * @param {Discord.CommandInteraction} interaction - The interaction object representing the command execution.
     * @returns {Promise<void>} Resolves when the command is fully executed.
     */
    async execute(interaction) {
        try {
            const targetInput = interaction.options.getString('target');
            const rsnInput = interaction.options.getString('rsn');

            const guild = interaction.guild;
            if (!guild) {
                return await interaction.reply({
                    content: '❌ This command can only be used within a guild.',
                    flags: 64,
                });
            }

            const targetUser = await guild.members.fetch(targetInput).catch(() => null);

            if (!targetUser) {
                return await interaction.reply({
                    content: '❌ The specified target user could not be found. Please check the input.',
                    flags: 64,
                });
            }

            const targetUserID = targetUser.id;

            // Log the admin action
            logger.info(`Admin ${interaction.user.id} initiated RSN removal for user ${targetUserID}: "${rsnInput}"`);

            const userRSNs = await getAll('SELECT rsn FROM registered_rsn WHERE user_id = ?', [targetUserID]);

            if (!userRSNs.length) {
                return await interaction.reply({
                    content: `⚠️ <@${targetUserID}> has no registered RSNs.`,
                    flags: 64,
                });
            }

            const normalizedUserRSNs = userRSNs.map((row) => normalizeRsn(row.rsn));
            const normalizedRsnInput = normalizeRsn(rsnInput);

            if (!normalizedUserRSNs.includes(normalizedRsnInput)) {
                return await interaction.reply({
                    content: `⚠️ The RSN \`${rsnInput}\` is not registered for <@${targetUserID}>.`,
                    flags: 64,
                });
            }

            // Prompt for confirmation
            const confirmationRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('confirm_remove_rsn').setLabel('Confirm').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('cancel_remove_rsn').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
            );

            await interaction.reply({
                content: `⚠️ **Confirmation Required**\nAre you sure you want to remove the RSN \`${rsnInput}\` from <@${targetUserID}>?`,
                components: [confirmationRow],
                flags: 64,
            });

            const filter = (i) => i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({
                filter,
                time: 15000,
                max: 1,
            });

            collector.on('collect', async (i) => {
                if (i.customId === 'confirm_remove_rsn') {
                    await runQuery(
                        `
                        DELETE FROM registered_rsn
                        WHERE user_id = ? AND LOWER(REPLACE(REPLACE(rsn, '-', ' '), '_', ' ')) = ?
                        `,
                        [targetUserID, normalizedRsnInput],
                    );

                    logger.info(`RSN "${rsnInput}" removed from user ${targetUserID} by admin ${interaction.user.id}.`);

                    await i.update({
                        content: `✅ The RSN \`${rsnInput}\` has been successfully removed from <@${targetUserID}>.`,
                        components: [],
                    });
                } else {
                    await i.update({
                        content: '❌ RSN removal has been canceled.',
                        components: [],
                    });
                }
            });

            collector.on('end', async (collected, reason) => {
                if (reason === 'time' && collected.size === 0) {
                    await interaction.editReply({
                        content: '⌛ Confirmation timed out. RSN removal has been canceled.',
                        components: [],
                    });
                }
            });
        } catch (error) {
            logger.error(`Error executing /admin_remove_rsn command: ${error.message}`);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: '❌ An error occurred while processing the command.',
                    flags: 64,
                });
            } else {
                await interaction.reply({
                    content: '❌ An error occurred while processing the command.',
                    flags: 64,
                });
            }
        }
    },

    /**
     * Provides autocomplete functionality for the `/admin_remove_rsn` command.
     *
     * @async
     * @function autocomplete
     * @param {Discord.CommandInteraction} interaction - The interaction object representing the autocomplete event.
     * @returns {Promise<void>} Resolves when autocomplete suggestions are sent.
     */
    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);

        try {
            if (focusedOption.name === 'target') {
                const input = focusedOption.value.toLowerCase();
                const rsnUsers = await getAll('SELECT DISTINCT user_id FROM registered_rsn', []);
                const userIds = rsnUsers.map((row) => row.user_id);

                const guild = interaction.guild;
                if (!guild) return await interaction.respond([]);

                const members = await guild.members.fetch({ user: userIds }).catch(() => new Map());
                const choices = Array.from(members.values())
                    .filter((member) => member.user.username.toLowerCase().includes(input) || member.user.id.includes(input))
                    .map((member) => ({
                        name: `${member.user.username} (${member.user.id})`,
                        value: member.user.id,
                    }));

                await interaction.respond(choices.slice(0, 25));
            } else if (focusedOption.name === 'rsn') {
                const targetUserID = interaction.options.getString('target');
                if (!targetUserID) return await interaction.respond([]);

                const rsnInput = normalizeRsn(focusedOption.value);
                const rsnsResult = await getAll('SELECT rsn FROM registered_rsn WHERE user_id = ? AND LOWER(REPLACE(REPLACE(rsn, "-", " "), "_", " ")) LIKE ?', [targetUserID, `%${rsnInput}%`]);

                const choices = rsnsResult.map((row) => ({
                    name: row.rsn,
                    value: row.rsn,
                }));

                await interaction.respond(choices.slice(0, 25));
            }
        } catch (error) {
            logger.error(`Error in autocomplete for /admin_remove_rsn: ${error.message}`);
            await interaction.respond([]);
        }
    },
};
