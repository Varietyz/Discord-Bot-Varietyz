// src/modules/commands/listCompetitions.js

const { SlashCommandBuilder } = require('discord.js');
const db = require('../utils/dbUtils');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder().setName('list_competitions').setDescription('List all upcoming and ongoing competitions.'),
    async execute(interaction) {
        try {
            const competitions = await db.getAll('SELECT * FROM competitions ORDER BY starts_at ASC');

            if (competitions.length === 0) {
                return interaction.reply({
                    content: 'There are no competitions currently scheduled.',
                    flags: 64,
                });
            }

            const embed = {
                color: 0x00ff00,
                title: 'Upcoming and Ongoing Competitions',
                fields: competitions.map((comp) => ({
                    name: `${comp.type} - ${comp.metric.replace('_', ' ').toUpperCase()}`,
                    value: `Starts At: ${new Date(comp.starts_at).toLocaleString()}\nEnds At: ${new Date(comp.ends_at).toLocaleString()}`,
                })),
                timestamp: new Date(),
                footer: {
                    text: 'Varietyz Bot',
                },
            };

            await interaction.reply({ embeds: [embed], flags: 64 });
        } catch (error) {
            logger.error(`Error executing list_competitions command: ${error.message}`);
            await interaction.reply({
                content: 'There was an error fetching the competitions.',
                flags: 64,
            });
        }
    },
};
