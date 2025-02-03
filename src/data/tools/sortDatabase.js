// @ts-nocheck
/* eslint-disable jsdoc/require-returns */
/* reorderAllTablesWithSchema.js
 *
 * This script connects to the SQLite database and permanently reorders rows in all your system tables
 * by recreating each table with the same schema (including uniques, primary keys, and defaults)
 * and inserting the rows sorted by the timestamp column.
 *
 * WARNING: This process re-creates tables, which may remove additional indexes, triggers, and constraints.
 * Ensure you have backups or run this on a test copy of your database before using it in production.
 *
 * Usage:
 *   node reorderAllTablesWithSchema.js
 */

const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
require('dotenv').config();

/**
 * openDatabase:
 * Opens a connection to the SQLite database.
 *
 * @returns {Promise<sqlite3.Database>} The open database connection.
 */
async function openDatabase() {
    return open({
        filename: 'src/data/messages.db',
        driver: sqlite3.Database,
    });
}

// Define the names and schema for all system tables.
// Adjust the schema definition if any table has a custom structure.
const systemTables = {
    DROP: 'drops',
    RAID_DROP: 'raid_drops',
    QUESTS: 'quest_completed',
    COLLECTION_LOG: 'collection_log',
    PERSONAL_BEST: 'personal_bests',
    PVP: 'pvp_messages',
    PET_DROP: 'pet_drops',
    LEVEL_UP: 'level_ups',
    COMBAT_ACHIEVEMENTS: 'combat_achievements',
    CLUE_DROP: 'clue_rewards',
    ATTENDANCE: 'clan_traffic',
    DIARY: 'diary_completed',
    TASKS: 'combat_tasks_completed',
    KEYS: 'loot_key_rewards',
    CHAT: 'chat_messages',
};

/**
 * reorderTable:
 * Permanently reorders the rows of a table by:
 * 1. Creating a temporary table with the same schema.
 * 2. Inserting rows sorted by timestamp (ascending) into the temporary table.
 * 3. Dropping the original table.
 * 4. Renaming the temporary table to the original table name.
 *
 * @param {object} db - The open database connection.
 * @param {string} tableName - The name of the table to reorder.
 */
async function reorderTable(db, tableName) {
    try {
        // Start a transaction to ensure atomicity.
        await db.exec('BEGIN TRANSACTION;');

        // Define the temporary table name.
        const tempTable = `${tableName}_temp`;

        // Create the temporary table with the same schema as the original.
        await db.exec(`
            CREATE TABLE ${tempTable} (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user TEXT,
                message TEXT,
                message_id TEXT UNIQUE,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Insert data into the temporary table, sorted by timestamp.
        // Adjust "ASC" to "DESC" if you prefer descending order.
        await db.exec(`
            INSERT INTO ${tempTable} (user, message, message_id, timestamp)
            SELECT user, message, message_id, timestamp
            FROM ${tableName}
            ORDER BY timestamp ASC;
        `);

        // Drop the original table.
        await db.exec(`DROP TABLE ${tableName};`);

        // Rename the temporary table to the original table name.
        await db.exec(`ALTER TABLE ${tempTable} RENAME TO ${tableName};`);

        // Commit the transaction.
        await db.exec('COMMIT;');

        console.log(`Table "${tableName}" has been permanently reordered with its schema preserved.`);
    } catch (error) {
        // Rollback the transaction if an error occurs.
        await db.exec('ROLLBACK;');
        console.error(`Error reordering table "${tableName}":`, error);
    }
}

/**
 * reorderAllTables:
 * Opens the database and permanently reorders all system tables defined in systemTables.
 */
async function reorderAllTables() {
    try {
        const db = await openDatabase();
        for (const tableName of Object.values(systemTables)) {
            console.log(`\nReordering table: ${tableName}`);
            await reorderTable(db, tableName);
        }
        await db.close();
        console.log('\nAll tables have been processed.');
    } catch (error) {
        console.error('Error reordering all tables:', error);
    }
}

// Run the script.
reorderAllTables();
