// @ts-nocheck
/**
 * @fileoverview
 * **Admin_assign_rsn Command** 🔄
 *
 * Defines the `/admin_assign_rsn` slash command for the Varietyz Bot.
 * This command allows administrators to assign a new RuneScape Name (RSN) to a guild member
 * by adding the RSN to the database. It performs input validation, conflict checking, and verifies the RSN
 * against the Wise Old Man API before prompting for confirmation to complete the assignment.
 *
 * **Core Features:**
 * - Assigns an RSN to a specified guild member.
 * - Validates the new RSN format and checks for conflicts with existing RSNs.
 * - Verifies the RSN on the Wise Old Man API.
 * - Provides an interactive confirmation prompt to avoid accidental assignments.
 * - Notifies the target user via a DM once the RSN is registered.
 *
 * **External Dependencies:**
 * - **Discord.js**: For handling slash commands, creating embeds, and managing interactive buttons.
 * - **Wise Old Man API**: For verifying RSNs and fetching player data.
 * - **SQLite**: For interacting with the RSN database.
 *
 * @module modules/commands/adminAssignRsn
 */

const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');
const { runQuery, getOne } = require('../utils/dbUtils');
const { normalizeRsn } = require('../utils/normalizeRsn');
const { validateRsn } = require('../utils/validateRsn');
const { fetchPlayerData } = require('../utils/fetchPlayerData');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin_assign_rsn')
        .setDescription('Assign a RuneScape Name (RSN) to a guild member.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addUserOption((option) => option.setName('target').setDescription('The guild member to assign an RSN to.').setRequired(true))
        .addStringOption((option) => option.setName('rsn').setDescription('The RuneScape Name to assign.').setRequired(true)),

    /**
     * 🎯 Executes the `/admin_assign_rsn` command.
     *
     * This function handles the RSN assignment process by:
     * 1. Retrieving the target user and the RSN to assign from the command options.
     * 2. Validating the RSN format using `validateRsn` and normalizing the RSN.
     * 3. Verifying the existence of the RSN on the Wise Old Man API via `fetchPlayerData`.
     * 4. Checking for conflicts in the database to ensure the RSN is not already registered.
     * 5. Sending a confirmation prompt with interactive buttons for the admin to confirm or cancel the action.
     * 6. Upon confirmation, inserting the RSN into the database and notifying the target user via DM.
     *
     * @async
     * @function execute
     * @param {Discord.CommandInteraction} interaction - The interaction object representing the command execution.
     * @returns {Promise<void>} Resolves when the command execution is complete.
     *
     * @example
     * // Invoked when an admin runs /admin_assign_rsn with the required options:
     * await execute(interaction);
     */
    async execute(interaction) {
        try {
            const targetUser = interaction.options.getUser('target');
            const rsn = interaction.options.getString('rsn');

            logger.info(`Administrator ${interaction.user.id} attempting to assign RSN '${rsn}' to user ${targetUser.id}`);

            const validation = validateRsn(rsn);
            if (!validation.valid) {
                return await interaction.reply({
                    content: `❌ ${validation.message} Please check your input and try again.`,
                    flags: 64,
                });
            }

            const normalizedRsn = normalizeRsn(rsn);

            // Verify RSN existence on Wise Old Man
            const playerData = await fetchPlayerData(normalizedRsn);
            if (!playerData) {
                const profileLink = `https://wiseoldman.net/players/${encodeURIComponent(normalizedRsn)}`;
                return await interaction.reply({
                    content: `❌ The RSN \`${rsn}\` could not be verified on Wise Old Man. Ensure the name exists and try again.\n\n🔗 [View Profile](${profileLink})`,
                    flags: 64,
                });
            }

            const existingUser = await getOne('SELECT user_id FROM registered_rsn WHERE LOWER(REPLACE(REPLACE(rsn, "-", " "), "_", " ")) = ? LIMIT 1', [normalizedRsn]);

            if (existingUser) {
                return await interaction.reply({
                    content: `🚫 The RSN \`${rsn}\` is already registered by another user: <@${existingUser.user_id}>.`,
                    flags: 64,
                });
            }

            const confirmationRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('confirm_assign_rsn').setLabel('Confirm').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('cancel_assign_rsn').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
            );

            await interaction.reply({
                content: `⚠️ **Confirmation Required**
Are you sure you want to assign the RSN \`${rsn}\` to <@${targetUser.id}>?`,
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
                if (i.customId === 'confirm_assign_rsn') {
                    await runQuery('INSERT INTO registered_rsn (user_id, rsn, registered_at) VALUES (?, ?, ?)', [targetUser.id, rsn, new Date().toISOString()]);

                    logger.info(`RSN '${rsn}' assigned to user ${targetUser.id} by admin ${interaction.user.id}`);

                    const userEmbed = new EmbedBuilder()
                        .setColor(0x00ff00)
                        .setTitle('✅ RSN Registered')
                        .setDescription(`\`${rsn}\` was registered to our records. ⚠️\n\nThis action was performed by: <@${interaction.user.id}>`)
                        .setFooter({ text: 'Varietyz Bot' })
                        .setTimestamp();

                    await targetUser.send({ embeds: [userEmbed] }).catch(() => {
                        logger.warn(`Failed to send DM to user ${targetUser.id}`);
                    });

                    await i.update({
                        content: `✅ The RSN \`${rsn}\` has been successfully assigned to <@${targetUser.id}>.`,
                        components: [],
                        flags: 64,
                    });
                } else if (i.customId === 'cancel_assign_rsn') {
                    await i.update({
                        content: '❌ RSN assignment has been canceled.',
                        components: [],
                        flags: 64,
                    });
                }
            });

            collector.on('end', async (collected, reason) => {
                if (reason === 'time' && collected.size === 0) {
                    await interaction.editReply({
                        content: '⌛ Confirmation timed out. RSN assignment has been canceled.',
                        components: [],
                        flags: 64,
                    });
                }
            });
        } catch (error) {
            logger.error(`Error executing /admin_assign_rsn command: ${error.message}`);
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
};
