/**
 * @fileoverview Utility functions for managing player fetch times in a SQLite database.
 * Provides functions for ensuring the existence of the `player_fetch_times` table, retrieving the last fetch time,
 * and updating the fetch timestamp for a specific player's RuneScape Name (RSN).
 *
 * Key Features:
 * - **Table Management**: Ensures the `player_fetch_times` table exists with a specific schema for tracking player fetch times.
 * - **Fetch Time Retrieval**: Retrieves the last fetch timestamp for a given player, returning `null` if not found.
 * - **Fetch Time Update**: Updates or inserts the fetch timestamp for a player, ensuring the table remains up-to-date.
 *
 * External Dependencies:
 * - **dbUtils**: For executing database queries and interacting with the SQLite database.
 *
 * @module utils/lastFetchedTime
 */

const { getAll, runQuery } = require('./dbUtils');

/**
 * Ensures the `player_fetch_times` table exists in the SQLite database.
 *
 * If the table does not exist, this function creates it with the following schema:
 * - `rsn` (TEXT): Primary key representing the RuneScape Name (RSN) of the player.
 * - `last_fetched_at` (DATETIME): The timestamp of the last fetch, defaulting to the current time.
 *
 * @async
 * @function ensurePlayerFetchTimesTable
 * @returns {Promise<void>} Resolves when the table is ensured to exist.
 * @example
 * // Ensure the table exists before using fetch time functions
 * await ensurePlayerFetchTimesTable();
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
 * This function queries the `player_fetch_times` table for the last fetched time of the specified player.
 * If the player does not exist in the table, it returns `null`.
 *
 * @async
 * @function getLastFetchedTime
 * @param {string} rsn - The RuneScape Name (RSN) of the player.
 * @returns {Promise<Date|null>} A `Date` object representing the last fetched time, or `null` if not found.
 * @example
 * // Retrieve the last fetched timestamp for a player
 * const lastFetched = await getLastFetchedTime('playerone');
 * console.log(lastFetched); // Outputs: Date object or null
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
 * This function inserts or updates the `player_fetch_times` table with the current timestamp for the specified player.
 * If the player already exists in the table, their `last_fetched_at` value is updated.
 *
 * @async
 * @function setLastFetchedTime
 * @param {string} rsn - The RuneScape Name (RSN) of the player.
 * @returns {Promise<void>} Resolves when the timestamp is successfully updated.
 * @example
 * // Update the last fetched timestamp for a player
 * await setLastFetchedTime('playerone');
 */
async function setLastFetchedTime(rsn) {
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

module.exports = {
    setLastFetchedTime,
    getLastFetchedTime,
    ensurePlayerFetchTimesTable,
};
