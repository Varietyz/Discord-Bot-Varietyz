const db = require('../essentials/dbUtils');

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
