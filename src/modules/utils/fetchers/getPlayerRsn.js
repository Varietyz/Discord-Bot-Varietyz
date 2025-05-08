const db = require('../essentials/dbUtils');

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
