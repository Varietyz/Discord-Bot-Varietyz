// @ts-nocheck
/**
 * @fileoverview Utility functions for handling player name changes within the Varietyz Bot.
 * This module interacts with the WOM API to fetch name changes, updates the database accordingly,
 * and manages associated Discord notifications.
 *
 * @module modules/functions/name_changes
 */

const { WOMClient } = require('@wise-old-man/utils');
const { getAll, runQuery } = require('../../utils/dbUtils');
const logger = require('./logger');
const { EmbedBuilder } = require('discord.js');
const { NAME_CHANGE_CHANNEL_ID, WOM_GROUP_ID } = require('../../config/constants');

const client = new WOMClient();

/**
 * Represents a name change record.
 *
 * @typedef {Object} NameChange
 * @property {string} oldName - The original RuneScape Name (RSN) before the change.
 * @property {string} newName - The new RSN after the change.
 * @property {number} resolvedAt - The timestamp when the name change was resolved.
 */

/**
 * Fetches recent name changes from the WOM API for a specific group.
 *
 * @async
 * @function fetchNameChanges
 * @returns {Promise<NameChange[]>} - A promise that resolves to an array of name change records.
 * @example
 * const nameChanges = await fetchNameChanges();
 * logger.info(nameChanges);
 */
async function fetchNameChanges() {
    try {
        const nameChanges = await client.groups.getGroupNameChanges(WOM_GROUP_ID);
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
 * Saves an array of name changes to the 'recent_name_changes' table in the database.
 * Clears existing entries before inserting new ones to maintain the latest state.
 *
 * @async
 * @function saveToDatabase
 * @param {NameChange[]} nameChanges - Array of name change objects to be saved.
 * @returns {Promise<void>} - Resolves when the operation is complete.
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
 * Updates the 'registered_rsn' table with new RSN mappings based on name changes.
 * Handles conflicts where the new RSN might already exist for the same or different users.
 * Sends Discord notifications for successful updates and conflict resolutions.
 *
 * @async
 * @function updateRegisteredRSN
 * @param {string} oldName - The old RuneScape Name (RSN) to be updated.
 * @param {string} newName - The new RSN to replace the old one.
 * @param {Discord.GuildChannelManager} channelManager - Discord channel manager for sending messages.
 * @returns {Promise<boolean>} - Resolves to `true` if the RSN was updated, `false` otherwise.
 * @example
 * const updated = await updateRegisteredRSN('OldName', 'NewName', client.channels);
 * if (updated) {
 * logger.info('RSN updated successfully.');
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
            return false; // Skip if `oldName` does not exist
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
            // If `newName` already exists for the same user, remove `oldName`
            const deleteOldNameQuery = `
                DELETE FROM registered_rsn
                WHERE user_id = ? AND LOWER(rsn) = LOWER(?)
            `;
            await runQuery(deleteOldNameQuery, [oldUserId, oldName]);

            logger.info(`[updateRegisteredRSN] Removed outdated RSN: "${oldName}" for user_id ${oldUserId} as "${newName}" already exists.`);
            // Send confirmation embed for successful removal and update
            if (channelManager) {
                const channel = await channelManager.fetch(NAME_CHANGE_CHANNEL_ID).catch(() => null);
                if (channel) {
                    const embed = new EmbedBuilder()
                        .setTitle('🔄 RSN Name Change')
                        .setDescription(`<@${oldUserId}>\nYour RSN has been successfully updated:\n\n📛 **Old Name:** \`${oldName}\`\n🔗 **New Name:** \`${newName}\``)
                        .setColor(0x3498db) // Blue for confirmation
                        .setTimestamp();

                    await channel.send({ embeds: [embed] });
                }
            }
            return true; // No need to update `newName` since it's already present
        }

        // Check if `newName` exists for a different user and handle conflicts
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

                // Notify the conflicting user
                if (channelManager) {
                    const channel = await channelManager.fetch(NAME_CHANGE_CHANNEL_ID).catch(() => null);
                    if (channel) {
                        const embed = new EmbedBuilder()
                            .setTitle('⚠️ Outdated RSN Removed')
                            .setDescription(`**Hey there, <@${newUserId}>!**\nWe noticed the RSN \`${rsn}\` conflicted with a recent name change and has been removed.\n\nIf this was your RSN, please register a new one using the \`/rsn\` command. 😊`)
                            .setColor(0xff6347) // Tomato color for warning
                            .setTimestamp();

                        await channel.send({ embeds: [embed] });
                    }
                }
            }
        }

        // Proceed to update the RSN if no conflict exists
        const updateQuery = `
            UPDATE registered_rsn
            SET rsn = ?
            WHERE LOWER(rsn) = LOWER(?)
        `;
        await runQuery(updateQuery, [newName, oldName]);
        logger.info(`[updateRegisteredRSN] Updated RSN: "${oldName}" to "${newName}" for user_id ${oldUserId}.`);
        return true;
    } catch (error) {
        logger.error(`[updateRegisteredRSN] Error updating RSN: ${oldName} -> ${newName} | ${error.message}`);
        return false;
    }
}

