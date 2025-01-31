/**
 * @fileoverview Defines and manages scheduled tasks for the Varietyz Bot.
 * Each task is represented as an object that includes its name, function to execute,
 * interval for execution, and flags for startup and scheduling behavior. Tasks are
 * used to handle automated processes such as data updates, member processing, and
 * player data synchronization.
 *
 * Key Features:
 * - Registers and schedules tasks with customizable intervals and execution behavior.
 * - Includes tasks for updating data, processing name changes, fetching player data, handling hiscores, and updating voice channels.
 * - Integrates with external modules for processing and database operations.
 * - Supports asynchronous execution and error logging for each task.
 *
 * External Dependencies:
 * - dotenv: Loads environment variables for configuration.
 * - Various processing modules (e.g., member_channel, name_changes, player_data_extractor).
 * - Database utilities (`dbUtils`) and logging utilities (`logger`).
 *
 * @module tasks
 */
const CompetitionService = require('./modules/services/competitionServices/competitionService');
const { updateData } = require('./modules/services/member_channel');
const { processNameChanges } = require('./modules/services/name_changes');
const { fetchAndUpdatePlayerData } = require('./modules/services/player_data_extractor');
const { fetchAndProcessMember } = require('./modules/services/auto_roles');
const { updateVoiceChannel } = require('./modules/services/active_members');
const { getAll } = require('./modules/utils/dbUtils');
const logger = require('./modules/utils/logger');
require('dotenv').config();

/**
 * Represents a scheduled task.
 *
 * @typedef {Object} Task
 * @property {string} name - The unique name of the task.
 * @property {Function} func - The asynchronous function to execute for the task.
 * @property {number} interval - The interval in seconds at which the task should run.
 * @property {boolean} runOnStart - Indicates whether the task should run immediately upon bot startup.
 * @property {boolean} runAsTask - Indicates whether the task should be scheduled to run at regular intervals.
 */

/**
 * An array of scheduled tasks for the Varietyz Bot.
 * Each task is an object adhering to the {@link Task} typedef.
 *
 * @type {Array<Task>}
 */
module.exports = [
    {
        // TODO: HAVE THIS DETERMINED BY COMPETITION START AND END TIMES FOR ACCURACY
        name: 'rotationTask',
        func: async (client) => {
            const competitionService = new CompetitionService(client);
            await competitionService.startNextCompetitionCycle();
        },
        interval: 600 * 3, // Runs every 30 min
        runOnStart: true,
        runAsTask: true,
    },
    {
        name: 'updateData',
        func: async (client) => await updateData(client),
        interval: 600 * 3, // Runs every 1800 seconds (30 minutes)
        runOnStart: true,
        runAsTask: true,
    },
    {
        name: 'processNameChanges',
        func: async (client) => await processNameChanges(client),
        interval: 3600 * 3, // Runs every 10800 seconds (3 hours)
        runOnStart: true,
        runAsTask: true,
    },
    {
        name: 'fetchAndUpdatePlayerData',
        func: async () => await fetchAndUpdatePlayerData(),
        interval: 3600 * 1, // Runs every 3600 seconds (1 hour)
        runOnStart: true,
        runAsTask: true,
    },
    {
        name: 'handleHiscoresData',
        func: async (client) => {
            const guild = client.guilds.cache.get(process.env.GUILD_ID);
            if (!guild) {
                logger.error('Guild not found');
                return;
            }

            // Fetch all user IDs with RSNs
            const userIds = await getAll('SELECT DISTINCT user_id FROM registered_rsn');

            for (const { user_id: userId } of userIds) {
                await fetchAndProcessMember(guild, userId); // Dynamically process members
            }
        },
        interval: 3600 * 1, // Runs every 3600 seconds (1 hour)
        runOnStart: true,
        runAsTask: true,
    },
    {
        name: 'updateVoiceChannel',
        func: async (client) => await updateVoiceChannel(client),
        interval: 3600 * 3, // Runs every 10800 seconds (3 hours)
        runOnStart: true,
        runAsTask: true,
    },
];
