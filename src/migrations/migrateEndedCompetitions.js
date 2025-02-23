const db = require('../modules/utils/essentials/dbUtils');
const logger = require('../modules/utils/essentials/logger');
const migrateEndedCompetitions = async () => {
    try {
        await db.runQuery(`
            CREATE TABLE IF NOT EXISTS ended_competitions (
                competition_id INTEGER PRIMARY KEY,
                title TEXT NOT NULL,
                metric TEXT NOT NULL,
                type TEXT CHECK(type IN ('SOTW', 'BOTW')) NOT NULL,
                starts_at DATETIME NOT NULL,
                ends_at DATETIME NOT NULL,
                verification_code TEXT,
                previous_metric TEXT,
                last_selected_at DATETIME,
                message_id TEXT,
                leaderboard_message_id TEXT,
                rotation_index INTEGER DEFAULT 0,
                final_leaderboard_sent INTEGER DEFAULT 0,
                migrated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
        logger.info('✅ Ensured ended_competitions table exists.');
        const now = new Date().toISOString();
        const endedCompetitions = await db.getAll(
            `
            SELECT * FROM competitions
            WHERE ends_at < ?
        `,
            [now],
        );
        if (!endedCompetitions || endedCompetitions.length === 0) {
            logger.info('ℹ️ No ended competitions to migrate.');
            return;
        }
        logger.info(`🚀 Found ${endedCompetitions.length} ended competition(s) to migrate.`);
        for (const comp of endedCompetitions) {
            await db.runQuery(
                `
                INSERT INTO ended_competitions 
                    (competition_id, title, metric, type, starts_at, ends_at, verification_code, previous_metric, last_selected_at, message_id, leaderboard_message_id, rotation_index, final_leaderboard_sent)
                VALUES 
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
                [
                    comp.competition_id,
                    comp.title,
                    comp.metric,
                    comp.type,
                    comp.starts_at,
                    comp.ends_at,
                    comp.verification_code,
                    comp.previous_metric,
                    comp.last_selected_at,
                    comp.message_id,
                    comp.leaderboard_message_id,
                    comp.rotation_index,
                    comp.final_leaderboard_sent,
                ],
            );
            await db.runQuery('DELETE FROM competitions WHERE competition_id = ?', [comp.competition_id]);
            logger.info(`✅ Migrated competition ID \`${comp.competition_id}\` to ended_competitions.`);
        }
        logger.info('🎉 Migration of ended competitions complete.');
    } catch (error) {
        await db.runQuery('ROLLBACK;');
        logger.error(`❌ Error migrating ended competitions: ${error.message}`);
    }
};
module.exports = migrateEndedCompetitions;