// @ts-nocheck
// competitionService/competitionCreator.js

const logger = require('../../utils/logger');
const { Metric } = require('@wise-old-man/utils');

/**
 * Creates a new competition on WOM, inserts it into the DB.
 * @param {WOMClient} womclient - The WOMClient instance.
 * @param {Object} db - The database utility.
 * @param {string} type - Competition type ('SOTW' or 'BOTW').
 * @param {string} metric - The metric name.
 * @param {Date} startsAt - Competition start time.
 * @param {Date} endsAt - Competition end time.
 * @param {Object} constants - Configuration constants.
 * @returns {Promise<Object>} - The newly created competition.
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
            `INSERT INTO competitions (id, title, metric, type, starts_at, ends_at, verification_code, rotation_index)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [competitionId, title, metric, type, startsAt.toISOString(), endsAt.toISOString(), verificationCode, rotationIndex],
        );

        logger.info(`Created competition ${competitionId} of type ${type} with metric ${metric}, rotation index ${rotationIndex}.`);
        return newComp;
    } catch (err) {
        logger.error(`Error in createCompetition: ${err.message}`);
        throw err;
    }
}

module.exports = {
    createCompetition,
};
