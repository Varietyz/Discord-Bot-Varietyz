/**
 * @fileoverview
 * **Player Data Extractor Utilities** 📊
 *
 * This module facilitates fetching, formatting, saving, and maintaining player data in the Varietyz Bot.
 * It integrates with the Wise Old Man (WOM) API to fetch player data and uses an SQLite database for storage.
 * Key operations include:
 * - **Data Formatting:** Flattening and renaming nested player data into a format suitable for database insertion.
 * - **Database Management:** Managing the `player_data` table to ensure player data is saved and updated correctly.
 * - **API Integration:** Fetching player data from the WOM API.
 * - **Player Synchronization:** Synchronizing player data with registered RSNs and removing stale records.
 * - **Rate-Limiting:** Handling frequent API requests efficiently.
 *
 * **External Dependencies:**
 * - **Wise Old Man (WOM) API:** For fetching player data.
 * - **luxon:** For date manipulation and calculating time intervals.
 * - **dbUtils:** For interacting with the SQLite database.
 *
 * @module modules/services/playerDataExtractor
 */

const WOMApiClient = require('../../api/wise_old_man/apiClient');
const logger = require('../utils/essentials/logger');
const { runQuery, getAll } = require('../utils/essentials/dbUtils');
const { sleep } = require('../utils/helpers/sleepUtil');
const { setLastFetchedTime, getLastFetchedTime, ensurePlayerFetchTimesTable } = require('../utils/fetchers/lastFetchedTime');

/**
 * 🎯 **Formats and Flattens Player Data for SQL Storage**
 *
 * Flattens a nested data object into a single-level object with concatenated keys,
 * filters out undesired fields, and renames keys for database insertion.
 *
 * @function formatDataForSql
 * @param {Object} data - The nested data object to format.
 * @returns {Object} The formatted and flattened data object.
 *
 * @example
 * const rawData = {
 * player: {
 * stats: {
 * attack: 99,
 * strength: 99
 * },
 * info: {
 * username: 'PlayerOne',
 * country: 'US'
 * }
 * }
 * };
 * const formattedData = formatDataForSql(rawData);
 * // formattedData = { 'Stats Attack': 99, 'Stats Strength': 99 }
 */
function formatDataForSql(data) {
    /**
     * Recursively flattens a nested object.
     *
     * @param {Object} d - The object to flatten.
     * @param {string} [parentKey=''] - The base key to prepend.
     * @param {string} [sep='_'] - The separator between keys.
     * @returns {Object} The flattened object.
     */
    function flattenDict(d, parentKey = '', sep = '_') {
        const items = {};
        for (const [k, v] of Object.entries(d)) {
            const newKey = parentKey ? `${parentKey}${sep}${k}` : k;
            if (typeof v === 'object' && v !== null) {
                Object.assign(items, flattenDict(v, newKey, sep));
            } else {
                items[newKey] = v;
            }
        }
        return items;
    }

    const flattenedData = flattenDict(data);

    const excludeAttributes = [
        'id',
        'username',
        'country',
        'patron',
        'exp',
        'ehp',
        'ehb',
        'ttm',
        'tt200m',
        'updatedAt',
        'lastChangedAt',
        'lastImportedAt',
        'latestSnapshot_id',
        'latestSnapshot_playerId',
        'latestSnapshot_createdAt',
        'latestSnapshot_importedAt',
        'archive',
    ];
    const excludeSubstrings = ['experience', 'rank', 'ehp', 'ehb', 'metric'];

    const formattedData = {};
    for (const [key, value] of Object.entries(flattenedData)) {
        if (excludeAttributes.includes(key) || excludeSubstrings.some((sub) => key.includes(sub))) {
            continue;
        }

        if (value === -1) {
            continue;
        }

        const formattedKey = key
            .replace('latestSnapshot_data_', '')
            .replace('_metric', '')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase());
        formattedData[formattedKey] = value;
    }

    return formattedData;
}

/**
 * 🎯 **Ensures the Player Data Table Exists**
 *
 * Checks if the `player_data` table exists in the SQLite database; if not, creates it with the specified schema.
 *
 * @async
 * @function ensurePlayerDataTable
 * @returns {Promise<void>} Resolves when the table is ensured.
 *
 * @example
 * await ensurePlayerDataTable();
 */
