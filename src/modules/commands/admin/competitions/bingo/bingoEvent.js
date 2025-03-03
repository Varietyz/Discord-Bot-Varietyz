const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { updateBingoProgress, endBingoEvent } = require('../../../../services/bingo/bingoService');
const logger = require('../../../../utils/essentials/logger');
const client = require('../../../../../main');
const { autoTransitionEvents } = require('../../../../services/bingo/autoTransitionEvents');
const getEmojiWithFallback = require('../../../../utils/fetchers/getEmojiWithFallback');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bingo-event')
        .setDescription('ADMIN: Manage Bingo events')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addSubcommand((subcommand) => subcommand.setName('new').setDescription('End the current Bingo event manually and start a new one.'))
        .addSubcommand((subcommand) => subcommand.setName('update').setDescription('Update the current Bingo event.')),
    async execute(interaction) {
        try {
            const emoji = await getEmojiWithFallback('emoji_clan_loading', 'loading...');
            await interaction.deferReply({ flags: 64 });
            const subcommand = interaction.options.getSubcommand();

            switch (subcommand) {
            case 'new':
                interaction.editReply({ content: `${emoji} Ending current event and initializing a new one... please wait.` });
                await endBingoEvent();
                interaction.editReply({ content: '🏁 Bingo event has been ended via auto-transition.' });
                break;
            case 'update':
                interaction.editReply({ content: `${emoji} Updating bingo progression for everyone... please wait.` });
                await updateBingoProgress(client);
                interaction.editReply({ content: `${emoji} Almost done...` });
                await autoTransitionEvents();
                interaction.editReply({ content: '🏁 Bingo event has been updated!' });
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
