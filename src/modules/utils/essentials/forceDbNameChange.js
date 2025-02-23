const logger = require('./logger');
const { getAll } = require('./dbUtils');
const {
    messages: { getAll: getAllMessages, runQuery: runMessagesQuery },
} = require('./dbUtils');
async function buildPlayerNameMappings() {
    const rows = await getAll(`
    SELECT player_id, old_rsn, new_rsn, resolved_at
    FROM recent_name_changes
  `);
    const latestByPlayer = {};
    for (const row of rows) {
        const pid = row.player_id;
        if (!latestByPlayer[pid]) {
            latestByPlayer[pid] = {
                finalRsn: row.new_rsn,
                resolvedAt: row.resolved_at,
                oldNames: new Set(),
            };
        }
        latestByPlayer[pid].oldNames.add(row.old_rsn);
        if (row.resolved_at > latestByPlayer[pid].resolvedAt) {
            latestByPlayer[pid].finalRsn = row.new_rsn;
            latestByPlayer[pid].resolvedAt = row.resolved_at;
        }
    }
    return latestByPlayer;
}
async function buildGlobalRsnMap() {
    const playerMap = await buildPlayerNameMappings();
    const globalMap = new Map();
    for (const info of Object.values(playerMap)) {
        for (const old of info.oldNames) {
            globalMap.set(old.toLowerCase(), info.finalRsn);
        }
    }
    return globalMap;
}
async function globalHistoricalRenameFromRecentChanges() {
    try {
        const globalMap = await buildGlobalRsnMap();
        const tables = await getAllMessages('SELECT name FROM sqlite_master WHERE type=\'table\'');
        if (!tables.length) {
            logger.info('⚠️ **GlobalRename:** No tables found in `messages.db`.');
            return;
        }
        for (const { name: tableName } of tables) {
            const columns = await getAllMessages(`PRAGMA table_info(${tableName})`);
            if (!columns?.length) continue;
            const rsnCol = columns.find((c) => c.name.toLowerCase() === 'rsn');
            if (!rsnCol) continue;
            for (const [oldLower, finalRsn] of globalMap.entries()) {
                const sql = `
          UPDATE ${tableName}
          SET rsn = ?
          WHERE LOWER(rsn) = ?
        `;
                const result = await runMessagesQuery(sql, [finalRsn, oldLower]);
                if (result.changes > 0) {
                    logger.info(`✅ **GlobalRename:** Table \`${tableName}\`: replaced \`${oldLower}\` -> \`${finalRsn}\` in \`${result.changes}\` row(s).`);
                }
            }
        }
        logger.info('✅ **GlobalRename:** Completed forced update in `messages.db` from recent_name_changes data. 🎉');
    } catch (err) {
        logger.error(`🚨 **GlobalRename Error:** ${err.message} ❌`);
    }
}
module.exports = {
    globalHistoricalRenameFromRecentChanges,
};