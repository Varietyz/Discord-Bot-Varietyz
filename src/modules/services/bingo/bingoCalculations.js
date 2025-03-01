// /modules/services/bingo/bingoCalculations.js

const db = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');

/**
 * Decide whether you want to round partial points at each task
 * or accumulate as float. Here we show "round per task" to
 * match the existing approach in your team card.
 * @param progressValue
 * @param targetValue
 * @param basePoints
 * @param roundPerTask
 */
function computePartialPoints(progressValue, targetValue, basePoints, roundPerTask = true) {
    const effectiveProgress = Math.min(progressValue, targetValue);
    const raw = (effectiveProgress / targetValue) * basePoints;
    return roundPerTask ? Math.round(raw) : raw;
}

/**
 * Overall completion = ( partialPoints / totalBoardPoints ) * 100
 * @param totalPartial
 * @param totalBoardPoints
 */
function computeOverallPercentage(totalPartial, totalBoardPoints) {
    if (totalBoardPoints <= 0) return 0;
    return (totalPartial / totalBoardPoints) * 100;
}

/**
 * Fetch all tasks (base_points, value, etc.) for a given EVENT.
 * We assume there's a 1:1 relationship between event -> board, or you
 * can adapt the query to find the correct board via event_id.
 * @param eventId
 */
async function getBoardTasksForEvent(eventId) {
    // This query can vary if your schema differs
    return db.getAll(
        `
    SELECT bbc.task_id,
           bt.base_points,
           bt.value AS targetValue
    FROM bingo_board_cells bbc
    JOIN bingo_tasks bt ON bbc.task_id = bt.task_id
    WHERE bbc.board_id = (
        SELECT board_id
        FROM bingo_state
        WHERE event_id = ?
        LIMIT 1
    )
    `,
        [eventId],
    );
}

/**
 *
 * @param eventId
 * @param teamId
 * @param roundPerTask
 */
async function computeTeamPartialPoints(eventId, teamId, roundPerTask = true) {
    // 1) Gather tasks for this event
    const boardTasks = await getBoardTasksForEvent(eventId);
    const totalBoardPoints = boardTasks.reduce((sum, t) => sum + t.base_points, 0);

    // 2) Get the list of members in this team
    const members = await db.getAll(
        `
    SELECT player_id
    FROM bingo_team_members
    WHERE team_id = ?
  `,
        [teamId],
    );

    if (!members.length) {
        return { partialPointsMap: {}, teamTotalPartial: 0, totalBoardPoints };
    }

    // We might store partial points for each *task*, for debugging or scoreboard
    let teamTotalPartial = 0;
    const partialPointsMap = {};

    // For each task, sum all members' progress
    for (const task of boardTasks) {
        const { task_id, base_points, targetValue } = task;

        // Query all players’ progress for that task
        // sum them up
        const rows = await db.getAll(
            `
      SELECT player_id, progress_value
      FROM bingo_task_progress
      WHERE event_id = ?
        AND task_id = ?
        AND player_id IN (${members.map(() => '?').join(',')})
    `,
            [eventId, task_id, ...members.map((m) => m.player_id)],
        );

        // The total for the entire team on this task
        let taskSum = 0;
        for (const row of rows) {
            // If you want each member’s share individually:
            const partialPts = computePartialPoints(row.progress_value, targetValue, base_points, roundPerTask);

            taskSum += partialPts;

            // If you want to store how many partial pts each member contributed:
            partialPointsMap[row.player_id] = (partialPointsMap[row.player_id] ?? 0) + partialPts;
        }

        // Add this task’s total to the team’s overall partial
        teamTotalPartial += taskSum;
    }

    return { partialPointsMap, teamTotalPartial, totalBoardPoints };
}

/**
 * Computes partial points for an INDIVIDUAL, returning:
 *  - partialPoints
 *  - totalBoardPoints
 * @param eventId
 * @param playerId
 * @param roundPerTask
 */
async function computeIndividualPartialPoints(eventId, playerId, roundPerTask = true) {
    // Same approach, but for a single user
    const boardTasks = await getBoardTasksForEvent(eventId);
    const totalBoardPoints = boardTasks.reduce((sum, t) => sum + t.base_points, 0);

    let totalPartialPoints = 0;

    for (const task of boardTasks) {
        const { task_id, base_points, targetValue } = task;
        const row = await db.getOne(
            `
      SELECT progress_value
      FROM bingo_task_progress
      WHERE event_id = ?
        AND player_id = ?
        AND task_id = ?
      `,
            [eventId, playerId, task_id],
        );

        const progressValue = row?.progress_value || 0;
        const cappedProgress = Math.min(progressValue, targetValue);

        const taskPartialPoints = computePartialPoints(cappedProgress, targetValue, base_points, roundPerTask);
        totalPartialPoints += taskPartialPoints; // Accumulate correctly

        const existingPoints = await db.getOne(
            `
    SELECT points_awarded
    FROM bingo_task_progress
    WHERE event_id = ?
      AND player_id = ?
      AND task_id = ?
    `,
            [eventId, playerId, task_id],
        );

        // Only update points_awarded if it's currently 0
        if (!existingPoints || existingPoints.points_awarded === 0) {
            // ✅ STORE POINTS IN `points_awarded`
            await db.runQuery(
                `
        UPDATE bingo_task_progress
        SET points_awarded = ?
        WHERE event_id = ?
          AND player_id = ?
          AND task_id = ?
        `,
                [taskPartialPoints, eventId, playerId, task_id],
            );
        } else {
            logger.info(`[bingoCalculations] Skipping points update for Player #${playerId} on Task #${task_id} - Points already awarded.`);
        }
    }

    return {
        partialPoints: totalPartialPoints,
        totalBoardPoints,
    };
}

module.exports = {
    computePartialPoints,
    computeOverallPercentage,
    computeTeamPartialPoints,
    computeIndividualPartialPoints,
    getBoardTasksForEvent,
};