async function ensurePlayerDataTable() {
    await runQuery(`
        CREATE TABLE IF NOT EXISTS player_data (
            idx INTEGER PRIMARY KEY AUTOINCREMENT,
            player_id INTEGER NOT NULL,
            rsn TEXT NOT NULL,
            data_key TEXT NOT NULL,
            data_value TEXT,
            last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (player_id) REFERENCES registered_rsn(player_id) ON DELETE CASCADE
        );
    `);
}

/**
 * 🎯 **Saves Player Data to the Database**
 *
 * Formats the raw player data using `formatDataForSql`, deletes any existing data for the player,
 * and inserts the formatted data into the `player_data` table.
 *
 * @async
 * @function savePlayerDataToDb
 * @param {string} playerName - The name of the player.
 * @param {Object} rawData - The raw data object fetched from the API.
 * @returns {Promise<void>} Resolves when the data is saved.
 *
 * @throws {Error} Throws an error if database operations fail.
 *
 * @example
 * await savePlayerDataToDb('PlayerOne', rawData);
 */
async function savePlayerDataToDb(playerName, rawData) {
    await ensurePlayerDataTable();
    const formattedData = formatDataForSql(rawData);

    const cleanedPlayerName = playerName.toLowerCase().trim();
    //logger.debug(`🔍 Looking for RSN: '${cleanedPlayerName}' in registered_rsn table`);

    const playerResult = await getAll('SELECT player_id, rsn FROM registered_rsn WHERE LOWER(rsn) = ? LIMIT 1', [cleanedPlayerName]);

    if (playerResult.length === 0) {
        logger.warn(`❌ No player_id found for ${playerName}. Skipping save.`);
        return;
    }

    const { player_id: playerId, rsn } = playerResult[0];
    //logger.debug(`✅ Found player_id: ${playerId}, RSN: ${rsn}`);

    await runQuery('DELETE FROM player_data WHERE player_id = ?', [playerId]);

    const now = new Date().toISOString();
    const insertQuery = `
        INSERT INTO player_data (player_id, rsn, data_key, data_value, last_updated)
        VALUES (?, ?, ?, ?, ?)
    `;

    for (const [key, val] of Object.entries(formattedData)) {
        await runQuery(insertQuery, [playerId, rsn, key, String(val), now]);
    }

    logger.info(`✅ Saved data for ${playerName} (ID: ${playerId}, RSN: ${rsn})`);
}

/**
 * 🎯 **Loads Registered RSN Data**
 *
 * Retrieves all registered RSNs from the database and returns a mapping of user IDs to their RSN data.
 *
 * @async
 * @function loadRegisteredRsnData
 * @returns {Promise<Object>} A mapping of player IDs to objects containing discord_id and rsn.
 *
 * @example
 * const rsnData = await loadRegisteredRsnData();
 * // rsnData = { 'player1': { discord_id: '...', rsn: 'RSN1' }, 'player2': { discord_id: '...', rsn: 'RSN2' } }
 */
async function loadRegisteredRsnData() {
    try {
        const query = `
            SELECT player_id, discord_id, rsn
            FROM registered_rsn
        `;
        const rows = await getAll(query);

        const playerMapping = {};
        rows.forEach(({ player_id, discord_id, rsn }) => {
            if (!playerMapping[player_id]) {
                playerMapping[player_id] = { discord_id, rsn };
            }
        });

        return playerMapping;
    } catch (error) {
        logger.error(`🚨 Error loading registered player data: ${error}`);
        return {};
    }
}

/**
 * 🎯 **Fetches and Saves Registered Player Data**
 *
 * Retrieves registered RSNs from the database, fetches the corresponding player data from
 * the WOM API based on the last fetched time, and saves the data to the database.
 * Implements rate-limiting between requests.
 *
 * @async
 * @function fetchAndSaveRegisteredPlayerData
 * @returns {Promise<{ fetchFailed: boolean }>}
 * An object containing a single field, `fetchFailed`, indicating if any fetches failed.
 *
 * @example
 * const result = await fetchAndSaveRegisteredPlayerData();
 * if (!result.fetchFailed) {
 * logger.info('Player data fetched successfully.');
 * }
 */
