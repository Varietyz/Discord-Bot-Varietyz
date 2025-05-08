const schedule = require('node-schedule');
const logger = require('../../utils/essentials/logger');

function scheduleRotation(
    endTime,
    rotationCallback,
    scheduledJobs,
    jobKey = 'rotation'
) {

    if (scheduledJobs.has(jobKey)) {
        const existingJob = scheduledJobs.get(jobKey);
        existingJob.cancel();
        scheduledJobs.delete(jobKey);
        logger.info(
            `🚫 **Cleared existing scheduled rotation job for ${jobKey}.**`
        );
    }

    if (!scheduledJobs.meta) scheduledJobs.meta = new Map();
    scheduledJobs.meta.set(`${jobKey}-isRotating`, false);

    async function safeRotationCallback() {
        const isRunning = scheduledJobs.meta.get(`${jobKey}-isRotating`);
        if (isRunning) {
            logger.warn(
                `Rotation already in progress for ${jobKey}. Skipping duplicate call.`
            );
            return;
        }

        scheduledJobs.meta.set(`${jobKey}-isRotating`, true);
        try {
            logger.info(`🔄 Executing rotation callback for ${jobKey}...`);
            await rotationCallback();
        } catch (error) {
            logger.error(`Error during rotation for ${jobKey}:`, error);
        } finally {
            scheduledJobs.meta.set(`${jobKey}-isRotating`, false);
        }
    }

    const job = schedule.scheduleJob(endTime, async () => {
        logger.info(`🔔 Scheduled rotation triggered for ${jobKey}!`);
        await safeRotationCallback();
        scheduledJobs.delete(jobKey);
    });
    scheduledJobs.set(jobKey, job);
    logger.info(
        `✅ **Scheduled rotation** for ${jobKey} at ${endTime.toISOString()}.`
    );
}

async function scheduleRotationsOnStartup(
    db,
    rotationCallback,
    constants,
    scheduledJobs
) {
    try {

        for (const [key, job] of scheduledJobs.entries()) {
            job.cancel();
            logger.info(`🧹 Cleared scheduled job: ${key}`);
        }
        scheduledJobs.clear();
        scheduledJobs.meta = new Map();

        const now = new Date().toISOString();
        const activeCompetitions = await db.getAll(
            `
            SELECT *
            FROM competitions
            WHERE ends_at > ? 
              AND type IN ('SOTW', 'BOTW')
            ORDER BY ends_at ASC
            `,
            [now]
        );

        if (activeCompetitions.length === 0) {
            logger.info(
                '📛 **No active competitions on startup.** Scheduling immediate rotation...'
            );
            await rotationCallback();
            return;
        }

        for (const comp of activeCompetitions) {
    const rotationTime = new Date(comp.ends_at);
    const jobKey = `rotation-${comp.competition_id}`;
    scheduleRotation(rotationTime, rotationCallback, scheduledJobs, jobKey);
}

        logger.info(
            `📌 **Scheduled rotation for competition ending at** ${nearestEnd}.`
        );
        logger.info(
    `🗂️ Total scheduled rotation jobs: ${scheduledJobs.size} (${[...scheduledJobs.keys()].join(', ')})`
);

    } catch (err) {
        logger.error(
            `🚨 **Error scheduling rotations on startup:** ${err.message}`
        );
    }
}

module.exports = {
    scheduleRotation,
    scheduleRotationsOnStartup,
};
