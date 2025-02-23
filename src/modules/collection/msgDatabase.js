require('dotenv').config();
const { dbPromise, systemTables } = require('./msgDbConstants');
const logger = require('../utils/essentials/logger');
async function initializeMsgTables() {
    const db = await dbPromise;
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