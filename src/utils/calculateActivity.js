const { DateTime } = require('luxon');
const { getAll, runQuery } = require('./dbUtils');

/**
 * Ensures the 'active_inactive' table exists in the SQLite database.
 * If the table does not exist, it creates one with the specified schema.
 *
 * @async
 * @function ensureActiveInactiveTable
 * @returns {Promise<void>} Resolves when the table has been ensured to exist.
 * @example
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
 * @async
 * @function calculateProgressCount
 * @returns {Promise<number>} - The count of active players.
 * @example
 * const activeCount = await calculateProgressCount();
 */
async function calculateProgressCount() {
    const daysAgo = DateTime.now().minus({ days: 7 }).toISO();
    const result = await getAll(
        'SELECT COUNT(*) AS activeCount FROM active_inactive WHERE last_progressed >= ?',
        [daysAgo]
    );
    return result[0]?.activeCount || 0;
}

/**
 * Calculates the number of inactive players who have not progressed in the last 21 days.
 *
 * @async
 * @function calculateInactivity
 * @returns {Promise<number>} - The count of inactive players.
 * @example
 * const inactiveCount = await calculateInactivity();
 */
async function calculateInactivity() {
    const daysAgo = DateTime.now().minus({ days: 21 }).toISO();
    const result = await getAll(
        'SELECT COUNT(*) AS inactiveCount FROM active_inactive WHERE last_progressed < ?',
        [daysAgo]
    );
    return result[0]?.inactiveCount || 0;
}

module.exports = {
    calculateInactivity,
    calculateProgressCount,
    ensureActiveInactiveTable
};
