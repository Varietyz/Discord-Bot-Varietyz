const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const logger = require('../../../utils/essentials/logger');
const { updateAllTimeLeaderboard } = require('../../../services/competitionServices/alltimeCompetitionWinners');
module.exports = {
    data: new SlashCommandBuilder().setName('update_toptenchannel').setDescription('ADMIN: Manually update the top 10 channel with the latest data.').setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    async execute(interaction) {
        if (!interaction.guild) {
            return await interaction.reply({
                content: '❌ **Error:** This command can only be used within a guild.',
                flags: 64,
            });
        }
        await interaction.deferReply({ flags: 64 });
        logger.info(`👮 Administrator \`${interaction.user.id}\` initiated a manual top 10 channel update.`);
        try {
            await updateAllTimeLeaderboard(interaction.client);
            const successEmbed = new EmbedBuilder().setColor(0x00ff00).setTitle('✅ **Channel Update Successful**').setDescription('The top10 channel has been updated with the latest member data.').setTimestamp();
            await interaction.editReply({ embeds: [successEmbed] });
        } catch (error) {
            logger.error(`❌ Error executing /update_toptenchannel: ${error.message}`);
            await interaction.editReply({
                content: '❌ **Error:** An error occurred while updating the top10 channel. Please try again later.',
            });
        }
    },
};
