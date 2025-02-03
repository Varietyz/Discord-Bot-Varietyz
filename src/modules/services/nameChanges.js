// @ts-nocheck
/**
 * @fileoverview
 * **Name Change Processor Utilities** 🔄
 *
 * This module provides utility functions for processing player name changes in the Varietyz Bot.
 * It interacts with the Wise Old Man (WOM) API to fetch recent name changes, updates the databases
 * with the new RSNs, and handles conflict resolution between users. It now extends name changes
 * to all occurrences across multiple databases and tables.
 *
 * **Key Features:**
 * - **Name Change Fetching**: Retrieves recent name changes from the WOM API.
 * - **Database Management**: Saves name change records to the `recent_name_changes` table and updates the `registered_rsn` table.
 * - **Global Update**: Propagates name changes in all applicable tables in both `database.sqlite` and `messages.db`.
 * - In `database.sqlite`: updates columns matching **username**, **name**, **player_id**, or **rsn**
 * (excluding the `recent_name_changes` and `skills_bosses` tables).
 * - In `messages.db`: updates columns named **user**.
 * - **Conflict Resolution**: Handles cases where the new RSN already exists for another user and resolves conflicts.
 * - **Discord Notifications**: Sends messages to a specified channel notifying users of successful updates and conflict resolutions.
 * - **Rate-Limiting and Dependencies**: Ensures rate-limited API requests and processes name changes in the correct order.
 *
 * **External Dependencies:**
 * - **Wise Old Man (WOM) API**: Fetches player name changes.
 * - **Discord.js**: Sends notifications and updates to Discord channels.
 * - **dbUtils**: Manages database operations for the main database (`database.sqlite`).
 * - **messagesDbUtils**: Manages database operations for `messages.db`.
 *
 * @module modules/services/nameChanges
 */

const WOMApiClient = require('../../api/wise_old_man/apiClient');
const logger = require('../utils/logger');
const { EmbedBuilder } = require('discord.js');
const { NAME_CHANGE_CHANNEL_ID } = require('../../config/constants');
const { getAll, runQuery } = require('../utils/dbUtils'); // For main database (database.sqlite)
const {
    messages: { getAll: getAllMessages, runQuery: runMessagesQuery },
} = require('../utils/dbUtils'); // For messages.db

/**
 * Represents a name change record.
 *
 * @typedef {Object} NameChange
 * @property {string} oldName - The original RuneScape Name (RSN) before the change.
 * @property {string} newName - The new RSN after the change.
 * @property {number} resolvedAt - The timestamp when the name change was resolved.
 */

/**
 * 🎯 **Fetches Recent Name Changes from the WOM API**
 *
 * Retrieves recent name changes from the WOM API for a specific group.
 *
 * @async
 * @function fetchNameChanges
 * @returns {Promise<NameChange[]>} A promise that resolves to an array of name change records.
 *
 * @example
 * const nameChanges = await fetchNameChanges();
 * logger.info(nameChanges);
 */
async function fetchNameChanges() {
    try {
        const nameChanges = await WOMApiClient.request('groups', 'getGroupNameChanges', WOMApiClient.groupId);
        return nameChanges.map((change) => ({
            oldName: change.oldName,
            newName: change.newName,
            resolvedAt: change.resolvedAt,
        }));
    } catch (error) {
        logger.error(`[fetchNameChanges] Failed to fetch data: ${error.message}`);
        return [];
    }
}

/**
 * 🎯 **Saves Name Changes to the Database**
 *
 * Clears the `recent_name_changes` table and inserts new name change records.
 *
 * @async
 * @function saveToDatabase
 * @param {NameChange[]} nameChanges - Array of name change objects to be saved.
 * @returns {Promise<void>} Resolves when the operation is complete.
 *
 * @example
 * await saveToDatabase(nameChanges);
 */
async function saveToDatabase(nameChanges) {
    const deleteAllQuery = 'DELETE FROM recent_name_changes';
    try {
        await runQuery(deleteAllQuery);
        logger.info('[saveToDatabase] Cleared existing rows from recent_name_changes.');
    } catch (error) {
        logger.error(`[saveToDatabase] Error clearing table: ${error.message}`);
        return;
    }

    const insertQuery = `
        INSERT INTO recent_name_changes (old_name, new_name, resolved_at)
        VALUES (?, ?, ?)
    `;

    for (const { oldName, newName, resolvedAt } of nameChanges) {
        try {
            await runQuery(insertQuery, [oldName, newName, resolvedAt]);
        } catch (error) {
            logger.error(`[saveToDatabase] Error saving name change: ${oldName} -> ${newName} | ${error.message}`);
        }
    }
}

/**
 * 🎯 **Updates the Registered RSN Based on Name Changes**
 *
 * Updates the `registered_rsn` table with new RSN mappings based on a name change.
 * Handles conflicts where the new RSN already exists for the same or a different user,
 * sends Discord notifications for successful updates/conflict resolutions, and then propagates
 * the change across all databases.
 *
 * @async
 * @function updateRegisteredRSN
 * @param {string} oldName - The old RuneScape Name (RSN) to be updated.
 * @param {string} newName - The new RSN to replace the old one.
 * @param {Discord.GuildChannelManager} channelManager - Discord channel manager for sending messages.
 * @returns {Promise<boolean>} Resolves to true if the RSN was updated, false otherwise.
 *
 * @example
 * const updated = await updateRegisteredRSN('OldName', 'NewName', client.channels);
 * if (updated) {
 *   logger.info('RSN updated successfully.');
 * }
 */
