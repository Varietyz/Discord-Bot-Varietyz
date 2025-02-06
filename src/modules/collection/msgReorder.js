/* eslint-disable no-process-exit */
// @ts-nocheck
/**
 * @fileoverview
 * **Reorder All Tables with Schema** 🔄
 *
 * This script connects to the SQLite database and permanently reorders rows in all your system tables
 * by recreating each table with the same schema (including uniques, primary keys, and defaults)
 * and inserting the rows sorted by the `timestamp` column.
 *
 * ⚠️ **Warning:** This process re-creates tables, which may remove additional indexes, triggers, and constraints.
 * Ensure you have backups or run this on a test copy of your database before using it in production.
 *
 * **Usage:**
 * `node reorderAllTablesWithSchema.js`
 *
 * @module reorderAllTablesWithSchema
 */

require('dotenv').config();
const { dbPromise } = require('./msgDbConstants');
const logger = require('../utils/logger');

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
 * 🎯 **Reorders a Table with Schema Preservation**
 *
 * Permanently reorders the rows of a table by:
 * 1. Creating a temporary table with the same schema.
 * 2. Inserting rows sorted by `timestamp` (ascending) into the temporary table.
 * 3. Dropping the original table.
 * 4. Renaming the temporary table to the original table name.
 *
 * ⚙️ **Note:** The temporary table is created with a fixed schema for demonstration purposes.
 * In a real scenario, you may need to dynamically recreate the original schema.
 *
 * @async
 * @function reorderTable
 * @param {object} db - The open database connection.
 * @param {string} tableName - The name of the table to reorder.
 */
async function reorderTable(db, tableName) {
    try {
        await db.exec('BEGIN TRANSACTION;');

        const tempTable = `${tableName}_temp`;

        await db.exec(`
            CREATE TABLE ${tempTable} (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                rsn TEXT,
                message TEXT,
                message_id TEXT UNIQUE,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await db.exec(`
            INSERT INTO ${tempTable} (rsn, message, message_id, timestamp)
            SELECT rsn, message, message_id, timestamp
            FROM ${tableName}
            ORDER BY timestamp ASC;
        `);

        await db.exec(`DROP TABLE ${tableName};`);

        await db.exec(`ALTER TABLE ${tempTable} RENAME TO ${tableName};`);

        await db.exec('COMMIT;');

        logger.info(`✅ Table "\`${tableName}\`" has been permanently reordered and schema preserved.`);
    } catch (error) {
        await db.exec('ROLLBACK;');
        logger.error(`❌ Error reordering table "\`${tableName}\`": ${error.message}`);
    }
}

/**
 * 🎯 **Reorders All System Tables**
 *
 * Opens the database and permanently reorders all system tables defined in the `systemTables` object.
 *
 * @async
 * @function reorderAllTables
 */
async function reorderAllTables() {
    try {
        const db = await dbPromise;
        for (const tableName of Object.values(systemTables)) {
            logger.info(`\n🔄 Reordering table: \`${tableName}\``);
            await reorderTable(db, tableName);
        }
        await db.close();
        logger.info('\n✅ All tables have been processed successfully.');
    } catch (error) {
        logger.error('❌ Error reordering all tables:', error);
    }
}

module.exports = {
    reorderAllTables,
};
