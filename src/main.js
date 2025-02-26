const { Client, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const logger = require('./modules/utils/essentials/logger');
const initializeMainTables = require('./migrations/initializeMainTables');
const initializeGuildTables = require('./migrations/initializeGuildTables');
const initializeBingoTables = require('./migrations/initializeBingoTables');
const { initializeMsgTables } = require('./modules/collection/msgDatabase');
const { fetchAndStoreChannelHistory } = require('./modules/collection/msgFetcher');
const { registerModal } = require('./modules/utils/essentials/modalHandler');
const CompetitionService = require('./modules/services/competitionServices/competitionService');
const { generateDynamicTasks } = require('./modules/services/bingo/dynamicTaskGenerator');

const commands = [];
const functions = [];
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
        GatewayIntentBits.GuildExpressions,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildScheduledEvents,
        GatewayIntentBits.GuildMessagePolls,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.DirectMessagePolls,
    ],
    partials: [Partials.Message, Partials.Reaction, Partials.User],
});
const initializeBot = async () => {
    try {
        await initializeGuildTables();
        await initializeMsgTables();
        await initializeMainTables();
        await initializeBingoTables();
        await generateDynamicTasks();
        loadModules('commands', client);
        loadModules('services', client);
        loadModules('events', client);
        loadModules('modals', client);
        client.commands = commands;
        client.competitionService = new CompetitionService(client);
        const { REST } = require('@discordjs/rest');
        const { Routes } = require('discord-api-types/v10');
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands.map((cmd) => cmd.data.toJSON()) });
        logger.info('✅ Slash commands registered successfully.');
        await client.login(process.env.DISCORD_TOKEN);
        logger.info('✅ Bot logged in successfully.');
        await fetchAndStoreChannelHistory(client);
    } catch (error) {
        logger.error(`🚨 Initialization Failed: ${error.message}`);
    }
};
initializeBot();

module.exports = client;
