const db = require('../essentials/dbUtils');
const logger = require('../essentials/logger');
const { convertRanks } = require('../helpers/rankUtils');

/**
 * Get the rank name of a player by player_id in the clan_members table
 * @param {number} playerId - The player ID to check
 * @returns {Promise<string|null>} - Returns rank name or null if not found
 */
async function getPlayerRank(playerId) {
    try {
        const query = `
            SELECT rank 
            FROM clan_members 
            WHERE player_id = ?
        `;

        const result = await db.getOne(query, [playerId]);

        if (result) {
            const rank = convertRanks(result.rank);
            return rank;
        } else {
            logger.warn(`❌ Player ID #${playerId} not found in clan_members.`);
            return null;
        }
    } catch (error) {
        logger.error(`❌ Failed to get player rank: ${error.message}`);
        return null;
    }
}
module.exports = getPlayerRank;
