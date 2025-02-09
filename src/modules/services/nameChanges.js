/* eslint-disable jsdoc/require-returns */
// @ts-nocheck

/**
 * # Name Changes Service (Optimized with getPlayerNames)
 *
 * This module:
 * 1. Fetches newly "approved" name changes from WOM (by group).
 * 2. Stores them in SQLite.
 * 3. Determines final RSNs.
 * 4. Updates the `registered_rsn` table in one pass, with conflict resolution
 * leveraging WOM's getPlayerNames for ownership checks.
 * 5. Updates references across `database.sqlite` and `messages.db`.
 *
 * Key functions:
 * - processNameChanges(client): main entry point
 * - resolveConflictByNameHistory(playerId, finalRsn): checks if finalRsn is in the user's chain
 */

const WOMApiClient = require('../../api/wise_old_man/apiClient'); // from @wise-old-man/utils or custom
const { EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');
const { NAME_CHANGE_CHANNEL_ID } = require('../../config/constants');
const { globalHistoricalRenameFromRecentChanges } = require('../utils/forceDbNameChange'); // Force messages.db Name Changes

const { getAll, runQuery, getOne } = require('../utils/dbUtils');
const {
    messages: { getAll: getAllMessages, runQuery: runMessagesQuery },
} = require('../utils/dbUtils');

/**
 * ### fetchNameChanges
 * Get all "approved" name changes from WOM's group endpoint.
 * Merges them into an array of:
 * { player_id, oldRsn, newRsn, resolvedAt }
 */
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

/**
 * ### appendNameChangesToDb
 * Appends the new name changes to `recent_name_changes` if they're not already there.
 * @param nameChanges
 */
async function appendNameChangesToDb(nameChanges) {
    if (!nameChanges || !nameChanges.length) return;
    await runQuery(`
        DROP TABLE IF EXISTS recent_name_changes
        `);

    await runQuery(`
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
            const result = await runQuery(insertSQL, [player_id, oldRsn, newRsn, resolvedAt]);
            if (result.changes === 1) {
                insertedCount++;
            }
        }
        logger.info(`✅ [appendNameChangesToDb] Inserted ${insertedCount} new name changes (out of ${nameChanges.length}).`);
    } catch (err) {
        logger.error(`❌ [appendNameChangesToDb] Failed: ${err.message}`);
    }
}

/**
 * ### getFinalNamesMap
 * Returns a mapping:  { [player_id]: { finalRsn, resolvedAt } },
 * picking the row with the largest resolvedAt from recent_name_changes
 */
async function getFinalNamesMap() {
    const rows = await getAll(`
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

/**
 * ### getUserNamesHistory
 * Uses WOM's getPlayerNames to fetch the full name-change history for a given RSN.
 * Returns an array of objects with { oldName, newName, resolvedAt } or empty if not found.
 * @param username
 */
async function getUserNamesHistory(username) {
    try {
        const nameChanges = await WOMApiClient.players.getPlayerNames(username);
        return nameChanges;
    } catch (err) {
        logger.warn(`⚠️ [getUserNamesHistory] Could not fetch names for '${username}': ${err.message}`);
        return [];
    }
}

/**
 * ### userHasRsnInHistory
 * Checks if `finalRsn` is found anywhere in the user's WOM name history (oldName or newName).
 * This indicates the user truly used/owns that name at some point.
 *
 * @param {string} knownRsn - The user's current (or last-known) RSN
 * @param {string} finalRsn - The new RSN they want to claim
 * @returns {Promise<boolean>}
 */
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

/**
 * ### resolveConflictByNameHistory
 * When we detect a conflict, we check if the requesting user truly has "finalRsn" in their
 * official name history from WOM. If yes, we remove/replace the conflict record. If no, we block.
 *
 * @param {number} requestingPlayerId - The local DB "player_id" for the user who wants to rename
 * @param {string} oldRsn - The user’s old RSN (from our DB)
 * @param {string} finalRsn - The new RSN they'd like
 * @returns {Promise<boolean>} - True if conflict is resolved in favor of the requesting user,
 * False if we block the rename.
 */
async function resolveConflictByNameHistory(requestingPlayerId, oldRsn, finalRsn) {
    const conflict = await getOne(
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
        await runQuery('DELETE FROM registered_rsn WHERE player_id = ?', [conflict.player_id]);
        logger.info(`✅ Freed up RSN '${finalRsn}' from #${conflict.player_id} in favor of #${requestingPlayerId}.`);
        return true;
    } else {
        logger.warn(`🚫 [resolveConflictByNameHistory] Blocking rename for #${requestingPlayerId}. They have no WOM record of '${finalRsn}'.`);
        return false;
    }
}

/**
 * ### updateAllRegisteredRSNs
 * 1. For each player's finalRsn, check if it differs from the existing one in `registered_rsn`.
 * 2. If there's a conflict, call `resolveConflictByNameHistory`.
 * 3. If resolved => update the user’s RSN.
 * 4. Collect changedRecords to pass on to the reference updates.
 *
 * @param finalNamesMap
 * @param channelManager
 * @returns {Promise<Array<{ discord_id: string, oldRsn: string, newRsn: string }>>}
 */
async function updateAllRegisteredRSNs(finalNamesMap, channelManager) {
    const changedRecords = [];
    const registeredRows = await getAll(`
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

        await runQuery('UPDATE registered_rsn SET rsn = ? WHERE player_id = ?', [finalRsn, playerId]);
        logger.info(`✅ Updated #${playerId} RSN: '${oldRsn}' → '${finalRsn}'`);
        changedRecords.push({ discord_id, oldRsn, newRsn: finalRsn });
    }

    if (channelManager && changedRecords.length) {
        const channel = await channelManager.fetch(NAME_CHANGE_CHANNEL_ID).catch(() => null);
        if (channel) {
            for (const { discord_id, oldRsn, newRsn } of changedRecords) {
                const embed = new EmbedBuilder()
                    .setTitle('🔄 RSN Name Change')
                    .setColor(0x3498db)
                    .setTimestamp()
                    .setDescription(`<@${discord_id}>\nYour RSN has been updated:\n` + `📛 **Old Name:** \`${oldRsn}\`\n` + `🔗 **New Name:** \`${newRsn}\``);
                await channel.send({ embeds: [embed] });
            }
        }
    }
    return changedRecords;
}

/**
 * ### updateNamesInMessagesDB
 * Single pass to update references in `messages.db` for all changed records.
 * @param changedRecords
 */
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

/**
 * ### updateNamesInMainDB
 * Single pass to update references in `database.sqlite` for all changed records
 * across any table that has a column named "rsn".
 * @param changedRecords
 */
async function updateNamesInMainDB(changedRecords) {
    if (!changedRecords.length) return;

    const excludeTables = ['recent_name_changes', 'skills_bosses'];
    const tables = await getAll('SELECT name FROM sqlite_master WHERE type=\'table\'');
    if (!tables.length) return;

    for (const { name: tableName } of tables) {
        if (excludeTables.includes(tableName)) continue;

        const columns = await getAll(`PRAGMA table_info(${tableName})`);
        if (!columns) continue;

        const rsnCol = columns.find((c) => c.name.toLowerCase() === 'rsn');
        if (!rsnCol) continue;

        for (const { oldRsn, newRsn } of changedRecords) {
            const sql = `UPDATE ${tableName} SET rsn = ? WHERE LOWER(rsn) = LOWER(?)`;
            const result = await runQuery(sql, [newRsn, oldRsn]);
            if (result.changes > 0) {
                logger.info(`✅ [updateNamesInMainDB] '${tableName}': replaced '${oldRsn}' -> '${newRsn}' in ${result.changes} row(s).`);
            }
        }
    }
}

/**
 * ### updateReferencesEverywhere
 * Updates references across both DBs in a single pass for all changed records.
 * @param changedRecords
 */
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

/**
 * ### processNameChanges
 * Main entry point:
 * 1. Fetch new name changes from WOM
 * 2. Store them in `recent_name_changes`
 * 3. Build a final name map
 * 4. Update `registered_rsn` with conflict resolution (using getPlayerNames)
 * 5. Update references in both DBs for all changed RSNs
 * @param client
 */
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

    // DEBUG: Forces Name Changes in the messages.db (old names to new)
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
