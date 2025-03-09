// /modules/services/bingo/bingoCalculations.js

const db = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
const { updatePlayerPoints } = require('../../utils/essentials/updatePlayerPoints');

/**
 * Decide whether you want to round partial points at each task
 * or accumulate as float. Here we show "round per task" to
 * match the existing approach in your team card.
 * @param progressValue
 * @param targetValue
 * @param basePoints
 * @param roundPerTask
 *@returns
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
 * @returns
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
 * @returns
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
 * by summing the `points_awarded` values.
 * - Overall progression (overallPartialPointsMap & teamTotalOverallPartial) is calculated using
 * each member's current progress for every task, regardless of completion status.
 *
 * @param {number} eventId - The event ID.
 * @param {number} teamId - The team ID.
 * @returns {Promise<{
 * partialPointsMap: Object,
 * teamTotalPartial: number,
 * totalBoardPoints: number,
 * overallPartialPointsMap: Object,
 * teamTotalOverallPartial: number
 * }>}
 */
async function computeTeamPartialPoints(eventId, teamId) {
    // 1. Fetch board tasks to determine the total available points.
    const boardTasks = await getBoardTasksForEvent(eventId);
    const totalBoardPoints = boardTasks.reduce((sum, t) => sum + t.base_points, 0);

    // 2. Retrieve team members.
    const members = await db.getAll('SELECT player_id FROM bingo_team_members WHERE team_id = ?', [teamId]);

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
    const rows = await db.getAll(
        `SELECT player_id, SUM(points_awarded) AS total_points
         FROM bingo_task_progress
         WHERE event_id = ? AND player_id IN (${memberIds.map(() => '?').join(',')})
         GROUP BY player_id`,
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
    const allProgress = await db.getAll(
        `SELECT player_id, task_id, progress_value
         FROM bingo_task_progress
         WHERE event_id = ? AND player_id IN (${memberIds.map(() => '?').join(',')})`,
        [eventId, ...memberIds],
    );

    // Create a lookup table { "playerId_taskId": progressValue }
    const progressLookup = {};
    for (const record of allProgress) {
        progressLookup[`${record.player_id}_${record.task_id}`] = record.progress_value || 0;
    }

    // Initialize storage for tracking overall partial points (per team)
    const overallPartialPointsMap = {};
    let teamTotalOverallPartial = 0;

    // Process each task on the board (team-wide)
    for (const task of boardTasks) {
        const { task_id, base_points, targetValue } = task;
        let totalRawProgress = 0;

        // Compute total team progress for this task (capped at `targetValue`)
        for (const member of members) {
            const key = `${member.player_id}_${task_id}`;
            totalRawProgress += progressLookup[key] || 0;
        }
        const finalTeamProgress = Math.min(totalRawProgress, targetValue); // ✅ Cap total progress

        // ✅ Distribute progress fairly across team members
        let remainingTarget = targetValue;
        const sortedMembers = members
            .map((m) => ({
                player_id: m.player_id,
                contribution: progressLookup[`${m.player_id}_${task_id}`] || 0,
            }))
            .sort((a, b) => b.contribution - a.contribution); // Sort by highest contribution first

        for (const member of sortedMembers) {
            if (remainingTarget <= 0) break; // Stop if we've allocated all progress
            const key = `${member.player_id}_${task_id}`;
            const cappedContribution = Math.min(progressLookup[key] || 0, remainingTarget);

            // ✅ Ensure fair distribution
            remainingTarget -= cappedContribution;

            // ✅ Compute member contribution points
            const memberPoints = computePartialPoints(cappedContribution, targetValue, base_points, false);
            overallPartialPointsMap[member.player_id] = (overallPartialPointsMap[member.player_id] || 0) + memberPoints;
        }

        // ✅ Accumulate overall points contribution (final team-wide points)
        teamTotalOverallPartial += computePartialPoints(finalTeamProgress, targetValue, base_points, false);
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
 * - partialPoints
 * - totalBoardPoints
 *
 * @param {number} eventId - The Bingo Event ID.
 * @param {number} playerId - The Player ID.
 * @param {boolean} roundPerTask - Whether to round points per task.
 * @returns
 */
async function computeIndividualPartialPoints(eventId, playerId, roundPerTask = true) {
    const boardTasks = await getBoardTasksForEvent(eventId);
    const totalBoardPoints = boardTasks.reduce((sum, t) => sum + t.base_points, 0);
    let totalPartialPoints = 0;

    for (const task of boardTasks) {
        const { task_id, base_points, targetValue } = task;

        // ✅ Fetch player's raw progress
        const row = await db.getOne(
            `SELECT progress_value FROM bingo_task_progress
             WHERE event_id = ? AND player_id = ? AND task_id = ?`,
            [eventId, playerId, task_id],
        );

        const progressValue = row?.progress_value || 0;
        const cappedProgress = Math.min(progressValue, targetValue);
        const taskPartialPoints = computePartialPoints(cappedProgress, targetValue, base_points, roundPerTask);
        totalPartialPoints += taskPartialPoints;

        // ✅ Save points in the database (delegated to new function)
        await saveTaskPointsAwarded(eventId, playerId, task_id, base_points, progressValue, targetValue, false);
    }

    return {
        partialPoints: totalPartialPoints,
        totalBoardPoints,
    };
}

/**
 * ✅ Save Task Points for an Individual or Team
 * - Ensures correct `points_awarded` update based on effective progress.
 * - Prevents duplicate updates if points have already been awarded.
 *
 * @param {number} eventId - The Bingo Event ID.
 * @param {number} playerId - The Player ID.
 * @param {number} taskId - The Task ID.
 * @param {number} basePoints - The base points of the task.
 * @param {number} progressValue - The player's raw progress.
 * @param {number} targetValue - The required progress to complete the task.
 * @param {boolean} isTeam - Whether the player is in a team.
 */
async function saveTaskPointsAwarded(eventId, playerId, taskId, basePoints, progressValue, targetValue, isTeam = false) {
    try {
        let effectiveProgress = progressValue;

        if (isTeam) {
            // ✅ Fetch all team members' progress for this task
            const teamProgress = await db.getAll(
                `SELECT player_id, SUM(progress_value) AS progress, last_updated
                 FROM bingo_task_progress
                 WHERE event_id = ? AND task_id = ?
                 GROUP BY player_id`,
                [eventId, taskId],
            );

            // ✅ Calculate effective progress for the team
            const effectiveProgressList = calculateTeamEffectiveProgress(teamProgress, targetValue);

            // ✅ Get the player's adjusted contribution
            const playerEffective = effectiveProgressList.find((m) => m.playerId === playerId);
            effectiveProgress = playerEffective ? playerEffective.effectiveProgress : 0;
        }

        // ✅ Ensure progress doesn't exceed task target
        const cappedProgress = Math.min(effectiveProgress, targetValue);
        let taskPartialPoints = computePartialPoints(cappedProgress, targetValue, basePoints, true);

        // ✅ Check if task is already completed for the player
        const isCompleted = await db.getOne(
            `SELECT status FROM bingo_task_progress 
             WHERE event_id = ? AND player_id = ? AND task_id = ?`,
            [eventId, playerId, taskId],
        );

        const activeParameter = await db.getOne(
            `
            SELECT parameter
            FROM bingo_tasks
            WHERE task_id = ?
            `,
            [taskId],
        );

        const comps = await db.getAll(`
              SELECT metric
              FROM competitions
              WHERE type IN ('SOTW','BOTW')
            `);

        if (taskPartialPoints > 0 && comps.some((comp) => comp.metric === activeParameter?.parameter)) {
            taskPartialPoints += 50;
        }

        // ✅ Only update points if the task is marked as "completed"
        if (isCompleted?.status === 'completed') {
            // ✅ Fetch existing `points_awarded`
            const existingPoints = await db.getOne(
                `SELECT points_awarded FROM bingo_task_progress
                 WHERE event_id = ? AND player_id = ? AND task_id = ?`,
                [eventId, playerId, taskId],
            );

            if (!existingPoints || existingPoints.points_awarded === 0) {
                logger.info(`[bingoCalculations] Task #${taskId} is completed for Player #${playerId}. Saving ${taskPartialPoints} pts.`);

                await db.runQuery(
                    `UPDATE bingo_task_progress
                     SET points_awarded = ?
                     WHERE event_id = ? AND player_id = ? AND task_id = ?`,
                    [taskPartialPoints, eventId, playerId, taskId],
                );
                await updatePlayerPoints(playerId, 'bingo', taskPartialPoints);
            } else {
                logger.info(`[bingoCalculations] Skipping points update for Player #${playerId} on Task #${taskId} - Points already awarded.`);
            }
        }
    } catch (error) {
        logger.error(`[saveTaskPointsAwarded] Error saving points for Player #${playerId}, Task #${taskId}: ${error.message}`);
    }
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
    // Sort by `last_updated`, tie-breaker by `player_id` for deterministic order
    const sortedMembers = [...teamMembers].sort((a, b) => {
        const timeDiff = new Date(a.last_updated) - new Date(b.last_updated);
        return timeDiff !== 0 ? timeDiff : a.playerId - b.playerId;
    });

    let remainingTarget = target; // Total task goal
    const effectiveResults = [];

    for (const member of sortedMembers) {
        if (remainingTarget <= 0) {
            // If we've already allocated all possible progress, zero out the remaining members
            effectiveResults.push({
                playerId: member.playerId,
                originalProgress: member.progress,
                effectiveProgress: 0, // No excess progress allowed
            });
            continue;
        }

        // If there's progress already allocated, deduct it from the highest contributor
        let effective = Math.min(member.progress, remainingTarget);

        // ✅ If another player has over-progressed, deduct it from their total
        const existingContribution = effectiveResults.reduce((sum, m) => sum + m.effectiveProgress, 0);
        const excess = existingContribution + effective - target;

        if (excess > 0) {
            effective -= excess; // ✅ Deduct excess from the highest contributor
        }

        // ✅ Save the new effective progress
        effectiveResults.push({
            playerId: member.playerId,
            originalProgress: member.progress,
            effectiveProgress: effective,
        });

        // Reduce the remaining progress allocation
        remainingTarget -= effective;
    }

    return effectiveResults;
}

/**
function calculateTeamEffectiveProgress(teamMembers, target) {
    // Sort by last_updated to prioritize older contributions first
    const sortedMembers = [...teamMembers].sort((a, b) => new Date(a.last_updated) - new Date(b.last_updated));
 
    let remainingTarget = target;
    const effectiveResults = [];
 
    for (const member of sortedMembers) {
        if (remainingTarget <= 0) {
            // Cap any further contributions at 0
            effectiveResults.push({
                playerId: member.playerId,
                originalProgress: member.progress,
                effectiveProgress: 0, // No excess progress allowed
            });
            continue;
        }
 
        // Assign contribution, ensuring it does not exceed the remaining target
        const effective = Math.min(member.progress, remainingTarget);
        effectiveResults.push({
            playerId: member.playerId,
            originalProgress: member.progress,
            effectiveProgress: effective,
        });
 
        // Reduce the remaining target accordingly
        remainingTarget -= effective;
    }
 
    return effectiveResults;
}
 */
module.exports = {
    computePartialPoints,
    computeOverallPercentage,
    computeTeamPartialPoints,
    computeIndividualPartialPoints,
    getBoardTasksForEvent,
    calculateTeamEffectiveProgress,
};
