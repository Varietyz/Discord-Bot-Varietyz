const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const logger = require('../../../utils/essentials/logger');
const { updateData } = require('../../../services/memberChannel');
module.exports = {
    data: new SlashCommandBuilder().setName('update_clan_channel').setDescription('ADMIN: Manually update the clan channel with the latest data.').setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    async execute(interaction) {
        if (!interaction.guild) {
            return await interaction.reply({
                content: '❌ **Error:** This command can only be used within a guild.',
                flags: 64,
            });
        }
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: 64 });
        }
        logger.info(`👮 Administrator \`${interaction.user.id}\` initiated a manual clan channel update.`);
        try {
            await updateData(interaction.client, { forceChannelUpdate: true });
            const successEmbed = new EmbedBuilder().setColor(0x00ff00).setTitle('✅ **Channel Update Successful**').setDescription('The clan channel has been updated with the latest member data.').setTimestamp();
            await interaction.editReply({ embeds: [successEmbed] });
        } catch (error) {
            logger.error(`❌ Error executing /update_clanchannel: ${error.message}`);
            await interaction.editReply({
                content: '❌ **Error:** An error occurred while updating the clan channel. Please try again later.',
            });
        }
    },
};