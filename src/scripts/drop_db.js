// @ts-nocheck
/* eslint-disable no-process-exit */
/**
 * @fileoverview
 * **Database Initialization Script** 🛠️
 *
 * This script initializes and sets up the SQLite database for the Varietyz Bot.
 * It deletes any existing database file to ensure a clean setup and then creates all necessary tables:
 * - `registered_rsn`: Stores registered RuneScape names.
 * - `clan_members`: Stores information about clan members.
 * - `recent_name_changes`: Tracks recent name changes.
 * - `player_data`: Stores various player-specific data points.
 * - `player_fetch_times`: Tracks the last time player data was fetched.
 * - `active_inactive`: Tracks active and inactive player progression.
 *
 * The script logs the success or failure of each table creation process and closes the database connection
 * gracefully upon completion.
 *
 * **External Dependencies:**
 * - **SQLite3**: For interacting with the SQLite database.
 * - **fs**: For file system operations (deleting existing database, creating directories).
 * - **path**: For constructing file paths.
 * - **logger**: For logging operations and errors.
 *
 * @module scripts/create_db
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('../modules/utils/logger'); // Import the logger

/**
 * Path to the SQLite database file.
 * @constant {string}
 */
const dbPath = path.join(__dirname, '..', 'data', 'database.sqlite');

/**
 * Initializes the SQLite database by deleting any existing database file,
 * creating the necessary directories, and establishing a new database connection.
 *
 * @function initializeDatabase
 * @returns {sqlite3.Database} The new SQLite database instance.
 *
 * @example
 * const db = initializeDatabase();
 */
function initializeDatabase() {
    // Establish a new database connection.
    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            logger.error(`Error connecting to SQLite: ${err.message}`);
            throw err; // Terminate script if connection fails.
        } else {
            logger.info(`Connected to SQLite at: ${dbPath}`);
        }
    });

    return db;
}

/**
 * Creates the 'clan_members' table to store clan member information.
 *
 * @function createClanMembersTable
 * @param {sqlite3.Database} db - The SQLite database instance.
 */
function dropTables(db) {
    //db.run(`
    //    DROP TABLE IF EXISTS clan_members
    //`);
    //db.run(`
    //    DROP TABLE IF EXISTS active_inactive
    //`);
    //db.run(`;
    //    DROP TABLE IF EXISTS competitions
    //`);
    //db.run(`
    //    DROP TABLE IF EXISTS ended_competitions
    //`);
    //db.run(`
    //    DROP TABLE IF EXISTS player_data
    //`);
    //db.run(`
    //    DROP TABLE IF EXISTS player_fetch_times
    //`);
    db.run(`
        DROP TABLE IF EXISTS recent_name_changes
    `);
    //db.run(`
    //    DROP TABLE IF EXISTS users
    //`);
    db.run(`
        DROP TABLE IF EXISTS votes
    `);
    //db.run(`
    //    DROP TABLE IF EXISTS winners
    //`);
    //db.run(`;
    //    DROP TABLE IF EXISTS skills_bosses
    //`);
    //db.run(`
    //    DROP TABLE IF EXISTS competition_queue
    //`);
    console.log('✅dropped tables!✅');
}

// Main execution flow.
(function main() {
    try {
        const db = initializeDatabase();

        // Serialize database operations to run sequentially.
        db.serialize(() => {
            dropTables(db);
        });

        // Close the database connection after all tables are created.
        db.close((err) => {
            if (err) {
                logger.error(`Error closing the database: ${err.message}`);
            } else {
                logger.info('Database schema created. No data imported. DB closed successfully.');
            }
            process.exit(0);
        });
    } catch (error) {
        logger.error(`Database initialization failed: ${error.message}`);
        process.exit(1); // Exit with failure code.
    }
})();
