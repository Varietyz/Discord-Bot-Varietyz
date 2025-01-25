/* eslint-disable no-process-exit */
// @ts-nocheck
/**
 * @fileoverview Script to initialize and set up the SQLite database for the Varietyz Bot.
 * Creates necessary tables for storing registered RSNs, clan members, recent name changes, and player data.
 * Deletes any existing database file before creating a new one to ensure a clean setup.
 *
 * @module scripts/create_db
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger'); // Import the logger

/**
 * Path to the SQLite database file.
 * @constant {string}
 */
const dbPath = path.join(__dirname, '..', 'data', 'database.sqlite');

// eslint-disable-next-line jsdoc/require-returns
/**
 * Initializes the SQLite database by deleting any existing database file,
 * creating the necessary directories, and establishing a new database connection.
 */
function initializeDatabase() {
    // Delete existing database file if it exists
    if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
        logger.info('Existing database file deleted.');
    }

    // Create the database directory if it doesn't exist
    if (!fs.existsSync(path.dirname(dbPath))) {
        fs.mkdirSync(path.dirname(dbPath), { recursive: true });
        logger.info('Created database directory.');
    }

    // Establish a new database connection
    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            logger.error(`Error connecting to SQLite: ${err.message}`);
            throw err; // Terminate script if connection fails
        } else {
            logger.info('Connected to SQLite at:', dbPath);
        }
    });

    return db;
}

/**
 * Creates the 'registered_rsn' table in the SQLite database.
 * This table stores the RuneScape names registered by users.
 *
 * @param {sqlite3.Database} db - The SQLite database instance.
 */
function createRegisteredRsnTable(db) {
    const query = `
        CREATE TABLE IF NOT EXISTS registered_rsn (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          rsn TEXT NOT NULL,
          registered_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `;
    db.run(query, (err) => {
        if (err) {
            logger.error(`Error creating 'registered_rsn' table: ${err.message}`);
        } else {
            logger.info('\'registered_rsn\' table created (empty).');
        }
    });
}

/**
 * Creates the 'clan_members' table in the SQLite database.
 * This table stores information about clan members.
 *
 * @param {sqlite3.Database} db - The SQLite database instance.
 */
function createClanMembersTable(db) {
    const query = `
        CREATE TABLE IF NOT EXISTS clan_members (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          rank TEXT,
          joined_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
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
 * Creates the 'recent_name_changes' table in the SQLite database.
 * This table records recent name changes of players.
 *
 * @param {sqlite3.Database} db - The SQLite database instance.
 */
function createRecentNameChangesTable(db) {
    const query = `
        CREATE TABLE IF NOT EXISTS recent_name_changes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          old_name TEXT NOT NULL,
          new_name TEXT NOT NULL,
          resolved_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
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
 * Creates the 'player_data' table in the SQLite database.
 * This table stores various data points related to players.
 *
 * @param {sqlite3.Database} db - The SQLite database instance.
 */
function createPlayerDataTable(db) {
    const query = `
        CREATE TABLE IF NOT EXISTS player_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          player_id TEXT NOT NULL,
          data_key TEXT NOT NULL,
          data_value TEXT,
          last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `;
    db.run(query, (err) => {
        if (err) {
            logger.error(`Error creating 'player_data' table: ${err.message}`);
        } else {
            logger.info('\'player_data\' table created (empty).');
        }
    });
}

// Main execution flow
(function main() {
    try {
        const db = initializeDatabase();

        // Serialize database operations to ensure they run sequentially
        db.serialize(() => {
            createRegisteredRsnTable(db);
            createClanMembersTable(db);
            createRecentNameChangesTable(db);
            createPlayerDataTable(db);
        });

        // Close the database connection after all tables are created
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
        process.exit(1); // Exit with failure code
    }
})();