/**
 * Processes name changes by fetching recent changes from the WOM API,
 * saving them to the database, and updating the registered RSNs accordingly.
 * Also handles dependencies and conflict resolutions based on the timestamp of changes.
 *
 * @async
 * @function processNameChanges
 * @param {Discord.Client} client - Discord client instance.
 * @returns {Promise<void>} - Resolves when the name changes have been processed.
 * @example
 * await processNameChanges(client);
 */
async function processNameChanges(client) {
    const nameChanges = await fetchNameChanges();

    if (nameChanges.length === 0) {
        logger.info('[processNameChanges] No name changes found.');
        return;
    }

    // Save name changes to the database
    await saveToDatabase(nameChanges);

    // Step 1: Build a dependency graph with resolved_at and user_id
    const dependencyGraph = new Map();
    for (const { oldName, newName, resolvedAt } of nameChanges) {
        const userIdQuery = `
            SELECT user_id
            FROM registered_rsn
            WHERE LOWER(rsn) = LOWER(?)
        `;
        const userIdEntry = await getAll(userIdQuery, [oldName]);

        if (userIdEntry.length > 0) {
            dependencyGraph.set(oldName.toLowerCase(), {
                newName: newName.toLowerCase(),
                resolvedAt,
                userId: userIdEntry[0].user_id,
            });
        } else {
            logger.warn(`[processNameChanges] No user_id found for RSN: "${oldName}". Skipping.`);
        }
    }

    // Step 2: Sort changes by resolved_at (latest first)
    const sortedChanges = Array.from(dependencyGraph.entries()).sort((a, b) => b[1].resolvedAt - a[1].resolvedAt);

    // Step 3: Process changes dynamically
    const processedNames = new Set();
    let changesApplied = 0;

    for (const [oldName, { newName, resolvedAt, userId }] of sortedChanges) {
        // Skip already-processed names
        if (processedNames.has(oldName) || processedNames.has(newName)) {
            continue;
        }

        // Step 3.1: Check if `newName` exists and validate its timestamp
        const newNameQuery = `
            SELECT user_id, rsn, registered_at
            FROM registered_rsn
            WHERE LOWER(rsn) = LOWER(?)
        `;
        const newNameEntries = await getAll(newNameQuery, [newName]);

        if (newNameEntries.length > 0) {
            const { user_id: existingUserId, registered_at } = newNameEntries[0];

            if (existingUserId === userId && registered_at > resolvedAt) {
                logger.info(`[processNameChanges] Skipping ${oldName} -> ${newName} for user_id ${userId} as ${newName} has a newer timestamp (${registered_at}).`);
                continue;
            }
        }

        // Step 3.2: Update the registered RSN if valid
        const updated = await updateRegisteredRSN(oldName, newName, client.channels);
        if (updated) {
            changesApplied++;
            processedNames.add(oldName);
            processedNames.add(newName);
            logger.info(`[processNameChanges] Updated RSN for user_id ${userId}: ${oldName} -> ${newName}.`);
        }
    }

    logger.info(`[processNameChanges] Successfully applied ${changesApplied} name changes.`);
}

module.exports = {
    processNameChanges,
};
