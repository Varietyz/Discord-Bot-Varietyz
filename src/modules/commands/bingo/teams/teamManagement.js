const { SlashCommandBuilder } = require('discord.js');
const logger = require('../../../utils/essentials/logger');
const handleCreate = require('../../../utils/helpers/commands/bingo/teams/handleCreate');
const handleJoin = require('../../../utils/helpers/commands/bingo/teams/handleJoin');
const handleLeave = require('../../../utils/helpers/commands/bingo/teams/handleLeave');
const handleList = require('../../../utils/helpers/commands/bingo/teams/handleList');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bingo-team')
        .setDescription('Manage Bingo teams')

        .addSubcommand((sub) =>
            sub
                .setName('create')
                .setDescription('Create a new Bingo team.')
                .addStringOption((o) => o.setName('team_name').setDescription('Team name').setRequired(true))
                .addStringOption((o) => o.setName('passkey').setDescription('Team passkey').setRequired(true)),
        )

        .addSubcommand((sub) =>
            sub
                .setName('join')
                .setDescription('Join an existing Bingo team.')
                .addStringOption((o) => o.setName('team_name').setDescription('Team name').setRequired(true))
                .addStringOption((o) => o.setName('passkey').setDescription('Passkey').setRequired(true)),
        )

        .addSubcommand((sub) => sub.setName('leave').setDescription('Leave your current Bingo team.'))

        .addSubcommand((sub) => sub.setName('list').setDescription('List all current teams and their members.')),

    async execute(interaction) {
        try {
            await interaction.deferReply({ flags: 64 });

            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'create') {
                await handleCreate(interaction);
            } else if (subcommand === 'join') {
                await handleJoin(interaction);
            } else if (subcommand === 'leave') {
                await handleLeave(interaction);
            } else if (subcommand === 'list') {
                await handleList(interaction);
            }
        } catch (err) {
            logger.error(`🚨 Error in /bingo-team subcommand: ${err.message}`);
            await interaction.reply({ content: '❌ An error occurred handling your request.', flags: 64 });
        }
    },
};
