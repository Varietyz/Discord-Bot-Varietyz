// /modules/services/bingo/bingoLeaderboard.js
const logger = require('../../utils/essentials/logger');
const db = require('../../utils/essentials/dbUtils');
const { getTeamProgress } = require('./bingoEmbedData');

/**
 * Retrieves detailed progress for each completed task for a given player and event.
 * @param {number} eventId - The bingo event ID.
 * @param {number} playerId - The player's ID.
 * @returns {Promise<Array<{ progress: number, target: number, basePoints: number }>>}
 */
async function getDetailedPlayerTaskProgress(eventId, playerId) {
    return await db.getAll(
        `
        SELECT 
            btp.progress_value AS progress,
            bt.value AS target,
            bt.base_points AS basePoints
        FROM bingo_task_progress btp
        JOIN bingo_tasks bt ON btp.task_id = bt.task_id
        WHERE btp.event_id = ? 
          AND btp.player_id = ?
          AND btp.status = 'completed'
        `,
        [eventId, playerId],
    );
}

/**
 * Calculates points based on the player's progress.
 * - Caps progress at the target value.
 * - Returns the percentage of basePoints achieved, rounded to the nearest integer.
 *
 * @param {number} progress - The player's progress on the task.
 * @param {number} target - The target value required for full completion.
 * @param {number} basePoints - The base points awarded for full completion.
 * @returns {number} The calculated points.
 */
function calculatePointsFromProgress(progress, target, basePoints) {
    const effectiveContribution = Math.min(progress, target);
    const percentage = effectiveContribution / target;
    const rawPoints = percentage * basePoints;
    return Math.round(rawPoints);
}

/**
 *
 */
async function updateLeaderboard() {
    logger.info('[BingoLeaderboard] updateLeaderboard() → Start');

    const ongoingEvents = await db.getAll(`
    SELECT event_id
    FROM bingo_state
    WHERE state = 'ongoing'
  `);

    for (const { event_id } of ongoingEvents) {
        await updateLeaderboardForEvent(event_id);
        await updateTeamLeaderboardForEvent(event_id);
    }
    logger.info('[BingoLeaderboard] updateLeaderboard() → Done');
}

/**
 *
 * @param eventId
 */
async function updateLeaderboardForEvent(eventId) {
    logger.info(`[BingoLeaderboard] Recalculating player-based leaderboard for event #${eventId}`);

    // Retrieve all distinct players in the event.
    const players = await db.getAll(
        `
    SELECT DISTINCT player_id
    FROM bingo_task_progress
    WHERE event_id = ?
    `,
        [eventId],
    );

    for (const { player_id } of players) {
        // Get detailed progress per task for this player.
        const taskProgresses = await getDetailedPlayerTaskProgress(eventId, player_id);
        let recalculatedCompletedPoints = 0;
        let completedTasksCount = 0;

        // Calculate points for each completed task.
        for (const task of taskProgresses) {
            const points = calculatePointsFromProgress(task.progress, task.target, task.basePoints);
            recalculatedCompletedPoints += points;
            completedTasksCount++;
        }

        // Optionally, if you still store extra points separately, retrieve them:
        const extraRow = await db.getOne(
            `
      SELECT SUM(extra_points) AS extra_sum
      FROM bingo_task_progress
      WHERE event_id = ? AND player_id = ?
      `,
            [eventId, player_id],
        );
        const extra_sum = extraRow?.extra_sum || 0;

        // Retrieve existing leaderboard record for this player (if any)
        const leaderRow = await db.getOne(
            `
      SELECT leaderboard_id, pattern_bonus
      FROM bingo_leaderboard
      WHERE event_id = ?
        AND player_id = ?
      `,
            [eventId, player_id],
        );
        const pattern_bonus = leaderRow?.pattern_bonus || 0;

        // Total points is the sum of the recalculated points, any extra points, and pattern bonuses.
        const total_points = recalculatedCompletedPoints + extra_sum + pattern_bonus;

        if (!leaderRow) {
            await db.runQuery(
                `
        INSERT INTO bingo_leaderboard (event_id, team_id, player_id, total_points, completed_tasks, pattern_bonus)
        VALUES (?, 0, ?, ?, ?, ?)
        `,
                [eventId, player_id, total_points, completedTasksCount, pattern_bonus],
            );
        } else {
            await db.runQuery(
                `
        UPDATE bingo_leaderboard
        SET total_points = ?,
            completed_tasks = ?,
            pattern_bonus = ?,
            last_updated = CURRENT_TIMESTAMP
        WHERE leaderboard_id = ?
        `,
                [total_points, completedTasksCount, pattern_bonus, leaderRow.leaderboard_id],
            );
        }
    }
}

/**
 *
 * @param eventId
 */
async function updateTeamLeaderboardForEvent(eventId) {
    logger.info(`[BingoLeaderboard] Recalculating team-based leaderboard for event #${eventId}`);

    // 🔄 New Call to getTeamProgress
    const progressRows = await getTeamProgress(eventId);

    for (const row of progressRows) {
        const { team_id, completed_points, extra_sum } = row;

        const existingRow = await db.getOne(
            `
            SELECT leaderboard_id, pattern_bonus
            FROM bingo_leaderboard
            WHERE event_id = ?
              AND team_id = ?
              AND (player_id IS NULL OR player_id = 0)
        `,
            [eventId, team_id],
        );

        const pattern_bonus = existingRow?.pattern_bonus || 0;
        const basePoints = (completed_points || 0) + (extra_sum || 0) + pattern_bonus;
        let total_points = basePoints;
        if (team_id === 0) {
            total_points = Math.round(basePoints * 1.2);
        }

        if (!existingRow) {
            await db.runQuery(
                `
                INSERT INTO bingo_leaderboard (event_id, team_id, player_id, total_points, completed_tasks, pattern_bonus)
                VALUES (?, ?, 0, ?, ?, ?)
            `,
                [eventId, team_id, total_points, completed_points, pattern_bonus],
            );
            logger.info(`Inserted: ${eventId}, team_id ${team_id}, total_points ${total_points}, completed_points ${completed_points}, pattern_bonus ${pattern_bonus}`);
        } else {
            await db.runQuery(
                `
                UPDATE bingo_leaderboard
                SET total_points = ?,
                    completed_tasks = ?,
                    pattern_bonus = ?,
                    last_updated = CURRENT_TIMESTAMP
                WHERE leaderboard_id = ?
            `,
                [total_points, completed_points, pattern_bonus, existingRow.leaderboard_id],
            );
            logger.info(`Updated: total_points ${total_points}, completed_points ${completed_points}, pattern_bonus ${pattern_bonus}, leaderboard_id ${existingRow.leaderboard_id}`);
        }
    }
}

module.exports = {
    updateLeaderboard,
    updateLeaderboardForEvent,
    updateTeamLeaderboardForEvent,
};
