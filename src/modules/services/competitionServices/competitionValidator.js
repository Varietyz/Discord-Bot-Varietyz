const logger = require('../../utils/essentials/logger');
const WOMApiClient = require('../../../api/wise_old_man/apiClient');
async function removeInvalidCompetitions(db) {
    try {
        const allCompetitions = await db.getAll('SELECT * FROM competitions');
        logger.debug(`🔍 Fetched \`${allCompetitions.length}\` competitions from the database.`);
        for (const comp of allCompetitions) {
            try {
                const womDetails = await WOMApiClient.retryRequest('competitions', 'getCompetitionDetails', comp.competition_id);
                if (!womDetails) {
                    await db.runQuery('DELETE FROM votes WHERE competition_id = ?', [comp.competition_id]);
                    await db.runQuery('DELETE FROM competitions WHERE competition_id = ?', [comp.competition_id]);
                    logger.info(`🚫 Removed competition ID \`${comp.competition_id}\` from DB (WOM "Competition not found").`);
                    continue;
                }
                const { id, title, metric, startsAt, endsAt } = womDetails;
                logger.debug(`🔍 WOM Competition Details for ID \`${id}\`: Title="\`${title}\`", Metric="\`${metric}\`", StartsAt="\`${startsAt}\`", EndsAt="\`${endsAt}\`"`);
                const dbCompetition = comp;
                const updates = {};
                if (dbCompetition.title !== title) {
                    updates.title = title;
                    logger.info(`✏️ Updating title for competition ID \`${comp.competition_id}\`: "\`${dbCompetition.title}\`" => "\`${title}\`"`);
                }
                if (dbCompetition.metric !== metric) {
                    updates.metric = metric;
                    logger.info(`✏️ Updating metric for competition ID \`${comp.competition_id}\`: "\`${dbCompetition.metric}\`" => "\`${metric}\`"`);
                }
                const dbStartsAt = new Date(dbCompetition.starts_at);
                const apiStartsAt = new Date(startsAt);
                if (dbStartsAt.getTime() !== apiStartsAt.getTime()) {
                    updates.starts_at = apiStartsAt.toISOString();
                    logger.info(`✏️ Updating starts_at for competition ID \`${comp.competition_id}\`: "\`${dbCompetition.starts_at}\`" => "\`${updates.starts_at}\`"`);
                }
                const dbEndsAt = new Date(dbCompetition.ends_at);
                const apiEndsAt = new Date(endsAt);
                if (dbEndsAt.getTime() !== apiEndsAt.getTime()) {
                    updates.ends_at = apiEndsAt.toISOString();
                    logger.info(`✏️ Updating ends_at for competition ID \`${comp.competition_id}\`: "\`${dbCompetition.ends_at}\`" => "\`${updates.ends_at}\`"`);
                }
                const updateKeys = Object.keys(updates);
                if (updateKeys.length > 0) {
                    const setClause = updateKeys.map((key) => `${key} = ?`).join(', ');
                    const values = updateKeys.map((key) => updates[key]);
                    values.push(comp.competition_id);
                    const updateQuery = `
                        UPDATE competitions
                        SET ${setClause}
                        WHERE competition_id = ?
                    `;
                    await db.runQuery(updateQuery, values);
                    logger.info(`✅ Updated competition ID \`${comp.competition_id}\` with new details from WOM API.`);
                }
            } catch (err) {
                logger.error(`❌ Error fetching WOM competition ID \`${comp.competition_id}\`: ${err.message}`, { competitionId: comp.competition_id, errorStack: err.stack });
            }
        }
    } catch (err) {
        logger.error(`❌ Failed to remove invalid competitions: ${err.message}`, { errorStack: err.stack });
    }
}
module.exports = {
    removeInvalidCompetitions,
};