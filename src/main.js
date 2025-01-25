// @ts-nocheck
/**
 * @fileoverview Main entry point for the Varietyz Bot Discord application.
 * Initializes the Discord client, dynamically loads commands and functions, registers slash commands,
 * handles interactions, and schedules periodic tasks. Provides a scalable framework for adding
 * additional bot functionality through commands, scheduled tasks, and interaction handling.
 *
 * Key Features:
 * - **Dynamic Module Loading**: Loads all commands and utility functions from designated directories.
 * - **Slash Command Registration**: Registers all slash commands with Discord's API.
 * - **Task Scheduling**: Executes and schedules tasks with configurable intervals, supporting both immediate execution on startup and periodic execution.
 * - **Interaction Handling**: Supports slash commands and autocomplete interaction types.
 * - **Error Logging**: Comprehensive error handling and logging for all bot processes.
 *
 * External Dependencies:
 * - **discord.js**: For interacting with the Discord API and managing events.
 * - **dotenv**: Loads environment variables from `.env` file.
 * - Custom modules for utilities (`dbUtils`, `logger`) and task processing.
 *
 * @module main
 */

const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();
const logger = require('./modules/utils/logger');
const fs = require('fs');
const path = require('path');
const tasks = require('./tasks'); // Import the task list

/**
 * Create a new Discord client instance with necessary intents.
 * @type {Client}
 */
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

/** @type {Array<Object>} */
const commands = [];

/** @type {Array<Object>} */
const functions = [];

/**
 * Dynamically loads all modules of a given type (commands or functions) from the specified directory.
 * @param {string} type - The type of modules to load ('commands' or 'functions').
 * @returns {Array<Object>} An array of loaded modules.
 */
const loadModules = (type) => {
    const folderPath = path.join(__dirname, `modules/${type}`);
    const loadedModules = [];

    fs.readdirSync(folderPath).forEach((file) => {
        const filePath = path.join(folderPath, file);

        if (file.endsWith('.js')) {
            const module = require(filePath);

            if (type === 'commands') {
                // Only load commands if the file exports data and execute
                if (!module.data || !module.data.description || !module.execute) {
                    logger.error(`Invalid command structure in ${file}: Missing description or execute function.`);
                    return;
                }
                commands.push(module); // Push only commands to commands array
                logger.info(`Command ${module.data.name} loaded.`);
            } else if (type === 'functions') {
                const funcName = path.basename(file, '.js');

                functions.push(module); // Push functions to a separate array
                logger.info(`Function ${funcName} loaded.`);
            }
        }
    });

    return loadedModules;
};

/**
 * Initializes the Discord bot by loading modules, registering slash commands, and logging in.
 * @async
 * @function initializeBot
 * @returns {Promise<void>}
 */
const initializeBot = async () => {
    try {
        loadModules('commands'); // Load all slash commands
        loadModules('functions'); // Load all functions

        // eslint-disable-next-line node/no-missing-require
        const { REST } = require('@discordjs/rest');
        const { Routes } = require('discord-api-types/v10');

        // @ts-ignore
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

        // Register the commands with Discord for a specific guild
        await rest.put(
            // @ts-ignore
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands.map((cmd) => cmd.data.toJSON()) }, // Ensure this always includes the newest changes to your commands
        );

        logger.info('Slash commands registered successfully.');

        // Log the bot into Discord
        await client.login(process.env.DISCORD_TOKEN);
        logger.info('Bot logged in successfully.');
    } catch (error) {
        logger.error('Bot initialization failed: ' + error.message);
    }
};

/**
 * Handles the 'ready' event when the Discord client is successfully logged in and ready.
 * Executes tasks that should run immediately on bot startup and schedules regular tasks.
 * @event Client#ready
 */
