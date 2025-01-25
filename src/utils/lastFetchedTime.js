const { getAll, runQuery } = require('./dbUtils');

/**
 * Ensures the 'player_fetch_times' table exists in the SQLite database.
 * If the table does not exist, it creates one with the specified schema.
 *
 * @async
 * @function ensurePlayerFetchTimesTable
 * @returns {Promise<void>}
 */
async function ensurePlayerFetchTimesTable() {
    await runQuery(`
        CREATE TABLE IF NOT EXISTS player_fetch_times (
            rsn TEXT PRIMARY KEY,
            last_fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
}

/**
 * Retrieves the last fetched timestamp for a given player.
 *
 * @async
 * @function getLastFetchedTime
 * @param {string} rsn - The unique identifier of the player.
 * @returns {Promise<Date|null>} - The last fetched Date object or null if not found.
 * @example
 * const lastFetched = await getLastFetchedTime('playerone');
 */
async function getLastFetchedTime(rsn) {
    const query = 'SELECT last_fetched_at FROM player_fetch_times WHERE rsn = ?';
    const rows = await getAll(query, [rsn]);
    if (rows.length > 0) {
        return new Date(rows[0].last_fetched_at);
    }
    return null;
}

/**
 * Updates the last fetched timestamp for a given player to the current time.
 *
 * @async
 * @function setLastFetchedTime
 * @param {string} rsn - The RuneScape Name of the player.
 * @returns {Promise<void>}
 * @example
 * await setLastFetchedTime('playerone');
 */
async function setLastFetchedTime(rsn) {
    // Renamed parameter from playerId to rsn for clarity
    const now = new Date().toISOString();
    await runQuery(
        `
        INSERT INTO player_fetch_times (rsn, last_fetched_at)
        VALUES (?, ?)
        ON CONFLICT(rsn) DO UPDATE SET last_fetched_at = excluded.last_fetched_at
    `,
        [rsn, now],
    );
}

module.exports = { setLastFetchedTime, getLastFetchedTime, ensurePlayerFetchTimesTable };
