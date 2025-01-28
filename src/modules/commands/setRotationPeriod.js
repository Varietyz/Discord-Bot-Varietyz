// src/modules/commands/setRotationPeriod.js

const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const db = require('../utils/dbUtils');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set_rotation_period')
        .setDescription('Set the rotation period for competitions.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addIntegerOption((option) => option.setName('weeks').setDescription('Number of weeks between rotations').setRequired(true)),
    async execute(interaction) {
        const weeks = interaction.options.getInteger('weeks');

        if (weeks < 1) {
            return interaction.reply({ content: 'Rotation period must be at least 1 week.', flags: 64 });
        }

        // Update the rotation period in the config table
        try {
            await db.runQuery('INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', ['rotation_period_weeks', weeks.toString()]);
            logger.info(`Rotation period set to ${weeks} week(s) by ${interaction.user.tag}`);
            return interaction.reply({ content: `Rotation period successfully set to ${weeks} week(s). This will take effect from the next competition cycle.`, flags: 64 });
        } catch (error) {
            logger.error(`Error setting rotation period: ${error.message}`);
            return interaction.reply({ content: 'There was an error setting the rotation period. Please try again later.', flags: 64 });
        }
    },
};