async function fetchAndSaveRegisteredPlayerData() {
    logger.info('🔄 Starting fetch for registered player data...');

    try {
        const registeredPlayers = await loadRegisteredRsnData();
        logger.info(`📊 Loaded ${Object.keys(registeredPlayers).length} registered players.`);

        if (Object.keys(registeredPlayers).length === 0) {
            logger.warn('⚠️ No registered players found. Aborting data fetch.');
            return { fetchFailed: false };
        }

        let fetchFailed = false;

        for (const [playerId, { rsn }] of Object.entries(registeredPlayers)) {
            logger.info(`🔍 Processing player: ${rsn} (ID: ${playerId})`);

            try {
                const lastFetched = await getLastFetchedTime(playerId);
                const now = new Date();

                let playerData;
                if (lastFetched) {
                    const hoursSinceLastFetch = (now.getTime() - lastFetched.getTime()) / (1000 * 60 * 60);

                    if (hoursSinceLastFetch > 24) {
                        logger.info(`🔄 Updating player ${rsn} on WOM API...`);
                        playerData = await WOMApiClient.request('players', 'updatePlayer', rsn);
                        await setLastFetchedTime(playerId);
                    } else {
                        logger.info(`📌 No update needed for ${rsn}.`);
                        playerData = await WOMApiClient.request('players', 'getPlayerDetails', rsn);
                    }
                } else {
                    logger.info(`🔄 First-time update for ${rsn} on WOM API...`);
                    playerData = await WOMApiClient.request('players', 'updatePlayer', rsn);
                    await setLastFetchedTime(playerId);
                }

                await savePlayerDataToDb(rsn, playerData);

                await sleep(1500);
            } catch (err) {
                logger.error(`❌ Error processing player ${rsn}: ${err.message}`);
                fetchFailed = true;
            }
        }

        return { fetchFailed };
    } catch (error) {
        logger.error(`❌ Error during fetch and save operation: ${error.message}`);
        return { fetchFailed: true };
    }
}

/**
 * 🎯 **Removes Non-Matching Player Data**
 *
 * Deletes player data from the `player_data` table for players whose IDs are not in the current clan.
 *
 * @async
 * @function removeNonMatchingPlayers
 * @param {Set<string>} currentClanUsers - A set of current clan player IDs.
 * @returns {Promise<void>} Resolves when non-matching records are removed.
 *
 * @example
 * const currentUsers = new Set(['player1', 'player2']);
 * await removeNonMatchingPlayers(currentUsers);
 */
async function removeNonMatchingPlayers(currentClanUsers) {
    const allPlayers = await getAll('SELECT DISTINCT player_id FROM player_data');

    for (const { player_id } of allPlayers) {
        if (!currentClanUsers.has(player_id)) {
            await runQuery('DELETE FROM player_data WHERE player_id = ?', [player_id]);
            logger.info(`🗑️ Removed data from DB for player ID: ${player_id}`);
        }
    }
}

/**
 * 🎯 **Fetches and Updates Player Data**
 *
 * Orchestrates the entire player data update process:
 * 1. Ensures necessary tables exist.
 * 2. Fetches data for all registered RSNs from the WOM API and saves it to the database.
 * 3. Removes stale data for players no longer registered.
 *
 * @async
 * @function fetchAndUpdatePlayerData
 * @returns {Promise<void>} Resolves when the update process is complete.
 *
 * @example
 * await fetchAndUpdatePlayerData();
 */
async function fetchAndUpdatePlayerData() {
    logger.info('🔄 Starting player data update process.');
    await ensurePlayerDataTable();
    await ensurePlayerFetchTimesTable();

    const { fetchFailed } = await fetchAndSaveRegisteredPlayerData();

    if (fetchFailed) {
        logger.warn('⚠️ Errors occurred during player data fetch. Cleanup skipped.');
        return;
    }

    try {
        const allRegistered = await getAll('SELECT player_id FROM registered_rsn');
        const currentClanUsers = new Set(allRegistered.map((row) => row.player_id));

        logger.info(`📊 Retrieved current RSN list from registered_rsn. Total registered: ${currentClanUsers.size}`);

        await removeNonMatchingPlayers(currentClanUsers);
    } catch (err) {
        logger.error(`❌ Failed to remove non-matching players: ${err.message}`);
    }

    logger.info('✅ Player data update process completed.');
}

module.exports = {
    fetchAndUpdatePlayerData,
    fetchAndSaveRegisteredPlayerData,
    savePlayerDataToDb,
};
