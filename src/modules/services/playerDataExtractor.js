const pLimit = require('p-limit'); // Ensure p-limit is installed: npm install p-limit
const WOMApiClient = require('../../api/wise_old_man/apiClient');
const logger = require('../utils/essentials/logger');
const { runQuery, getAll, runTransaction } = require('../utils/essentials/dbUtils');
const { setLastFetchedTime, getLastFetchedTime, ensurePlayerFetchTimesTable } = require('../utils/fetchers/lastFetchedTime');
const { updateEventBaseline } = require('./bingo/bingoTaskManager');

/**
 * Normalize a string to lower-case with underscores.
 * @param {string} str
 * @returns {string}
 */
function normalize(str) {
    return String(str).toLowerCase().replace(/\s+/g, '_');
}

/**
 * Ensure that the player_data table exists.
 */
async function ensurePlayerDataTable() {
    await runQuery(`
    CREATE TABLE IF NOT EXISTS player_data (
      player_id INTEGER NOT NULL,
      rsn TEXT NOT NULL,
      type TEXT NOT NULL,
      metric TEXT NOT NULL,
      kills INTEGER DEFAULT 0,
      score INTEGER DEFAULT 0,
      level INTEGER DEFAULT 0,
      exp BIGINT DEFAULT 0,
      last_changed DATETIME,
      last_updated DATETIME,
      PRIMARY KEY (player_id, type, metric)
    );
  `);
}

/**
 * Transform raw API player data into an array of rows for the database.
 * @param {object} rawData
 * @returns {Array<Object>}
 */
function transformPlayerData(rawData) {
    const rows = [];
    const rsn = normalize(rawData.username);
    const last_updated = new Date(rawData.updatedAt).toISOString();
    const last_changed = new Date(rawData.lastChangedAt).toISOString();
    const player_id = rawData.latestSnapshot?.playerId;
    if (!player_id) {
        logger.warn(`❌ No player_id found for ${rsn}. Skipping data transformation.`);
        return [];
    }
    if (rawData.combatLevel !== undefined) {
        rows.push({
            player_id,
            rsn,
            type: normalize('account'),
            metric: normalize('combat_level'),
            kills: 0,
            score: 0,
            level: rawData.combatLevel,
            exp: 0,
            last_changed,
            last_updated,
        });
    }
    const accountFields = ['type', 'build', 'status'];
    accountFields.forEach((field) => {
        if (rawData[field] !== undefined) {
            rows.push({
                player_id,
                rsn,
                type: normalize(field),
                metric: normalize(rawData[field]),
                kills: 0,
                score: 0,
                level: 0,
                exp: 0,
                last_changed,
                last_updated,
            });
        }
    });
    const snapshotData = rawData.latestSnapshot?.data;
    if (snapshotData) {
        Object.entries(snapshotData).forEach(([category, metrics]) => {
            const normCategory = normalize(category);
            Object.entries(metrics).forEach(([metricName, data]) => {
                const normMetric = normalize(metricName);
                const row = {
                    player_id,
                    rsn,
                    type: normCategory,
                    metric: normMetric,
                    kills: 0,
                    score: 0,
                    level: 0,
                    exp: 0,
                    last_changed,
                    last_updated,
                };

                if (normCategory === 'skills') {
                    row.level = data.level || 0;
                    row.exp = data.experience || 0;
                } else if (normCategory === 'bosses') {
                    row.kills = data.kills && data.kills > 0 ? data.kills : 0;
                } else if (normCategory === 'activities') {
                    row.score = data.score && data.score > 0 ? data.score : 0;
                }
                rows.push(row);
            });
        });
    }
    return rows;
}

/**
 * Build upsert query objects for the given player data rows.
 * @param {number} player_id
 * @param {string} rsn
 * @param {Array} rows
 * @returns {Array<Object>}
 */
function buildUpsertQueries(player_id, rsn, rows) {
    const queries = [];
    const upsertQuery = `
    INSERT INTO player_data (
      player_id, rsn, type, metric, kills, score, level, exp, last_changed, last_updated
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(player_id, type, metric) DO UPDATE SET
      kills = excluded.kills,
      score = excluded.score,
      level = excluded.level,
      exp = excluded.exp,
      last_changed = excluded.last_changed,
      last_updated = excluded.last_updated;
  `;
    for (const row of rows) {
        queries.push({
            query: upsertQuery,
            params: [player_id, rsn, row.type, row.metric, row.kills, row.score, row.level, row.exp, row.last_changed, row.last_updated],
        });
    }
    return queries;
}

/**
 * Process a single player's data.
 * Determines whether to force an update or simply fetch details,
 * then transforms the data and returns DB upsert queries.
 * @param {string} playerId
 * @param {string} rsn
 * @returns {Promise<Array<Object>>}
 */
