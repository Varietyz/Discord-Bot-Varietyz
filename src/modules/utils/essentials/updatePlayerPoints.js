const logger = require('./logger');
const db = require('./dbUtils');

async function updatePlayerPoints(player_id, type, points) {
    try {

        points = parseInt(points, 10);
        if (isNaN(points)) {
            throw new Error(`Invalid points value: ${points}`);
        }

        await db.runQuery(
            `
            INSERT INTO player_points (player_id, type, points)
            VALUES (?, ?, ?)
            ON CONFLICT(player_id, type) DO UPDATE SET
                points = points + excluded.points,
                last_updated_at = CURRENT_TIMESTAMP
            `,
            [player_id, type, points],
        );

    } catch (error) {
        logger.error(`[PlayerPoints] Error updating points for Player #${player_id} in ${type}: ${error.message}`);
    }
}

module.exports = {
    updatePlayerPoints,
};
