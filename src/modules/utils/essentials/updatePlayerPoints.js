// /modules/services/utils/updatePlayerPoints.js
const logger = require('./logger');
const db = require('./dbUtils');

/**
 * 🎯 Centralized Function to Update Player Points
 * - Adds or removes points for a player.
 * - Automatically creates a new row if it doesn't exist.
 * - Updates the total points for the event type.
 * - Handles both positive (add) and negative (remove) points.
 *
 * @param {number} player_id - The ID of the player
 * @param {string} type - The type of event (e.g., Bingo, SOTW, BOTW, FutureEvent)
 * @param {number} points - Points to add (positive) or remove (negative)
 */
async function updatePlayerPoints(player_id, type, points) {
    try {
        // Ensure points is a number
        points = parseInt(points, 10);
        if (isNaN(points)) {
            throw new Error(`Invalid points value: ${points}`);
        }

        // Update points in player_points table
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

        //logger.info(`[PlayerPoints] Updated ${points} points for Player #${player_id} in ${type}`);
    } catch (error) {
        logger.error(`[PlayerPoints] Error updating points for Player #${player_id} in ${type}: ${error.message}`);
    }
}

module.exports = {
    updatePlayerPoints,
};
