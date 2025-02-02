// competitionService/scheduler.js

const schedule = require('node-schedule');
const logger = require('../../utils/logger');

/**
 * 🎯 **Schedules a Competition Rotation**
 *
 * Cancels any existing rotation job and schedules a new rotation job using the `node-schedule` package.
 * When the scheduled time (`endTime`) is reached, the provided `rotationCallback` is invoked.
 *
 * @param {Date} endTime - The time when the competition ends and the rotation should trigger.
 * @param {Function} rotationCallback - The callback function to execute when the job triggers.
 * @param {Map<string, any>} scheduledJobs - A map tracking scheduled jobs. The key used here is `'rotation'`.
 *
 * @example
 * // Schedule a rotation for a competition ending at a specific date:
 * scheduleRotation(new Date('2025-02-03T15:00:00Z'), async () => {
 * // Callback logic for rotation
 * }, scheduledJobs);
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

    // Schedule the job to trigger at the specified endTime
    const job = schedule.scheduleJob(endTime, async () => {
        logger.info('Scheduled rotation triggered.');
        await rotationCallback();
        scheduledJobs.delete(jobName);
    });

    scheduledJobs.set(jobName, job);
    logger.info(`Scheduled rotation for ${endTime.toISOString()}.`);
}

/**
 * 🎯 **Schedules Rotations on Bot Startup**
 *
 * On bot startup, this function checks for active competitions and schedules a rotation based on the nearest
 * competition end time. If no active competitions are found, it triggers an immediate rotation.
 *
 * @async
 * @function scheduleRotationsOnStartup
 * @param {Object} db - The database utility object used to query competition data.
 * @param {Function} rotationCallback - The callback function to invoke when a rotation is triggered.
 * @param {Object} constants - A configuration object containing constant values (e.g., competition types).
 * @param {Map<string, any>} scheduledJobs - A map tracking scheduled jobs.
 *
 * @example
 * // On startup, schedule rotations:
 * scheduleRotationsOnStartup(db, async () => {
 * // Logic to start the next competition cycle
 * }, constants, scheduledJobs);
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

        // Find the nearest competition end time
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
