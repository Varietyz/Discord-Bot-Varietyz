const logger = require('../../utils/essentials/logger');
const { Metric } = require('@wise-old-man/utils');

async function createCompetition(womclient, db, type, metric, startsAt, endsAt, constants) {
    try {
        const recent = await db.getOne(
            `SELECT ends_at FROM competitions 
     WHERE type = ? 
       AND ends_at >= DATETIME('now', '-1 day') 
     ORDER BY ends_at DESC 
     LIMIT 1`,
            [type]
        );

        if (recent) {
            const lastEnd = new Date(recent.ends_at);
            const now = new Date();
            const hoursSinceLast = (now - lastEnd) / 1000 / 3600;
            if (hoursSinceLast < 3) {
                logger.warn(`🕒 Cooldown active: ${type} was created less than 3 hours ago.`);
                return null;
            }
        }

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
