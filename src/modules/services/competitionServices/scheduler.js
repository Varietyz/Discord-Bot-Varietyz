// competitionService/scheduler.js

const schedule = require('node-schedule');
const logger = require('../../utils/logger');

/**
 * Schedules the rotation using node-schedule.
 * @param {Date} endTime - The time when the competition ends.
 * @param {Function} rotationCallback - The function to call when the job triggers.
 * @param {Map} scheduledJobs - Map of scheduled jobs.
 */
function scheduleRotation(endTime, rotationCallback, scheduledJobs) {
    const jobName = 'rotation';

    // Cancel existing job if any
    if (scheduledJobs.has(jobName)) {
        const existingJob = scheduledJobs.get(jobName);
        existingJob.cancel();
        scheduledJobs.delete(jobName);
        logger.info('Cleared existing scheduled rotation job.');
    }

    // Schedule the job
    const job = schedule.scheduleJob(endTime, async () => {
        logger.info('Scheduled rotation triggered.');
        await rotationCallback();
        scheduledJobs.delete(jobName);
    });

    scheduledJobs.set(jobName, job);
    logger.info(`Scheduled rotation for ${endTime.toISOString()}.`);
}

/**
 * On bot startup, schedule rotations based on active competitions.
 * @param {Object} db - The database utility.
 * @param {Function} rotationCallback - The function to call when rotation is triggered.
 * @param {Object} constants - Configuration constants.
 * @param {Map} scheduledJobs - Map of scheduled jobs.
 */
async function scheduleRotationsOnStartup(db, rotationCallback, constants, scheduledJobs) {
    try {
        const now = new Date().toISOString();
        const activeCompetitions = await db.getAll(
            `
            SELECT *
            FROM competitions
            WHERE ends_at > ?
              AND type IN ('SOTW','BOTW')
            ORDER BY ends_at ASC
            `,
            [now],
        );

        if (activeCompetitions.length === 0) {
            logger.info('No active competitions on startup. Scheduling immediate rotation.');
            await rotationCallback();
            return;
        }

        // Find the nearest end time
        const nearestEnd = activeCompetitions[0].ends_at;
        scheduleRotation(new Date(nearestEnd), rotationCallback, scheduledJobs);
        logger.info(`Scheduled rotation for competition ending at ${nearestEnd}.`);
    } catch (err) {
        logger.error(`Error scheduling rotations on startup: ${err.message}`);
    }
}

module.exports = {
    scheduleRotation,
    scheduleRotationsOnStartup,
};
