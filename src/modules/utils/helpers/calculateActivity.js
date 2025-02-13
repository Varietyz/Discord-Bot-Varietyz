/**
 * @fileoverview
 * **Player Activity Data Utilities** ⏱️
 *
 * This module provides functions for managing player activity data in the Varietyz Bot's SQLite database.
 * It ensures the existence of the `active_inactive` table and calculates the number of active and inactive players
 * based on their last recorded progress.
 *
 * **Key Features:**
 * - **Table Management**: Ensures the `active_inactive` table exists, which stores player usernames and their last progress timestamp.
 * - **Active Player Count**: Calculates the number of players who have progressed in the last 7 days.
 * - **Inactive Player Count**: Calculates the number of players who have not progressed in the last 21 days.
 *
 * **External Dependencies:**
 * - **luxon**: For handling date and time operations (e.g., calculating 7-day and 21-day intervals).
 * - **dbUtils**: For executing SQL queries to interact with the SQLite database.
 *
 * @module utils/calculateActivity
 */

const { DateTime } = require('luxon');
const { getAll } = require('../essentials/dbUtils');

/**
 * 🎯 **Calculates the Number of Active Players**
 *
 * Counts players in the `active_inactive` table whose `last_progressed` timestamp is within the past 7 days.
 *
 * @async
 * @function calculateProgressCount
 * @returns {Promise<number>} The count of active players.
 *
 * @example
 * // Retrieve and log the number of active players.
 * const activeCount = await calculateProgressCount();
 * console.log(`Active players: ${activeCount}`);
 */
async function calculateProgressCount() {
    const daysAgo = DateTime.now().minus({ days: 7 }).toISO();
    const result = await getAll('SELECT COUNT(*) AS activeCount FROM active_inactive WHERE last_progressed >= ?', [daysAgo]);
    return result[0]?.activeCount || 0;
}

/**
 * 🎯 **Calculates the Number of Inactive Players**
 *
 * Counts players in the `active_inactive` table whose `last_progressed` timestamp is older than 21 days.
 *
 * @async
 * @function calculateInactivity
 * @returns {Promise<number>} The count of inactive players.
 *
 * @example
 * // Retrieve and log the number of inactive players.
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
};
