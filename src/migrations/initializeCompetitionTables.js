// src/migrations/initializeCompetitionsTables.js

const db = require('../modules/utils/dbUtils');
const logger = require('../modules/utils/logger');

/**
 * Initializes the competitions-related tables in the database.
 */
const initializeCompetitionsTables = async () => {
    try {
        // Create competitions table
        await db.runQuery(`
            CREATE TABLE IF NOT EXISTS competitions (
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
                leaderboard_message_id TEXT
            );
        `);
        logger.info('Ensured competitions table.');

        // Create votes table
        await db.runQuery(`
    CREATE TABLE IF NOT EXISTS votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        competition_id INTEGER NOT NULL,
        vote_choice TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (competition_id) REFERENCES competitions(id),
        UNIQUE(user_id, competition_id)
    );
`);
        logger.info('Ensured votes table.');

        // Create users table
        await db.runQuery(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                discord_user_id TEXT UNIQUE NOT NULL,
                username TEXT NOT NULL,
                total_votes INTEGER DEFAULT 0,
                total_wins INTEGER DEFAULT 0
            );
        `);
        logger.info('Ensured users table.');
        await db.runQuery(`
    ALTER TABLE competitions ADD COLUMN rotation_index INTEGER DEFAULT 0;
`);

        // Create winners table
        await db.runQuery(`
            CREATE TABLE IF NOT EXISTS winners (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                competition_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                vote_count INTEGER NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (competition_id) REFERENCES competitions(id),
                FOREIGN KEY (user_id) REFERENCES users(id),
                rotation_index INTEGER DEFAULT 0
            );
        `);
        logger.info('Ensured winners table.');

        // Create skills_bosses table
        await db.runQuery(`
            CREATE TABLE IF NOT EXISTS skills_bosses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT CHECK(type IN ('Skill', 'Boss')) NOT NULL,
                last_selected_at DATETIME
            );
        `);
        logger.info('Ensured skills_bosses table.');

        // Create competition_queue table
        await db.runQuery(`
            CREATE TABLE IF NOT EXISTS competition_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT CHECK(type IN ('SOTW', 'BOTW')) NOT NULL,
                metric TEXT NOT NULL,
                queued_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
        logger.info('Ensured competition_queue table.');

        // Create config table
        await db.runQuery(`
            CREATE TABLE IF NOT EXISTS config (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
        `);
        logger.info('Ensured config table.');
    } catch (error) {
        logger.error(`Error initializing competition tables: ${error.message}`);
    }
};

module.exports = initializeCompetitionsTables;
