/**
 * @fileoverview
 * **Initialize Competitions Tables Migration** ⚙️
 *
 * This module initializes or updates the competitions-related tables in the database.
 * It ensures that all required tables (competitions, votes, users, winners, skills_bosses,
 * competition_queue, and config) exist with the appropriate schema. It also checks for and
 * adds any missing columns dynamically.
 *
 * **External Dependencies:**
 * - **SQLite** via the dbUtils module for executing SQL queries.
 * - **Logger** for logging migration progress and errors.
 *
 * @module src/migrations/initializeCompetitionsTables
 */

const db = require('../modules/utils/dbUtils');
const logger = require('../modules/utils/logger');

/**
 * Initializes or updates the competitions-related tables in the database.
 *
 * This function ensures that all necessary tables exist by iterating over a set of table schemas.
 * It then calls `addMissingColumns` to check for and add any missing columns dynamically.
 *
 * @async
 * @function initializeCompetitionsTables
 * @returns {Promise<void>} Resolves when the tables are ensured to exist and updated.
 *
 * @example
 * await initializeCompetitionsTables();
 */
const initializeCompetitionsTables = async () => {
    try {
        logger.info('🔄 Ensuring all necessary competition tables exist...');

        // Define table schemas.
        const tables = {
            competitions: `
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
                final_leaderboard_sent INTEGER DEFAULT 0
            `,
            votes: `
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                competition_id INTEGER NOT NULL,
                vote_choice TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (competition_id) REFERENCES competitions(id),
                UNIQUE(user_id, competition_id)
            `,
            users: `
                username TEXT PRIMARY KEY,
                total_wins INTEGER DEFAULT 0,
                total_metric_gain_sotw INTEGER DEFAULT 0,
                total_metric_gain_botw INTEGER DEFAULT 0,
                total_top10_appearances_sotw INTEGER DEFAULT 0,
                total_top10_appearances_botw INTEGER DEFAULT 0
            `,
            winners: `
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                competition_id INTEGER NOT NULL,
                username TEXT NOT NULL,
                metric_gain INTEGER NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (competition_id) REFERENCES competitions(id)
            `,
            skills_bosses: `
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT CHECK(type IN ('Skill', 'Boss')) NOT NULL,
                last_selected_at DATETIME
            `,
            competition_queue: `
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT CHECK(type IN ('SOTW', 'BOTW')) NOT NULL,
                metric TEXT NOT NULL,
                queued_at DATETIME DEFAULT CURRENT_TIMESTAMP
            `,
            config: `
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            `,
        };

        // Create missing tables.
        for (const [table, schema] of Object.entries(tables)) {
            //await db.runQuery(`DROP TABLE IF EXISTS ${table};`);
            //logger.info(`✅ Dropped ${table} table.`);
            await db.runQuery(`CREATE TABLE IF NOT EXISTS ${table} (${schema});`);
            logger.info(`✅ Ensured ${table} table.`);
        }

        // Dynamically check and add any missing columns.
        await addMissingColumns(tables);
    } catch (error) {
        logger.error(`❌ Error initializing competition tables: ${error.message}`);
    }
};

/**
 * Checks for missing columns in the specified tables and adds them dynamically.
 *
 * Iterates over each table's schema, fetches the existing columns using a PRAGMA query,
 * and compares the defined columns with the existing ones. Missing columns that do not contain
 * complex constraints (like CHECK clauses) are added to the table.
 *
 * @async
 * @function addMissingColumns
 * @param {Object} tables - An object where keys are table names and values are their column schema definitions.
 * @returns {Promise<void>} Resolves when missing columns have been checked and added.
 *
 * @example
 * await addMissingColumns(tables);
 */
const addMissingColumns = async (tables) => {
    try {
        logger.info('🔄 Checking for missing database columns...');

        for (const [table, schema] of Object.entries(tables)) {
            // Fetch existing columns.
            const existingColumns = await db.getAll(`PRAGMA table_info(${table});`);
            const existingColumnNames = existingColumns.map((col) => col.name);

            // Extract column definitions while ignoring FOREIGN KEY constraints.
            const columnDefinitions = schema
                .split(',')
                .map((col) => col.trim())
                .filter((col) => col.match(/^[a-zA-Z_]+\s/) && !col.toUpperCase().includes('FOREIGN KEY')); // Ignore FK constraints

            for (const colDef of columnDefinitions) {
                const columnName = colDef.split(' ')[0]; // Extract column name.

                if (!existingColumnNames.includes(columnName)) {
                    const alterTableQuery = `ALTER TABLE ${table} ADD COLUMN ${colDef};`;

                    // Skip invalid column definitions that contain CHECK constraints or closing parentheses.
                    if (!alterTableQuery.includes('CHECK') && !alterTableQuery.includes(')')) {
                        logger.info(`🛠️ Executing: ${alterTableQuery}`);
                        await db.runQuery(alterTableQuery);
                        logger.info(`✅ Added missing column: ${table}.${columnName}`);
                    } else {
                        logger.warn(`⚠️ Skipping invalid column definition for '${columnName}' in table '${table}'`);
                    }
                }
            }
        }

        logger.info('✅ All required columns are present.');
    } catch (error) {
        logger.error(`❌ Error checking or adding missing columns: ${error.message}`);
    }
};

module.exports = initializeCompetitionsTables;
