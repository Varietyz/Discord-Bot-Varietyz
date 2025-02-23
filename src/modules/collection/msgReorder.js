require('dotenv').config();
const { dbPromise } = require('./msgDbConstants');
const logger = require('../utils/essentials/logger');
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
async function reorderAllTables() {
    try {
        const db = await dbPromise;
        for (const tableName of Object.values(systemTables)) {
            logger.info(`\n🔄 Reordering table: \`${tableName}\``);
            await reorderTable(db, tableName);
        }
        logger.info('\n✅ All tables have been processed successfully.');
    } catch (error) {
        logger.error('❌ Error reordering all tables:', error);
    }
}
module.exports = {
    reorderAllTables,
};