const logger = require('../../utils/essentials/logger');
const { Metric } = require('@wise-old-man/utils');
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