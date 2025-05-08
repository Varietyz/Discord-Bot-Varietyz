const { SlashCommandBuilder } = require('discord.js');
const logger = require('../../../utils/essentials/logger');
const handleCreate = require('../../../utils/helpers/commands/bingo/teams/handleCreate');
const handleJoin = require('../../../utils/helpers/commands/bingo/teams/handleJoin');
const handleLeave = require('../../../utils/helpers/commands/bingo/teams/handleLeave');
const handleList = require('../../../utils/helpers/commands/bingo/teams/handleList');
const { getOngoingEventId } = require('../../../utils/helpers/commands/bingo/teams/teamCommandHelpers');
const dbUtils = require('../../../utils/essentials/dbUtils');

async function autocomplete(interaction) {
    try {
        const eventId = await getOngoingEventId();
        if (!eventId) {
            return interaction.respond([]);
        }

        const query = interaction.options.getFocused().toLowerCase();
        const teams = await dbUtils.getAll('SELECT team_name FROM bingo_teams WHERE event_id = ? AND LOWER(team_name) LIKE ? ORDER BY team_name ASC LIMIT 25', [eventId, `%${query}%`]);

        const choices = teams.map((t) => ({ name: t.team_name, value: t.team_name }));
        await interaction.respond(choices);
    } catch (error) {
        logger.error(`[Autocomplete] Error fetching team names: ${error.message}`);
        await interaction.respond([]);
    }
}

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
                .addStringOption((o) => o.setName('team_name').setDescription('Team name').setRequired(true).setAutocomplete(true))
                .addStringOption((o) => o.setName('passkey').setDescription('Passkey').setRequired(true)),
        )
        .addSubcommand((sub) => sub.setName('leave').setDescription('Leave your current Bingo team.'))
        .addSubcommand((sub) => sub.setName('list').setDescription('List all current teams and their members.')),

    async execute(interaction) {
        try {

            await interaction.deferReply({ flags: 64 });
            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'join') {
                await handleJoin(interaction);
            } else if (subcommand === 'create') {
                await handleCreate(interaction);
            } else if (subcommand === 'leave') {
                await handleLeave(interaction);
            } else if (subcommand === 'list') {
                await handleList(interaction);
            }
        } catch (err) {
            logger.error(`🚨 Error in /bingo-team subcommand: ${err.message}`);
            if (!interaction.replied) {
                await interaction.reply({ content: '❌ An error occurred handling your request.', flags: 64 });
            } else {
                await interaction.editReply({ content: '❌ An error occurred handling your request.' });
            }
        }
    },

    async autocomplete(interaction) {
        if (interaction.options.getSubcommand() !== 'join') return;
        await autocomplete(interaction); 
    },
};
