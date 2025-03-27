const schedule = require('node-schedule');
const logger = require('../../utils/essentials/logger');
/**
 *
 * @param endTime
 * @param rotationCallback
 * @param scheduledJobs
 */
function scheduleRotation(endTime, rotationCallback, scheduledJobs) {
    const jobName = 'rotation';
    if (scheduledJobs.has(jobName)) {
        const existingJob = scheduledJobs.get(jobName);
        existingJob.cancel();
        scheduledJobs.delete(jobName);
        logger.info('🚫 **Cleared existing scheduled rotation job.**');
    }
    let isRotating = false;
    /**
     *
     */
    async function safeRotationCallback() {
        if (isRotating) {
            logger.warn('Rotation already in progress. Skipping duplicate call.');
            return;
        }
        isRotating = true;
        try {
            await rotationCallback();
        } catch (error) {
            logger.error('Error during rotation:', error);
        } finally {
            isRotating = false;
        }
    }
    const job = schedule.scheduleJob(endTime, async () => {
        logger.info('🔄 **Scheduled rotation triggered!** Executing rotation callback...');
        await safeRotationCallback();
        scheduledJobs.delete(jobName);
    });
    scheduledJobs.set(jobName, job);
    logger.info(`✅ **Scheduled rotation** for \`${endTime.toISOString()}\`.`);
}
/**
 *
 * @param db
 * @param rotationCallback
 * @param constants
 * @param scheduledJobs
 */
async function scheduleRotationsOnStartup(db, rotationCallback, constants, scheduledJobs) {
    try {
        const now = new Date().toISOString();
        const activeCompetitions = await db.getAll(
            `
            SELECT *
            FROM competitions
            WHERE ends_at > ? 
              AND type IN ('SOTW', 'BOTW')
            ORDER BY ends_at ASC
            `,
            [now],
        );

        if (activeCompetitions.length === 0) {
            logger.info('📛 **No active competitions on startup.** Scheduling immediate rotation...');
            await rotationCallback();
            return;
        }
        const nearestEnd = activeCompetitions[0].ends_at;
        scheduleRotation(new Date(nearestEnd), rotationCallback, scheduledJobs);
        logger.info(`📌 **Scheduled rotation for competition ending at** \`${nearestEnd}\`.`);
    } catch (err) {
        logger.error(`🚨 **Error scheduling rotations on startup:** ${err.message}`);
    }
}
module.exports = {
    scheduleRotation,
    scheduleRotationsOnStartup,
};