client.once('ready', async () => {
    // @ts-ignore
    logger.info(`${client.user.tag} is online!`);
    // Execute tasks that should run immediately on bot startup
    for (const task of tasks) {
        if (task.runOnStart) {
            logger.info(`Running task: ${task.name} on startup...`);
            try {
                await task.func(client); // Run the task immediately
            } catch (err) {
                logger.error(`Error running task: ${task.name} on startup: ${err}`);
            }
        }
    }

    // Schedule tasks that should run at regular intervals (runAsTask is true)
    tasks.forEach((task) => {
        if (task.runAsTask) {
            // Schedule the task to repeat regardless of runOnStart (runOnStart does not block this)
            const hours = Math.floor(task.interval / 3600); // Extract hours
            const minutes = Math.floor((task.interval % 3600) / 60); // Extract minutes

            // Format hours and minutes into a string (hh:mm)
            const intervalFormatted = `${hours > 0 ? `${hours}h ` : ''}${minutes}m`;

            logger.info(`Scheduling task: ${task.name} to run at ${intervalFormatted} intervals.`);
            try {
                setInterval(async () => {
                    logger.info(`Running scheduled task: ${task.name}...`);
                    await task.func(client); // Run at the scheduled interval
                }, task.interval * 1000); // Convert seconds to milliseconds
            } catch (err) {
                logger.error(`Error scheduling task: ${task.name}: ${err}`);
            }
        }
    });
});

/**
 * Handles interaction events such as slash commands and autocomplete.
 * @event Client#interactionCreate
 * @param {Interaction} interaction - The interaction that was created.
 */
client.on('interactionCreate', async (interaction) => {
    // Step 1: Validate Interaction Type (slash command or autocomplete)
    if (interaction.isCommand()) {
        // Handle regular slash command execution
        await handleSlashCommand(interaction);
    } else if (interaction.isAutocomplete()) {
        // Handle autocomplete specifically
        await handleAutocomplete(interaction);
    }
});

/**
 * Executes the appropriate slash command based on the interaction.
 * @async
 * @function handleSlashCommand
 * @param {CommandInteraction} interaction - The command interaction to handle.
 * @returns {Promise<void>}
 */
async function handleSlashCommand(interaction) {
    try {
        // Find the appropriate command based on the interaction's name
        const command = commands.find((cmd) => cmd.data.name === interaction.commandName);

        // Check if the command exists
        if (!command) {
            logger.warn(`Unknown command: ${interaction.commandName}`);
            return;
        }

        // Execute the command
        await command.execute(interaction);
        logger.info(`${interaction.commandName} command executed successfully.`);
    } catch (err) {
        logger.error(`Error executing ${interaction.commandName}: ${err.message}`);
        await interaction.reply({
            content: 'Something went wrong while processing your command.',
            flags: 64, // EPHEMERAL flag
        });
    }
}

/**
 * Handles autocomplete interactions by delegating to the appropriate command's autocomplete handler.
 * @async
 * @function handleAutocomplete
 * @param {AutocompleteInteraction} interaction - The autocomplete interaction to handle.
 * @returns {Promise<void>}
 */
async function handleAutocomplete(interaction) {
    try {
        // Find the appropriate command based on the interaction's name
        const command = commands.find((cmd) => cmd.data.name === interaction.commandName);

        // Check if the command exists and supports autocomplete
        if (!command) {
            logger.warn(`Autocomplete trigger failed: Unknown command ${interaction.commandName}`);
            return;
        }

        if (!command.autocomplete) {
            logger.warn(`Autocomplete handler not implemented for command: ${interaction.commandName}`);
            return;
        }

        // Handle the autocomplete response
        await command.autocomplete(interaction);
        logger.info(`Autocomplete triggered for command ${interaction.commandName}`);
    } catch (err) {
        logger.error(`Error processing autocomplete for ${interaction.commandName}: ${err.message}`);
        await interaction.respond([]); // Send empty array to indicate no suggestions if there's an error
    }
}

// Run bot initialization
initializeBot();
