const { getAll, runTransaction } = require('../essentials/dbUtils');
const logger = require('../essentials/logger');

async function cleanupInactiveUsers(guild) {
    try {
        logger.info('🔄 **Starting inactive user cleanup...**');
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
        for (const { player_id, discord_id, rsn } of inactiveUsers) {
            const deleteQueries = [
                { table: 'votes', query: 'DELETE FROM votes WHERE discord_id = ?', params: [discord_id] },
                { table: 'winners', query: 'DELETE FROM winners WHERE player_id = ?', params: [player_id] },
                { table: 'users', query: 'DELETE FROM users WHERE player_id = ?', params: [player_id] },
                { table: 'registered_rsn', query: 'DELETE FROM registered_rsn WHERE discord_id = ?', params: [discord_id] },
                { table: 'player_data', query: 'DELETE FROM player_data WHERE player_id = ?', params: [player_id] },
                { table: 'player_fetch_times', query: 'DELETE FROM player_fetch_times WHERE player_id = ?', params: [player_id] },
            ];
            await runTransaction(deleteQueries);
            logger.info(`🗑️ **Removed User:** ${rsn} (Discord ID: ${discord_id}, Player ID: ${player_id})\n` + deleteQueries.map(({ table }) => ` - ✅ Cleared from **${table}** 🗑️`).join('\n'));
        }
        logger.info(`✅🗑️ **Successfully removed ${inactiveUsers.length} inactive users from the database.**`);
    } catch (error) {
        logger.error(`🚨 **Error during cleanupInactiveUsers:** ${error.message}`);
    }
}
module.exports = { cleanupInactiveUsers };
