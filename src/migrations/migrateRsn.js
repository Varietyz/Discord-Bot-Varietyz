/* eslint-disable jsdoc/require-returns */
const fs = require('fs');
const path = require('path');
const db = require('../modules/utils/dbUtils');
const logger = require('../modules/utils/logger');
const { sleep } = require('../modules/utils/sleepUtil');
const WOMApiClient = require('../api/wise_old_man/apiClient');

const BACKUP_PATH = path.join(__dirname, 'registered_rsn_backup.json');

/**
 * 📂 **Loads Backup Data from JSON (If Available)**
 *
 * - Checks if `registered_rsn_backup.json` exists.
 * - Reads and parses the JSON file.
 * @returns {Promise<Object[]>} The backup data or an empty array.
 */
const loadBackupFromFile = async () => {
    try {
        if (!fs.existsSync(BACKUP_PATH)) {
            logger.warn('⚠️ No backup file found. Skipping data restore.');
            return [];
        }
        logger.info('📂 Loading backup data from file...');
        const fileData = fs.readFileSync(BACKUP_PATH, 'utf8');
        return JSON.parse(fileData);
    } catch (error) {
        logger.error(`❌ Error loading backup file: ${error.message}`);
        return [];
    }
};

/**
 * 🛠️ **Drops and Recreates `registered_rsn` Table**
 */
const dropAndRecreateRegisteredRSN = async () => {
    try {
        logger.warn('⚠️ Dropping `registered_rsn` table...');
        await db.runQuery('DROP TABLE IF EXISTS registered_rsn;');
        logger.info('✅ Dropped `registered_rsn` table.');

        logger.info('🔄 Recreating `registered_rsn` table...');
        await db.runQuery(`
            CREATE TABLE registered_rsn (
                player_id INTEGER PRIMARY KEY,
                discord_id TEXT NOT NULL,
                rsn TEXT NOT NULL UNIQUE,
                registered_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
        logger.info('✅ Recreated `registered_rsn` table.');
    } catch (error) {
        logger.error(`❌ Error dropping or recreating registered_rsn: ${error.message}`);
    }
};

/**
 * 🔍 **Fetches `player_id` from WOM API for Each RSN**
 *
 * - Loads backup data from file.
 * - Calls `getPlayerDetails` for each username.
 * - Inserts data back into the new `registered_rsn` table.
 */
const repopulateRegisteredRSN = async () => {
    try {
        const backupData = await loadBackupFromFile();

        if (!backupData.length) {
            logger.warn('⚠️ No backup data to restore. Skipping repopulation.');
            return;
        }

        logger.info('🔄 Repopulating `registered_rsn` table with player_id...');

        for (const row of backupData) {
            try {
                const { id: player_id } = await WOMApiClient.request('players', 'getPlayerDetails', row.rsn);

                await db.runQuery(
                    `
                    INSERT INTO registered_rsn (player_id, discord_id, rsn, registered_at)
                    VALUES (?, ?, ?, ?)
                `,
                    [player_id, row.discord_id, row.rsn, row.registered_at],
                );
                await sleep(3000);
                logger.info(`✅ Inserted: player_id=${player_id}, rsn=${row.rsn}`);
            } catch (apiError) {
                logger.warn(`⚠️ Failed to fetch player_id for ${row.rsn}: ${apiError.message}`);
            }
        }
    } catch (error) {
        logger.error(`❌ Error repopulating registered_rsn: ${error.message}`);
    }
};

/**
 * 🔄 **Main Execution: Drop, Recreate, and Repopulate from Backup**
 */
const migrateRegisteredRSN = async () => {
    try {
        await dropAndRecreateRegisteredRSN();
        await repopulateRegisteredRSN();
        logger.info('🎉 Migration of `registered_rsn` completed successfully.');
    } catch (error) {
        logger.error(`❌ Migration failed: ${error.message}`);
    }
};

module.exports = migrateRegisteredRSN;
