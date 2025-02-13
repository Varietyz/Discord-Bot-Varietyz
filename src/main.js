/* eslint-disable node/no-missing-require */
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

const { Client, GatewayIntentBits, Partials } = require('discord.js');
require('dotenv').config();
const logger = require('./modules/utils/essentials/logger');
const fs = require('fs');
const path = require('path');
const initializeMainTables = require('./migrations/initializeMainTables');
const initializeGuildTables = require('./migrations/initializeGuildTables');
const CompetitionService = require('./modules/services/competitionServices/competitionService');

const { CLAN_CHAT_CHANNEL_ID } = require('./config/constants');
const { initializeMsgTables } = require('./modules/collection/msgDatabase');
const { fetchAndStoreChannelHistory } = require('./modules/collection/msgFetcher');

//const migrateRegisteredRSN = require('./migrations/migrateRsn');

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
    intents: [
        GatewayIntentBits.Guilds, // Required for basic guild interactions
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.AutoModerationConfiguration,
        GatewayIntentBits.AutoModerationExecution,
        GatewayIntentBits.GuildMessages, // Detects messages in the guild
        GatewayIntentBits.MessageContent, // Required to read message content
        GatewayIntentBits.GuildMembers, // Detects member updates (joins, leaves, role changes)
        GatewayIntentBits.GuildMessageReactions, // Detects reactions on messages
        GatewayIntentBits.GuildVoiceStates, // Detects voice channel joins, mutes, and disconnects
        GatewayIntentBits.GuildPresences, // Detects status changes (online, offline, playing game)
        GatewayIntentBits.GuildModeration, // Tracks moderation events (bans, kicks, timeouts)
        GatewayIntentBits.GuildInvites, // Tracks invites
        GatewayIntentBits.GuildEmojisAndStickers, // Tracks emojis and stickers in guilds
        GatewayIntentBits.GuildIntegrations, // Tracks integrations like bots and apps
        GatewayIntentBits.GuildScheduledEvents, // Tracks scheduled events in guilds
        GatewayIntentBits.GuildMessagePolls, // Polls in guild message
        GatewayIntentBits.GuildBans, // Detects bans in guild
        GatewayIntentBits.DirectMessages, // Tracks direct messages
        GatewayIntentBits.DirectMessageReactions, // Detects reactions in direct messages
        GatewayIntentBits.DirectMessageTyping, // Detects typing in direct messages
        GatewayIntentBits.DirectMessagePolls, // Polls in direct messages
    ],
    partials: [Partials.Message, Partials.Reaction, Partials.User], // Necessary for uncached messages, reactions, and users
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
 * @param {string} type - The type of modules to load (`commands` or `services`).
 * @returns {Array<Object>} An array of loaded modules.
 *
 * @example
 * loadModules('commands');
 */
const loadModules = (type) => {
    const folderPath = path.join(__dirname, `modules/${type}`);
    const loadedModules = [];

    // Recursive function to traverse directories.
    const traverseDirectory = (currentPath) => {
        const entries = fs.readdirSync(currentPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(currentPath, entry.name);
            if (entry.isDirectory()) {
                // Recurse into subdirectory.
                traverseDirectory(fullPath);
            } else if (entry.isFile() && entry.name.endsWith('.js')) {
                try {
                    const module = require(fullPath);
                    // Process commands.
                    if (type === 'commands') {
                        if (!module.data || !module.data.description || !module.execute) {
                            logger.error(`❌ **Error:** Invalid command structure in \`${entry.name}\`: Missing \`description\` or \`execute\` function. ❌`);
                            continue;
                        }
                        commands.push(module);
                        logger.info(`✅ **Loaded Command:** \`${module.data.name}\` successfully from ${fullPath}. 🎉`);
                    } else if (type === 'services') {
                        const funcName = path.basename(entry.name, '.js');
                        functions.push(module);
                        logger.info(`✅ **Loaded Function:** \`${funcName}\` successfully from ${fullPath}. 🎉`);
                    }
                    loadedModules.push(module);
                } catch (err) {
                    logger.error(`❌ **Error:** Failed to load module from ${fullPath}: ${err.message}`);
                }
            }
        }
    };

    traverseDirectory(folderPath);
    return loadedModules;
};

loadModules('commands');
loadModules('services');
// Attach the commands array to the client so event files can access it.
client.commands = commands;

// Instantiate CompetitionService and attach it to the client.
const competitionService = new CompetitionService(client);
client.competitionService = competitionService;

/**
 * Initializes the Discord bot by loading modules, registering slash commands, and logging in.
 *
 * This function performs the following steps:
 * 1. Initializes competitions-related tables.
 * 2. Populates the skills_bosses & activities table.
 * 3. Dynamically loads command and service modules.
 * 4. Registers slash commands with Discord's API.
 * 5. Logs the bot into Discord.
 *
 * 🚀 This is the primary bootstrapping function for the bot.
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
        await initializeGuildTables();
        await initializeMsgTables();
        await initializeMainTables();

        const { REST } = require('@discordjs/rest');
        const { Routes } = require('discord-api-types/v10');

        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

        await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands.map((cmd) => cmd.data.toJSON()) });

        logger.info('✅ **Success!** Slash commands registered successfully. 🎉');

        await client.login(process.env.DISCORD_TOKEN);

        await fetchAndStoreChannelHistory(client, CLAN_CHAT_CHANNEL_ID);
        logger.info('✅ **Success!** Bot logged in successfully. 🎉');
    } catch (error) {
        logger.error('🚨 **Initialization Failed:** ' + error.message + ' ❌');
    }
};

const eventsPath = path.join(__dirname, 'modules', 'events');

/**
 * Recursively reads all .js files in a directory (and its subdirectories).
 * @param {string} dir - The directory to search.
 * @returns {string[]} An array of full paths to .js files.
 */
function getEventFiles(dir) {
    let eventFiles = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            // Recursively get files in subdirectories.
            eventFiles = eventFiles.concat(getEventFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            eventFiles.push(fullPath);
        }
    }

    return eventFiles;
}

const eventFiles = getEventFiles(eventsPath);

// Register each event with the Discord client.
for (const file of eventFiles) {
    const event = require(file);

    if (event.name === 'raw') {
        // 🔥 Raw events must be manually registered
        client.on('raw', (...args) => event.execute(...args, client));
        logger.info(`✅ Loaded RAW event handler from ${file}`);
    } else if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }

    logger.info(`✅ Loaded event handler for '${event.name}' from ${file}`);
}

initializeBot();
