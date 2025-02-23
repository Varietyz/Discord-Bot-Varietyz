const WOMApiClient = require('../../api/wise_old_man/apiClient');
const logger = require('../utils/essentials/logger');
const { runQuery, getAll } = require('../utils/essentials/dbUtils');
const { sleep } = require('../utils/helpers/sleepUtil');
const { setLastFetchedTime, getLastFetchedTime, ensurePlayerFetchTimesTable } = require('../utils/fetchers/lastFetchedTime');
function normalize(str) {
    return String(str).toLowerCase().replace(/\s+/g, '_');
}
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
function transformPlayerData(rawData) {
    const rows = [];
    const rsn = normalize(rawData.username);
    const last_updated = new Date(rawData.updatedAt).toISOString();
    const last_changed = new Date(rawData.lastChangedAt).toISOString();
    const player_id = rawData.latestSnapshot?.playerId;
    if (!player_id) {
        logger.warn('No player_id found in latestSnapshot');
        return rows;
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
        await runQuery(upsertQuery, [player_id, rsn, row.type, row.metric, row.kills, row.score, row.level, row.exp, row.last_changed, row.last_updated]);
    }
    logger.info(`✅ Upserted data for ${playerName} (player_id: ${player_id}, rsn: ${rsn})`);
}
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
            logger.info(`🔍 Processing player: ${rsn} (player_id: ${playerId})`);
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
async function removeNonMatchingPlayers(currentClanUsers) {
    const allPlayers = await getAll('SELECT DISTINCT player_id FROM player_data');
    for (const { player_id } of allPlayers) {
        if (!currentClanUsers.has(player_id)) {
            await runQuery('DELETE FROM player_data WHERE player_id = ?', [player_id]);
            logger.info(`🗑️ Removed data from DB for player_id: ${player_id}`);
        }
    }
}
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