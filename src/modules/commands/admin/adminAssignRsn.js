// @ts-nocheck
/**
 * @fileoverview
 * **Admin_assign_rsn Command** 🔄
 *
 * This command defines the `/admin_assign_rsn` slash command for the Varietyz Bot.
 * It allows administrators to assign a new RuneScape Name (RSN) to a guild member by adding the RSN to the database.
 * The command performs input validation, conflict checking, and verifies the RSN against the Wise Old Man API before prompting
 * for confirmation to complete the assignment. Upon confirmation, it inserts the RSN into the database and notifies the target user via DM.
 *
 * ---
 *
 * 🔹 **Usage:**
 * - Administrator-only command.
 * - Provides an interactive confirmation prompt to avoid accidental assignments.
 *
 * 🔗 **External Dependencies:**
 * - **Discord.js** for handling slash commands, embeds, and interactive buttons.
 * - **Wise Old Man API** for verifying RSNs and fetching player data.
 * - **SQLite** for interacting with the RSN database.
 *
 * @module modules/commands/adminAssignRsn
 */

const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, EmbedBuilder } = require('discord.js');
const logger = require('../../utils/essentials/logger');
const { runQuery, getOne } = require('../../utils/essentials/dbUtils');
const { normalizeRsn } = require('../../utils/normalizing/normalizeRsn');
const { validateRsn } = require('../../utils/helpers/validateRsn');
const { fetchPlayerData } = require('../../utils/fetchers/fetchPlayerData');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin_assign_rsn')
        .setDescription('Assign a RuneScape Name (RSN) to a guild member.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addUserOption((option) => option.setName('target').setDescription('The guild member to assign an RSN to.').setRequired(true))
        .addStringOption((option) => option.setName('rsn').setDescription('The RuneScape Name to assign.').setRequired(true)),

    /**
     * 🎯 **Executes the /admin_assign_rsn Command**
     *
     * This function handles the RSN assignment process by performing the following steps:
     *
     * 1. Retrieves the target user and the RSN to assign from the command options.
     * 2. Validates the new RSN format using `validateRsn` and normalizes the RSN.
     * 3. Verifies the RSN on the Wise Old Man API via `fetchPlayerData`.
     * 4. Checks for conflicts to ensure the RSN is not already registered.
     * 5. Sends a confirmation prompt with interactive buttons (Confirm/Cancel) to proceed with the assignment.
     * 6. Upon confirmation, inserts the RSN into the database and notifies the target user via DM.
     *
     * @async
     * @function execute
     * @param {Discord.CommandInteraction} interaction - The interaction object representing the command execution.
     * @returns {Promise<void>} Resolves when the command execution is complete.
     *
     * @example
     * // 📌 Example:
     * // /admin_assign_rsn target:@User rsn:"PlayerOne"
     * await execute(interaction);
     */
    async execute(interaction) {
        try {
            const targetUser = interaction.options.getUser('target');
            const rsn = interaction.options.getString('rsn');

            logger.info(`🔍 Admin ${interaction.user.id} attempting to assign RSN "\`${rsn}\`" to user \`${targetUser.id}\`.`);

            // Validate RSN format
            const validation = validateRsn(rsn);
            if (!validation.valid) {
                return await interaction.reply({
                    content: `❌ **Error:** ${validation.message} Please check your input and try again.`,
                    flags: 64,
                });
            }

            const normalizedRsn = normalizeRsn(rsn);

            // Verify RSN via Wise Old Man API
            const playerData = await fetchPlayerData(normalizedRsn);
            if (!playerData) {
                const profileLink = `https://wiseoldman.net/players/${encodeURIComponent(normalizedRsn)}`;
                return await interaction.reply({
                    content: `❌ **Verification Failed:** The RSN "\`${rsn}\`" could not be verified on Wise Old Man. Please ensure the name exists and try again.\n\n🔗 [View Profile](${profileLink})`,
                    flags: 64,
                });
            }
            const womPlayerId = playerData.id;

            // Check for conflicts: RSN already registered
            const existingUser = await getOne('SELECT discord_id FROM registered_rsn WHERE LOWER(REPLACE(REPLACE(rsn, "-", " "), "_", " ")) = ? LIMIT 1', [normalizedRsn]);
            if (existingUser) {
                return await interaction.reply({
                    content: `🚫 **Conflict:** The RSN "\`${rsn}\`" is already registered by <@${existingUser.discord_id}>.`,
                    flags: 64,
                });
            }

            // Build confirmation prompt
            const confirmationRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('confirm_assign_rsn').setLabel('Confirm').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('cancel_assign_rsn').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
            );

            await interaction.reply({
                content: `⚠️ **Confirmation Required**\nAre you sure you want to assign the RSN "\`${rsn}\`" to <@${targetUser.id}>?`,
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
                    // Insert RSN into the database
                    await runQuery('INSERT INTO registered_rsn (player_id, discord_id, rsn, registered_at) VALUES (?, ?, ?, ?)', [womPlayerId, targetUser.id, rsn, new Date().toISOString()]);

                    logger.info(`✅ RSN "\`${rsn}\`" (WOM ID: \`${womPlayerId}\`) assigned to user \`${targetUser.id}\` by admin ${interaction.user.id}.`);

                    const userEmbed = new EmbedBuilder()
                        .setColor(0x00ff00)
                        .setTitle('✅ RSN Registered')
                        .setDescription(`Your RuneScape Name "\`${rsn}\`" (WOM ID: \`${womPlayerId}\`) has been successfully registered in our records.\n\n*This action was performed by: <@${interaction.user.id}>*`)
                        .setFooter({ text: 'Varietyz Bot' })
                        .setTimestamp();

                    // Attempt to send a DM to the target user
                    await targetUser.send({ embeds: [userEmbed] }).catch(() => {
                        logger.warn(`⚠️ Failed to send DM to user \`${targetUser.id}\`.`);
                    });

                    await i.update({
                        content: `✅ **Success:** The RSN "\`${rsn}\`" (WOM ID: \`${womPlayerId}\`) has been successfully assigned to <@${targetUser.id}>.`,
                        components: [],
                        flags: 64,
                    });
                } else if (i.customId === 'cancel_assign_rsn') {
                    await i.update({
                        content: '❌ **Canceled:** RSN assignment has been canceled.',
                        components: [],
                        flags: 64,
                    });
                }
            });

            collector.on('end', async (collected, reason) => {
                if (reason === 'time' && collected.size === 0) {
                    await interaction.editReply({
                        content: '⌛ **Timeout:** Confirmation timed out. RSN assignment has been canceled.',
                        components: [],
                        flags: 64,
                    });
                }
            });
        } catch (error) {
            logger.error(`❌ Error executing /admin_assign_rsn command: ${error.message}`);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: '❌ **Error:** An error occurred while processing the request. Please try again later.',
                    flags: 64,
                });
            } else {
                await interaction.reply({
                    content: '❌ **Error:** An error occurred while processing the request. Please try again later.',
                    flags: 64,
                });
            }
        }
    },
};
