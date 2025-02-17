/* eslint-disable node/no-missing-require */
/* eslint-disable no-process-exit */
// @ts-nocheck

/**
 * @fileoverview
 * 🚀 **Main Entry Point for the Varietyz Bot** 🤖
 *
 * Initializes the bot by:
 * - **Loading Commands, Services, Events, and Modals** dynamically.
 * - **Registering Slash Commands** with Discord's API.
 * - **Setting up Database Tables**.
 * - **Handling Interactions** (commands, autocomplete, modals, select menus).
 * - **Ensuring Comprehensive Error Handling**.
 *
 * @module main
 */

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const logger = require('./modules/utils/essentials/logger');

const initializeMainTables = require('./migrations/initializeMainTables');
const initializeGuildTables = require('./migrations/initializeGuildTables');
const { initializeMsgTables } = require('./modules/collection/msgDatabase');
const { fetchAndStoreChannelHistory } = require('./modules/collection/msgFetcher');
const { registerModal } = require('./modules/utils/essentials/modalHandler');

const CompetitionService = require('./modules/services/competitionServices/competitionService');

/** @type {Array<Object>} */
const commands = [];
/** @type {Array<Object>} */
const functions = [];

/**
 * 🎯 **Dynamically loads all modules of a given type (Commands, Services, Events, Modals).**
 *
 * - Commands: Must export `data` (name, description) & `execute()`.
 * - Services: Loads utility services for background operations.
 * - Events: Attaches event listeners to the client.
 * - Modals: Must export `modalId` and `execute()`.
 *
 * @param {string} type - The module type (`commands`, `services`, `events`, `modals`).
 * @param {Client} client - The Discord client instance.
 * @returns
 */
const loadModules = (type, client) => {
    const folderPath = path.join(__dirname, `modules/${type}`);
    const loadedModules = [];

    const traverseDirectory = (currentPath) => {
        const entries = fs.readdirSync(currentPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(currentPath, entry.name);
            if (entry.isDirectory()) {
                traverseDirectory(fullPath);
            } else if (entry.isFile() && entry.name.endsWith('.js')) {
                try {
                    const module = require(fullPath);

                    if (type === 'commands') {
                        if (!module.data || !module.data.description || !module.execute) {
                            logger.error(`❌ Error: Invalid command in ${entry.name}. Missing 'description' or 'execute'.`);
                            continue;
                        }
                        commands.push(module);
                        logger.info(`✅ Loaded Command: ${module.data.name}`);
                    } else if (type === 'services') {
                        functions.push(module);
                        logger.info(`✅ Loaded Service: ${path.basename(entry.name, '.js')}`);
                    } else if (type === 'events') {
                        if (!module.name) {
                            logger.warn(`⚠️ Skipping event file ${entry.name} - missing event name.`);
                            continue;
                        }
                        if (module.once) {
                            client.once(module.name, (...args) => module.execute(...args, client));
                        } else {
                            client.on(module.name, (...args) => module.execute(...args, client));
                        }
                        logger.info(`✅ Loaded Event: ${module.name}`);
                    } else if (type === 'modals') {
                        if (!module.modalId || !module.execute) {
                            logger.warn(`⚠️ Skipping modal file ${entry.name} - missing modalId or execute function.`);
                            continue;
                        }
                        registerModal(module.modalId, module.execute);
                        logger.info(`✅ Registered Modal: ${module.modalId}`);
                    }

                    loadedModules.push(module);
                } catch (err) {
                    logger.error(`❌ Error: Failed to load ${type} module from ${fullPath}: ${err.message}`);
                }
            }
        }
    };

    traverseDirectory(folderPath);
    return loadedModules;
};

// Create the Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.AutoModerationConfiguration,
        GatewayIntentBits.AutoModerationExecution,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildScheduledEvents,
        GatewayIntentBits.GuildMessagePolls,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.DirectMessagePolls,
    ],
    partials: [Partials.Message, Partials.Reaction, Partials.User],
});

/**
 * 🎯 **Initializes the bot**
 * - Loads all required modules.
 * - Registers Slash Commands.
 * - Logs into Discord.
 */
const initializeBot = async () => {
    try {
        await initializeGuildTables();
        await initializeMsgTables();
        await initializeMainTables();

        // Load commands, services, events, and modals
        loadModules('commands', client);
        loadModules('services', client);
        loadModules('events', client);
        loadModules('modals', client);

        client.commands = commands;
        client.competitionService = new CompetitionService(client);

        // Register slash commands
        const { REST } = require('@discordjs/rest');
        const { Routes } = require('discord-api-types/v10');

        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands.map((cmd) => cmd.data.toJSON()) });

        logger.info('✅ Slash commands registered successfully.');

        // Log in
        await client.login(process.env.DISCORD_TOKEN);
        logger.info('✅ Bot logged in successfully.');

        // Fetch message history for Clan Chat channel
        await fetchAndStoreChannelHistory(client);
    } catch (error) {
        logger.error(`🚨 Initialization Failed: ${error.message}`);
    }
};

// Start the bot
initializeBot();
