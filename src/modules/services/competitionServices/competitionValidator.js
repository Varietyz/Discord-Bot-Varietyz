/* eslint-disable jsdoc/check-param-names */
// @ts-nocheck
// competitionService/competitionValidator.js

/**
 * @fileoverview
 * **Competition Validator** 🛠️
 *
 * This module contains functions to validate and update competition data
 * by cross-referencing with the WOM API. It helps ensure that the database
 * only contains valid competitions by removing those that no longer exist or
 * updating details that have changed on the WOM platform.
 *
 * **Key Features:**
 * - Checks each competition entry in the database against the WOM API.
 * - Removes competitions (and associated votes) that are not found on WOM.
 * - Updates competition details (title, metric, start/end times) if discrepancies are found.
 *
 * @module competitionService/competitionValidator
 */

const logger = require('../../utils/essentials/logger');
const WOMApiClient = require('../../../api/wise_old_man/apiClient');

/**
 * 🎯 **Removes Invalid Competitions**
 *
 * Iterates over all competitions in the database and validates each against the WOM API.
 * If a competition is not found (or returns null), it deletes the competition and its
 * associated votes from the database. Additionally, if there are discrepancies in the
 * competition details (e.g., title, metric, start/end times), the function updates the
 * database with the latest data from WOM.
 *
 * @async
 * @function removeInvalidCompetitions
 * @param {Object} db - The database utility object used for querying and updating competitions.
 *
 * @example
 * // 📌 Remove competitions that are no longer valid:
 * await removeInvalidCompetitions(db);
 */
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
