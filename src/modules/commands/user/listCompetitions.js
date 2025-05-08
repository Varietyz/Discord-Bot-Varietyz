const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
module.exports = {
    data: new SlashCommandBuilder().setName('list_competitions').setDescription('List all upcoming, ongoing, and queued competitions.'),
    async execute(interaction) {
        try {
            const now = new Date();
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
                    content: 'ℹ️ **Info:** There are no competitions currently scheduled or queued.',
                    flags: 64,
                });
            }
            const ongoing = competitions.filter((comp) => comp.status === 'Scheduled' && new Date(comp.starts_at) <= now && new Date(comp.ends_at) >= now);
            const upcoming = competitions.filter((comp) => comp.status === 'Scheduled' && new Date(comp.starts_at) > now);
            const queued = competitions.filter((comp) => comp.status === 'Queued');
            const fields = [];
            if (ongoing.length > 0) {
                fields.push({
                    name: '🔥 **Ongoing Competitions**',
                    value: ongoing.map((comp) => `${comp.type} - ${comp.metric.replace('_', ' ').toUpperCase()}\nEnds At: \`${new Date(comp.ends_at).toLocaleString()}\``).join('\n\n'),
                });
            }
            if (upcoming.length > 0) {
                fields.push({
                    name: '⏰ **Upcoming Competitions**',
                    value: upcoming.map((comp) => `${comp.type} - ${comp.metric.replace('_', ' ').toUpperCase()}\nStarts At: \`${new Date(comp.starts_at).toLocaleString()}\``).join('\n\n'),
                });
            }
            if (queued.length > 0) {
                fields.push({
                    name: '📋 **Queued Competitions**',
                    value: queued.map((comp) => `${comp.type} - ${comp.metric.replace('_', ' ').toUpperCase()}\nThis competition is queued and will be scheduled in the next rotation.`).join('\n\n'),
                });
            }
            const embed = {
                color: 0x00ff00,
                title: '📅 **Competition Schedule**',
                fields,
                timestamp: new Date(),
                footer: {
                    text: 'Varietyz Bot',
                },
            };
            logger.info(`✅ Successfully fetched ${competitions.length} competition(s).`);
            await interaction.reply({ embeds: [embed], flags: 64 });
        } catch (error) {
            logger.error(`❌ Error executing list_competitions command: ${error.message}`);
            await interaction.reply({
                content: '❌ **Error:** There was an error fetching the competitions. Please try again later.',
                flags: 64,
            });
        }
    },
};
