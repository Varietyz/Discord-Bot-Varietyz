// src/config/scripts/create_db.js

const { runQuery } = require('../modules/utils/dbUtils');
const logger = require('../modules/utils/logger');

/**
 * Initializes the database by creating necessary tables.
 */
async function setupDatabase() {
    try {
        // Create competitions table
        await runQuery(`
            DROP TABLE IF EXISTS competitions
        `);

        // Create participations table
        await runQuery(`
            DROP TABLE IF EXISTS votes
        `);

        // Create teams table
        await runQuery(`
            DROP TABLE IF EXISTS users
        `);

        // Create competition_history table
        await runQuery(`
            DROP TABLE IF EXISTS winners
        `);
        await runQuery(`
            DROP TABLE IF EXISTS embed_messages
        `);

        logger.info('Table "competition_history" ensured.');

        logger.info('Database setup completed successfully.');
    } catch (error) {
        logger.error(`Database setup failed: ${error.message}`);
    }
}

setupDatabase();
