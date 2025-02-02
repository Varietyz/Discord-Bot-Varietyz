// @ts-nocheck
/**
 * @fileoverview
 * **Admin_update_channel Command** 🔄
 *
 * Defines the `/admin_update_channel` slash command for the Varietyz Bot.
 * This command allows administrators to manually trigger an update of the clan channel with the latest member data.
 * It calls the `updateData` function, which handles data retrieval from the WOM API, role management,
 * database updates, and refreshing the Discord channel.
 *
 * **External Dependencies:**
 * - **Discord.js**: For handling slash commands and interactions.
 * - **updateData**: The function responsible for updating clan member data and refreshing the clan channel.
 *
 * @module modules/commands/adminUpdateClannieChannel
 */

const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');
const { updateData } = require('../services/memberChannel');

module.exports = {
    data: new SlashCommandBuilder().setName('update_clanchannel').setDescription('Manually update the clan channel with the latest data.').setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    /**
     * 🎯 Executes the `/admin_update_channel` command.
     *
     * This command allows administrators to manually update the clan channel by triggering the
     * `updateData` function with the `forceChannelUpdate` flag set to `true`. It first checks that
     * the command is used within a guild, then defers the reply, logs the action, and attempts the update.
     * On success, a success embed is sent; on failure, an error message is returned.
     *
     * @async
     * @function execute
     * @param {Discord.CommandInteraction} interaction - The interaction object representing the command execution.
     * @returns {Promise<void>} Resolves when the command execution is complete.
     *
     * @example
     * // When an administrator runs /update_clanchannel:
     * await execute(interaction);
     */
    async execute(interaction) {
        if (!interaction.guild) {
            return await interaction.reply({
                content: '❌ This command can only be used within a guild.',
                flags: 64,
            });
        }

        await interaction.deferReply({ flags: 64 });
        logger.info(`Administrator ${interaction.user.id} initiated a manual clan channel update.`);

        try {
            // Force the channel update regardless of detected changes.
            await updateData(interaction.client, { forceChannelUpdate: true });

            const successEmbed = new EmbedBuilder().setColor(0x00ff00).setTitle('Channel Update Successful').setDescription('The clan channel has been successfully updated with the latest data.').setTimestamp();

            await interaction.editReply({ embeds: [successEmbed] });
        } catch (error) {
            logger.error(`Error executing /update_clanchannel: ${error.message}`);
            await interaction.editReply({
                content: '❌ An error occurred while updating the clan channel. Please try again later.',
            });
        }
    },
};
