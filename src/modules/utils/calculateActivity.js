/**
 * @fileoverview Utility functions for managing player activity data in the Varietyz Bot's SQLite database.
 * This module provides functions for ensuring the existence of the `active_inactive` table, as well as calculating
 * the number of active and inactive players based on their last recorded progress.
 *
 * Key Features:
 * - **Table Management**: Ensures the `active_inactive` table exists, which stores player usernames and their last progress timestamp.
 * - **Active Player Count**: Calculates the number of active players based on their progress within the last 7 days.
 * - **Inactive Player Count**: Calculates the number of inactive players who have not progressed in the last 21 days.
 *
 * External Dependencies:
 * - **luxon**: For handling date and time operations, such as calculating 7-day and 21-day intervals.
 * - **dbUtils**: For executing SQL queries to interact with the database.
 *
 * @module utils/calculateActivity
 */

const { DateTime } = require('luxon');
const { getAll, runQuery } = require('./dbUtils');

/**
 * Ensures the `active_inactive` table exists in the SQLite database.
 *
 * If the table does not exist, this function creates it with the following schema:
 * - `username` (TEXT): The player's username, serving as the primary key.
 * - `last_progressed` (DATETIME): The timestamp of the player's last recorded progress.
 *
 * @async
 * @function ensureActiveInactiveTable
 * @returns {Promise<void>} Resolves when the table has been ensured to exist.
 * @example
 * // Ensure the table exists before performing operations
 * await ensureActiveInactiveTable();
 */
async function ensureActiveInactiveTable() {
    await runQuery(`
        CREATE TABLE IF NOT EXISTS active_inactive (
            username TEXT PRIMARY KEY,
            last_progressed DATETIME
        );
    `);
}

/**
 * Calculates the number of active players who have progressed in the last 7 days.
 *
 * This function queries the `active_inactive` table to count players whose
 * `last_progressed` timestamp is within the past 7 days.
 *
 * @async
 * @function calculateProgressCount
 * @returns {Promise<number>} The count of active players.
 * @example
 * // Get the count of active players
 * const activeCount = await calculateProgressCount();
 * console.log(`Active players: ${activeCount}`);
 */
async function calculateProgressCount() {
    const daysAgo = DateTime.now().minus({ days: 7 }).toISO();
    const result = await getAll('SELECT COUNT(*) AS activeCount FROM active_inactive WHERE last_progressed >= ?', [daysAgo]);
    return result[0]?.activeCount || 0;
}

/**
 * Calculates the number of inactive players who have not progressed in the last 21 days.
 *
 * This function queries the `active_inactive` table to count players whose
 * `last_progressed` timestamp is more than 21 days old.
 *
 * @async
 * @function calculateInactivity
 * @returns {Promise<number>} The count of inactive players.
 * @example
 * // Get the count of inactive players
 * const inactiveCount = await calculateInactivity();
 * console.log(`Inactive players: ${inactiveCount}`);
 */
async function calculateInactivity() {
    const daysAgo = DateTime.now().minus({ days: 21 }).toISO();
    const result = await getAll('SELECT COUNT(*) AS inactiveCount FROM active_inactive WHERE last_progressed < ?', [daysAgo]);
    return result[0]?.inactiveCount || 0;
}

module.exports = {
    calculateInactivity,
    calculateProgressCount,
    ensureActiveInactiveTable,
};
