const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
require('dotenv').config();

async function openDatabase() {
    return open({
        filename: 'src/data/messages.db',
        driver: sqlite3.Database,
    });
}
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
        console.log(`Table "${tableName}" has been permanently reordered with its schema preserved.`);
    } catch (error) {
        await db.exec('ROLLBACK;');
        console.error(`Error reordering table "${tableName}":`, error);
    }
}

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
reorderAllTables();
