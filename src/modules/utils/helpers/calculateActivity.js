const { DateTime } = require('luxon');
const { getAll } = require('../essentials/dbUtils');
async function calculateProgressCount() {
    const daysAgo = DateTime.now().minus({ days: 7 }).toISO();
    const result = await getAll('SELECT COUNT(*) AS activeCount FROM active_inactive WHERE last_progressed >= ?', [daysAgo]);
    return result[0]?.activeCount || 0;
}
async function calculateInactivity() {
    const daysAgo = DateTime.now().minus({ days: 21 }).toISO();
    const result = await getAll('SELECT COUNT(*) AS inactiveCount FROM active_inactive WHERE last_progressed < ?', [daysAgo]);
    return result[0]?.inactiveCount || 0;
}
module.exports = {
    calculateInactivity,
    calculateProgressCount,
};