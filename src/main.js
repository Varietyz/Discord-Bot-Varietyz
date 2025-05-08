require('dotenv').config();
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const https = require('https');

const {
    fetchAndStoreChannelHistory,
} = require('./modules/collection/msgFetcher');
const {
    generateDynamicTasks,
} = require('./modules/services/bingo/dynamicTaskGenerator');

const { initializeMsgTables } = require('./modules/collection/msgDatabase');
const initializeBingoTables = require('./migrations/initializeBingoTables');
const initializeGuildTables = require('./migrations/initializeGuildTables');
const initializeMainTables = require('./migrations/initializeMainTables');
const { loadModules, commands } = require('./moduleLoader');
const gracefulShutdown = require('./modules/events/client/gracefulShutdown');

const logger = require('./modules/utils/essentials/logger');
const loggedIn = require('./modules/events/bot/loggedIn');
const client = require('./modules/discordClient');
const CompetitionService = require('./modules/services/competitionServices/competitionService');
const { app, sslOptions } = require('./api'); 

const discordToken = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

const initializeBot = async () => {
    try {
        await initializeGuildTables();
        await initializeMainTables();
        await initializeMsgTables();
        await initializeBingoTables();
        await generateDynamicTasks();
        loadModules('commands', client);
        loadModules('services', client);
        loadModules('events', client);
        loadModules('modals', client);
        client.commands = commands;
        client.competitionService = new CompetitionService(client);

        const rest = new REST({ version: '10' }).setToken(discordToken);
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
            body: commands.map((cmd) => cmd.data.toJSON()),
        });

        logger.info('✅ Slash commands registered successfully.');

        await client.login(discordToken).then(() => {
            logger.info('✅ Discord client logged in successfully.');
        });
        loggedIn(client);
        await fetchAndStoreChannelHistory(client);

        https.createServer(sslOptions, app).listen(3003, () => {
            logger.info(
                '🔒 Secure HTTPS API server running on https://localhost:3003'
            );
        });
    } catch (error) {
        logger.error(`🚨 Initialization Failed: ${error.message}`);
        process.exit(1);
    }
};

initializeBot();

process.on('SIGINT', () => gracefulShutdown('SIGINT', client));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM', client));
