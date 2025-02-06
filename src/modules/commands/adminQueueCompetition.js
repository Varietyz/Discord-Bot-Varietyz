// @ts-nocheck
/**
 * @fileoverview
 * **Queue_competition Command** ⏳
 *
 * This module defines the `/queue_competition` slash command for the Varietyz Bot.
 * It allows administrators to queue a new competition to be created in the next rotation.
 * The command validates the provided competition type and metric against the database,
 * ensures that the competition is not already queued, and then inserts the new competition into the queue.
 *
 * ---
 *
 * 🔹 **Core Features:**
 * - **Validation:** Checks if the provided metric exists in the database.
 * - **Conflict Prevention:** Prevents queuing the same competition twice.
 * - **Database Interaction:** Inserts the new competition into the competition queue.
 * - **Autocomplete Support:** Provides autocomplete suggestions for both the "type" and "metric" options.
 *
 * 🔗 **External Dependencies:**
 * - **Discord.js** for handling slash command interactions and autocompletion.
 * - **SQLite** for managing competition and metric data.
 *
 * @module modules/commands/adminQueueCompetition
 */

const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const db = require('../utils/dbUtils');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue_competition')
        .setDescription('Queue a new competition to be created in the next rotation.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addStringOption((option) => option.setName('type').setDescription('Type of competition (**SOTW**/**BOTW**)').setRequired(true).setAutocomplete(true))
        .addStringOption((option) => option.setName('metric').setDescription('Metric for the competition (e.g., `attack`, `slayer`, `kril_tsutsaroth`)').setRequired(true).setAutocomplete(true)),

    /**
     * 🎯 **Executes the /queue_competition Command**
     *
     * Retrieves the "type" and "metric" options from the interaction, validates the provided metric
     * by querying the database, checks if a competition with the same type and metric is already queued,
     * and if not, inserts a new competition into the queue.
     *
     * @async
     * @function execute
     * @param {Discord.CommandInteraction} interaction - The interaction object representing the command execution.
     * @returns {Promise<void>} Resolves when the command has been fully executed.
     *
     * @example
     * // 📌 Usage by an administrator:
     * await execute(interaction);
     */
    async execute(interaction) {
        const type = interaction.options.getString('type');
        const metric = interaction.options.getString('metric').toLowerCase();

        // Validate the provided metric against the database.
        const metricEntry = await db.getOne('SELECT * FROM skills_bosses WHERE name = ? AND type = ?', [metric, type === 'SOTW' ? 'Skill' : 'Boss']);
        if (!metricEntry) {
            return interaction.reply({
                content: `🚫 **Error:** The metric "\`${metric}\`" is not a valid ${type}. Please choose a valid metric.`,
                flags: 64,
            });
        }

        // Check if the competition is already queued.
        const existing = await db.getOne('SELECT * FROM competition_queue WHERE type = ? AND metric = ?', [type, metric]);
        if (existing) {
            return interaction.reply({
                content: `🚫 **Notice:** This ${type} competition is already queued!`,
                flags: 64,
            });
        }

        try {
            // Insert the new competition into the queue.
            await db.runQuery('INSERT INTO competition_queue (type, metric) VALUES (?, ?)', [type, metric]);
            logger.info(`🚀 Queued new ${type} competition with metric \`${metric}\` by admin ${interaction.user.tag}`);
            return interaction.reply({
                content: `🎉 **Success:** ${type} competition with metric "\`${metric}\`" has been queued and will be created in the next rotation cycle.`,
                flags: 64,
            });
        } catch (error) {
            logger.error(`❌ Error queuing competition: ${error.message}`);
            return interaction.reply({
                content: '❌ **Error:** There was an error queuing the competition. Please try again later.',
                flags: 64,
            });
        }
    },

    /**
     * 🎯 **Handles Autocomplete for the /queue_competition Command**
     *
     * Provides autocomplete suggestions for the "type" and "metric" options.
     *
     * - For the "type" option: Suggests "SOTW" and "BOTW".
     * - For the "metric" option: Queries the database for matching metrics based on the user's input.
     *
     * @async
     * @function autocomplete
     * @param {Discord.AutocompleteInteraction} interaction - The autocomplete interaction object.
     * @returns {Promise<void>} Resolves when autocomplete suggestions have been sent.
     *
     * @example
     * // 📌 Invoked as a user types in the command option field:
     * await autocomplete(interaction);
     */
    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);

        try {
            if (focusedOption.name === 'type') {
                const choices = ['SOTW', 'BOTW'];
                const filtered = choices.filter((choice) => choice.toLowerCase().startsWith(focusedOption.value.toLowerCase()));

                await interaction.respond(filtered.map((choice) => ({ name: choice, value: choice })).slice(0, 25));
            } else if (focusedOption.name === 'metric') {
                const type = interaction.options.getString('type');
                const input = focusedOption.value.toLowerCase();

                if (!type) {
                    return await interaction.respond([]);
                }

                const metrics = await db.getAll('SELECT name FROM skills_bosses WHERE type = ? AND name LIKE ? ORDER BY name ASC', [type === 'SOTW' ? 'Skill' : 'Boss', `%${input}%`]);

                const choices = metrics.map((row) => ({
                    name: row.name,
                    value: row.name,
                }));

                await interaction.respond(choices.slice(0, 25));
            }
        } catch (error) {
            logger.error(`❌ Error in autocomplete for /queue_competition: ${error.message}`);
            await interaction.respond([]);
        }
    },
};
