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
const logger = require('../modules/utils/essentials/logger'); // Import the logger

/**
 * Path to the SQLite database file.
 * @constant {string}
 */
const dbPath = path.join(__dirname, '..', 'data', 'guild.db');

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
 * Creates the 'active_inactive' table to track player activity status.
 *
 * @function createActiveInactiveTable
 * @param {sqlite3.Database} db - The SQLite database instance.
 */
function createTables(db) {
    db.run(`
        CREATE TABLE IF NOT EXISTS ensured_channels (
                channel_key TEXT PRIMARY KEY,
                channel_id TEXT NOT NULL UNIQUE
        );`);
    db.run(`
        CREATE TABLE IF NOT EXISTS ensured_channels (
                channel_key TEXT PRIMARY KEY,
                channel_id TEXT NOT NULL UNIQUE
        );`);
    db.run(`
        CREATE TABLE IF NOT EXISTS ensured_channels (
                channel_key TEXT PRIMARY KEY,
                channel_id TEXT NOT NULL UNIQUE
        );`);
    db.run(`
        CREATE TABLE IF NOT EXISTS guild_channels (
                channel_id TEXT PRIMARY KEY,
                channel_key TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                type INTEGER NOT NULL,
                category TEXT DEFAULT 'general',
                permissions INTEGER DEFAULT 0
        );`);

    db.run(`
        CREATE TABLE IF NOT EXISTS guild_roles (
                role_key TEXT PRIMARY KEY,
                role_id TEXT NOT NULL UNIQUE,
                permissions INTEGER DEFAULT 0
        );`);

    db.run(`
        CREATE TABLE IF NOT EXISTS guild_webhooks (
                webhook_key TEXT PRIMARY KEY,
                webhook_url TEXT NOT NULL UNIQUE,
                channel_id TEXT DEFAULT NULL,
                webhook_name TEXT DEFAULT 'Unnamed Webhook',
                FOREIGN KEY (channel_id) REFERENCES guild_channels(channel_id) ON DELETE SET NULL
        );`);

    db.run(`
        CREATE TABLE IF NOT EXISTS guild_emojis (
                emoji_id TEXT PRIMARY KEY,
                emoji_name TEXT NOT NULL,
                emoji_format TEXT NOT NULL,
                animated INTEGER DEFAULT 0
        );`);

    db.run(`
        CREATE TABLE IF NOT EXISTS guild_members (
                user_id TEXT PRIMARY KEY,
                username TEXT NOT NULL
        );`);
    db.run(`
        CREATE TABLE IF NOT EXISTS guild_events (
                event_id TEXT PRIMARY KEY,
                guild_id TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT DEFAULT 'No description',
                creator_id TEXT DEFAULT 'Unknown',
                event_type INTEGER NOT NULL,
                privacy INTEGER NOT NULL,
                start_time INTEGER NOT NULL,
                channel_id TEXT DEFAULT NULL,
                banner_url TEXT DEFAULT NULL
        );`);
    db.run(`
        CREATE TABLE IF NOT EXISTS error_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            error_message TEXT NOT NULL,
            error_stack TEXT,
            occurrences INTEGER DEFAULT 1,
            last_occurred TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            reported INTEGER DEFAULT 0
        );`);
}

// Main execution flow.
(function main() {
    try {
        const db = initializeDatabase();

        // Serialize database operations to run sequentially.
        db.serialize(() => {
            createTables(db);
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
