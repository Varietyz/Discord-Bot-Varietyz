/* eslint-disable no-process-exit */
// @ts-nocheck
/**
 * @fileoverview
 * 🚀 **Main Entry Point for the Varietyz Bot** 🤖
 *
 * This script initializes the Varietyz Bot Discord application. It creates a new Discord client,
 * dynamically loads command and service modules, registers slash commands with Discord's API,
 * handles interactions (slash commands, autocomplete, and select menus), and schedules periodic tasks.
 *
 * **Key Features:**
 * - **Dynamic Module Loading**: Loads all commands and service modules from designated directories.
 * - **Slash Command Registration**: Registers all slash commands with Discord's API.
 * - **Task Scheduling**: Executes and schedules tasks with configurable intervals, supporting both immediate execution on startup and periodic execution.
 * - **Interaction Handling**: Supports slash commands, autocomplete interactions, and select menu interactions.
 * - **Error Logging**: Comprehensive error handling and logging for all bot processes.
 *
 * **External Dependencies:**
 * - **discord.js**: For interacting with the Discord API and managing events.
 * - **dotenv**: Loads environment variables from a `.env` file.
 * - Custom modules for utilities (e.g., `dbUtils`, `logger`) and task processing.
 *
 * @module main
 */

const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();
const logger = require('./modules/utils/logger');
const fs = require('fs');
const path = require('path');
const tasks = require('./tasks');
const initializeCompetitionsTables = require('./migrations/initializeCompetitionTables');
const populateSkillsBosses = require('./migrations/populateSkillsBosses');
const CompetitionService = require('./modules/services/competitionServices/competitionService');
const { handleAutocomplete, handleSlashCommand } = require('./modules/utils/slashCommandHandler');

const { CLAN_CHAT_CHANNEL_ID } = require('./config/constants');
const { initDatabase, saveMessage } = require('./modules/events/clanchatDatabase');

/**
 * Creates a new Discord client instance with the necessary intents.
 *
 * @type {Client}
 * @example
 * const client = new Client({
 *   intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
 * });
 */
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

/** @type {Array<Object>} */
const commands = [];

/** @type {Array<Object>} */
const functions = [];

/**
 * Dynamically loads all modules of a given type from the specified directory.
 *
 * For `commands`, the module must export a `data` object with a description and an `execute` function.
 * For `services`, the module is simply loaded.
 *
 * @function loadModules
 * @param {string} type - The type of modules to load ('commands' or 'services').
 * @returns {Array<Object>} An array of loaded modules.
 *
 * @example
 * loadModules('commands');
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
            } else if (type === 'services') {
                const funcName = path.basename(file, '.js');
                functions.push(module); // Push functions to a separate array
                logger.info(`Function ${funcName} loaded.`);
            }
        }
    });

    return loadedModules;
};

const competitionService = new CompetitionService(client);

/**
 * Initializes the Discord bot by loading modules, registering slash commands, and logging in.
 *
 * This function performs the following steps:
 * 1. Initializes competitions-related tables.
 * 2. Populates the skills_bosses table.
 * 3. Dynamically loads command and service modules.
 * 4. Registers slash commands with Discord's API.
 * 5. Logs the bot into Discord.
 *
 * @async
 * @function initializeBot
 * @returns {Promise<void>} Resolves when the bot is fully initialized.
 *
 * @example
 * await initializeBot();
 */
const initializeBot = async () => {
    try {
        await initDatabase(); // Initialize Clanchat database
        await initializeCompetitionsTables(); // Initialize competitions-related tables.
        await populateSkillsBosses(); // Populate skills_bosses table.

        loadModules('commands'); // Load all slash commands.
        loadModules('services'); // Load all functions.

        // eslint-disable-next-line node/no-missing-require
        const { REST } = require('@discordjs/rest');
        const { Routes } = require('discord-api-types/v10');

        // @ts-ignore
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

        // Register the commands with Discord for a specific guild.
        await rest.put(
            // @ts-ignore
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands.map((cmd) => cmd.data.toJSON()) }, // Ensure this always includes the latest changes to your commands.
        );

        logger.info('Slash commands registered successfully.');

        // Log the bot into Discord.
        await client.login(process.env.DISCORD_TOKEN);

        //await cleanupDatabase();
        logger.info('Bot logged in successfully.');
    } catch (error) {
        logger.error('Bot initialization failed: ' + error.message);
    }
};

/**
 * Event handler for when the Discord client is ready.
 *
 * When the client is ready, it logs the bot status, runs startup tasks,
 * and schedules periodic tasks to run at configured intervals.
 *
 * @event Client#ready
 */
client.once('ready', async () => {
    // @ts-ignore
    logger.info(`${client.user.tag} is online!`);
    // Execute tasks that should run immediately on bot startup.
    for (const task of tasks) {
        if (task.runOnStart) {
            logger.info(`Running task: ${task.name} on startup...`);
            try {
                await task.func(client); // Run the task immediately.
            } catch (err) {
                logger.error(`Error running task: ${task.name} on startup: ${err}`);
            }
        }
    }

    // Schedule tasks that should run at regular intervals.
    tasks.forEach((task) => {
        if (task.runAsTask) {
            // Calculate interval in hours and minutes for logging.
            const hours = Math.floor(task.interval / 3600);
            const minutes = Math.floor((task.interval % 3600) / 60);
            const intervalFormatted = `${hours > 0 ? `${hours}h ` : ''}${minutes}m`;

            logger.info(`Scheduling task: ${task.name} to run at ${intervalFormatted} intervals.`);
            try {
                setInterval(async () => {
                    logger.info(`Running scheduled task: ${task.name}...`);
                    await task.func(client); // Run at the scheduled interval.
                }, task.interval * 1000); // Convert seconds to milliseconds.
            } catch (err) {
                logger.error(`Error scheduling task: ${task.name}: ${err}`);
            }
        }
    });
});

/**
 * Event handler for interaction events (slash commands, autocomplete, select menus).
 *
 * @event Client#interactionCreate
 * @param {Interaction} interaction - The interaction object created by Discord.
 */
client.on('interactionCreate', async (interaction) => {
    if (interaction.isCommand()) {
        // Handle slash command interactions.
        await handleSlashCommand(interaction, commands);
    } else if (interaction.isAutocomplete()) {
        // Handle autocomplete interactions.
        await handleAutocomplete(interaction, commands);
    } else if (interaction.isStringSelectMenu()) {
        // Handle select menu interactions (voting).
        if (interaction.customId === 'vote_dropdown') {
            await competitionService.handleVote(interaction);
        }
    }
});

client.on('messageCreate', async (message) => {
    if (![CLAN_CHAT_CHANNEL_ID].includes(message.channel.id)) return;
    console.log(`💬 Chat logged: ${message.author.username}: ${message.content}`);
    try {
        await saveMessage(message.author.username, message.content, message.id, message.createdTimestamp);
        console.log(`Saved message ${message.id} from ${message.author.username}`);
    } catch (error) {
        console.error(`Error saving message ${message.id}:`, error);
    }
});

// Run bot initialization.
initializeBot();
