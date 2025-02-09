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
        CREATE TABLE IF NOT EXISTS registered_rsn (
                player_id INTEGER PRIMARY KEY,
                discord_id INTEGER NOT NULL,
                rsn TEXT NOT NULL UNIQUE,
                registered_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS clan_members (
          player_id INTEGER PRIMARY KEY,
                rsn TEXT NOT NULL UNIQUE,
                rank TEXT,
                joined_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS recent_name_changes (
            idx INTEGER PRIMARY KEY AUTOINCREMENT,
                player_id INTEGER NOT NULL,
                old_rsn TEXT NOT NULL,
                new_rsn TEXT NOT NULL,
                resolved_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS player_data (
          idx INTEGER PRIMARY KEY AUTOINCREMENT,
                player_id INTEGER NOT NULL,
                rsn TEXT NOT NULL,
                data_key TEXT NOT NULL,
                data_value TEXT,
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS player_fetch_times (
            player_id INTEGER PRIMARY KEY,
                last_fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS active_inactive (
            player_id INTEGER PRIMARY KEY,
                last_progressed DATETIME
        );
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS competitions (
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
                final_leaderboard_sent INTEGER DEFAULT 0
        );
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS votes ( 
                idx INTEGER PRIMARY KEY AUTOINCREMENT,
                player_id INTEGER NOT NULL,
                discord_id INTEGER NOT NULL,
                competition_id INTEGER NOT NULL,
                vote_choice TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (player_id) REFERENCES users(player_id) ON DELETE CASCADE,
                FOREIGN KEY (competition_id) REFERENCES competitions(competition_id),
                UNIQUE(discord_id, competition_id)
        );`);
    db.run(`
        CREATE TABLE IF NOT EXISTS users ( 
                player_id INTEGER PRIMARY KEY,
                rsn TEXT,
                total_wins INTEGER DEFAULT 0,
                total_metric_gain_sotw INTEGER DEFAULT 0,
                total_metric_gain_botw INTEGER DEFAULT 0,
                total_top10_appearances_sotw INTEGER DEFAULT 0,
                total_top10_appearances_botw INTEGER DEFAULT 0
        );`);
    db.run(`
        CREATE TABLE IF NOT EXISTS winners ( 
                competition_id INTEGER PRIMARY KEY,
                rsn TEXT NOT NULL,
                metric_gain INTEGER NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (competition_id) REFERENCES competitions(competition_id)
            
        );`);
    db.run(`
        CREATE TABLE IF NOT EXISTS skills_bosses ( 
                idx INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT CHECK(type IN ('Skill', 'Boss')) NOT NULL,
                last_selected_at DATETIME
        );`);
    db.run(`
        CREATE TABLE IF NOT EXISTS competition_queue ( 
                idx INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT CHECK(type IN ('SOTW', 'BOTW')) NOT NULL,
                metric TEXT NOT NULL,
                queued_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );`);
    db.run(`
        CREATE TABLE IF NOT EXISTS config ( 
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
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
