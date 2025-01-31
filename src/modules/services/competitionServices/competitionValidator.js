/* eslint-disable jsdoc/check-param-names */
// @ts-nocheck
// competitionService/competitionValidator.js

const logger = require('../../utils/logger');
const WOMApiClient = require('../../../api/wise_old_man/apiClient');

/**
 * Removes invalid competitions by checking with WOM API.
 * @param {Object} db - The database utility.
 */
async function removeInvalidCompetitions(db) {
    try {
        const allCompetitions = await db.getAll('SELECT * FROM competitions');
        logger.debug(`Fetched ${allCompetitions.length} competitions from the database.`);

        for (const comp of allCompetitions) {
            try {
                // Fetch competition details using retryRequest (handles rate limits and errors)
                const womDetails = await WOMApiClient.retryRequest('competitions', 'getCompetitionDetails', comp.id);

                // If womDetails is null, competition was deleted or not found, remove from DB
                if (!womDetails) {
                    await db.runQuery('DELETE FROM votes WHERE competition_id = ?', [comp.id]);
                    await db.runQuery('DELETE FROM competitions WHERE id = ?', [comp.id]);
                    logger.info(`Removed competition ID ${comp.id} from DB (WOM "Competition not found").`);
                    continue; // Move to the next competition
                }

                const { id, title, metric, startsAt, endsAt } = womDetails;
                logger.debug(`WOM Competition Details for ID ${id}: Title="${title}", Metric="${metric}", StartsAt="${startsAt}", EndsAt="${endsAt}"`);

                // Compare API data with DB entry
                const dbCompetition = comp;
                const updates = {};

                // Compare and prepare updates
                if (dbCompetition.title !== title) {
                    updates.title = title;
                    logger.info(`Updating title for competition ID ${comp.id}: "${dbCompetition.title}" => "${title}"`);
                }

                if (dbCompetition.metric !== metric) {
                    updates.metric = metric;
                    logger.info(`Updating metric for competition ID ${comp.id}: "${dbCompetition.metric}" => "${metric}"`);
                }

                // Handle starts_at
                const dbStartsAt = new Date(dbCompetition.starts_at);
                const apiStartsAt = new Date(startsAt);
                if (dbStartsAt.getTime() !== apiStartsAt.getTime()) {
                    updates.starts_at = apiStartsAt.toISOString();
                    logger.info(`Updating starts_at for competition ID ${comp.id}: "${dbCompetition.starts_at}" => "${updates.starts_at}"`);
                }

                // Handle ends_at
                const dbEndsAt = new Date(dbCompetition.ends_at);
                const apiEndsAt = new Date(endsAt);
                if (dbEndsAt.getTime() !== apiEndsAt.getTime()) {
                    updates.ends_at = apiEndsAt.toISOString();
                    logger.info(`Updating ends_at for competition ID ${comp.id}: "${dbCompetition.ends_at}" => "${updates.ends_at}"`);
                }

                // If any updates are present, execute the update query
                const updateKeys = Object.keys(updates);
                if (updateKeys.length > 0) {
                    const setClause = updateKeys.map((key) => `${key} = ?`).join(', ');
                    const values = updateKeys.map((key) => updates[key]);
                    values.push(comp.id); // For WHERE clause

                    const updateQuery = `
                        UPDATE competitions
                        SET ${setClause}
                        WHERE id = ?
                    `;

                    await db.runQuery(updateQuery, values);
                    logger.info(`Updated competition ID ${comp.id} with new details from WOM API.`);
                }
            } catch (err) {
                logger.error(`Error fetching WOM competition ID ${comp.id}: ${err.message}`, {
                    competitionId: comp.id,
                    errorStack: err.stack,
                });
            }
        }
    } catch (err) {
        logger.error(`Failed to remove invalid competitions: ${err.message}`, { errorStack: err.stack });
    }
}

module.exports = {
    removeInvalidCompetitions,
};
