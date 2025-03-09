const CompetitionService = require('./modules/services/competitionServices/competitionService');
const { updateData } = require('./modules/services/memberChannel');
const { processNameChanges } = require('./modules/services/nameChanges');
const { fetchAndUpdatePlayerData } = require('./modules/services/playerDataExtractor');
const { fetchAndProcessMember } = require('./modules/services/autoRoles');
const { updateVoiceChannel } = require('./modules/services/activeMembers');
const { updateBingoProgress } = require('./modules/services/bingo/bingoService');
const { getAll } = require('./modules/utils/essentials/dbUtils');
const logger = require('./modules/utils/essentials/logger');
const { autoTransitionEvents } = require('./modules/services/bingo/autoTransitionEvents');
require('dotenv').config();
module.exports = [
    {
        name: 'rotationTask',
        func: async (client) => {
            const competitionService = new CompetitionService(client);
            await competitionService.startNextCompetitionCycle();
        },
        interval: 60 * 30,
        runOnStart: true,
        runAsTask: true,
    },
    {
        name: 'updateData',
        func: async (client) => await updateData(client),
        interval: 60 * 30,
        runOnStart: true,
        runAsTask: true,
    },
    {
        name: 'processNameChanges',
        func: async (client) => await processNameChanges(client),
        interval: 60 * 180,
        runOnStart: true,
        runAsTask: true,
    },
    {
        name: 'fetchAndUpdatePlayerData',
        func: async () => await fetchAndUpdatePlayerData(),
        interval: 60 * 30,
        runOnStart: false,
        runAsTask: true,
    },
    {
        name: 'handleHiscoresData',
        func: async (client) => {
            const guild = await client.guilds.cache.get(process.env.GUILD_ID);
            if (!guild) {
                logger.error('Guild not found');
                return;
            }
            const userIds = await getAll('SELECT DISTINCT discord_id FROM registered_rsn');
            for (const { discord_id: userId } of userIds) {
                await fetchAndProcessMember(guild, userId);
            }
        },
        interval: 60 * 60,
        runOnStart: true,
        runAsTask: true,
    },
    {
        name: 'updateVoiceChannel',
        func: async (client) => await updateVoiceChannel(client),
        interval: 60 * 180,
        runOnStart: true,
        runAsTask: true,
    },
    {
        name: 'autoTransitionEvents',
        func: async () => await autoTransitionEvents(),
        interval: 60 * 5,
        runOnStart: true,
        runAsTask: true,
    },
    {
        name: 'updateBingoProgress',
        func: async (client) => await updateBingoProgress(client),
        interval: 60 * 5,
        runOnStart: true,
        runAsTask: true,
    },
];
