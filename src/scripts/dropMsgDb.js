const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('../modules/utils/essentials/logger'); 

const dbPath = path.join(__dirname, '..', 'data', 'messages.db');

function initializeDatabase() {

    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            logger.error(`❌ Error connecting to SQLite: ${err.message}`);
            throw err; 
        } else {
            logger.info(`✅ Connected to SQLite at: ${dbPath}`);
        }
    });

    return db;
}

async function dropTables(db) {
    const tables = [
        'drops',
        'raid_drops',
        'quest_completed',
        'collection_log',
        'personal_bests',
        'pvp_messages',
        'pet_drops',
        'level_ups',
        'combat_achievements',
        'clue_rewards',
        'clan_traffic',
        'diary_completed',
        'combat_tasks_completed',
        'loot_key_rewards',
        'chat_messages',
        'meta_info',
    ];

    try {
        for (const table of tables) {
            await new Promise((resolve, reject) => {
                db.run(`DROP TABLE IF EXISTS ${table};`, (err) => {
                    if (err) {
                        console.error(`❌ Error dropping table ${table}: ${err.message}`);
                        reject(err);
                    } else {
                        console.log(`✅ Dropped table: ${table}`);
                        resolve();
                    }
                });
            });
        }
        console.log('✅ All selected tables dropped successfully!');
    } catch (error) {
        console.error(`❌ Error during table deletion: ${error.message}`);
    }
}

(async function main() {
    try {
        const db = initializeDatabase();

        await dropTables(db);

        db.close((err) => {
            if (err) {
                logger.error(`❌ Error closing the database: ${err.message}`);
            } else {
                logger.info('✅ DB closed successfully.');
            }
            process.exit(0);
        });
    } catch (error) {
        logger.error(`❌ Database initialization failed: ${error.message}`);
        throw error; 
    }
})();
