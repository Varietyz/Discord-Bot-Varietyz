const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { DateTime } = require("luxon");
const { WOM_API_URL } = require("../../config/constants");
const logger = require("./logger");
const { runQuery, getAll } = require("../../utils/dbUtils");

/**
 * Sleep helper for rate limiting.
 */
async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Flatten the data to convert nested structures into simple key-value pairs,
 * then filter out undesired fields, rename them, etc.
 * This exactly replicates your old 'formatDataForCsv' but returns an object
 * for DB insertion rather than CSV lines.
 */
function formatDataForSql(data) {
  // 1. Flatten all nested objects
  function flattenDict(d, parentKey = "", sep = "_") {
    let items = {};
    for (const [k, v] of Object.entries(d)) {
      const newKey = parentKey ? `${parentKey}${sep}${k}` : k;
      if (typeof v === "object" && v !== null) {
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
    "id",
    "username",
    "country",
    "patron",
    "exp",
    "ehp",
    "ehb",
    "ttm",
    "tt200m",
    "updatedAt",
    "lastChangedAt",
    "lastImportedAt",
    "latestSnapshot_id",
    "latestSnapshot_playerId",
    "latestSnapshot_createdAt",
    "latestSnapshot_importedAt",
    "archive",
  ];
  const excludeSubstrings = ["experience", "rank", "ehp", "ehb", "metric"];

  // 3. Rename & filter
  const formattedData = {};
  for (const [key, value] of Object.entries(flattenedData)) {
    if (
      excludeAttributes.includes(key) ||
      excludeSubstrings.some((sub) => key.includes(sub))
    ) {
      continue;
    }

    // Skip -1 sentinel
    if (value === -1) {
      continue;
    }

    // Rename from e.g. "latestSnapshot_data_skills_attack_level" => "Latestsnapshot Data Skills Attack Level"
    // Then we do .replace(/_/g, " ") => "Latestsnapshot Data Skills Attack Level"
    // Then uppercase each word => "Latestsnapshot Data Skills Attack Level"
    let formattedKey = key
      .replace("latestSnapshot_data_", "")
      .replace("_metric", "")
      .replace(/_/g, " ") // underscores => spaces
      .replace(/\b\w/g, (char) => char.toUpperCase()); // uppercase each word

    formattedData[formattedKey] = value;
  }

  return formattedData;
}

/**
 * Creates the 'player_data' table if it doesn't exist, with the schema:
 *   (id, player_id, data_key, data_value, last_updated)
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
 * Overwrites (deletes old rows) for a given player, then inserts the new flattened data.
 */
async function savePlayerDataToDb(playerName, rawData) {
  // 1) Ensure table
  await ensurePlayerDataTable();

  // 2) Flatten & filter
  const formattedData = formatDataForSql(rawData);

  // 3) Delete old data for this player
  const playerId = playerName.toLowerCase().trim();
  await runQuery(`DELETE FROM player_data WHERE player_id = ?`, [playerId]);

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
 * Centralized request handler with retry logic (same logic as before).
 */
async function fetchWithRetry(url, headers, retries = 10, delay = 10000) {
  let attempt = 0;
  while (attempt < retries) {
    try {
      const response = await axios.get(url, { headers });
      return response.data; // Return data on success
    } catch (error) {
      if (error.response && error.response.status === 429) {
        const retryAfter =
          error.response.headers["retry-after"] || delay / 1000;
        logger.warn(
          `Rate-limited. Retrying in ${retryAfter}s (URL: ${url})...`,
        );
        await sleep(retryAfter * 1000);
      } else if (error.response && error.response.status === 404) {
        logger.error(`Player not found (404) for URL: ${url}`);
        throw new Error("404: Player not found");
      } else {
        logger.error(`Request failed for URL ${url}: ${error.message}`);
        throw error;
      }
    }
    attempt++;
  }
  logger.error(`Max retries reached for URL: ${url}`);
  throw new Error("Max retries reached");
}

/**
 * Fetches all registered RSNs from the database.
 *
 * @returns {Promise<Object>} - Returns a mapping of user IDs to their RSNs.
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
 * Main function to fetch data for each RSN in registered_rsn,
 * flatten it, and store in 'player_data'.
 */
async function fetchAndSaveRegisteredPlayerData() {
  const headers = { "Content-Type": "application/json" };
  logger.info("Starting fetch for registered player data...");

  try {
    // Fetch registered RSNs from the database
    const registeredRsnData = await loadRegisteredRsnData();
    logger.info("Loaded registered RSNs from database:", registeredRsnData);

    // Flatten the RSN map { user1: [rsn1, rsn2], user2: [rsn3] } => [rsn1, rsn2, rsn3]
    const playerIds = Object.values(registeredRsnData).flat();
    logger.info(`Found ${playerIds.length} RSNs to process:`, playerIds);

    if (playerIds.length === 0) {
      logger.warn("No RSNs found. Aborting data fetch.");
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

    logger.info(
      `Successfully processed ${validMembersWithData.length} players.`,
    );
    return { data: validMembersWithData, fetchFailed };
  } catch (error) {
    logger.error(`Error during fetch and save operation: ${error.message}`);
    return { data: [], fetchFailed: true };
  }
}

/**
 * Removes old players from 'player_data' who are not in the current set.
 * If you don't want this logic, remove it.
 */
async function removeNonMatchingPlayers(currentClanUsers) {
  // gather all distinct player_ids in 'player_data'
  const allPlayers = await getAll("SELECT DISTINCT player_id FROM player_data");

  for (const { player_id } of allPlayers) {
    if (!currentClanUsers.has(player_id)) {
      await runQuery("DELETE FROM player_data WHERE player_id = ?", [
        player_id,
      ]);
      logger.info(`Removed data from DB for player: ${player_id}`);
    }
  }
}

/**
 * Orchestrates the entire update:
 *  - fetch from WOM for each RSN
 *  - store in DB
 *  - remove leftover data if desired
 */
async function fetchAndUpdatePlayerData() {
  logger.info("Starting player data update process.");

  const { data: clanData, fetchFailed } =
    await fetchAndSaveRegisteredPlayerData();

  if (fetchFailed) {
    logger.warn("Errors occurred during player data fetch. Cleanup skipped.");
    return;
  }

  if (clanData) {
    const currentClanUsers = new Set(
      clanData.map((member) => member.username.toLowerCase()),
    );
    logger.info("Retrieved current RSN list.");

    // Optional: remove DB data for non-registered RSNs
    await removeNonMatchingPlayers(currentClanUsers);
  } else {
    logger.warn("No data fetched, update process aborted.");
  }

  logger.info("Player data update process completed.");
}

module.exports = {
  fetchAndUpdatePlayerData,
  fetchAndSaveRegisteredPlayerData,
  savePlayerDataToDb, // if needed by other modules
};
