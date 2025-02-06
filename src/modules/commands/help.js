/* eslint-disable no-const-assign */
// @ts-nocheck
/**
 * @fileoverview
 * **Help Command** 📖
 *
 * Dynamically loads command metadata from the `commands` directory.
 * Provides autocomplete support and filters admin commands for non-admin users.
 */

const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Provides a list of available commands with descriptions.')
        .addStringOption((option) => option.setName('command').setDescription('Get detailed help for a specific command').setRequired(false).setAutocomplete(true)),

    /**
     * 🎯 Executes the `/help` command.
     *
     * @async
     * @function execute
     * @param {Discord.CommandInteraction} interaction - The interaction object.
     * @returns {Promise<void>}
     */
    async execute(interaction) {
        const commandName = interaction.options.getString('command');

        const { allCommands } = loadAndCategorizeCommands();
        const hasAdminPermissions = checkAdminPermissions(interaction);

        if (!hasAdminPermissions) {
            allCommands = allCommands.filter((cmd) => !cmd.category.includes('Admin'));
        }

        if (commandName) {
            const command = allCommands.find((cmd) => cmd.name === commandName);
            if (!command) {
                return interaction.reply({ content: `❌ No command found with the name **${commandName}**.`, flags: 64 });
            }

            const embed = createCommandEmbed(command);

            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        const embed = new EmbedBuilder().setTitle('📜 Varietyz Bot Help Menu').setColor(0x3498db).setDescription('🔹 Use `/help command:<name>` for details about a specific command.').setTimestamp();

        return interaction.reply({ embeds: [embed], flags: 64 });
    },

    /**
     * 🎯 Handles Autocomplete for `/help` command options.
     *
     * - Suggests valid command names for `command` option.
     *
     * @async
     * @function autocomplete
     * @param {Discord.AutocompleteInteraction} interaction - The autocomplete interaction object.
     * @returns {Promise<void>}
     */
    autocomplete: async (interaction) => {
        const hasAdminPermissions = checkAdminPermissions(interaction);

        const { allCommands } = loadAndCategorizeCommands();

        let availableCommands = allCommands;
        if (!hasAdminPermissions) {
            availableCommands = availableCommands.filter((cmd) => !cmd.category.includes('Admin'));
        }

        return interaction.respond(availableCommands.map((cmd) => ({ name: cmd.name, value: cmd.name })));
    },
};

/**
 * 🎯 Creates a JSDoc-styled embed for a specific command.
 *
 * @param {Object} command - The command object.
 * @returns {EmbedBuilder} A formatted embed with command details.
 */
function createCommandEmbed(command) {
    const embed = new EmbedBuilder().setTitle(`📖 Command Help: \`/${command.name}\``).setColor(0x3498db).setTimestamp();

    embed.addFields({ name: '📝 **Description:**', value: command.description });

    embed.addFields({ name: '📌 **Usage:**', value: `\`/${command.name}\` ${formatCommandUsage(command)}` });

    if (command.options.length > 0) {
        const optionsText = command.options
            .map((opt) => {
                return `- \`${opt.name}\` *${opt.required ? 'required' : 'optional'}* → ${opt.description}`;
            })
            .join('\n');
        embed.addFields({ name: '🔹 **Options:**', value: optionsText });
    }

    embed.addFields({ name: '💡 **Example:**', value: `\`/${command.name} ${generateExample(command)}\`` });

    return embed;
}

/**
 * 🎯 Formats the command usage by listing all options.
 *
 * @param {Object} command - The command object.
 * @returns {string} The formatted command usage.
 */
function formatCommandUsage(command) {
    if (!command.options.length) return '';
    return command.options.map((opt) => `[${opt.name}]`).join(' ');
}

/**
 * 🎯 Generates an example usage for the command.
 *
 * @param {Object} command - The command object.
 * @returns {string} Example command usage.
 */
function generateExample(command) {
    if (!command.options.length) return '';
    return command.options.map((opt) => (opt.required ? `<${opt.name}>` : `[${opt.name}]`)).join(' ');
}

/**
 * 🎯 Loads all commands dynamically and categorizes them.
 *
 * @returns {Object} Contains a flat list of all commands.
 */
function loadAndCategorizeCommands() {
    const commandDir = path.join(__dirname);
    const commandFiles = fs.readdirSync(commandDir).filter((file) => file.endsWith('.js'));

    const allCommands = [];

    for (const file of commandFiles) {
        try {
            const command = require(`./${file}`);
            if (!command.data) continue;

            const commandName = command.data.name;
            const commandDescription = command.data.description;
            const category = determineCategory(file);

            const commandObj = { name: commandName, description: commandDescription, category, options: command.data.options || [] };
            allCommands.push(commandObj);
        } catch (error) {
            logger.error(`❌ Failed to load command ${file}:`, error);
        }
    }

    return { allCommands };
}

/**
 * 🎯 Determines the category of a command based on its filename.
 *
 * @param {string} filename - The filename of the command.
 * @returns {string} The category of the command.
 */
function determineCategory(filename) {
    if (filename.startsWith('admin')) return 'Admin';
    if (filename.includes('Competition') || filename.includes('SetRotationPeriod')) return 'Competition';
    return 'General';
}

/**
 * 🎯 Checks if a user has administrator permissions.
 *
 * @param {Discord.CommandInteraction} interaction - The interaction object.
 * @returns {boolean} Returns true if the user has admin permissions.
 */
function checkAdminPermissions(interaction) {
    return interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) || interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild);
}
