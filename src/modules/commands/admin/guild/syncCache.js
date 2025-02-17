// @ts-nocheck
/**
 * @fileoverview
 * **Admin_update_channel Command** 🔄
 *
 * This command defines `/update_clanchannel` for the Varietyz Bot.
 * It allows administrators to manually trigger an update of the clan channel with the latest member data.
 * The command invokes the `updateData` function, which handles data retrieval from the WOM API,
 * role management, database updates, and refreshing of the clan channel.
 *
 * ---
 *
 * 🔹 **Usage:**
 * - Must be executed within a guild.
 * - Requires administrator permissions.
 *
 * 🔗 **External Dependencies:**
 * - **Discord.js**: For handling slash commands and interactions.
 * - **updateData**: The service function responsible for updating clan member data and refreshing the channel.
 *
 * @module modules/commands/adminUpdateClannieChannel
 */

const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const logger = require('../../../utils/essentials/logger');
const { populateImageCache } = require('../../../../migrations/populateImageCache');

module.exports = {
    data: new SlashCommandBuilder().setName('sync_cache').setDescription('ADMIN: Manually update the image cache with the latest data.').setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    /**
     * 🎯 **Executes the /update_clanchannel Command**
     *
     * This command allows administrators to manually update the clan channel by triggering the
     * `updateData` function with the `forceChannelUpdate` flag set to `true`. It ensures the command
     * is executed within a guild, defers the reply, logs the update initiation, and attempts the update.
     * Upon success, it sends an embed confirming the successful update; if an error occurs, it returns an error message.
     *
     * ---
     *
     * @async
     * @function execute
     * @param {Discord.CommandInteraction} interaction - The interaction object representing the command execution.
     * @returns {Promise<void>} Resolves when the command execution is complete.
     *
     * @example
     * // 📌 When an administrator runs /update_clanchannel:
     * await execute(interaction);
     */
    async execute(interaction) {
        if (!interaction.guild) {
            return await interaction.reply({
                content: '❌ **Error:** This command can only be used within a guild.',
                flags: 64,
            });
        }

        await interaction.deferReply({ flags: 64 });
        logger.info(`👮 Administrator \`${interaction.user.id}\` initiated a manual clan channel update.`);

        try {
            await populateImageCache();

            const successEmbed = new EmbedBuilder().setColor(0x00ff00).setTitle('✅ **Image Cache Update Successful**').setDescription('The image cache has been updated with the latest resource folder data.').setTimestamp();

            await interaction.editReply({ embeds: [successEmbed] });
        } catch (error) {
            logger.error(`❌ Error executing /update_clanchannel: ${error.message}`);
            await interaction.editReply({
                content: '❌ **Error:** An error occurred while updating the clan channel. Please try again later.',
            });
        }
    },
};
