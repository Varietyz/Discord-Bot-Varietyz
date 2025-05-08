const WOMApiClient = require('../../api/wise_old_man/apiClient');
const { EmbedBuilder } = require('discord.js');
const logger = require('../utils/essentials/logger');
const { globalHistoricalRenameFromRecentChanges } = require('../utils/essentials/forceDbNameChange');
const db = require('../utils/essentials/dbUtils');
const {
    messages: { getAll: getAllMessages, runQuery: runMessagesQuery },
} = require('../utils/essentials/dbUtils');

async function fetchNameChanges() {
    try {
        const response = await WOMApiClient.request('groups', 'getGroupNameChanges', WOMApiClient.groupId);
        return response
            .filter((change) => change.status === 'approved')
            .map((change) => ({
                player_id: change.playerId,
                oldRsn: change.oldName,
                newRsn: change.newName,
                resolvedAt: change.resolvedAt,
            }));
    } catch (error) {
        logger.error(`❌ [fetchNameChanges] Error: ${error.message}`);
        return [];
    }
}

async function appendNameChangesToDb(nameChanges) {
    if (!nameChanges || !nameChanges.length) return;
    await db.runQuery(`
        DROP TABLE IF EXISTS recent_name_changes
        `);
    await db.runQuery(`
        CREATE TABLE recent_name_changes (
  idx INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL,
  old_rsn TEXT NOT NULL,
  new_rsn TEXT NOT NULL,
  resolved_at INTEGER NOT NULL
);
 `);
    logger.info('🔄 Refreshed recent_name_changes & collecting data..');
    const insertSQL = `
    INSERT OR IGNORE INTO recent_name_changes (player_id, old_rsn, new_rsn, resolved_at)
    VALUES (?, ?, ?, ?)
  `;
    try {
        let insertedCount = 0;
        for (const { player_id, oldRsn, newRsn, resolvedAt } of nameChanges) {
            const result = await db.runQuery(insertSQL, [player_id, oldRsn, newRsn, resolvedAt]);
            if (result.changes === 1) {
                insertedCount++;
            }
        }
        logger.info(`✅ [appendNameChangesToDb] Inserted ${insertedCount} new name changes (out of ${nameChanges.length}).`);
    } catch (err) {
        logger.error(`❌ [appendNameChangesToDb] Failed: ${err.message}`);
    }
}

async function getFinalNamesMap() {
    const rows = await db.getAll(`
    SELECT player_id, old_rsn, new_rsn, resolved_at
    FROM recent_name_changes
  `);
    const latestByPlayer = {};
    for (const row of rows) {
        const { player_id, new_rsn, resolved_at } = row;
        if (!latestByPlayer[player_id] || resolved_at > latestByPlayer[player_id].resolvedAt) {
            latestByPlayer[player_id] = {
                finalRsn: new_rsn,
                resolvedAt: resolved_at,
            };
        }
    }
    return latestByPlayer;
}

async function getUserNamesHistory(username) {
    try {
        const nameChanges = await WOMApiClient.players.getPlayerNames(username);
        return nameChanges;
    } catch (err) {
        logger.warn(`⚠️ [getUserNamesHistory] Could not fetch names for '${username}': ${err.message}`);
        return [];
    }
}

async function userHasRsnInHistory(knownRsn, finalRsn) {
    const history = await getUserNamesHistory(knownRsn);
    if (!history || !history.length) return false;

    const finalLower = finalRsn.toLowerCase();
    for (const entry of history) {
        if (entry.oldName.toLowerCase() === finalLower || entry.newName.toLowerCase() === finalLower) {
            return true;
        }
    }
    return false;
}

async function resolveConflictByNameHistory(requestingPlayerId, oldRsn, finalRsn) {
    const conflict = await db.getOne(
        `
    SELECT player_id, rsn 
    FROM registered_rsn
    WHERE LOWER(rsn) = LOWER(?)
      AND player_id != ?
  `,
        [finalRsn, requestingPlayerId],
    );

    if (!conflict) {
        return true;
    }
    logger.warn(`⚠️ Conflict: RSN '${finalRsn}' used by player #${conflict.player_id}. Checking WOM name history...`);
    const userOwnsName = await userHasRsnInHistory(oldRsn, finalRsn);
    if (userOwnsName) {
        await db.runQuery('DELETE FROM registered_rsn WHERE player_id = ?', [conflict.player_id]);
        logger.info(`✅ Freed up RSN '${finalRsn}' from #${conflict.player_id} in favor of #${requestingPlayerId}.`);
        return true;
    } else {
        logger.warn(`🚫 [resolveConflictByNameHistory] Blocking rename for #${requestingPlayerId}. They have no WOM record of '${finalRsn}'.`);
        return false;
    }
}

