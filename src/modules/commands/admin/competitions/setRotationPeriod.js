// @ts-nocheck
/**
 * @fileoverview
 * **Set Rotation Period Command** ⏱️
 *
 * This module defines the `/set_rotation_period` slash command for the Varietyz Bot.
 * It allows administrators to set the rotation period (in weeks) for competitions.
 * The command updates the configuration in the database and informs the user upon success or failure.
 *
 * ---
 *
 * 🔹 **Usage:**
 * - Administrator-only command.
 * - Takes an integer value (minimum 1) representing the number of weeks.
 * - Updates the configuration table using an upsert query.
 *
 * @module src/modules/commands/adminSetRotationPeriod
 */

const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../../utils/essentials/dbUtils');
const logger = require('../../../utils/essentials/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set_rotation_period')
        .setDescription('ADMIN: Set the rotation period for competitions.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addIntegerOption((option) => option.setName('weeks').setDescription('Number of weeks between rotations').setRequired(true)),

    /**
     * 🎯 **Executes the /set_rotation_period Command**
     *
     * This command allows administrators to set the rotation period for competitions.
     * It retrieves the number of weeks from the command options, validates that it is at least 1,
     * and updates the configuration in the database accordingly.
     *
     * ---
     *
     * @async
     * @function execute
     * @param {Discord.CommandInteraction} interaction - The command interaction object.
     * @returns {Promise<void>} Resolves when the command execution is complete.
     *
     * @example
     * // 📌 Example:
     * // /set_rotation_period weeks:2
     * // The rotation period is set to 2 weeks.
     */
    async execute(interaction) {
        const weeks = interaction.options.getInteger('weeks');

        if (weeks < 1) {
            return interaction.reply({
                content: '🚫 **Error:** Rotation period must be at least 1 week.',
                flags: 64,
            });
        }

        try {
            await db.runQuery('INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', ['rotation_period_weeks', weeks.toString()]);
            logger.info(`✅ Rotation period set to ${weeks} week(s) by ${interaction.user.tag}`);
            return interaction.reply({
                content: `🎉 **Success:** Rotation period successfully set to \`${weeks}\` week(s). This will take effect from the next competition cycle. ⏱️`,
                flags: 64,
            });
        } catch (error) {
            logger.error(`❌ Error setting rotation period: ${error.message}`);
            return interaction.reply({
                content: '❌ **Error:** There was an error setting the rotation period. Please try again later. 🛠️',
                flags: 64,
            });
        }
    },
};
