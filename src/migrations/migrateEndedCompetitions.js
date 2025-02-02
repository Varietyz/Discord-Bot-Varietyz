// @ts-nocheck
/**
 * @fileoverview
 * **Migrate Ended Competitions Script** ⏳
 *
 * This script migrates competitions that have ended from the active competitions table
 * to the ended_competitions table in the database. It ensures the ended_competitions table exists,
 * selects competitions whose end time has passed, inserts them into the ended_competitions table,
 * and then deletes them from the active competitions table.
 *
 * **External Dependencies:**
 * - **SQLite**: For executing SQL queries via the dbUtils module.
 * - **Logger**: For logging migration progress and errors.
 *
 * @module src/migrations/migrateEndedCompetitions
 */

const db = require('../modules/utils/dbUtils');
const logger = require('../modules/utils/logger');

/**
 * 🎯 Migrates Ended Competitions
 *
 * This asynchronous function migrates competitions that have ended (i.e., where the end time is in the past)
 * from the active competitions table to the ended_competitions table. The process includes:
 * - Ensuring the ended_competitions table exists.
 * - Selecting competitions that have ended based on the current time.
 * - Inserting each ended competition into the ended_competitions table.
 * - Deleting the migrated competition from the active competitions table.
 *
 * @async
 * @function migrateEndedCompetitions
 * @returns {Promise<void>} Resolves when the migration process is complete.
 *
 * @example
 * // Run the migration process:
 * await migrateEndedCompetitions();
 */
const migrateEndedCompetitions = async () => {
    try {
        // Ensure the ended_competitions table exists
        await db.runQuery(`
            CREATE TABLE IF NOT EXISTS ended_competitions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        logger.info('Ensured ended_competitions table exists.');

        // Define the current timestamp for migration comparison
        const now = new Date().toISOString();

        // Select competitions that have ended (you might further filter by final_leaderboard_sent=1 if needed)
        const endedCompetitions = await db.getAll(
            `
            SELECT * FROM competitions
            WHERE ends_at < ?
        `,
            [now],
        );

        if (!endedCompetitions || endedCompetitions.length === 0) {
            logger.info('No ended competitions to migrate.');
            return;
        }

        logger.info(`Found ${endedCompetitions.length} ended competitions to migrate.`);

        // For each ended competition, insert it into ended_competitions and then delete it from competitions
        for (const comp of endedCompetitions) {
            // Insert into ended_competitions
            await db.runQuery(
                `
                INSERT INTO ended_competitions 
                    (id, title, metric, type, starts_at, ends_at, verification_code, previous_metric, last_selected_at, message_id, leaderboard_message_id, rotation_index, final_leaderboard_sent)
                VALUES 
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
                [
                    comp.id,
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

            // Delete the migrated competition from the active competitions table
            await db.runQuery('DELETE FROM competitions WHERE id = ?', [comp.id]);
            logger.info(`Migrated competition ID ${comp.id} to ended_competitions.`);
        }

        logger.info('Migration of ended competitions complete.');
    } catch (error) {
        // Rollback the transaction in case of any errors
        await db.runQuery('ROLLBACK;');
        logger.error(`Error migrating ended competitions: ${error.message}`);
    }
};

module.exports = migrateEndedCompetitions;
