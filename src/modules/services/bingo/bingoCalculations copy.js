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
 * Computes partial points for a team.
 *
 * - Points (partialPointsMap & teamTotalPartial) are calculated only from tasks marked as completed,
 *   by summing the `points_awarded` values.
 * - Overall progression (overallPartialPointsMap & teamTotalOverallPartial) is calculated using
 *   each member's current progress for every task, regardless of completion status.
 *
 * @param {number} eventId - The event ID.
 * @param {number} teamId - The team ID.
 * @returns {Promise<{
 *   partialPointsMap: Object,
 *   teamTotalPartial: number,
 *   totalBoardPoints: number,
 *   overallPartialPointsMap: Object,
 *   teamTotalOverallPartial: number
 * }>}
 */
async function computeTeamPartialPoints(eventId, teamId) {
    // 1. Fetch board tasks to determine the total available points.
    const boardTasks = await getBoardTasksForEvent(eventId);
    const totalBoardPoints = boardTasks.reduce((sum, t) => sum + t.base_points, 0);

    // 2. Retrieve team members.
    const members = await db.getAll(
        `
        SELECT player_id
        FROM bingo_team_members
        WHERE team_id = ?
        `,
        [teamId],
    );
    if (!members.length) {
        return {
            partialPointsMap: {},
            teamTotalPartial: 0,
            totalBoardPoints,
            overallPartialPointsMap: {},
            teamTotalOverallPartial: 0,
        };
    }

    // 3. Extract member IDs.
    const memberIds = members.map((m) => m.player_id);

    // 4. Calculate points from completed tasks only.
    //    (These points come from the DB column points_awarded.)
    const rows = await db.getAll(
        `
        SELECT player_id, SUM(points_awarded) AS total_points
        FROM bingo_task_progress
        WHERE event_id = ?
          AND player_id IN (${memberIds.map(() => '?').join(',')})
        GROUP BY player_id
        `,
        [eventId, ...memberIds],
    );
    const partialPointsMap = {};
    let teamTotalPartial = 0;
    for (const row of rows) {
        const pts = row.total_points || 0;
        partialPointsMap[row.player_id] = pts;
        teamTotalPartial += pts;
    }

    // 5. Compute overall progression for any progress (including partial completions).
    //    We'll fetch all progress records for team members for this event (ignoring status).
    const allProgress = await db.getAll(
        `
        SELECT player_id, task_id, progress_value
        FROM bingo_task_progress
        WHERE event_id = ?
          AND player_id IN (${memberIds.map(() => '?').join(',')})
        `,
        [eventId, ...memberIds],
    );
    // Create a lookup: { [player_id + '_' + task_id]: progress_value }
    const progressLookup = {};
    for (const record of allProgress) {
        progressLookup[`${record.player_id}_${record.task_id}`] = record.progress_value;
    }

    // Now, for every task and every team member, calculate their current partial progress.
    const overallPartialPointsMap = {};
    let teamTotalOverallPartial = 0;
    // For overall progression, we want to capture partial progress precisely,
    // so we pass false as the roundPerTask flag.
    for (const task of boardTasks) {
        const { task_id, base_points, targetValue } = task;
        for (const member of members) {
            const key = `${member.player_id}_${task_id}`;
            const progressValue = progressLookup[key] || 0;
            // Calculate partial progress (even if not completed).
            const partialOverall = computePartialPoints(progressValue, targetValue, base_points, false);
            overallPartialPointsMap[member.player_id] = (overallPartialPointsMap[member.player_id] || 0) + partialOverall;
            teamTotalOverallPartial += partialOverall;
        }
    }

    return {
        partialPointsMap,
        teamTotalPartial,
        totalBoardPoints,
        overallPartialPointsMap,
        teamTotalOverallPartial,
    };
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
        const isCompleted = await db.getOne('SELECT status FROM bingo_task_progress WHERE event_id = ? AND player_id = ? AND task_id = ?', [eventId, playerId, task_id]);
        if (isCompleted?.status === 'completed') {
            if (!existingPoints || existingPoints.points_awarded === 0) {
                logger.info(`[bingoCalculations] Task #${task_id} is completed for Player #${playerId}. Saving ${taskPartialPoints} pts.`);
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
    }

    return {
        partialPoints: totalPartialPoints,
        totalBoardPoints,
    };
}

/**
 * Helper function to calculate effective team progress.
 * It sorts team members in ascending order by their raw progress.
 * Then, starting from the lowest, it subtracts their progress from the target.
 * If a member's progress exceeds the remaining target, it's capped at the remaining value.
 *
 * @param {Array<{ playerId: string|number, progress: number }>} teamMembers - Array of team members with their raw progress.
 * @param {number} target - The target progress value.
 * @returns {Array<{ playerId: string|number, originalProgress: number, effectiveProgress: number }>}
 */
function calculateTeamEffectiveProgress(teamMembers, target) {
    // Clone and sort team members in ascending order by their recorded progress.
    const sortedMembers = [...teamMembers].sort((a, b) => a.progress - b.progress);
    let remainingTarget = target;
    const effectiveResults = [];

    // Process each member in sorted order.
    for (const member of sortedMembers) {
        // The effective contribution is the minimum between the member's progress and the remaining target.
        const effective = Math.min(member.progress, remainingTarget);
        effectiveResults.push({
            playerId: member.playerId,
            originalProgress: member.progress,
            effectiveProgress: effective,
        });
        remainingTarget -= effective;
        if (remainingTarget <= 0) break;
    }
    // If there are members left after the target is fully allocated, assign them zero effective progress.
    if (effectiveResults.length < sortedMembers.length) {
        for (let i = effectiveResults.length; i < sortedMembers.length; i++) {
            effectiveResults.push({
                playerId: sortedMembers[i].playerId,
                originalProgress: sortedMembers[i].progress,
                effectiveProgress: 0,
            });
        }
    }
    return effectiveResults;
}

module.exports = {
    computePartialPoints,
    computeOverallPercentage,
    computeTeamPartialPoints,
    computeIndividualPartialPoints,
    getBoardTasksForEvent,
    calculateTeamEffectiveProgress,
};
