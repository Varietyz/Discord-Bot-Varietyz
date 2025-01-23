/**
 * @fileoverview Utility functions for extracting and managing player data.
 * Handles fetching data from external APIs, formatting data for database storage,
 * and ensuring data integrity within the SQLite database.
 *
 * @module modules/functions/player_data_extractor
 */
const axios = require('axios');
const { WOM_API_URL } = require('../../config/constants');
const logger = require('./logger');
const { runQuery, getAll } = require('../../utils/dbUtils');

/**
 * Pauses execution for a specified number of milliseconds.
 *
 * @param {number} ms - Milliseconds to sleep.
 * @returns {Promise<void>} - A promise that resolves after the specified delay.
 * @example
 * // Sleeps for 2 seconds
 * await sleep(2000);
 */
async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Flattens a nested object into a single-level object with concatenated keys.
 * Filters out undesired fields and renames keys for database insertion.
 *
 * This function replicates the old 'formatDataForCsv' but returns an object
 * suitable for database storage rather than CSV lines.
 *
 * @param {Object} data - The nested data object to format.
 * @returns {Object} - The formatted and flattened data object.
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
 * // formattedData = { 'Stats_Attack': 99, 'Stats_Strength': 99 }
 */
function formatDataForSql(data) {
    // 1. Flatten all nested objects
    /**
     * Recursively flattens a nested object.
     *
     * @param {Object} d - The object to flatten.
     * @param {string} [parentKey=''] - The base key to prepend to each key.
     * @param {string} [sep='_'] - The separator between keys.
     * @returns {Object} - The flattened object.
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

    // 2. Exclusion lists
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

    // 3. Rename & filter
    const formattedData = {};
    for (const [key, value] of Object.entries(flattenedData)) {
        if (excludeAttributes.includes(key) || excludeSubstrings.some((sub) => key.includes(sub))) {
            continue;
        }

        // Skip -1 sentinel
        if (value === -1) {
            continue;
        }

        // Rename from e.g. "latestSnapshot_data_skills_attack_level" => "LatestSnapshot Data Skills Attack Level"
        const formattedKey = key
            .replace('latestSnapshot_data_', '')
            .replace('_metric', '')
            .replace(/_/g, ' ') // underscores => spaces
            .replace(/\b\w/g, (char) => char.toUpperCase()); // uppercase each word

        formattedData[formattedKey] = value;
    }

    return formattedData;
}

/**
 * Ensures the 'player_data' table exists in the SQLite database.
 * If the table does not exist, it creates one with the specified schema.
 *
 * @async
 * @function ensurePlayerDataTable
 * @returns {Promise<void>} - Resolves when the table is ensured.
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
 * Saves formatted player data to the SQLite database.
 * It overwrites existing entries for the player to ensure data integrity.
 *
 * @async
 * @function savePlayerDataToDb
 * @param {string} playerName - The name of the player.
 * @param {Object} rawData - The raw data object fetched from the API.
 * @returns {Promise<void>} - Resolves when the data is saved.
 * @throws {Error} - Throws an error if database operations fail.
 * @example
 * await savePlayerDataToDb('PlayerOne', rawData);
 */
async function savePlayerDataToDb(playerName, rawData) {
    // 1) Ensure table
    await ensurePlayerDataTable();

    // 2) Flatten & filter
    const formattedData = formatDataForSql(rawData);

    // 3) Delete old data for this player
    const playerId = playerName.toLowerCase().trim();
    await runQuery('DELETE FROM player_data WHERE player_id = ?', [playerId]);

    // 4) Insert each key->value
    const now = new Date().toISOString();
    const insertQuery = `
        INSERT INTO player_data (player_id, data_key, data_value, last_updated)
        VALUES (?, ?, ?, ?)
    `;
    for (const [key, val] of Object.entries(formattedData)) {
        await runQuery(insertQuery, [playerId, key, String(val), now]);
    }
    logger.info(`Saved data in DB for player: ${playerName}`);
}

/**
 * Makes an HTTP GET request with retry logic.
 * Handles rate limiting (HTTP 429) and not-found errors (HTTP 404).
 *
 * @async
 * @function fetchWithRetry
 * @param {string} url - The URL to fetch.
 * @param {Object} headers - HTTP headers to include in the request.
 * @param {number} [retries=10] - Number of retry attempts.
 * @param {number} [delay=10000] - Delay between retries in milliseconds.
 * @returns {Promise<Object>} - The response data from the HTTP request.
 * @throws {Error} - Throws an error if all retries fail or if a 404 error occurs.
 * @example
 * const data = await fetchWithRetry('https://api.example.com/player', { Authorization: 'Bearer token' });
 */
async function fetchWithRetry(url, headers, retries = 10, delay = 10000) {
    let attempt = 0;
    while (attempt < retries) {
        try {
            const response = await axios.get(url, { headers });
            return response.data; // Return data on success
        } catch (error) {
            if (error.response && error.response.status === 429) {
                const retryAfter = error.response.headers['retry-after'] || delay / 1000;
                logger.warn(`Rate-limited. Retrying in ${retryAfter}s (URL: ${url})...`);
                await sleep(retryAfter * 1000);
            } else if (error.response && error.response.status === 404) {
                logger.error(`Player not found (404) for URL: ${url}`);
                throw new Error('404: Player not found');
            } else {
                logger.error(`Request failed for URL ${url}: ${error.message}`);
                throw error;
            }
        }
        attempt++;
    }
    logger.error(`Max retries reached for URL: ${url}`);
    throw new Error('Max retries reached');
}

/**
 * Loads all registered RSNs from the database.
 * Returns a mapping of user IDs to their associated RSNs.
 *
 * @async
 * @function loadRegisteredRsnData
 * @returns {Promise<Object>} - A mapping of user IDs to arrays of RSNs.
 * @throws {Error} - Throws an error if the database query fails.
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

        // Transform rows into a mapping { user_id: [rsn1, rsn2, ...] }
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
 * Fetches and saves registered player data by retrieving data from the WOM API
 * and storing it in the SQLite database.
 *
 * @async
 * @function fetchAndSaveRegisteredPlayerData
 * @returns {Promise<{data: Array<Object>, fetchFailed: boolean}>} - An object containing the processed clan data and a flag indicating if any fetches failed.
 * @throws {Error} - Throws an error if critical operations fail.
 * @example
 * const result = await fetchAndSaveRegisteredPlayerData();
 * // result = { data: [...], fetchFailed: false }
 */
async function fetchAndSaveRegisteredPlayerData() {
    const headers = { 'Content-Type': 'application/json' };
    logger.info('Starting fetch for registered player data...');

    try {
        // Fetch registered RSNs from the database
        const registeredRsnData = await loadRegisteredRsnData();
        logger.info('Loaded registered RSNs from database:', registeredRsnData);

        // Flatten the RSN map { user1: [rsn1, rsn2], user2: [rsn3] } => [rsn1, rsn2, rsn3]
        const playerIds = Object.values(registeredRsnData).flat();
        logger.info(`Found ${playerIds.length} RSNs to process:`, playerIds);

        if (playerIds.length === 0) {
            logger.warn('No RSNs found. Aborting data fetch.');
            return { data: [], fetchFailed: false };
        }

        const validMembersWithData = [];
        let fetchFailed = false;

        for (const playerName of playerIds) {
            const url = `${WOM_API_URL}/players/${playerName.toLowerCase().trim()}`;
            logger.info(`Fetching data for player: ${playerName} (URL: ${url})`);

            try {
                // 1) Retrieve data from WOM API
                const playerData = await fetchWithRetry(url, headers);
                logger.info(`Fetched data for ${playerName}:`, playerData);

                // 2) Save data to the database
                await savePlayerDataToDb(playerName, playerData);
                logger.info(`Saved player data to database for: ${playerName}`);

                // 3) Track successfully processed players
                validMembersWithData.push({
                    username: playerName.toLowerCase().trim(),
                    displayName: playerData.displayName,
                    lastProgressedAt: playerData.lastChangedAt || null,
                });

                // 4) Rate-limit
                await sleep(1500);
            } catch (err) {
                logger.error(`Error processing player ${playerName}: ${err.message}`);
                fetchFailed = true;
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
 * Removes players from the 'player_data' table who are no longer part of the current clan.
 * This ensures that the database remains clean and only contains relevant player data.
 *
 * @async
 * @function removeNonMatchingPlayers
 * @param {Set<string>} currentClanUsers - A set of current clan user IDs.
 * @returns {Promise<void>} - Resolves when non-matching players are removed.
 * @example
 * const currentUsers = new Set(['player1', 'player2']);
 * await removeNonMatchingPlayers(currentUsers);
 */
async function removeNonMatchingPlayers(currentClanUsers) {
    // Gather all distinct player_ids in 'player_data'
    const allPlayers = await getAll('SELECT DISTINCT player_id FROM player_data');

    for (const { player_id } of allPlayers) {
        if (!currentClanUsers.has(player_id)) {
            await runQuery('DELETE FROM player_data WHERE player_id = ?', [player_id]);
            logger.info(`Removed data from DB for player: ${player_id}`);
        }
    }
}

/**
 * Orchestrates the entire player data update process:
 * 1. Fetches data from WOM for each registered RSN.
 * 2. Saves the fetched data to the database.
 * 3. Removes any leftover data that no longer corresponds to registered RSNs.
 *
 * @async
 * @function fetchAndUpdatePlayerData
 * @returns {Promise<void>} - Resolves when the update process is complete.
 * @example
 * await fetchAndUpdatePlayerData();
 */
async function fetchAndUpdatePlayerData() {
    logger.info('Starting player data update process.');

    const { data: clanData, fetchFailed } = await fetchAndSaveRegisteredPlayerData();

    if (fetchFailed) {
        logger.warn('Errors occurred during player data fetch. Cleanup skipped.');
        return;
    }

    if (clanData) {
        const currentClanUsers = new Set(clanData.map((member) => member.username.toLowerCase()));
        logger.info('Retrieved current RSN list.');

        // Optional: remove DB data for non-registered RSNs
        await removeNonMatchingPlayers(currentClanUsers);
    } else {
        logger.warn('No data fetched, update process aborted.');
    }

    logger.info('Player data update process completed.');
}

module.exports = {
    fetchAndUpdatePlayerData,
    fetchAndSaveRegisteredPlayerData,
    savePlayerDataToDb, // Exported if needed by other modules
};
