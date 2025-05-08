require('dotenv').config();
const { systemTables } = require('./msgDbConstants');
const logger = require('../utils/essentials/logger');
const db = require('../utils/essentials/dbUtils');

async function initializeMsgTables() {
    await db.messages.runQuery(`
  CREATE TABLE IF NOT EXISTS chat_messages (
    idx INTEGER PRIMARY KEY AUTOINCREMENT,
    rsn TEXT,
    message TEXT,
    message_id TEXT UNIQUE,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
    await db.messages.runQuery(`
  CREATE TABLE IF NOT EXISTS meta_info (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);
    for (const tableName of Object.values(systemTables)) {
        await db.messages.runQuery(`
    CREATE TABLE IF NOT EXISTS ${tableName} (
      idx INTEGER PRIMARY KEY AUTOINCREMENT,
      rsn TEXT,
      message TEXT,
      message_id TEXT UNIQUE,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
    }
    logger.info(
        '✅ **Success:** Database initialized with WAL mode. All chat and system tables are created.'
    );
}
module.exports = {
    initializeMsgTables,
};
