const db = require('../essentials/dbUtils');

/**
 * Retrieves the RSN for a given player_id from the registered_rsn table.
 * @param {number} playerId
 * @returns {Promise<string|null>} The player's RSN, or null if not found.
 */
async function getPlayerRsn(playerId) {
    const row = await db.getOne(
        `
    SELECT rsn 
    FROM registered_rsn 
    WHERE player_id = ?
    `,
        [playerId],
    );
    return row ? row.rsn : null;
}

module.exports = getPlayerRsn;
