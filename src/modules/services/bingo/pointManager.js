// /modules/utils/points/pointManager.js
const db = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');

/**
 * 🎯 Centralized Point Calculation
 * @param {number} playerId - ID of the player
 * @param {number} taskId - ID of the task
 * @param {number} progress - Player's progress value
 * @param {number} target - Target value for task completion
 * @param {number} basePoints - Base points for the task
 * @returns {number} - Calculated points for the player
 */
function calculatePoints(playerId, taskId, progress, target, basePoints) {
    const effectiveContribution = Math.min(progress, target);
    const pointsAwarded = Math.ceil((effectiveContribution / target) * basePoints);

    logger.info(`[PointManager] Calculated ${pointsAwarded} points for Player #${playerId} on Task #${taskId}`);
    return pointsAwarded;
}

/**
 * 🎯 Calculate Points for Bingo Task
 * - Calculates base points, bonus points, and extra points.
 * - Handles team and individual points separately.
 * - Returns total points awarded.
 *
 * @param {number} task_id - The ID of the bingo task
 * @param {number} player_id - The ID of the player
 * @param {number} team_id - The ID of the team (optional)
 * @param {string} status - The status of the task (e.g., 'completed')
 * @returns {number} - Total points awarded
 */
async function calculatorProgression(task_id, player_id, team_id = null, status) {
    try {
        const task = await db.getOne(
            `
            SELECT base_points, value
            FROM bingo_tasks 
            WHERE task_id = ?
            `,
            [task_id],
        );
        const basePoints = task?.base_points || 0;
        let points = 0;

        if (status === 'completed') {
            points = basePoints;
        }

        if (team_id) {
            await db.runQuery(
                `
                UPDATE bingo_task_progress
                SET points_awarded = ?,
                    team_id = ?,
                    last_updated = CURRENT_TIMESTAMP
                WHERE task_id = ?
                  AND player_id = ?
                `,
                [points, team_id, task_id, player_id],
            );
            logger.info(`[calculatePoints] Awarded ${points} points to Player #${player_id} in Team #${team_id} for Task #${task_id}`);
        } else {
            await db.runQuery(
                `
                UPDATE bingo_task_progress
                SET points_awarded = ?,
                    last_updated = CURRENT_TIMESTAMP
                WHERE task_id = ?
                  AND player_id = ?
                `,
                [points, task_id, player_id],
            );
            logger.info(`[calculatePoints] Awarded ${points} points to Player #${player_id} for Task #${task_id}`);
        }

        return points;
    } catch (error) {
        logger.error(`[calculatePoints] Error calculating points for Task #${task_id}: ${error.message}`);
        return 0;
    }
}

module.exports = {
    calculatePoints,
    calculatorProgression,
};
