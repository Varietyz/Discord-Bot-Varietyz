/**
 * @fileoverview
 * **Player Data Extractor Utilities** 📊
 *
 * This module facilitates fetching, formatting, saving, and maintaining player data in the Varietyz Bot.
 * It integrates with the Wise Old Man (WOM) API to fetch player data and uses an SQLite database for storage.
 * Key operations include:
 * - **Data Formatting**: Flattening and renaming nested player data into a format suitable for database insertion.
 * - **Database Management**: Managing the `player_data` table to ensure player data is saved and updated correctly.
 * - **API Integration**: Fetching player data from the WOM API.
 * - **Player Synchronization**: Synchronizing player data with registered RSNs and removing stale records.
 * - **Rate-Limiting**: Handling frequent API requests efficiently.
 *
 * **External Dependencies:**
 * - **Wise Old Man (WOM) API**: For fetching player data.
 * - **luxon**: For date manipulation and calculating time intervals.
 * - **dbUtils**: For interacting with the SQLite database.
 *
 * @module modules/services/playerDataExtractor
 */

const WOMApiClient = require('../../api/wise_old_man/apiClient');
const logger = require('../utils/logger');
const { runQuery, getAll } = require('../utils/dbUtils');
const { sleep } = require('../utils/sleepUtil');
const { setLastFetchedTime, getLastFetchedTime, ensurePlayerFetchTimesTable } = require('../utils/lastFetchedTime');

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
 *   player: {
 *     stats: {
 *       attack: 99,
 *       strength: 99
 *     },
 *     info: {
 *       username: 'PlayerOne',
 *       country: 'US'
 *     }
 *   }
 * };
 * const formattedData = formatDataForSql(rawData);
 * // formattedData = { 'Stats Attack': 99, 'Stats Strength': 99 }
 */
