const logger = require('../../utils/essentials/logger');
const WOMApiClient = require('../../../api/wise_old_man/apiClient');
const failCache = require('../../utils/essentials/failCache'); 

const FIVE_MINUTE = 5 * 60 * 1000;

async function removeInvalidCompetitions(db) {
    try {
        const allCompetitions = await db.getAll('SELECT * FROM competitions');
        logger.debug(
            `🔍 Fetched \`${allCompetitions.length}\` competitions from the database.`
        );

        const now = Date.now();

        for (const comp of allCompetitions) {
            try {
                const endsAt = new Date(comp.ends_at).getTime();
                const isExpired = now > endsAt + FIVE_MINUTE;

                if (isExpired) {
                    await db.runQuery('DELETE FROM votes WHERE competition_id = ?', [
                        comp.competition_id,
                    ]);
                    await db.runQuery(
                        'DELETE FROM competitions WHERE competition_id = ?',
                        [comp.competition_id]
                    );
                    logger.info(
                        `🗑️ Removed expired competition ID \`${comp.competition_id}\` (ended over 6h ago).`
                    );
                    continue;
                }

                if (failCache.has(`comp:${comp.competition_id}`)) {
                    logger.warn(
                        `⚠️ Skipping WOM enrichment for comp \`${comp.competition_id}\` (cached failure).`
                    );
                    continue;
                }

                const womDetails = await WOMApiClient.retryRequest(
                    'competitions',
                    'getCompetitionDetails',
                    comp.competition_id
                );

                if (!womDetails) {
                    await db.runQuery('DELETE FROM votes WHERE competition_id = ?', [
                        comp.competition_id,
                    ]);
                    await db.runQuery(
                        'DELETE FROM competitions WHERE competition_id = ?',
                        [comp.competition_id]
                    );
                    logger.info(
                        `🚫 Removed competition ID \`${comp.competition_id}\` (WOM returned null).`
                    );
                    failCache.set(`comp:${comp.competition_id}`, true, 30 * 60); 
                    continue;
                }

                const { id, title, metric, startsAt, endsAt: apiEndsAt } = womDetails;
                logger.debug(
                    `🔍 WOM Competition Details for ID \`${id}\`: Title="\`${title}\`", Metric="\`${metric}\`"`
                );

                const updates = {};
                if (comp.title !== title) updates.title = title;
                if (comp.metric !== metric) updates.metric = metric;

                const dbStartsAt = new Date(comp.starts_at).getTime();
                const womStartsAt = new Date(startsAt).getTime();
                if (dbStartsAt !== womStartsAt)
                    updates.starts_at = new Date(womStartsAt).toISOString();

                const womEndsAt = new Date(apiEndsAt).getTime();
                if (endsAt !== womEndsAt)
                    updates.ends_at = new Date(womEndsAt).toISOString();

                if (Object.keys(updates).length > 0) {
                    const setClause = Object.keys(updates)
                        .map((k) => `${k} = ?`)
                        .join(', ');
                    const values = [...Object.values(updates), comp.competition_id];
                    await db.runQuery(
                        `UPDATE competitions SET ${setClause} WHERE competition_id = ?`,
                        values
                    );
                    logger.info(
                        `✅ Synced competition ID \`${comp.competition_id}\` with WOM updates.`
                    );
                }
            } catch (err) {
                logger.error(
                    `❌ Error processing comp ID \`${comp.competition_id}\`: ${err.message}`,
                    {
                        competitionId: comp.competition_id,
                        errorStack: err.stack,
                    }
                );
                failCache.set(`comp:${comp.competition_id}`, true, 30 * 60); 
            }
        }
    } catch (err) {
        logger.error(`❌ Failed to remove invalid competitions: ${err.message}`, {
            errorStack: err.stack,
        });
    }
}

module.exports = {
    removeInvalidCompetitions,
};
