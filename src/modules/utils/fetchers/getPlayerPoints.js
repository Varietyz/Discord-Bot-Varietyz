const db = require('../essentials/dbUtils');

/**
 * Retrieves the points for a given player_id and type from the player_points table.
 * @param {number} playerId
 * @param {string} type
 * @returns {Promise<number|null>} The player's points for the given type, or null if not found.
 */
async function getPlayerPoints(playerId, type) {
    const row = await db.getOne(
        `
        SELECT points 
        FROM player_points 
        WHERE player_id = ? AND type = ?
        `,
        [playerId, type],
    );
    return row && row.points !== null ? row.points : 0;
}

/**
 * Retrieves the total points for a given player_id by summing all points.
 * @param {number} playerId
 * @returns {Promise<number>} The sum of points for the player, or 0 if none found.
 */
async function getPlayerTotalPoints(playerId) {
    const row = await db.getOne(
        `
        SELECT SUM(points) AS totalPoints 
        FROM player_points 
        WHERE player_id = ?
        `,
        [playerId],
    );
    return row && row.totalPoints !== null ? row.totalPoints : 0;
}

module.exports = { getPlayerPoints, getPlayerTotalPoints };
