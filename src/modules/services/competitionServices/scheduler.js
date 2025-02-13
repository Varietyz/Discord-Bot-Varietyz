const schedule = require('node-schedule');
const logger = require('../../utils/essentials/logger');

/**
 * 🎯 **Schedules a Competition Rotation**
 *
 * - Cancels any existing **rotation job** before scheduling a new one.
 * - Uses the **node-schedule** package to trigger the `rotationCallback` at the specified `endTime`.
 * - Keeps track of scheduled jobs in the provided `scheduledJobs` map.
 *
 * ---
 *
 * 🔹 **How It Works:**
 * - 🛑 Cancels the **previously scheduled rotation**, if any.
 * - 🕛 Schedules a **new rotation** for the provided `endTime`.
 * - 🎲 When triggered, the **rotation callback** executes and removes the scheduled job.
 *
 * ---
 *
 * @param {Date} endTime - 📅 The **exact time** when the competition ends and rotation should trigger.
 * @param {Function} rotationCallback - 🔄 The callback function executed **when the job triggers**.
 * @param {Map<string, any>} scheduledJobs - 📌 A map tracking scheduled jobs (`'rotation'` key is used).
 *
 * ---
 *
 * @example
 * // 📌 Schedule a competition rotation:
 * scheduleRotation(new Date('2025-02-03T15:00:00Z'), async () => {
 * // 🔄 Callback logic for rotating the competition
 * }, scheduledJobs);
 */
function scheduleRotation(endTime, rotationCallback, scheduledJobs) {
    const jobName = 'rotation';

    if (scheduledJobs.has(jobName)) {
        const existingJob = scheduledJobs.get(jobName);
        existingJob.cancel();
        scheduledJobs.delete(jobName);
        logger.info('🚫 **Cleared existing scheduled rotation job.**');
    }

    const job = schedule.scheduleJob(endTime, async () => {
        logger.info('🔄 **Scheduled rotation triggered!** Executing rotation callback...');
        await rotationCallback();
        scheduledJobs.delete(jobName);
    });

    scheduledJobs.set(jobName, job);
    logger.info(`✅ **Scheduled rotation** for \`${endTime.toISOString()}\`.`);
}

/**
 * 🎯 **Schedules Rotations on Bot Startup**
 *
 * - Checks for **active competitions** in the database.
 * - If active competitions exist, **schedules a rotation** at the **earliest competition end time**.
 * - If no active competitions are found, **triggers an immediate rotation**.
 *
 * ---
 *
 * 🔹 **How It Works:**
 * - 📊 Queries the database for **ongoing competitions** (`SOTW`, `BOTW`).
 * - 🏁 If no competitions are active, **immediately starts a new competition cycle**.
 * - 📅 If competitions are active, schedules a **rotation at the nearest end time**.
 *
 * ---
 *
 * @async
 * @function scheduleRotationsOnStartup
 * @param {Object} db - 🗄️ The database utility object for **querying competition data**.
 * @param {Function} rotationCallback - 🔄 The function that executes **when a rotation is triggered**.
 * @param {Object} constants - ⚙️ A configuration object containing **competition types and settings**.
 * @param {Map<string, any>} scheduledJobs - 📌 A map tracking scheduled jobs.
 *
 * ---
 *
 * @example
 * // 📌 On bot startup, schedule rotations:
 * scheduleRotationsOnStartup(db, async () => {
 * // 🔄 Logic to start the next competition cycle
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
