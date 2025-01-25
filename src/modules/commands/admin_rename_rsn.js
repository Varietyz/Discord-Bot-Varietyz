// @ts-nocheck
/**
 * @fileoverview Defines the `/admin_rename_rsn` slash command for the Varietyz Bot.
 * This command allows administrators to rename a registered RuneScape Name (RSN)
 * of a guild member. It includes validation, database interactions,
 * and an autocomplete feature for RSN suggestions.
 *
 * Core Features: (Administrator-only command)
 * - Allows administrators to rename a registered RSN for a guild member.
 * - Validates RSN format and checks for conflicts with existing RSNs.
 * - Verifies the RSN on Wise Old Man API before renaming.
 * - Provides confirmation and cancellation options for the renaming action.
 * - Autocomplete support for `target` and `current_rsn` fields based on registered RSNs.
 * - Handles rate limiting to prevent abuse of the command.
 * - Updates the database with the new RSN upon confirmation.
 *
 * External Dependencies:
 * - **Discord.js**: For handling slash commands, creating embeds, and managing interactive buttons.
 * - **Wise Old Man API**: For verifying RSNs and fetching player data.
 * - **SQLite**: For interacting with the registered RSN database.
 *
 * @module modules/commands/admin_rename_rsn
 */

const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const logger = require('../utils/logger');
const { runQuery, getAll, getOne } = require('../utils/dbUtils');
const { normalizeRsn } = require('../utils/normalizeRsn');
const { validateRsn } = require('../utils/validateRsn');
const { fetchPlayerData } = require('../utils/fetchPlayerData');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin_rename_rsn')
        .setDescription('Rename a registered RSN of a guild member.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addStringOption((option) => option.setName('target').setDescription('The guild member whose RSN you want to rename.').setRequired(true).setAutocomplete(true))
        .addStringOption((option) => option.setName('current_rsn').setDescription('The current RSN to rename.').setRequired(true).setAutocomplete(true))
        .addStringOption((option) => option.setName('new_rsn').setDescription('The new RSN to associate with the user.').setRequired(true)),

    /**
     * Executes the `/admin_rename_rsn` command.
     * Validates inputs, checks for conflicts, verifies RSN existence on Wise Old Man, and provides a confirmation prompt before renaming.
     *
     * @async
     * @function execute
     * @param {Discord.CommandInteraction} interaction - The interaction object representing the command execution.
     * @returns {Promise<void>} Resolves when the command is fully executed.
     */
    async execute(interaction) {
        try {
            const targetInput = interaction.options.getString('target');
            const currentRsn = interaction.options.getString('current_rsn');
            const newRsn = interaction.options.getString('new_rsn');

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
                    content: '❌ The specified target user could not be found. Please ensure you have entered the correct user.',
                    flags: 64,
                });
            }

            const targetUserID = targetUser.id;

            logger.info(`Administrator ${interaction.user.id} attempting to rename RSN '${currentRsn}' to '${newRsn}' for user ${targetUserID}`);

            const validation = validateRsn(newRsn);
            if (!validation.valid) {
                return await interaction.reply({
                    content: `❌ ${validation.message} Please check your input and try again.`,
                    flags: 64,
                });
            }

            const normalizedCurrentRsn = normalizeRsn(currentRsn);
            const normalizedNewRsn = normalizeRsn(newRsn);

            const playerData = await fetchPlayerData(normalizedNewRsn);
            if (!playerData) {
                const profileLink = `https://wiseoldman.net/players/${encodeURIComponent(normalizedNewRsn)}`;
                return await interaction.reply({
                    content: `❌ The RSN \`${newRsn}\` could not be verified on Wise Old Man. Ensure the name exists and try again.

🔗 [View Profile](${profileLink})`,
                    flags: 64,
                });
            }

            const existingUser = await getOne('SELECT user_id FROM registered_rsn WHERE LOWER(REPLACE(REPLACE(rsn, \'-\', \' \'), \'_\', \' \')) = ? LIMIT 1', [normalizedNewRsn]);

            if (existingUser && existingUser.user_id !== targetUserID) {
                return await interaction.reply({
                    content: `🚫 The RSN \`${newRsn}\` is already registered by another user: <@${existingUser.user_id}>.`,
                    flags: 64,
                });
            }

            const userRSNs = await getAll('SELECT rsn FROM registered_rsn WHERE user_id = ?', [targetUserID]);

            if (!userRSNs.length) {
                return await interaction.reply({
                    content: `⚠️ <@${targetUserID}> has no registered RSNs. Nothing to rename.`,
                    flags: 64,
                });
            }

            const normalizedUserRSNs = userRSNs.map((row) => normalizeRsn(row.rsn));

            if (!normalizedUserRSNs.includes(normalizedCurrentRsn)) {
                return await interaction.reply({
                    content: `⚠️ The RSN \`${currentRsn}\` was not found in <@${targetUserID}>'s registered RSNs.`,
                    flags: 64,
                });
            }

            const confirmationRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('confirm_rename_rsn').setLabel('Confirm').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('cancel_rename_rsn').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
            );

            await interaction.reply({
                content: `⚠️ **Confirmation Required**\nAre you sure you want to rename the RSN \`${currentRsn}\` to \`${newRsn}\` for <@${targetUserID}>?`,
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
                if (i.customId === 'confirm_rename_rsn') {
                    await runQuery(
                        `
                        UPDATE registered_rsn
                        SET rsn = ?
                        WHERE user_id = ? AND LOWER(REPLACE(REPLACE(rsn, '-', ' '), '_', ' ')) = ?
                        `,
                        [newRsn, targetUserID, normalizedCurrentRsn],
                    );

                    logger.info(`RSN '${currentRsn}' renamed to '${newRsn}' for user ${targetUserID} by admin ${interaction.user.id}`);

                    await i.update({
                        content: `✅ The RSN \`${currentRsn}\` has been successfully renamed to \`${newRsn}\` for <@${targetUserID}>.`,
                        components: [],
                        flags: 64,
                    });
                } else if (i.customId === 'cancel_rename_rsn') {
                    await i.update({
                        content: '❌ RSN renaming has been canceled.',
                        components: [],
                        flags: 64,
                    });
                }
            });

            collector.on('end', async (collected, reason) => {
                if (reason === 'time' && collected.size === 0) {
                    await interaction.editReply({
                        content: '⌛ Confirmation timed out. RSN renaming has been canceled.',
                        components: [],
                        flags: 64,
                    });
                }
            });
        } catch (error) {
            logger.error(`Error executing /admin_rename_rsn command: ${error.message}`);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: '❌ An error occurred while processing the request. Please try again later.',
                    flags: 64,
                });
            } else {
                await interaction.reply({
                    content: '❌ An error occurred while processing the request. Please try again later.',
                    flags: 64,
                });
            }
        }
    },

    /**
     * Provides autocomplete suggestions for the `target` and `current_rsn` options.
     *
     * @async
     * @function autocomplete
     * @param {Discord.AutocompleteInteraction} interaction - The interaction object for the autocomplete event.
     * @returns {Promise<void>} Resolves when suggestions are sent.
     */
    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);

        try {
            if (focusedOption.name === 'target') {
                const input = focusedOption.value.toLowerCase();

                const rsnUsers = await getAll('SELECT DISTINCT user_id FROM registered_rsn', []);

                const userIds = rsnUsers.map((row) => row.user_id);
                const guild = interaction.guild;
                if (!guild) {
                    return await interaction.respond([]);
                }

                const members = await guild.members.fetch({ user: userIds }).catch(() => new Map());

                const choices = await Promise.all(
                    Array.from(members.values()).map(async (member) => {
                        const userId = member.user.id;
                        const username = member.user.username.toLowerCase();
                        const discriminator = member.user.discriminator.toLowerCase();
                        const tag = `${member.user.username}#${member.user.discriminator}`.toLowerCase();

                        const rsns = await getAll('SELECT rsn FROM registered_rsn WHERE user_id = ?', [userId]);

                        const normalizedRsns = rsns.map((row) => ({
                            original: row.rsn,
                            normalized: normalizeRsn(row.rsn),
                        }));

                        const matchingRsns = normalizedRsns.filter((rsn) => rsn.normalized.includes(input));

                        const rsnDisplay = matchingRsns.length > 0 ? matchingRsns.map((rsn) => rsn.original).join(', ') : 'No RSN matches';

                        if (username.includes(input) || discriminator.includes(input) || tag.includes(input) || userId.includes(input) || matchingRsns.length > 0) {
                            return {
                                name: `${rsnDisplay} (${userId}) - ${member.user.username}`,
                                value: userId,
                            };
                        }

                        return null;
                    }),
                );

                await interaction.respond(choices.filter(Boolean).slice(0, 25));
            } else if (focusedOption.name === 'current_rsn') {
                const targetUserID = interaction.options.getString('target');

                if (!targetUserID) {
                    return await interaction.respond([]);
                }

                const rsnInput = focusedOption.value;
                const normalizedInput = normalizeRsn(rsnInput);

                const rsnsResult = await getAll(
                    `
    SELECT rsn 
    FROM registered_rsn 
    WHERE user_id = ? 
    AND LOWER(REPLACE(REPLACE(rsn, '-', ' '), '_', ' ')) LIKE LOWER(?)
    `,
                    [targetUserID, `%${normalizedInput}%`],
                );

                const choices = rsnsResult.map((row) => ({
                    name: row.rsn,
                    value: row.rsn,
                }));

                await interaction.respond(choices.slice(0, 25));
            }
        } catch (error) {
            logger.error(`Error in autocomplete for /admin_rename_rsn: ${error.message}`);
            await interaction.respond([]);
        }
    },
};
