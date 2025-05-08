const db = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
const { updatePlayerPoints } = require('../../utils/essentials/updatePlayerPoints');

function computePartialPoints(progressValue, targetValue, basePoints, roundPerTask = true) {
    const effectiveProgress = Math.min(progressValue, targetValue);
    const raw = (effectiveProgress / targetValue) * basePoints;
    return roundPerTask ? Math.round(raw) : raw;
}

function computeOverallPercentage(totalPartial, totalBoardPoints) {
    if (totalBoardPoints <= 0) return 0;
    return (totalPartial / totalBoardPoints) * 100;
}

async function getBoardTasksForEvent(eventId) {

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

async function computeTeamPartialPoints(eventId, teamId) {

    const boardTasks = await getBoardTasksForEvent(eventId);
    const totalBoardPoints = boardTasks.reduce((sum, t) => sum + t.base_points, 0);

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

    const memberIds = members.map((m) => m.player_id);

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

    const allProgress = await db.getAll(
        `SELECT player_id, task_id, progress_value
         FROM bingo_task_progress
         WHERE event_id = ? AND player_id IN (${memberIds.map(() => '?').join(',')})`,
        [eventId, ...memberIds],
    );

    const progressLookup = {};
    for (const record of allProgress) {
        progressLookup[`${record.player_id}_${record.task_id}`] = record.progress_value || 0;
    }

    const overallPartialPointsMap = {};
    let teamTotalOverallPartial = 0;

    for (const task of boardTasks) {
        const { task_id, base_points, targetValue } = task;
        let totalRawProgress = 0;

        for (const member of members) {
            const key = `${member.player_id}_${task_id}`;
            totalRawProgress += progressLookup[key] || 0;
        }
        const finalTeamProgress = Math.min(totalRawProgress, targetValue); 

        let remainingTarget = targetValue;
        const sortedMembers = members
            .map((m) => ({
                player_id: m.player_id,
                contribution: progressLookup[`${m.player_id}_${task_id}`] || 0,
            }))
            .sort((a, b) => b.contribution - a.contribution); 

        for (const member of sortedMembers) {
            if (remainingTarget <= 0) break; 
            const key = `${member.player_id}_${task_id}`;
            const cappedContribution = Math.min(progressLookup[key] || 0, remainingTarget);

            remainingTarget -= cappedContribution;

            const memberPoints = computePartialPoints(cappedContribution, targetValue, base_points, false);
            overallPartialPointsMap[member.player_id] = (overallPartialPointsMap[member.player_id] || 0) + memberPoints;
        }

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

async function computeIndividualPartialPoints(eventId, playerId, roundPerTask = true) {
    const boardTasks = await getBoardTasksForEvent(eventId);
    const totalBoardPoints = boardTasks.reduce((sum, t) => sum + t.base_points, 0);
    let totalPartialPoints = 0;

    for (const task of boardTasks) {
        const { task_id, base_points, targetValue } = task;

        const row = await db.getOne(
            `SELECT progress_value FROM bingo_task_progress
             WHERE event_id = ? AND player_id = ? AND task_id = ?`,
            [eventId, playerId, task_id],
        );

        const progressValue = row?.progress_value || 0;
        const cappedProgress = Math.min(progressValue, targetValue);
        const taskPartialPoints = computePartialPoints(cappedProgress, targetValue, base_points, roundPerTask);
        totalPartialPoints += taskPartialPoints;

        await saveTaskPointsAwarded(eventId, playerId, task_id, base_points, progressValue, targetValue, false);
    }

    return {
        partialPoints: totalPartialPoints,
        totalBoardPoints,
    };
}

async function saveTaskPointsAwarded(eventId, playerId, taskId, basePoints, progressValue, targetValue, isTeam = false) {
    try {
        let effectiveProgress = progressValue;

        if (isTeam) {

            const teamProgress = await db.getAll(
                `SELECT player_id, SUM(progress_value) AS progress, last_updated
                 FROM bingo_task_progress
                 WHERE event_id = ? AND task_id = ?
                 GROUP BY player_id`,
                [eventId, taskId],
            );

            const effectiveProgressList = calculateTeamEffectiveProgress(teamProgress, targetValue);

            const playerEffective = effectiveProgressList.find((m) => m.playerId === playerId);
            effectiveProgress = playerEffective ? playerEffective.effectiveProgress : 0;
        }

        const cappedProgress = Math.min(effectiveProgress, targetValue);
        let taskPartialPoints = computePartialPoints(cappedProgress, targetValue, basePoints, true);

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

        if (isCompleted?.status === 'completed') {

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

function calculateTeamEffectiveProgress(teamMembers, target) {

    const sortedMembers = [...teamMembers].sort((a, b) => {
        const timeDiff = new Date(a.last_updated) - new Date(b.last_updated);
        return timeDiff !== 0 ? timeDiff : a.playerId - b.playerId;
    });

    let remainingTarget = target; 
    const effectiveResults = [];

    for (const member of sortedMembers) {
        if (remainingTarget <= 0) {

            effectiveResults.push({
                playerId: member.playerId,
                originalProgress: member.progress,
                effectiveProgress: 0, 
            });
            continue;
        }

        let effective = Math.min(member.progress, remainingTarget);

        const existingContribution = effectiveResults.reduce((sum, m) => sum + m.effectiveProgress, 0);
        const excess = existingContribution + effective - target;

        if (excess > 0) {
            effective -= excess; 
        }

        effectiveResults.push({
            playerId: member.playerId,
            originalProgress: member.progress,
            effectiveProgress: effective,
        });

        remainingTarget -= effective;
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
