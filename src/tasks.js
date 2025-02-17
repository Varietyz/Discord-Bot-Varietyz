/**
 * @fileoverview
 * **Scheduled Tasks for the Varietyz Bot** ⏰
 *
 * This module defines and manages scheduled tasks for the Varietyz Bot. Each task is represented as an object that includes
 * its name, the asynchronous function to execute, the interval (in seconds) at which it should run, and flags indicating
 * whether the task should run on startup and be scheduled for periodic execution.
 *
 * **Key Features:**
 * - **Task Registration & Scheduling**: Registers tasks with customizable intervals and startup behavior.
 * - **Data Updates & Synchronization**: Includes tasks for updating data, processing name changes, fetching player data,
 * handling hiscores, and updating voice channels.
 * - **Integration with External Modules**: Utilizes external modules for database operations, logging, and data processing.
 * - **Asynchronous Execution**: Supports asynchronous task execution with proper error logging.
 *
 * **External Dependencies:**
 * - **dotenv**: Loads environment variables for configuration.
 * - Various processing modules (e.g., `member_channel`, `name_changes`, `player_data_extractor`).
 * - Database utilities (`dbUtils`) and logging utilities (`logger`).
 *
 * @module tasks
 */

const CompetitionService = require('./modules/services/competitionServices/competitionService');
const { updateData } = require('./modules/services/memberChannel');
const { processNameChanges } = require('./modules/services/nameChanges');
const { fetchAndUpdatePlayerData } = require('./modules/services/playerDataExtractor');
const { fetchAndProcessMember } = require('./modules/services/autoRoles');
const { updateVoiceChannel } = require('./modules/services/activeMembers');
const { getAll } = require('./modules/utils/essentials/dbUtils');
const logger = require('./modules/utils/essentials/logger');
require('dotenv').config();

/**
 * @typedef {Object} Task
 * @property {string} name - The unique name of the task.
 * @property {Function} func - The asynchronous function to execute for the task.
 * @property {number} interval - The interval in seconds at which the task should run.
 * @property {boolean} runOnStart - Indicates whether the task should run immediately upon bot startup.
 * @property {boolean} runAsTask - Indicates whether the task should be scheduled to run at regular intervals.
 */

/**
 * An array of scheduled tasks for the Varietyz Bot.
 * Each task adheres to the {@link Task} typedef.
 *
 * @type {Array<Task>}
 */
module.exports = [
    {
        name: 'rotationTask',
        func: async (client) => {
            const competitionService = new CompetitionService(client);
            await competitionService.startNextCompetitionCycle();
        },
        interval: 60 * 30, // Runs every 30 minutes
        runOnStart: true,
        runAsTask: true,
    },
    {
        name: 'updateData',
        func: async (client) => await updateData(client),
        interval: 60 * 30, // Runs every 30 minutes
        runOnStart: true,
        runAsTask: true,
    },
    {
        name: 'processNameChanges',
        func: async (client) => await processNameChanges(client),
        interval: 60 * 180, // Runs every 3 hours
        runOnStart: true,
        runAsTask: true,
    },
    {
        name: 'fetchAndUpdatePlayerData',
        func: async () => await fetchAndUpdatePlayerData(),
        interval: 60 * 60, // Runs every 1 hour
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
            const userIds = await getAll('SELECT DISTINCT discord_id FROM registered_rsn');
            for (const { discord_id: userId } of userIds) {
                await fetchAndProcessMember(guild, userId);
            }
        },
        interval: 60 * 60, // Runs every 1 hour
        runOnStart: true,
        runAsTask: true,
    },
    {
        name: 'updateVoiceChannel',
        func: async (client) => await updateVoiceChannel(client),
        interval: 60 * 180, // Runs every 3 hours
        runOnStart: true,
        runAsTask: true,
    },
];
