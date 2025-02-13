// @ts-nocheck
/**
 * @fileoverview
 * **Database Maintenance: Cleanup Inactive Users** 🗑️
 *
 * This module removes users from the database who are no longer in the Discord guild.
 * It checks the `registered_rsn` table for all stored Discord IDs and verifies their
 * presence in the guild. If a user is no longer in the guild, their data is removed
 * from multiple related tables to free up space and maintain database integrity.
 *
 * ---
 *
 * **Affected Tables:**
 * - `votes`
 * - `winners`
 * - `users`
 * - `registered_rsn`
 * - `player_data`
 * - `player_fetch_times`
 *
 * ---
 *
 * **Usage Example:**
 * ```javascript
 * const { cleanupInactiveUsers } = require('../utils/helpers/cleanupInactiveUsers');
 * await cleanupInactiveUsers(guild);
 * ```
 *
 * @module utils/cleanupInactiveUsers
 */

const { getAll, runTransaction } = require('../essentials/dbUtils');
const logger = require('../essentials/logger');

/**
 * 🎯 **Removes Inactive Users from the Database**
 *
 * This function:
 * - Fetches all `discord_id`s from the `registered_rsn` table.
 * - Checks if each user is still in the Discord guild.
 * - If a user is no longer in the guild, removes them from all relevant tables.
 *
 * @async
 * @function cleanupInactiveUsers
 * @param {Discord.Guild} guild - The Discord guild object.
 * @returns {Promise<void>} Resolves when the cleanup is complete.
 *
 * @example
 * await cleanupInactiveUsers(guild);
 */
async function cleanupInactiveUsers(guild) {
    try {
        logger.info('🔄 **Starting inactive user cleanup...**');

        // Fetch all registered Discord IDs from the database
        const registeredUsers = await getAll('SELECT player_id, discord_id, rsn FROM registered_rsn');
        if (!registeredUsers.length) {
            logger.info('⚠️ **No registered users found.**');
            return;
        }

        logger.info(`📊 **Checking guild membership for ${registeredUsers.length} registered users...**`);

        const inactiveUsers = [];

        for (const { player_id, discord_id, rsn } of registeredUsers) {
            const member = await guild.members.fetch(discord_id).catch(() => null);
            if (!member) {
                inactiveUsers.push({ player_id, discord_id, rsn });
                logger.warn(`⚠️ **User Left:** ${rsn} (Discord ID: ${discord_id})`);
            }
        }

        if (!inactiveUsers.length) {
            logger.info('✅ **All registered users are still in the guild. No cleanup needed.**');
            return;
        }

        logger.info(`🗑️ **Removing ${inactiveUsers.length} inactive users from the database...**`);

        // Construct and execute deletion queries
        for (const { player_id, discord_id, rsn } of inactiveUsers) {
            const deleteQueries = [
                { table: 'votes', query: 'DELETE FROM votes WHERE discord_id = ?', params: [discord_id] },
                { table: 'winners', query: 'DELETE FROM winners WHERE player_id = ?', params: [player_id] },
                { table: 'users', query: 'DELETE FROM users WHERE player_id = ?', params: [player_id] },
                { table: 'registered_rsn', query: 'DELETE FROM registered_rsn WHERE discord_id = ?', params: [discord_id] },
                { table: 'player_data', query: 'DELETE FROM player_data WHERE player_id = ?', params: [player_id] },
                { table: 'player_fetch_times', query: 'DELETE FROM player_fetch_times WHERE player_id = ?', params: [player_id] },
            ];

            // Run deletions inside a transaction
            await runTransaction(deleteQueries);

            // Log detailed removal info
            logger.info(`🗑️ **Removed User:** ${rsn} (Discord ID: ${discord_id}, Player ID: ${player_id})\n` + deleteQueries.map(({ table }) => ` - ✅ Cleared from **${table}** 🗑️`).join('\n'));
        }

        logger.info(`✅🗑️ **Successfully removed ${inactiveUsers.length} inactive users from the database.**`);
    } catch (error) {
        logger.error(`🚨 **Error during cleanupInactiveUsers:** ${error.message}`);
    }
}

module.exports = { cleanupInactiveUsers };
