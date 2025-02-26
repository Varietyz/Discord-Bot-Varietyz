// /modules/services/bingo/bingoLeaderboard.js
const logger = require('../../utils/essentials/logger');
const db = require('../../utils/essentials/dbUtils');

/**
 * Summarizes points for 'ongoing' events, including team or player points.
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
        // If you also want a team-based ranking table:
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

    // Aggregation now calculates both the count of completed tasks and the sum of base points from completed tasks.
    const progressRows = await db.getAll(
        `
    SELECT 
        btp.player_id,
        COUNT(CASE WHEN btp.status = 'completed' THEN 1 END) AS completed_tasks,
        SUM(CASE WHEN btp.status = 'completed' THEN bt.base_points ELSE 0 END) AS completed_points,
        SUM(btp.extra_points) AS extra_sum
    FROM bingo_task_progress btp
    JOIN bingo_tasks bt ON btp.task_id = bt.task_id
    WHERE btp.event_id = ?
    GROUP BY btp.player_id
    `,
        [eventId],
    );

    for (const row of progressRows) {
        // completed_tasks is now the number of tasks completed.
        const { player_id, completed_tasks, completed_points, extra_sum } = row;

        // Retrieve pattern_bonus from the existing leaderboard row, if any.
        const leaderRow = await db.getOne(
            `
        SELECT leaderboard_id, pattern_bonus
        FROM bingo_leaderboard
        WHERE event_id = ?
          AND player_id = ?
          AND (team_id IS NULL OR team_id = 0)
        `,
            [eventId, player_id],
        );

        const pattern_bonus = leaderRow?.pattern_bonus || 0;
        // Total points still include the sum of base points plus extra points and any bonus.
        const total_points = (completed_points || 0) + (extra_sum || 0) + pattern_bonus;

        if (!leaderRow) {
            await db.runQuery(
                `
            INSERT INTO bingo_leaderboard (event_id, team_id, player_id, total_points, completed_tasks, pattern_bonus)
            VALUES (?, 0, ?, ?, ?, ?)
            `,
                [eventId, player_id, total_points, completed_tasks, pattern_bonus],
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
                [total_points, completed_tasks, pattern_bonus, leaderRow.leaderboard_id],
            );
        }
    }
}

/**
 * NEW FUNCTION: Recalculates total_points for each TEAM.
 *   total_points = sum(# tasks completed by all members) + sum(extra_points) + sum of pattern_bonus
 * Because each team might also get pattern bonuses if you're awarding them collectively.
 * @param eventId
 */
async function updateTeamLeaderboardForEvent(eventId) {
    logger.info(`[BingoLeaderboard] Recalculating team-based leaderboard for event #${eventId}`);

    // Sum progress by team_id:
    const progressRows = await db.getAll(
        `
    SELECT 
        btp.team_id,
        SUM(CASE WHEN btp.status = 'completed' THEN bt.base_points ELSE 0 END) AS completed_points,
        SUM(btp.extra_points) AS extra_sum
    FROM bingo_task_progress btp
    JOIN bingo_tasks bt ON btp.task_id = bt.task_id
    WHERE btp.event_id = ?
      AND btp.team_id IS NOT NULL
      AND btp.team_id > 0
    GROUP BY btp.team_id
    `,
        [eventId],
    );

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
        }
    }
}

module.exports = {
    updateLeaderboard,
    updateLeaderboardForEvent,
    updateTeamLeaderboardForEvent,
};
