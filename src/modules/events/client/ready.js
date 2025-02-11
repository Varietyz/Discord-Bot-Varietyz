// src/modules/events/ready.js

const logger = require('../../utils/logger');
const dbUtils = require('../../utils/dbUtils');
const tasks = require('../../../tasks');

const populateSkillsBosses = require('../../../migrations/populateSkillsBosses');
const populateHiscoreActivities = require('../../../migrations/populateHiscoreActivities');

module.exports = {
    name: 'ready', // Event name
    once: true, // Run only once
    /**
     * Execute when the bot becomes ready.
     * @param client - The Discord client instance.
     */
    async execute(client) {
        logger.info(`✅ Online: ${client.user.tag} is now online! 🎉`);
        dbUtils.setClient(client);

        await populateSkillsBosses(client);
        await populateHiscoreActivities(client);

        // Execute tasks that need to run on startup.
        for (const task of tasks) {
            if (task.runOnStart) {
                logger.info(`⏳ Running startup task: ${task.name}`);
                try {
                    await task.func(client);
                } catch (err) {
                    logger.error(`🚨 Startup task error (${task.name}): ${err}`);
                }
            }
        }

        // Schedule periodic tasks.
        tasks.forEach((task) => {
            if (task.runAsTask) {
                const hours = Math.floor(task.interval / 3600);
                const minutes = Math.floor((task.interval % 3600) / 60);
                const intervalFormatted = `${hours > 0 ? `${hours}h ` : ''}${minutes}m`;
                logger.info(`⏳ Scheduled task: ${task.name} every ${intervalFormatted}.`);

                setInterval(async () => {
                    logger.info(`⏳ Executing scheduled task: ${task.name}...`);
                    try {
                        await task.func(client);
                    } catch (err) {
                        logger.error(`🚨 Task error (${task.name}): ${err}`);
                    }
                }, task.interval * 1000);
            }
        });
    },
};
