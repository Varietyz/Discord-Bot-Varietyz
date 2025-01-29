const { SlashCommandBuilder } = require('discord.js');
const db = require('../utils/dbUtils');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder().setName('list_competitions').setDescription('List all upcoming, ongoing, and queued competitions.'),
    async execute(interaction) {
        try {
            const now = new Date();

            // Fetch ongoing/upcoming competitions and queued competitions
            const competitions = await db.getAll(`
                SELECT type, metric, starts_at, ends_at, 'Scheduled' AS status
                FROM competitions
                UNION ALL
                SELECT type, metric, NULL AS starts_at, NULL AS ends_at, 'Queued' AS status
                FROM competition_queue
                ORDER BY status DESC, starts_at ASC
            `);

            if (competitions.length === 0) {
                return interaction.reply({
                    content: 'There are no competitions currently scheduled or queued.',
                    flags: 64,
                });
            }

            // Categorize competitions
            const ongoing = competitions.filter((comp) => comp.status === 'Scheduled' && new Date(comp.starts_at) <= now && new Date(comp.ends_at) >= now);
            const upcoming = competitions.filter((comp) => comp.status === 'Scheduled' && new Date(comp.starts_at) > now);
            const queued = competitions.filter((comp) => comp.status === 'Queued');

            // Generate embed fields for each category
            const fields = [];

            if (ongoing.length > 0) {
                fields.push({
                    name: 'Ongoing Competitions',
                    value: ongoing.map((comp) => `${comp.type} - ${comp.metric.replace('_', ' ').toUpperCase()}\n` + `Ends At: ${new Date(comp.ends_at).toLocaleString()}`).join('\n\n'),
                });
            }

            if (upcoming.length > 0) {
                fields.push({
                    name: 'Upcoming Competitions',
                    value: upcoming.map((comp) => `${comp.type} - ${comp.metric.replace('_', ' ').toUpperCase()}\n` + `Starts At: ${new Date(comp.starts_at).toLocaleString()}`).join('\n\n'),
                });
            }

            if (queued.length > 0) {
                fields.push({
                    name: 'Queued Competitions',
                    value: queued.map((comp) => `${comp.type} - ${comp.metric.replace('_', ' ').toUpperCase()}\n` + 'This competition is queued and will be scheduled in the next rotation.').join('\n\n'),
                });
            }

            // Create the embed
            const embed = {
                color: 0x00ff00,
                title: 'Upcoming, Ongoing, and Queued Competitions',
                fields,
                timestamp: new Date(),
                footer: {
                    text: 'Varietyz Bot',
                },
            };

            await interaction.reply({ embeds: [embed], flags: 64 });
        } catch (error) {
            logger.error(`Error executing list_competitions command: ${error.message}`);
            await interaction.reply({
                content: 'There was an error fetching the competitions. Please try again later.',
                flags: 64,
            });
        }
    },
};
