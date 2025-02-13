// msgDatabase.js

require('dotenv').config();
const { dbPromise, systemTables } = require('./msgDbConstants');
const logger = require('../utils/essentials/logger');

/**
 * 🎯 **Initializes the Database**
 *
 * This function sets up the SQLite database for the bot by:
 * - Enabling WAL (Write-Ahead Logging) mode for improved concurrency.
 * - Creating the `chat_messages` table for storing chat messages.
 * - Creating the `meta_info` table for storing metadata (e.g., last fetched message ID).
 * - Iterating over all system tables (as defined in `systemTables`) and creating them if they do not exist.
 *
 * **Note:** This initialization preserves the schema for both chat and system tables.
 *
 * @async
 * @function initializeMsgTables
 *
 * @example
 * // Initialize the database at startup:
 * initializeMsgTables().then(() => {
 * console.log('Database successfully initialized.');
 * }).catch(console.error);
 */
async function initializeMsgTables() {
    const db = await dbPromise;
    // Enable Write-Ahead Logging for better performance
    await db.exec('PRAGMA journal_mode=WAL;');

    await db.exec(`
  CREATE TABLE IF NOT EXISTS chat_messages (
    idx INTEGER PRIMARY KEY AUTOINCREMENT,
    rsn TEXT,
    message TEXT,
    message_id TEXT UNIQUE,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

    await db.exec(`
  CREATE TABLE IF NOT EXISTS meta_info (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

    // Create all system tables as defined in systemTables
    for (const tableName of Object.values(systemTables)) {
        await db.exec(`
    CREATE TABLE IF NOT EXISTS ${tableName} (
      idx INTEGER PRIMARY KEY AUTOINCREMENT,
      rsn TEXT,
      message TEXT,
      message_id TEXT UNIQUE,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
    }
    logger.info('✅ **Success:** Database initialized with WAL mode. All chat and system tables are created.');
}

module.exports = {
    initializeMsgTables,
};
