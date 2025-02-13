// @ts-nocheck
// competitionService/competitionCreator.js

const logger = require('../../utils/essentials/logger');
const { Metric } = require('@wise-old-man/utils');

/**
 * 🎯 **Creates a New Competition on WOM and Inserts it into the Database**
 *
 * This function creates a new competition via the WOM API using the provided parameters.
 * It then inserts the new competition details into the database. For BOTW competitions,
 * a rotation index is calculated based on the most recent BOTW competition.
 *
 * ---
 *
 * 🔹 **How It Works:**
 * - Formats the competition title based on the metric and type.
 * - Validates the provided metric against the available `Metric` values.
 * - Creates the competition on WOM using the WOMClient.
 * - For BOTW competitions, calculates the next rotation index.
 * - Inserts the competition details into the database.
 *
 * ---
 *
 * @async
 * @function createCompetition
 * @param {WOMClient} womclient - The WOMClient instance used for creating competitions.
 * @param {Object} db - The database utility object for executing queries.
 * @param {string} type - The competition type, either `'SOTW'` or `'BOTW'`.
 * @param {string} metric - The metric name (e.g., `'mining'`); underscores will be replaced with spaces.
 * @param {Date} startsAt - The start time for the competition.
 * @param {Date} endsAt - The end time for the competition.
 * @param {Object} constants - Configuration constants, including `WOM_GROUP_ID` and `WOM_VERIFICATION`.
 * @returns {Promise<Object>} A promise that resolves to the newly created competition object from WOM. 📦
 *
 * @throws {Error} Throws an error if the provided metric is invalid or if the competition creation fails.
 *
 * @example
 * // 📌 Example usage:
 * const newCompetition = await createCompetition(
 * womclient,
 * db,
 * 'SOTW',
 * 'mining',
 * new Date(),
 * new Date(Date.now() + 604800000),
 * constants
 * );
 * console.log('Created Competition:', newCompetition);
 */
async function createCompetition(womclient, db, type, metric, startsAt, endsAt, constants) {
    try {
        const title = type === 'SOTW' ? `${metric.replace(/_/g, ' ').toUpperCase()} SOTW` : `${metric.replace(/_/g, ' ').toUpperCase()} BOTW`;

        const metricKey = metric.toUpperCase();
        if (!Metric[metricKey]) {
            throw new Error(`Invalid metric: ${metric}`);
        }
        const competitionMetric = Metric[metricKey];

        const newComp = await womclient.competitions.createCompetition({
            title,
            metric: competitionMetric,
            startsAt: startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
            groupId: Number(constants.WOM_GROUP_ID),
            groupVerificationCode: constants.WOM_VERIFICATION,
        });

        const competitionId = newComp.competition.id;
        const verificationCode = newComp.verificationCode;

        let rotationIndex = 0;
        if (type === 'BOTW') {
            const lastIndex = await db.getOne('SELECT MAX(rotation_index) AS last_index FROM competitions WHERE type = "BOTW"');
            rotationIndex = (lastIndex?.last_index ?? 0) + 1;
        }

        await db.runQuery(
            `INSERT INTO competitions (competition_id, title, metric, type, starts_at, ends_at, verification_code, rotation_index)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [competitionId, title, metric, type, startsAt.toISOString(), endsAt.toISOString(), verificationCode, rotationIndex],
        );

        logger.info(`🚀 Created competition \`${competitionId}\` of type \`${type}\` with metric \`${metric}\` and rotation index \`${rotationIndex}\`.`);
        return newComp;
    } catch (err) {
        logger.error(`❌ Error in createCompetition: ${err.message}`);
        throw err;
    }
}

module.exports = {
    createCompetition,
};
