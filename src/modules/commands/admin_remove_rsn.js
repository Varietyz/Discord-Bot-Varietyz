// @ts-nocheck
/**
 * @fileoverview Defines the `/admin_remove_rsn` slash command for the Varietyz Bot.
 * This admin command allows administrators to remove a single registered RuneScape Name (RSN) from a specified guild member's account.
 * It includes validation, database interactions, an autocomplete feature for RSN suggestions, and a confirmation prompt to prevent accidental removals.
 *
 * @module modules/commands/admin_remove_rsn
 */

const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const logger = require('../../utils/logger');
const { runQuery, getAll } = require('../../utils/dbUtils'); // Importing dbUtils functions
const { normalizeRsn } = require('../../utils/normalizeRsn'); // Importing normalizeRsn function

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin_remove_rsn')
        .setDescription('Remove a registered RSN from a guild member.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addStringOption((option) => option.setName('target').setDescription('The guild member whose RSN you want to remove.').setRequired(true).setAutocomplete(true))
        .addStringOption((option) => option.setName('rsn').setDescription('The RSN to remove.').setRequired(true).setAutocomplete(true)),

    /**
     * Executes the `/admin_remove_rsn` command, allowing administrators to remove a single RSN from a specified guild member's account.
     * It handles validation, database interactions, autocomplete suggestions, and provides a confirmation prompt before removal.
     *
     * @async
     * @function execute
     * @param {Discord.CommandInteraction} interaction - The interaction object representing the command execution.
     * @returns {Promise<void>} - Resolves when the command has been executed.
     * @example
     * // Handler in your bot's command execution logic
     * if (commandName === 'admin_remove_rsn') {
     * await commands.admin_remove_rsn.execute(interaction);
     * }
     */
    async execute(interaction) {
        try {
            // Extract options from the interaction
            const targetInput = interaction.options.getString('target');
            const rsnInput = interaction.options.getString('rsn');

            // Resolve the target user from the input string (assumed to be user ID)
            const guild = interaction.guild;
            if (!guild) {
                return await interaction.reply({
                    content: '❌ This command can only be used within a guild.',
                    flags: 64,
                });
            }

            // Fetch the user by ID
            const targetUser = await guild.members.fetch(targetInput).catch(() => null);

            if (!targetUser) {
                return await interaction.reply({
                    content: '❌ The specified target user could not be found. Please ensure you have entered the correct user.',
                    flags: 64,
                });
            }

            const targetUserID = targetUser.id;

            logger.info(`Administrator ${interaction.user.id} attempting to remove RSN "${rsnInput}" from user ${targetUserID}`);

            // Fetch all RSNs registered to the target user
            const userRSNs = await getAll(
                `
                SELECT rsn FROM registered_rsn
                WHERE user_id = ?
                `,
                [targetUserID],
            );

            // If no RSNs are registered, inform the administrator
            if (!userRSNs.length) {
                return await interaction.reply({
                    content: `⚠️ <@${targetUserID}> has no registered RSNs. Nothing to remove.`,
                    flags: 64,
                });
            }

            const normalizedUserRSNs = userRSNs.map((row) => normalizeRsn(row.rsn));
            const normalizedRsnInput = normalizeRsn(rsnInput);

            // Check if the RSN exists in the user's registered list
            if (!normalizedUserRSNs.includes(normalizedRsnInput)) {
                return await interaction.reply({
                    content: `⚠️ The RSN \`${rsnInput}\` was not found in <@${targetUserID}>'s registered RSNs.`,
                    flags: 64,
                });
            }

            // Create a confirmation prompt with Yes and No buttons
            const confirmationRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('confirm_remove_rsn').setLabel('Confirm').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('cancel_remove_rsn').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
            );

            // Send the confirmation prompt
            await interaction.reply({
                content: `⚠️ **Confirmation Required**\nAre you sure you want to remove the RSN \`${rsnInput}\` from <@${targetUserID}>?`,
                components: [confirmationRow],
                flags: 64, // Only the admin can see this confirmation
            });

            // Create a message component collector to handle button interactions
            const filter = (i) => i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({
                filter,
                time: 15000, // 15 seconds to respond
                max: 1, // Collect only one interaction
            });

            collector.on('collect', async (i) => {
                if (i.customId === 'confirm_remove_rsn') {
                    // Proceed to remove the RSN from the database
                    await runQuery(
                        `
                        DELETE FROM registered_rsn
                        WHERE user_id = ? AND LOWER(REPLACE(REPLACE(rsn, '-', ' '), '_', ' ')) = ?
                        `,
                        [targetUserID, normalizedRsnInput],
                    );

                    logger.info(`RSN "${rsnInput}" successfully removed from user ${targetUserID} by admin ${interaction.user.id}`);

                    await i.update({
                        content: `✅ The RSN \`${rsnInput}\` has been successfully removed from <@${targetUserID}>'s account.`,
                        components: [], // Remove buttons after confirmation
                        flags: 64,
                    });
                } else if (i.customId === 'cancel_remove_rsn') {
                    // Cancel the removal process
                    await i.update({
                        content: '❌ RSN removal has been canceled.',
                        components: [], // Remove buttons after cancellation
                        flags: 64,
                    });
                }
            });

            collector.on('end', async (collected, reason) => {
                if (reason === 'time' && collected.size === 0) {
                    // If the collector times out without any interaction
                    await interaction.editReply({
                        content: '⌛ Confirmation timed out. RSN removal has been canceled.',
                        components: [],
                        flags: 64,
                    });
                }
            });
        } catch (error) {
            logger.error(`Error executing /admin_remove_rsn command: ${error.message}`);
            // If the interaction has already been replied to, use followUp
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
     * Handles the autocomplete functionality for the `target` and `rsn` options in the `/admin_remove_rsn` command.
     *
     * - For the `target` option, suggests guild members who have registered RSNs.
     * - For the `rsn` option, suggests RSNs that the selected target user has registered and match the current input.
     *
     * @async
     * @function autocomplete
     * @param {Discord.CommandInteraction} interaction - The interaction object representing the autocomplete event.
     * @returns {Promise<void>} - Resolves when autocomplete suggestions have been sent.
     * @example
     * // Handler in your bot's command execution logic
     * if (commandName === 'admin_remove_rsn') {
     * await commands.admin_remove_rsn.autocomplete(interaction);
     * }
     */
    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);

        try {
            if (focusedOption.name === 'target') {
                // Autocomplete for the 'target' field: suggest users with registered RSNs
                const input = focusedOption.value.toLowerCase();

                // Fetch distinct user_ids from registered_rsn that have RSNs
                const rsnUsers = await getAll(
                    `
                    SELECT DISTINCT user_id FROM registered_rsn
                    `,
                    [],
                );

                const userIds = rsnUsers.map((row) => row.user_id);

                // Fetch guild members matching the user IDs
                const guild = interaction.guild;
                if (!guild) {
                    return await interaction.respond([]);
                }

                // Filter guild members by matching user IDs and input
                const members = await guild.members.fetch({ user: userIds }).catch(() => new Map());

                // Map the members to suggestion choices, filtering based on input
                const choices = await Promise.all(
                    Array.from(members.values()).map(async (member) => {
                        const userId = member.user.id;
                        const username = member.user.username.toLowerCase();
                        const discriminator = member.user.discriminator.toLowerCase();
                        const tag = `${member.user.username}#${member.user.discriminator}`.toLowerCase();

                        // Fetch RSNs linked to this user ID
                        const rsns = await getAll('SELECT rsn FROM registered_rsn WHERE user_id = ?', [userId]);

                        // Normalize RSNs for comparison
                        const normalizedRsns = rsns.map((row) => ({
                            original: row.rsn, // Keep the original RSN for display
                            normalized: normalizeRsn(row.rsn),
                        }));

                        // Filter RSNs that match the input
                        const matchingRsns = normalizedRsns.filter((rsn) => rsn.normalized.includes(input));

                        // Determine the RSN to display:
                        const rsnDisplay =
                            matchingRsns.length > 0
                                ? matchingRsns.map((rsn) => rsn.original).join(', ') // Display all matching RSNs
                                : 'No matching RSNs';

                        // Return the member as a choice if any field or RSN matches the input
                        if (username.includes(input) || discriminator.includes(input) || tag.includes(input) || userId.includes(input) || matchingRsns.length > 0) {
                            return {
                                name: `${rsnDisplay} (${userId}) - ${member.user.username}`,
                                value: userId,
                            };
                        }

                        return null; // Exclude members that don't match
                    }),
                );

                // Filter out null entries and limit to 25 choices
                await interaction.respond(choices.filter(Boolean).slice(0, 25));
            } else if (focusedOption.name === 'rsn') {
                // Autocomplete for the 'rsn' field: suggest RSNs for the selected target user

                const targetUserID = interaction.options.getString('target');

                if (!targetUserID) {
                    // If the target user is not specified yet, cannot provide RSN suggestions
                    return await interaction.respond([]);
                }

                const rsnInput = focusedOption.value;
                const normalizedInput = normalizeRsn(rsnInput);

                // Fetch RSNs registered to the target user that include the input substring
                const rsnsResult = await getAll(
                    `
                    SELECT rsn FROM registered_rsn
                    WHERE user_id = ? AND LOWER(REPLACE(REPLACE(rsn, '-', ' '), '_', ' ')) LIKE ?
                    `,
                    [targetUserID, `%${normalizedInput}%`],
                );

                const choices = rsnsResult.map((row) => ({
                    name: row.rsn,
                    value: row.rsn,
                }));

                await interaction.respond(choices.slice(0, 25)); // Discord allows a maximum of 25 choices
            }
        } catch (error) {
            logger.error(`Error in autocomplete for /admin_remove_rsn: ${error.message}`);
            await interaction.respond([]); // Send empty array to indicate no suggestions if there's an error
        }
    },
};
