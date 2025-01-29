const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const db = require('../utils/dbUtils');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue_competition')
        .setDescription('Queue a new competition to be created in the next rotation.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addStringOption(
            (option) => option.setName('type').setDescription('Type of competition (SOTW/BOTW)').setRequired(true).setAutocomplete(true), // Enable autocomplete for the "type" option
        )
        .addStringOption(
            (option) => option.setName('metric').setDescription('Metric for the competition (e.g., attack, slayer, kril_tsutsaroth)').setRequired(true).setAutocomplete(true), // Enable autocomplete for the "metric" option
        ),
    async execute(interaction) {
        const type = interaction.options.getString('type');
        const metric = interaction.options.getString('metric').toLowerCase();

        // Validate metric exists in the database
        const metricEntry = await db.getOne('SELECT * FROM skills_bosses WHERE name = ? AND type = ?', [metric, type === 'SOTW' ? 'Skill' : 'Boss']);
        if (!metricEntry) {
            return interaction.reply({
                content: `The metric "${metric}" is not a valid ${type}. Please choose a valid metric.`,
                flags: 64,
            });
        }

        // Queue the competition
        try {
            await db.runQuery('INSERT INTO competition_queue (type, metric) VALUES (?, ?)', [type, metric]);
            logger.info(`Queued new ${type} competition with metric ${metric} by ${interaction.user.tag}`);
            return interaction.reply({
                content: `${type} competition with metric "${metric}" has been queued and will be created in the next rotation cycle.`,
                flags: 64,
            });
        } catch (error) {
            logger.error(`Error queuing competition: ${error.message}`);
            return interaction.reply({
                content: 'There was an error queuing the competition. Please try again later.',
                flags: 64,
            });
        }
    },

    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);

        try {
            if (focusedOption.name === 'type') {
                // Autocomplete for "type" option
                const choices = ['SOTW', 'BOTW'];
                const filtered = choices.filter((choice) => choice.toLowerCase().startsWith(focusedOption.value.toLowerCase()));

                await interaction.respond(filtered.map((choice) => ({ name: choice, value: choice })).slice(0, 25));
            } else if (focusedOption.name === 'metric') {
                // Autocomplete for "metric" option
                const type = interaction.options.getString('type');
                const input = focusedOption.value.toLowerCase();

                if (!type) {
                    return await interaction.respond([]);
                }

                // Fetch metrics from the database based on the selected type
                const metrics = await db.getAll('SELECT name FROM skills_bosses WHERE type = ? AND name LIKE ? ORDER BY name ASC', [type === 'SOTW' ? 'Skill' : 'Boss', `%${input}%`]);

                const choices = metrics.map((row) => ({
                    name: row.name,
                    value: row.name,
                }));

                await interaction.respond(choices.slice(0, 25));
            }
        } catch (error) {
            logger.error(`Error in autocomplete for /queue_competition: ${error.message}`);
            await interaction.respond([]);
        }
    },
};
