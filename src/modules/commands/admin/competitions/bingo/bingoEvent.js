const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { updateBingoProgress } = require('../../../../services/bingo/bingoService');
const logger = require('../../../../utils/essentials/logger');
const client = require('../../../../../main');
const { autoTransitionEvents, handleEventCompletion, rotateAndStartNewEvent } = require('../../../../services/bingo/autoTransitionEvents');
const getEmojiWithFallback = require('../../../../utils/fetchers/getEmojiWithFallback');
const dbUtils = require('../../../../utils/essentials/dbUtils');
const { refreshBingoInfoEmbed } = require('../../../../services/bingo/embeds/bingoInfoData');

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
            const now = new Date();
            const ongoingEvents = await dbUtils.getAll(`
    SELECT event_id
    FROM bingo_state
    WHERE state = 'ongoing'
  `);

            switch (subcommand) {
            case 'new':
                interaction.editReply({ content: `${emoji} Ending current event and initializing a new one... please wait.` });
                await updateBingoProgress(client);
                for (const { event_id } of ongoingEvents) {
                    await handleEventCompletion(event_id);
                    await rotateAndStartNewEvent(now, event_id);
                }
                await autoTransitionEvents();
                interaction.editReply({ content: '🏁 Bingo event has been ended via auto-transition.' });
                break;
            case 'update':
                interaction.editReply({ content: `${emoji} Updating bingo progression for everyone... please wait.` });
                await updateBingoProgress(client);
                interaction.editReply({ content: `${emoji} Almost done...` });
                for (const { event_id } of ongoingEvents) {
                    await refreshBingoInfoEmbed(event_id, client);
                }
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