function formatDataForSql(data) {
    // 1. Flatten all nested objects.
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

    // 2. Exclusion lists for attributes and substrings.
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

    // 3. Rename and filter keys.
    const formattedData = {};
    for (const [key, value] of Object.entries(flattenedData)) {
        if (excludeAttributes.includes(key) || excludeSubstrings.some((sub) => key.includes(sub))) {
            continue;
        }

        // Skip sentinel values.
        if (value === -1) {
            continue;
        }

        // Rename keys (e.g., "latestSnapshot_data_skills_attack_level" becomes "LatestSnapshot Data Skills Attack Level")
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
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          player_id TEXT NOT NULL,
          data_key TEXT NOT NULL,
          data_value TEXT,
          last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
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
    // Ensure the table exists.
    await ensurePlayerDataTable();

    // Flatten and filter the raw data.
    const formattedData = formatDataForSql(rawData);

    // Delete old data for this player.
    const playerId = playerName.toLowerCase().trim();
    await runQuery('DELETE FROM player_data WHERE player_id = ?', [playerId]);

    // Insert each key-value pair with the current timestamp.
    const now = new Date().toISOString();
    const insertQuery = `
        INSERT INTO player_data (player_id, data_key, data_value, last_updated)
        VALUES (?, ?, ?, ?)
    `;
    for (const [key, val] of Object.entries(formattedData)) {
        await runQuery(insertQuery, [playerId, key, String(val), now]);
    }
}

/**
 * 🎯 **Loads Registered RSN Data**
 *
 * Retrieves all registered RSNs from the database and returns a mapping of user IDs to arrays of RSNs.
 *
 * @async
 * @function loadRegisteredRsnData
 * @returns {Promise<Object>} A mapping of user IDs to arrays of RSNs.
 *
 * @example
 * const rsnData = await loadRegisteredRsnData();
 * // rsnData = { 'user1': ['RSN1', 'RSN2'], 'user2': ['RSN3'] }
 */
async function loadRegisteredRsnData() {
    try {
        const query = `
            SELECT user_id, rsn
            FROM registered_rsn
        `;
        const rows = await getAll(query);

        const rsnMapping = {};
        rows.forEach(({ user_id, rsn }) => {
            if (!rsnMapping[user_id]) {
                rsnMapping[user_id] = [];
            }
            rsnMapping[user_id].push(rsn);
        });

        return rsnMapping;
    } catch (error) {
        logger.error(`Error loading registered RSNs from the database: ${error}`);
        return {};
    }
}

/**
 * 🎯 **Fetches and Saves Registered Player Data**
 *
 * Retrieves registered RSNs from the database, fetches the corresponding player data from the WOM API
 * based on the last fetched time, and saves the data to the database. Implements rate-limiting between requests.
 *
 * @async
 * @function fetchAndSaveRegisteredPlayerData
 * @returns {Promise<{data: Array<Object>, fetchFailed: boolean}>} An object containing the fetched data and a flag indicating if any fetch failed.
 *
 * @example
 * const result = await fetchAndSaveRegisteredPlayerData();
 * if (!result.fetchFailed) {
 *   logger.info('Player data fetched successfully.');
 * }
 */
async function fetchAndSaveRegisteredPlayerData() {
    logger.info('Starting fetch for registered player data...');

    try {
        // Load registered RSNs.
        const registeredRsnData = await loadRegisteredRsnData();
        logger.info('Loaded registered RSNs from database.');

        // Flatten the RSN map into a list.
        const rsns = Object.values(registeredRsnData).flat();
        logger.info(`Found ${rsns.length} RSNs to process.`);

        if (rsns.length === 0) {
            logger.warn('No RSNs found. Aborting data fetch.');
            return { data: [], fetchFailed: false };
        }

        const validMembersWithData = [];
        let fetchFailed = false;

        for (const rsn of rsns) {
            logger.info(`Processing player: ${rsn}`);
            try {
                const normalizedRsn = rsn.toLowerCase().trim();

                // Retrieve the last fetched time.
                const lastFetched = await getLastFetchedTime(normalizedRsn);
                const now = new Date();
                let playerData;

                if (lastFetched) {
                    const hoursSinceLastFetch = (now.getTime() - lastFetched.getTime()) / (1000 * 60 * 60);
                    if (hoursSinceLastFetch > 24) {
                        logger.info(`More than 24 hours since last update on Wise Old Man for ${rsn}. Updating...`);
                        playerData = await WOMApiClient.request('players', 'updatePlayer', normalizedRsn);
                        await setLastFetchedTime(normalizedRsn);
                    } else {
                        logger.info(`No need to update ${rsn} on Wise Old Man yet.`);
                        playerData = await WOMApiClient.request('players', 'getPlayerDetails', normalizedRsn);
                    }
                } else {
                    // If never fetched before, use updatePlayer.
                    logger.info(`No previous fetch found for ${rsn}. Using 'updatePlayer'.`);
                    playerData = await WOMApiClient.request('players', 'updatePlayer', normalizedRsn);
                    await setLastFetchedTime(normalizedRsn);
                }

                // Save the fetched data.
                await savePlayerDataToDb(rsn, playerData);
                logger.info(`Saved player data to database for: ${rsn}`);

                validMembersWithData.push({
                    username: normalizedRsn,
                    displayName: playerData.displayName,
                    lastProgressedAt: playerData.lastChangedAt || null,
                });

                // Rate-limit between requests.
                await sleep(1500);
            } catch (err) {
                if (err.message.includes('Cannot convert undefined or null to object')) {
                    logger.warn(`Non-critical issue processing player ${rsn}: ${err.message}`);
                } else {
                    logger.error(`Error processing player ${rsn}: ${err.message}`);
                    fetchFailed = true;
                }
            }
        }

        logger.info(`Successfully processed ${validMembersWithData.length} players.`);
        return { data: validMembersWithData, fetchFailed };
    } catch (error) {
        logger.error(`Error during fetch and save operation: ${error.message}`);
        return { data: [], fetchFailed: true };
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
            logger.info(`Removed data from DB for player: ${player_id}`);
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
    logger.info('Starting player data update process.');
    // Ensure necessary tables exist.
    await ensurePlayerDataTable();
    await ensurePlayerFetchTimesTable();

    const { data: clanData, fetchFailed } = await fetchAndSaveRegisteredPlayerData();

    if (fetchFailed) {
        logger.warn('Errors occurred during player data fetch. Cleanup skipped.');
        return;
    }

    if (clanData) {
        const currentClanUsers = new Set(clanData.map((member) => member.username.toLowerCase()));
        logger.info('Retrieved current RSN list.');
        await removeNonMatchingPlayers(currentClanUsers);
    } else {
        logger.warn('No data fetched, update process aborted.');
    }

    logger.info('Player data update process completed.');
}

module.exports = {
    fetchAndUpdatePlayerData,
    fetchAndSaveRegisteredPlayerData,
    savePlayerDataToDb, // Exported if needed by other modules.
};
