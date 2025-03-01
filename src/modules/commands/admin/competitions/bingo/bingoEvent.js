const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { updateBingoProgress, endBingoEvent } = require('../../../../services/bingo/bingoService');
const logger = require('../../../../utils/essentials/logger');
const client = require('../../../../../main');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bingo-event')
        .setDescription('ADMIN: Manage Bingo events')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addSubcommand((subcommand) => subcommand.setName('new').setDescription('End the current Bingo event manually and start a new one.'))
        .addSubcommand((subcommand) => subcommand.setName('update').setDescription('Update the current Bingo event.')),
    async execute(interaction) {
        try {
            await interaction.deferReply({ flags: 64 });
            const subcommand = interaction.options.getSubcommand();

            switch (subcommand) {
            case 'new':
                await endBingoEvent();
                interaction.editReply({ content: '🏁 Bingo event has been ended via auto-transition.' });
                break;
            case 'update':
                await updateBingoProgress(client);
                break;
            default:
                await interaction.editReply({ content: '❌ Unknown subcommand' });
            }
        } catch (error) {
            logger.error(`❌ Error executing /bingo-event command: ${error.message}`);
            await interaction.editReply({
                content: '❌ **Error:** An error occurred while processing your request.',
            });
        }
    },
};
