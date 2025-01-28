// src/modules/commands/queueCompetition.js

const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const db = require('../utils/dbUtils');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue_competition')
        .setDescription('Queue a new competition to be created in the next rotation.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addStringOption((option) => option.setName('type').setDescription('Type of competition (SOTW/BOTW)').setRequired(true).addChoices({ name: 'SOTW', value: 'SOTW' }, { name: 'BOTW', value: 'BOTW' }))
        .addStringOption((option) => option.setName('metric').setDescription('Metric for the competition (e.g., attack, slayer, kril_tsutsaroth)').setRequired(true)),
    async execute(interaction) {
        const type = interaction.options.getString('type');
        const metric = interaction.options.getString('metric').toLowerCase();

        // Validate metric exists in skills_bosses
        const metricEntry = await db.getOne('SELECT * FROM skills_bosses WHERE name = ? AND type = ?', [metric, type === 'SOTW' ? 'Skill' : 'Boss']);
        if (!metricEntry) {
            return interaction.reply({ content: `The metric "${metric}" is not a valid ${type}. Please choose a valid metric.`, flags: 64 });
        }

        // Queue the competition
        try {
            await db.runQuery('INSERT INTO competition_queue (type, metric) VALUES (?, ?)', [type, metric]);
            logger.info(`Queued new ${type} competition with metric ${metric} by ${interaction.user.tag}`);
            return interaction.reply({ content: `${type} competition with metric "${metric}" has been queued and will be created in the next rotation cycle.`, flags: 64 });
        } catch (error) {
            logger.error(`Error queuing competition: ${error.message}`);
            return interaction.reply({ content: 'There was an error queuing the competition. Please try again later.', flags: 64 });
        }
    },
};
