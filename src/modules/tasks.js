/**
 * @fileoverview Defines scheduled tasks for the Varietyz Bot.
 * Each task includes a name, the function to execute, the interval at which to run,
 * and flags indicating whether to run on startup and as a scheduled task.
 *
 * @module modules/tasks
 */

const { updateData } = require('./functions/member_channel');
const { processNameChanges } = require('./functions/name_changes');
const {
    fetchAndUpdatePlayerData
} = require('./functions/player_data_extractor');
const { fetchAndProcessMember } = require('./functions/auto_roles');
const { updateVoiceChannel } = require('./functions/active_members');
require('dotenv').config();
const { getAll } = require('../utils/dbUtils');
const logger = require('../utils/logger');

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
        name: 'updateData',
        func: async (client) => await updateData(client),
        interval: 600 * 3, // Runs every 1800 seconds (30 minutes)
        runOnStart: true,
        runAsTask: true
    },
    {
        name: 'processNameChanges',
        func: async (client) => await processNameChanges(client),
        interval: 3600 * 3, // Runs every 10800 seconds (3 hours)
        runOnStart: true,
        runAsTask: true
    },
    {
        name: 'fetchAndUpdatePlayerData',
        func: async () => await fetchAndUpdatePlayerData(),
        interval: 600 * 1, // Runs every 3600 seconds (1 hour)
        runOnStart: true,
        runAsTask: true
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
            const userIds = await getAll(
                'SELECT DISTINCT user_id FROM registered_rsn'
            );

            for (const { user_id: userId } of userIds) {
                await fetchAndProcessMember(guild, userId); // Dynamically process members
            }
        },
        interval: 3600 * 1, // Runs every 3600 seconds (1 hour)
        runOnStart: true,
        runAsTask: true
    },
    {
        name: 'updateVoiceChannel',
        func: async (client) => await updateVoiceChannel(client),
        interval: 3600 * 3, // Runs every 10800 seconds (3 hours)
        runOnStart: true,
        runAsTask: true
    }
];
