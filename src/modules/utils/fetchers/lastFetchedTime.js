const { getAll, runQuery } = require('../essentials/dbUtils');

async function ensurePlayerFetchTimesTable() {
    await runQuery(`
        CREATE TABLE IF NOT EXISTS player_fetch_times (
            player_id INTEGER PRIMARY KEY,
                last_fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
}

async function getLastFetchedTime(player_id) {
    const query = 'SELECT last_fetched_at FROM player_fetch_times WHERE player_id = ?';
    const rows = await getAll(query, [player_id]);
    if (rows.length > 0) {
        return new Date(rows[0].last_fetched_at);
    }
    return null;
}

async function resetPlayerFetchTimesTable() {
    await runQuery(`
        DROP TABLE IF EXISTS player_fetch_times
    `);
}

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