async function updateRegisteredRSN(oldName, newName, channelManager) {
    if (oldName.toLowerCase() === newName.toLowerCase()) {
        return false; // Skip identical names (case-insensitive)
    }

    try {
        // Fetch the `user_id` associated with the `oldName`
        const oldNameQuery = `
            SELECT user_id, rsn
            FROM registered_rsn
            WHERE LOWER(rsn) = LOWER(?)
        `;
        const oldNameEntry = await getAll(oldNameQuery, [oldName]);

        if (oldNameEntry.length === 0) {
            logger.warn(`[updateRegisteredRSN] No entry found for oldName: "${oldName}".`);
            return false;
        }

        const { user_id: oldUserId } = oldNameEntry[0];

        // Check if `newName` already exists for the same user
        const newNameQuery = `
            SELECT user_id, rsn
            FROM registered_rsn
            WHERE LOWER(rsn) = LOWER(?) AND user_id = ?
        `;
        const newNameEntry = await getAll(newNameQuery, [newName, oldUserId]);

        if (newNameEntry.length > 0) {
            // If `newName` exists for the same user, remove the old RSN.
            const deleteOldNameQuery = `
                DELETE FROM registered_rsn
                WHERE user_id = ? AND LOWER(rsn) = LOWER(?)
            `;
            await runQuery(deleteOldNameQuery, [oldUserId, oldName]);

            logger.info(`[updateRegisteredRSN] Removed outdated RSN: "${oldName}" for user_id ${oldUserId} as "${newName}" already exists.`);
            // Send a confirmation embed for successful removal and update.
            if (channelManager) {
                const channel = await channelManager.fetch(NAME_CHANGE_CHANNEL_ID).catch(() => null);
                if (channel) {
                    const embed = new EmbedBuilder()
                        .setTitle('🔄 RSN Name Change')
                        .setDescription(`<@${oldUserId}>\nYour RSN has been successfully updated:\n\n📛 **Old Name:** \`${oldName}\`\n🔗 **New Name:** \`${newName}\``)
                        .setColor(0x3498db)
                        .setTimestamp();

                    await channel.send({ embeds: [embed] });
                }
            }
            // Propagate the change across all databases.
            await updateNameEverywhere(oldName, newName);
            return true;
        }

        // Check for conflicts: If `newName` exists for a different user, resolve the conflict.
        const conflictQuery = `
            SELECT user_id, rsn
            FROM registered_rsn
            WHERE LOWER(rsn) = LOWER(?)
        `;
        const newNameConflicts = await getAll(conflictQuery, [newName]);

        for (const { user_id: newUserId, rsn } of newNameConflicts) {
            if (newUserId !== oldUserId) {
                const deleteQuery = `
                    DELETE FROM registered_rsn
                    WHERE user_id = ? AND LOWER(rsn) = LOWER(?)
                `;
                await runQuery(deleteQuery, [newUserId, rsn]);

                // Notify the conflicting user.
                if (channelManager) {
                    const channel = await channelManager.fetch(NAME_CHANGE_CHANNEL_ID).catch(() => null);
                    if (channel) {
                        const embed = new EmbedBuilder()
                            .setTitle('⚠️ Outdated RSN Removed')
                            .setDescription(`**Hey there, <@${newUserId}>!**\nWe noticed the RSN \`${rsn}\` conflicted with a recent name change and has been removed.\n\nIf this was your RSN, please register a new one using the \`/rsn\` command. 😊`)
                            .setColor(0xff6347)
                            .setTimestamp();

                        await channel.send({ embeds: [embed] });
                    }
                }
            }
        }

        // Proceed to update the RSN if no conflict exists.
        const updateQuery = `
            UPDATE registered_rsn
            SET rsn = ?
            WHERE LOWER(rsn) = LOWER(?)
        `;
        await runQuery(updateQuery, [newName, oldName]);
        logger.info(`[updateRegisteredRSN] Updated RSN: "${oldName}" to "${newName}" for user_id ${oldUserId}.`);

        // Propagate the name change to all other databases and tables.
        await updateNameEverywhere(oldName, newName);
        return true;
    } catch (error) {
        logger.error(`[updateRegisteredRSN] Error updating RSN: ${oldName} -> ${newName} | ${error.message}`);
        return false;
    }
}

/**
 * 🎯 **Processes Recent Name Changes**
 *
 * Retrieves recent name changes from the WOM API, saves them to the database, and updates the registered RSNs accordingly.
 * Handles dependency ordering and conflict resolution based on the timestamp of changes.
 *
 * @async
 * @function processNameChanges
 * @param {Discord.Client} client - The Discord client instance.
 * @returns {Promise<void>} Resolves when all name changes have been processed.
 *
 * @example
 * await processNameChanges(client);
 */
