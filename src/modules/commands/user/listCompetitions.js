// @ts-nocheck
/**
 * @fileoverview
 * **List Competitions Command** 📅
 *
 * This module defines the `/list_competitions` slash command for the Varietyz Bot.
 * It retrieves all upcoming, ongoing, and queued competitions from the database, categorizes them,
 * and displays the results in an embed. The command uses a union query to fetch competitions from both
 * the `competitions` and `competition_queue` tables.
 *
 * ---
 *
 * 🔹 **How It Works:**
 * - Fetches competitions from the scheduled and queued tables.
 * - Categorizes competitions into ongoing (currently active), upcoming (scheduled for the future),
 * and queued (waiting to be scheduled).
 * - Constructs an embed with sections for each category and sends it as a reply.
 *
 * ---
 *
 * @module modules/commands/list_competitions
 */

const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/dbUtils');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder().setName('list_competitions').setDescription('List all upcoming, ongoing, and queued competitions.'),

    /**
     * 🎯 **Executes the /list_competitions Command**
     *
     * Retrieves competitions from the database (both scheduled and queued), categorizes them into ongoing,
     * upcoming, and queued groups, and sends an embed with the competition details.
     *
     * @async
     * @function execute
     * @param {Discord.CommandInteraction} interaction - The command interaction object.
     * @returns {Promise<void>} Resolves when the command execution is complete.
     *
     * @example
     * // 📌 When a user runs /list_competitions:
     * await execute(interaction);
     */
    async execute(interaction) {
        try {
            const now = new Date();

            // Fetch competitions from both the scheduled and queued tables
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

            // Categorize competitions based on status and time
            const ongoing = competitions.filter((comp) => comp.status === 'Scheduled' && new Date(comp.starts_at) <= now && new Date(comp.ends_at) >= now);
            const upcoming = competitions.filter((comp) => comp.status === 'Scheduled' && new Date(comp.starts_at) > now);
            const queued = competitions.filter((comp) => comp.status === 'Queued');

            // Build embed fields for each category
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

            // Build the embed
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