async function processPlayer(playerId, rsn) {
    try {
        const lastFetched = await getLastFetchedTime(playerId);
        const now = new Date();
        let playerData;
        if (lastFetched) {
            const hoursSinceLastFetch = (now.getTime() - lastFetched.getTime()) / (1000 * 60 * 60);
            if (hoursSinceLastFetch > 4) {
                logger.info(`🔄 Updating player ${rsn} on WOM API...`);
                playerData = await WOMApiClient.request('players', 'updatePlayer', rsn);
                await setLastFetchedTime(playerId);
            } else {
                logger.info(`📌 Fetching details for ${rsn} on WOM API...`);
                playerData = await WOMApiClient.request('players', 'getPlayerDetails', rsn);
            }
        } else {
            logger.info(`🔄 First-time update for ${rsn} on WOM API...`);
            playerData = await WOMApiClient.request('players', 'updatePlayer', rsn);
            await setLastFetchedTime(playerId);
        }
        if (!playerData) {
            logger.warn(`⚠️ No data returned for ${rsn}. Skipping.`);
            return [];
        }
        const rows = transformPlayerData(playerData);
        return buildUpsertQueries(playerId, rsn, rows);
    } catch (err) {
        logger.error(`❌ Error processing player ${rsn}: ${err.message}`);
        return [];
    }
}

/**
 * Load registered players from the database.
 * @returns {Promise<Object>}
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
 * Fetch and save data for all registered players.
 * This function collects up all DB queries from processing each player,
 * then writes them in a single batch transaction.
 */
async function fetchAndSaveRegisteredPlayerData() {
    logger.info('🔄 Starting fetch for registered player data...');
    try {
        const registeredPlayers = await loadRegisteredRsnData();
        const playerEntries = Object.entries(registeredPlayers);
        logger.info(`📊 Loaded ${playerEntries.length} registered players.`);
        if (playerEntries.length === 0) {
            logger.warn('⚠️ No registered players found. Aborting data fetch.');
            return { fetchFailed: false };
        }
        const limit = pLimit(2); // Limit concurrent API calls to
        const allQueries = [];
        await Promise.all(
            playerEntries.map(([playerId, { rsn }]) =>
                limit(() =>
                    processPlayer(playerId, rsn).then((queries) => {
                        if (queries.length > 0) {
                            allQueries.push(...queries);
                        }
                    }),
                ),
            ),
        );
        if (allQueries.length > 0) {
            logger.info(`📝 Batch writing ${allQueries.length} upsert queries to the database...`);
            await runTransaction(allQueries);
        }
        return { fetchFailed: false };
    } catch (error) {
        logger.error(`❌ Error during fetch and save operation: ${error.message}`);
        return { fetchFailed: true };
    }
}

/**
 * Standalone function to save player data to the database.
 * This is provided for use by other functions that require individual data writes.
 * It transforms the provided rawData and writes it in a batch transaction.
 * @param {string} playerName
 * @param {object} rawData
 */
async function savePlayerDataToDb(playerName, rawData) {
    await ensurePlayerDataTable();
    const cleanedPlayerName = playerName.toLowerCase().trim();
    const playerResult = await getAll('SELECT player_id, rsn FROM registered_rsn WHERE LOWER(rsn) = ? LIMIT 1', [cleanedPlayerName]);
    if (playerResult.length === 0) {
        logger.warn(`❌ No player_id found for ${playerName}. Skipping save.`);
        return;
    }
    const { player_id, rsn } = playerResult[0];
    const rows = transformPlayerData(rawData);
    if (rows.length === 0) return;
    const queries = buildUpsertQueries(player_id, rsn, rows);
    try {
        await runTransaction(queries);
        logger.info(`✅ Upserted data for ${playerName} (player_id: ${player_id}, rsn: ${rsn})`);
    } catch (error) {
        logger.error(`❌ Failed to save player data for ${playerName}: ${error.message}`);
    }
}

/**
 * Remove data for players not in the current registered list.
 * @param {Set} currentClanUsers - Set of current player IDs.
 */
async function removeNonMatchingPlayers(currentClanUsers) {
    const allPlayers = await getAll('SELECT DISTINCT player_id FROM player_data');
    for (const { player_id } of allPlayers) {
        if (!currentClanUsers.has(player_id)) {
            await runQuery('DELETE FROM player_data WHERE player_id = ?', [player_id]);
            logger.info(`🗑️ Removed data from DB for player_id: ${player_id}`);
        }
    }
}

/**
 * Main function to fetch and update player data.
 * Ensures tables exist, fetches player data in batch, cleans up old records,
 * and updates event baselines.
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
    await updateEventBaseline();
    logger.info('✅ Player data update process completed.');
}

module.exports = {
    fetchAndUpdatePlayerData,
    fetchAndSaveRegisteredPlayerData,
    savePlayerDataToDb,
};