async function updateAllRegisteredRSNs(finalNamesMap, channelManager) {
    const changedRecords = [];
    const registeredRows = await db.getAll(`
    SELECT player_id, discord_id, rsn
    FROM registered_rsn
  `);
    const registeredMap = new Map();
    for (const row of registeredRows) {
        registeredMap.set(row.player_id, row);
    }
    for (const [pidStr, { finalRsn }] of Object.entries(finalNamesMap)) {
        const playerId = parseInt(pidStr, 10);
        const record = registeredMap.get(playerId);
        if (!record) continue;
        const { discord_id, rsn: oldRsn } = record;
        if (oldRsn.toLowerCase() === finalRsn.toLowerCase()) {
            continue;
        }
        const canRename = await resolveConflictByNameHistory(playerId, oldRsn, finalRsn);
        if (!canRename) {
            continue;
        }
        await db.runQuery('UPDATE registered_rsn SET rsn = ? WHERE player_id = ?', [finalRsn, playerId]);
        logger.info(`✅ Updated #${playerId} RSN: '${oldRsn}' → '${finalRsn}'`);
        changedRecords.push({ discord_id, oldRsn, newRsn: finalRsn });
    }
    if (channelManager && changedRecords.length) {
        const row = await db.guild.getOne('SELECT channel_id FROM ensured_channels WHERE channel_key = ?', ['name_change_channel']);
        if (!row) {
            logger.info('⚠️ No channel_id is configured in ensured_channels for name_change_channel.');
            return;
        }
        const channelId = row.channel_id;
        const channel = await channelManager.fetch(channelId).catch(() => null);
        if (channel) {
            for (const { discord_id, oldRsn, newRsn } of changedRecords) {
                const embed = new EmbedBuilder()
                    .setTitle('🔄 RSN Name Change')
                    .setColor(0x3498db)
                    .setTimestamp()
                    .setDescription('Your RSN has been updated:\n' + `📛 **Old Name:** \`${oldRsn}\`\n` + `🔗 **New Name:** \`${newRsn}\``);
                await channel.send({ content: `<@${discord_id}>`, embeds: [embed] });
            }
        }
    }
    return changedRecords;
}

async function updateNamesInMessagesDB(changedRecords) {
    if (!changedRecords.length) return;
    const tables = await getAllMessages('SELECT name FROM sqlite_master WHERE type=\'table\'');
    if (!tables.length) return;
    for (const { name: tableName } of tables) {
        const columns = await getAllMessages(`PRAGMA table_info(${tableName})`);
        if (!columns) continue;
        const userCol = columns.find((c) => c.name.toLowerCase() === 'rsn');
        if (!userCol) continue;
        for (const { oldRsn, newRsn } of changedRecords) {
            const sql = `UPDATE ${tableName} SET rsn = ? WHERE LOWER(rsn) = LOWER(?)`;
            const result = await runMessagesQuery(sql, [newRsn, oldRsn]);
            if (result.changes > 0) {
                logger.info(`✅ [updateNamesInMessagesDB] Table '${tableName}': replaced '${oldRsn}' -> '${newRsn}' in ${result.changes} row(s).`);
            }
        }
    }
}

async function updateNamesInMainDB(changedRecords) {
    if (!changedRecords.length) return;
    const excludeTables = ['recent_name_changes', 'skills_bosses'];
    const tables = await db.getAll('SELECT name FROM sqlite_master WHERE type=\'table\'');
    if (!tables.length) return;
    for (const { name: tableName } of tables) {
        if (excludeTables.includes(tableName)) continue;
        const columns = await db.getAll(`PRAGMA table_info(${tableName})`);
        if (!columns) continue;
        const rsnCol = columns.find((c) => c.name.toLowerCase() === 'rsn');
        if (!rsnCol) continue;
        for (const { oldRsn, newRsn } of changedRecords) {
            const sql = `UPDATE ${tableName} SET rsn = ? WHERE LOWER(rsn) = LOWER(?)`;
            const result = await db.runQuery(sql, [newRsn, oldRsn]);
            if (result.changes > 0) {
                logger.info(`✅ [updateNamesInMainDB] '${tableName}': replaced '${oldRsn}' -> '${newRsn}' in ${result.changes} row(s).`);
            }
        }
    }
}

async function updateReferencesEverywhere(changedRecords) {
    if (!changedRecords.length) return;
    try {
        await updateNamesInMessagesDB(changedRecords);
        await updateNamesInMainDB(changedRecords);
        logger.info(`🎉 [updateReferencesEverywhere] Finished updates for ${changedRecords.length} name(s).`);
    } catch (err) {
        logger.error(`❌ [updateReferencesEverywhere] Error: ${err.message}`);
    }
}

async function processNameChanges(client) {
    const nameChanges = await fetchNameChanges();
    if (!nameChanges.length) {
        logger.info('⏳ [processNameChanges] No new name changes found.');
        return;
    }
    await appendNameChangesToDb(nameChanges);
    const finalMap = await getFinalNamesMap();
    if (!Object.keys(finalMap).length) {
        logger.info('⏳ [processNameChanges] No final RSNs computed. Skipping.');
        return;
    }
    await globalHistoricalRenameFromRecentChanges();
    const changedRecords = await updateAllRegisteredRSNs(finalMap, client?.channels);
    const pairs = changedRecords.map(({ oldRsn, newRsn }) => ({ oldRsn, newRsn }));
    await updateReferencesEverywhere(pairs);
    if (changedRecords.length) {
        await updateReferencesEverywhere(pairs);
    } else {
        logger.info('⏳ [processNameChanges] No new RSNs actually changed in the registry.');
    }
}
module.exports = {
    processNameChanges,
};
