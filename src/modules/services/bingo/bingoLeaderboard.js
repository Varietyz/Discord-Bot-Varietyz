// /modules/services/bingo/bingoLeaderboard.js
const logger = require('../../utils/essentials/logger');
const db = require('../../utils/essentials/dbUtils');
const { calculateTeamEffectiveProgress } = require('./bingoCalculations');

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
        await updateTeamLeaderboardForEvent(event_id);
        await updateLeaderboardForEvent(event_id);
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
 * 📊 Update Team Leaderboard for Event
 * - Recalculates points and completed tasks for each team.
 * - Uses `calculateTeamEffectiveProgress` to ensure fair progress allocation.
 *
 * @param {number} eventId - The ID of the event
 */
async function updateTeamLeaderboardForEvent(eventId) {
    logger.info(`[BingoLeaderboard] Recalculating team-based leaderboard for event #${eventId}`);

    // Fetch all tasks for the event
    const tasks = await db.getAll(
        `SELECT task_id, value, base_points 
         FROM bingo_tasks 
         WHERE task_id IN (
            SELECT DISTINCT task_id 
            FROM bingo_task_progress 
            WHERE event_id = ?
         )`,
        [eventId],
    );

    const teamProgressMap = {};

    for (const task of tasks) {
        const { task_id, value: target, base_points } = task;

        // Fetch all teams' progress for this task
        const teamProgressRows = await db.getAll(
            `SELECT team_id, player_id, SUM(progress_value) AS progress
             FROM bingo_task_progress
             WHERE event_id = ? AND task_id = ? AND team_id IS NOT NULL
             GROUP BY team_id, player_id`,
            [eventId, task_id],
        );

        // Group by team_id
        const teams = {};
        for (const row of teamProgressRows) {
            if (!teams[row.team_id]) teams[row.team_id] = [];
            teams[row.team_id].push({
                playerId: row.player_id,
                progress: row.progress,
            });
        }

        // Apply `calculateTeamEffectiveProgress` for each team
        for (const [team_id, members] of Object.entries(teams)) {
            const effectiveProgressList = calculateTeamEffectiveProgress(members, target);

            // Sum up effective progress for the team
            const totalEffectiveProgress = effectiveProgressList.reduce((sum, member) => sum + member.effectiveProgress, 0);

            // Determine if the task is completed
            const taskCompleted = totalEffectiveProgress >= target;
            if (!teamProgressMap[team_id]) {
                teamProgressMap[team_id] = { points: 0, completedTasks: 0 };
            }

            // Add base points if task is completed
            if (taskCompleted) {
                teamProgressMap[team_id].points += base_points;
                teamProgressMap[team_id].completedTasks += 1;
            }
        }
    }

    // Update the leaderboard
    for (const [team_id, progress] of Object.entries(teamProgressMap)) {
        const { points, completedTasks } = progress;

        const existingRow = await db.getOne(
            `SELECT leaderboard_id, pattern_bonus
             FROM bingo_leaderboard
             WHERE event_id = ? AND team_id = ?`,
            [eventId, team_id],
        );

        const pattern_bonus = existingRow?.pattern_bonus || 0;
        const finalPoints = points + pattern_bonus;

        if (!existingRow) {
            await db.runQuery(
                `INSERT INTO bingo_leaderboard (event_id, team_id, total_points, completed_tasks, pattern_bonus)
                 VALUES (?, ?, ?, ?, ?)`,
                [eventId, team_id, finalPoints, completedTasks, pattern_bonus],
            );
        } else {
            await db.runQuery(
                `UPDATE bingo_leaderboard
                 SET total_points = ?, completed_tasks = ?, pattern_bonus = ?, last_updated = CURRENT_TIMESTAMP
                 WHERE leaderboard_id = ?`,
                [finalPoints, completedTasks, pattern_bonus, existingRow.leaderboard_id],
            );
        }
    }
}

module.exports = {
    updateLeaderboard,
    updateLeaderboardForEvent,
    updateTeamLeaderboardForEvent,
};
