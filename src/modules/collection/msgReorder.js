require('dotenv').config();
const logger = require('../utils/essentials/logger');
const db = require('../utils/essentials/dbUtils');
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

async function reorderTable(tableName) {
    try {
        if (typeof tableName !== 'string') {
            logger.error(`❌ Invalid table name: ${JSON.stringify(tableName)}`);
            return;
        }

        const tempTable = `${tableName}_temp`;

        await db.messages.runQuery('BEGIN TRANSACTION;');

        await db.messages.runQuery(`
            CREATE TABLE ${tempTable} AS 
            SELECT * FROM ${tableName} 
            ORDER BY timestamp ASC;
        `);
        await db.messages.runQuery(`DROP TABLE IF EXISTS ${tableName};`);
        await db.messages.runQuery(`ALTER TABLE ${tempTable} RENAME TO ${tableName};`);

        await db.messages.runQuery('COMMIT;');
        logger.info(`✅ Table "\`${tableName}\`" has been reordered.`);
    } catch (error) {
        await db.messages.runQuery('ROLLBACK;');
        logger.error(`❌ Error reordering table "\`${tableName}\`": ${error.message}`);
    }
}

async function reorderAllTables() {
    try {
        for (const tableName of Object.values(systemTables)) {
            if (typeof tableName !== 'string' || !tableName.trim()) {
                logger.error(`❌ Skipping invalid table name: ${JSON.stringify(tableName)}`);
                continue;
            }

            logger.info(`🔄 Reordering table: \`${tableName}\``);
            await reorderTable(tableName);
        }
        logger.info('\n✅ All tables have been processed successfully.');
    } catch (error) {
        logger.error('❌ Error reordering all tables:', error);
    }
}

module.exports = {
    reorderAllTables,
};