async function processNameChanges(client) {
    const nameChanges = await fetchNameChanges();

    if (nameChanges.length === 0) {
        logger.info('[processNameChanges] No name changes found.');
        return;
    }

    await saveToDatabase(nameChanges);
    let changesApplied = 0;

    // Process registered_rsn updates first.
    for (const { oldName, newName } of nameChanges) {
        const updated = await updateRegisteredRSN(oldName, newName, client.channels);
        if (updated) {
            logger.info(`[processNameChanges] Registered RSN updated: "${oldName}" -> "${newName}".`);
        }
    }

    // Now, force update everywhere regardless of registered_rsn.
    for (const { oldName, newName } of nameChanges) {
        try {
            await updateNameEverywhere(oldName, newName);
            logger.info(`[processNameChanges] Forced update applied for: "${oldName}" -> "${newName}".`);
            changesApplied++;
        } catch (error) {
            logger.error(`[processNameChanges] Error updating "${oldName}" to "${newName}": ${error.message}`);
        }
    }

    logger.info(`[processNameChanges] Successfully forced update on ${changesApplied} name change(s) across all databases.`);
}

/**
 * Updates Name in the Messages Database (messages.db)
 *
 * Scans every table in messages.db for a column named "user" (case-insensitive) and updates
 * any occurrence of the old name with the new name. It collects and logs a summary of effective changes.
 *
 * @async
 * @function updateNameInMessagesDB
 * @param {string} oldName - The old name value.
 * @param {string} newName - The new name value.
 * @returns {Promise<void>}
 */
async function updateNameInMessagesDB(oldName, newName) {
    const changesSummary = [];
    const tables = await getAllMessages('SELECT name FROM sqlite_master WHERE type=\'table\'');
    for (const { name: tableName } of tables) {
        const columns = await getAllMessages(`PRAGMA table_info(${tableName})`);
        if (columns.some((col) => col.name.toLowerCase() === 'user')) {
            const updateQuery = `UPDATE ${tableName} SET user = ? WHERE LOWER(user) = LOWER(?)`;
            const result = await runMessagesQuery(updateQuery, [newName, oldName]);
            if (result.changes > 0) {
                changesSummary.push({ table: tableName, column: 'user', rows: result.changes });
            }
        }
    }
    if (changesSummary.length > 0) {
        const summaryStr = changesSummary.map((change) => `Table: ${change.table} | Column: ${change.column} | Rows affected: ${change.rows}`).join('\n');
        logger.info(`[updateNameInMessagesDB] Update Summary:\n${summaryStr}`);
    }
}

/**
 * Updates Name in the Main Database (database.sqlite)
 *
 * Scans every table (excluding `recent_name_changes` and `skills_bosses`) in the main database for columns
 * named "username", "name", "player_id", or "rsn" (case-insensitive) and updates any occurrence of the old name.
 * It collects and logs a summary of effective changes.
 *
 * @async
 * @function updateNameInMainDB
 * @param {string} oldName - The old name value.
 * @param {string} newName - The new name value.
 * @returns {Promise<void>}
 */
async function updateNameInMainDB(oldName, newName) {
    const excludeTables = ['recent_name_changes', 'skills_bosses'];
    const targetColumns = ['username', 'name', 'player_id', 'rsn'];
    const changesSummary = [];
    const tables = await getAll('SELECT name FROM sqlite_master WHERE type=\'table\'');
    for (const { name: tableName } of tables) {
        if (excludeTables.includes(tableName)) continue;
        const columns = await getAll(`PRAGMA table_info(${tableName})`);
        for (const col of columns) {
            if (targetColumns.includes(col.name.toLowerCase())) {
                const updateQuery = `UPDATE ${tableName} SET ${col.name} = ? WHERE LOWER(${col.name}) = LOWER(?)`;
                const result = await runQuery(updateQuery, [newName, oldName]);
                if (result.changes > 0) {
                    changesSummary.push({ table: tableName, column: col.name, rows: result.changes });
                }
            }
        }
    }
    if (changesSummary.length > 0) {
        const summaryStr = changesSummary.map((change) => `Table: ${change.table} | Column: ${change.column} | Rows affected: ${change.rows}`).join('\n');
        logger.info(`[updateNameInMainDB] Update Summary:\n${summaryStr}`);
    }
}

/**
 * Updates the name everywhere across both messages and main databases,
 * then logs a summary of effective changes.
 *
 * @async
 * @function updateNameEverywhere
 * @param {string} oldName - The old name value to replace.
 * @param {string} newName - The new name value.
 * @returns {Promise<void>}
 */
async function updateNameEverywhere(oldName, newName) {
    try {
        await updateNameInMessagesDB(oldName, newName);
        await updateNameInMainDB(oldName, newName);
        logger.info(`[updateNameEverywhere] Completed update of "${oldName}" to "${newName}".`);
    } catch (error) {
        logger.error(`[updateNameEverywhere] Failed to update name everywhere: ${error.message}`);
    }
}

module.exports = {
    processNameChanges,
};
