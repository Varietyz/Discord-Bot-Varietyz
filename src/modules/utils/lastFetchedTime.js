/**
 * @fileoverview
 * **Player Fetch Times Utilities** ⏰
 *
 * This module provides utility functions for managing player fetch times in the Varietyz Bot's SQLite database.
 * It ensures the existence of the `player_fetch_times` table, retrieves the last fetch time for a player,
 * and updates the fetch timestamp when player data is refreshed.
 *
 * **Key Features:**
 * - **Table Management**: Ensures the `player_fetch_times` table exists with the appropriate schema.
 * - **Fetch Time Retrieval**: Retrieves the last fetch timestamp for a specified RuneScape Name (player_id), returning `null` if not found.
 * - **Fetch Time Update**: Inserts or updates the fetch timestamp for a player.
 * - **Table Reset**: Provides a function to drop the `player_fetch_times` table, if necessary.
 *
 * **External Dependencies:**
 * - **dbUtils**: For executing SQL queries and interacting with the SQLite database.
 *
 * @module utils/lastFetchedTime
 */

const { getAll, runQuery } = require('./dbUtils');

/**
 * 🎯 **Ensures the Player Fetch Times Table Exists**
 *
 * Checks if the `player_fetch_times` table exists in the SQLite database and creates it if not.
 * The table schema includes:
 * - `player_id` (TEXT): The player's RuneScape Name (player_id), serving as the primary key.
 * - `last_fetched_at` (DATETIME): The timestamp of the last data fetch, defaulting to the current time.
 *
 * @async
 * @function ensurePlayerFetchTimesTable
 * @returns {Promise<void>} Resolves when the table exists.
 *
 * @example
 * // Ensure the fetch times table exists before fetching player data.
 * await ensurePlayerFetchTimesTable();
 */
async function ensurePlayerFetchTimesTable() {
    await runQuery(`
        CREATE TABLE IF NOT EXISTS player_fetch_times (
            player_id INTEGER PRIMARY KEY,
                last_fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
}

/**
 * 🎯 **Retrieves the Last Fetched Timestamp for a Player**
 *
 * Queries the `player_fetch_times` table for the last fetch timestamp associated with the specified player_id.
 * If the player_id is found, returns a Date object representing the timestamp; otherwise, returns `null`.
 *
 * @async
 * @function getLastFetchedTime
 * @param {string} player_id - The RuneScape player_id (WOM) of the player.
 * @returns {Promise<Date|null>} A promise that resolves to the last fetched time as a Date object, or `null` if not found.
 *
 * @example
 * // Retrieve the last fetch time for a player.
 * const lastFetched = await getLastFetchedTime('playerone');
 * console.log(lastFetched); // Outputs a Date object or null.
 */
async function getLastFetchedTime(player_id) {
    const query = 'SELECT last_fetched_at FROM player_fetch_times WHERE player_id = ?';
    const rows = await getAll(query, [player_id]);
    if (rows.length > 0) {
        return new Date(rows[0].last_fetched_at);
    }
    return null;
}

/**
 * 🎯 **Resets the Player Fetch Times Table**
 *
 * Drops the `player_fetch_times` table from the SQLite database if it exists.
 * This can be used for cleanup or to force a rebuild of the table.
 *
 * @async
 * @function resetPlayerFetchTimesTable
 * @returns {Promise<void>} Resolves when the table is dropped.
 *
 * @example
 * // Reset the fetch times table.
 * await resetPlayerFetchTimesTable();
 */
async function resetPlayerFetchTimesTable() {
    await runQuery(`
        DROP TABLE IF EXISTS player_fetch_times
    `);
}

/**
 * 🎯 **Updates the Last Fetched Timestamp for a Player**
 *
 * Inserts a new record or updates the existing record in the `player_fetch_times` table with the current timestamp
 * for the specified RuneScape Name (player_id). This function ensures that the database reflects the latest data fetch time.
 *
 * @async
 * @function setLastFetchedTime
 * @param {string} player_id - The RuneScape Name (player_id) of the player.
 * @returns {Promise<void>} Resolves when the timestamp is updated.
 *
 * @example
 * // Update the last fetched timestamp for a player.
 * await setLastFetchedTime('playerone');
 */
async function setLastFetchedTime(player_id) {
    const now = new Date().toISOString();
    await runQuery(
        `
        INSERT INTO player_fetch_times (player_id, last_fetched_at)
        VALUES (?, ?)
        ON CONFLICT(player_id) DO UPDATE SET last_fetched_at = excluded.last_fetched_at
    `,
        [player_id, now],
    );
}

module.exports = {
    setLastFetchedTime,
    getLastFetchedTime,
    ensurePlayerFetchTimesTable,
    resetPlayerFetchTimesTable,
};
