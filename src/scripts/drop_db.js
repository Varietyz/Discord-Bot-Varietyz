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
const fs = require('fs');
const path = require('path');
const logger = require('../modules/utils/logger'); // Import the logger

/**
 * Path to the SQLite database file.
 * @constant {string}
 */
const dbPath = path.join(__dirname, '..', '..', 'data', 'database.sqlite');

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
    // Delete existing database file if it exists.
    if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
        logger.info('Existing database file deleted.');
    }

    // Create the database directory if it doesn't exist.
    if (!fs.existsSync(path.dirname(dbPath))) {
        fs.mkdirSync(path.dirname(dbPath), { recursive: true });
        logger.info('Created database directory.');
    }

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
function createClanMembersTable(db) {
    const query = `
        DROP TABLE IF EXISTS clan_members
    `;
    db.run(query, (err) => {
        if (err) {
            logger.error(`Error creating 'clan_members' table: ${err.message}`);
        } else {
            logger.info('\'clan_members\' table created (empty).');
        }
    });
}

/**
 * Creates the 'recent_name_changes' table to track recent player name changes.
 *
 * @function createRecentNameChangesTable
 * @param {sqlite3.Database} db - The SQLite database instance.
 */
function createRecentNameChangesTable(db) {
    const query = `
        DROP TABLE IF EXISTS recent_name_changes
    `;
    db.run(query, (err) => {
        if (err) {
            logger.error(`Error creating 'recent_name_changes' table: ${err.message}`);
        } else {
            logger.info('\'recent_name_changes\' table created (empty).');
        }
    });
}

/**
 * Creates the 'player_data' table to store various player-specific data points.
 *
 * @function createPlayerDataTable
 * @param {sqlite3.Database} db - The SQLite database instance.
 */
function createPlayerDataTable(db) {
    const query = `
        DROP TABLE IF EXISTS player_data
    `;
    db.run(query, (err) => {
        if (err) {
            logger.error(`Error creating 'player_data' table: ${err.message}`);
        } else {
            logger.info('\'player_data\' table created (empty).');
        }
    });
}

/**
 * Creates the 'player_fetch_times' table to track when player data was last fetched.
 *
 * @function createFetchTimeTable
 * @param {sqlite3.Database} db - The SQLite database instance.
 */
function createFetchTimeTable(db) {
    const query = `
        DROP TABLE IF EXISTS player_fetch_times
    `;
    db.run(query, (err) => {
        if (err) {
            logger.error(`Error creating 'player_fetch_times' table: ${err.message}`);
        } else {
            logger.info('\'player_fetch_times\' table created (empty).');
        }
    });
}

/**
 * Creates the 'active_inactive' table to track player activity status.
 *
 * @function createActiveInactiveTable
 * @param {sqlite3.Database} db - The SQLite database instance.
 */
function createActiveInactiveTable(db) {
    const query = `
        DROP TABLE IF EXISTS active_inactive
    `;
    db.run(query, (err) => {
        if (err) {
            logger.error(`Error creating 'active_inactive' table: ${err.message}`);
        } else {
            logger.info('\'active_inactive\' table created (empty).');
        }
    });
}

// Main execution flow.
(function main() {
    try {
        const db = initializeDatabase();

        // Serialize database operations to run sequentially.
        db.serialize(() => {
            createClanMembersTable(db);
            createRecentNameChangesTable(db);
            createPlayerDataTable(db);
            createFetchTimeTable(db);
            createActiveInactiveTable(db);
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
