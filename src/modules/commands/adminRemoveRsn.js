// @ts-nocheck
/**
 * @fileoverview
 * **Admin_remove_rsn Command** 🔥
 *
 * Defines the `/admin_remove_rsn` slash command for the Varietyz Bot.
 * This administrator-only command allows administrators to remove a registered RuneScape Name (RSN)
 * from a specified guild member's account. The command validates inputs, checks for the RSN's existence,
 * and provides a confirmation prompt before executing the removal. It also supports autocomplete for the
 * `target` and `rsn` options.
 *
 * **External Dependencies:**
 * - **Discord.js**: For handling slash commands, creating embeds, and managing interactive buttons.
 * - **SQLite**: For interacting with the registered RSN database.
 *
 * @module modules/commands/adminRemoveRsn
 */

const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, EmbedBuilder } = require('discord.js');
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
     * 🎯 Executes the `/admin_remove_rsn` command.
     *
     * This function handles the removal of a registered RSN from a specified guild member.
     * It performs the following steps:
     * 1. Retrieves the target user and the RSN to remove from the command options.
     * 2. Validates that the command is used in a guild and that the target user exists.
     * 3. Fetches the target user's registered RSNs and normalizes them.
     * 4. Checks whether the provided RSN exists in the target user's registered RSNs.
     * 5. Sends a confirmation prompt with interactive buttons (Confirm/Cancel).
     * 6. If confirmed, removes the RSN from the database and sends a DM to the target user.
     *
     * @async
     * @function execute
     * @param {Discord.CommandInteraction} interaction - The interaction object representing the command.
     * @returns {Promise<void>} Resolves when the command execution is complete.
     *
     * @example
     * // When an administrator runs /admin_remove_rsn, this function is invoked.
     * await execute(interaction);
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

            // Log the administrator's action
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

            // Prompt for confirmation before removal.
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

                    const removalEmbed = new EmbedBuilder()
                        .setColor(0xff0000)
                        .setTitle('❌ RSN Removed')
                        .setDescription(`Your RuneScape Name \`${rsnInput}\` has been removed from our records. ⚠️\n\nThis action was performed by: <@${interaction.user.id}>`)
                        .setFooter({ text: 'Varietyz Bot' })
                        .setTimestamp();

                    await targetUser.send({ embeds: [removalEmbed] }).catch(() => {
                        logger.warn(`Failed to send RSN removal DM to user ${targetUserID}`);
                    });

                    await i.update({
                        content: `✅ The RSN \`${rsnInput}\` has been successfully removed from <@${targetUserID}>.`,
                        components: [],
                        flags: 64,
                    });
                } else {
                    await i.update({
                        content: '❌ RSN removal has been canceled.',
                        components: [],
                        flags: 64,
                    });
                }
            });

            collector.on('end', async (collected, reason) => {
                if (reason === 'time' && collected.size === 0) {
                    await interaction.editReply({
                        content: '⌛ Confirmation timed out. RSN removal has been canceled.',
                        components: [],
                        flags: 64,
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
     * 🎯 Provides autocomplete suggestions for the `/admin_remove_rsn` command.
     *
     * For the `target` option, it retrieves a list of unique user IDs from the registered RSNs,
     * fetches the corresponding guild members, and returns suggestions based on the input.
     *
     * For the `rsn` option, it filters the target user's registered RSNs based on the input.
     *
     * @async
     * @function autocomplete
     * @param {Discord.AutocompleteInteraction} interaction - The autocomplete interaction object.
     * @returns {Promise<void>} Resolves when autocomplete suggestions have been sent.
     *
     * @example
     * // Invoked when a user types in the `target` or `rsn` field.
     * await autocomplete(interaction);
     */
    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);

        try {
            if (focusedOption.name === 'target') {
                const input = focusedOption.value.toLowerCase();

                // Fetch all unique user IDs from the registered RSN table.
                const rsnUsers = await getAll('SELECT DISTINCT user_id FROM registered_rsn', []);
                const userIds = rsnUsers.map((row) => row.user_id);

                const guild = interaction.guild;
                if (!guild) return await interaction.respond([]);

                // Fetch guild members corresponding to the user IDs.
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

                        // Match the input against the normalized RSNs.
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
            } else if (focusedOption.name === 'rsn') {
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
                    AND LOWER(REPLACE(REPLACE(rsn, '-', ' '), '_', ' ')) LIKE ?`,
                    [targetUserID, `%${normalizedInput}%`],
                );

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
