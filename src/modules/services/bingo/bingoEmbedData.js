const db = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
const { calculatePatternBonus } = require('./bingoPatternRecognition');

/**
 *
 * @param eventId
 * @param playerId
 */
async function getProgressEmbedData(eventId, playerId) {
    try {
        const progressQuery = `
      SELECT 
        btp.event_id, 
        btp.task_id, 
        btp.player_id,
        rr.rsn, 
        bt.description AS taskName, 
        bt.value AS targetValue,
        COALESCE(btp.progress_value, 0) AS progressValue,
        ROUND(COALESCE(btp.progress_value, 0) / bt.value * 100, 2) AS completionPercent,
        btp.last_updated,
        bt.base_points,
        COALESCE(btp.extra_points, 0) AS extraPoints
      FROM bingo_task_progress btp
      JOIN bingo_tasks bt ON bt.task_id = btp.task_id
      JOIN registered_rsn rr ON rr.player_id = btp.player_id
      WHERE btp.event_id = ?
        AND btp.player_id = ?
        AND btp.status IN ('in-progress', 'completed')
      ORDER BY btp.last_updated DESC
      LIMIT 1
    `;
        const row = await db.getOne(progressQuery, [eventId, playerId]);
        if (!row) {
            logger.warn(`[getProgressEmbedData] No tasks found for Player #${playerId} in Event #${eventId}`);
            return null;
        }

        const patternBonusQuery = `
      SELECT 
        bpa.pattern_key, 
        bpa.bonus_points,
        bpa.awarded_at
      FROM bingo_patterns_awarded bpa
      WHERE bpa.event_id = ?
        AND bpa.player_id = ?
      ORDER BY bpa.awarded_at DESC
    `;
        const patternBonuses = await db.getAll(patternBonusQuery, [eventId, playerId]);

        const historicalQuery = `
      SELECT 
        bl.total_points AS previousTotalPoints,
        bl.completed_tasks AS previousCompletedTasks
      FROM bingo_leaderboard bl
      WHERE bl.player_id = ?
        AND bl.event_id = (
          SELECT MAX(event_id) 
          FROM bingo_state 
          WHERE state = 'completed'
            AND event_id < ?
        )
    `;
        const historicalComparison = await db.getOne(historicalQuery, [playerId, eventId]);

        return {
            eventId: row.event_id,
            playerId: row.player_id,
            rsn: row.rsn,
            taskName: row.taskName,
            points: row.base_points,
            extraPoints: row.extraPoints,
            completionPercent: row.completionPercent,
            lastUpdated: row.last_updated,
            patternBonuses,
            historicalComparison,
        };
    } catch (err) {
        logger.error(`[getProgressEmbedData] Error: ${err.message}`);
        return null;
    }
}

/**
 * Retrieves Final Results Embed Data for a Bingo Event.
 * - Fetches Top Players, Top Teams, and Pattern Bonuses.
 * @param {number} eventId - The ID of the Bingo event.
 * @returns {Object} - Event results including top players, teams, and pattern bonuses.
 */
async function getFinalResultsEmbedData(eventId) {
    try {
        // 🎯 Fetch Top 5 Players (Individual)
        const topPlayersQuery = `
            SELECT 
                rr.rsn, 
                bl.total_points,
                bl.completed_tasks, 
                bl.pattern_bonus
            FROM bingo_leaderboard bl
            JOIN registered_rsn rr ON rr.player_id = bl.player_id
            WHERE bl.event_id = ?
              AND (
                    bl.team_id = 0 OR 
                    bl.team_id IS NULL OR 
                    bl.player_id NOT IN (
                        SELECT player_id 
                        FROM bingo_team_members
                    )
                )
            ORDER BY bl.total_points DESC
            LIMIT 5
        `;
        const topPlayers = await db.getAll(topPlayersQuery, [eventId]);

        // 🎯 Fetch Top 3 Teams
        const topTeamsQuery = `
            SELECT 
                t.team_name, 
                bl.total_points,
                bl.completed_tasks, 
                bl.pattern_bonus,
                ROUND(SUM(btp.points_awarded) / bl.total_points * 100, 2) AS contributionPercent
            FROM bingo_leaderboard bl
            JOIN bingo_teams t ON t.team_id = bl.team_id
            LEFT JOIN bingo_task_progress btp ON btp.team_id = t.team_id
            WHERE bl.event_id = ?
              AND bl.team_id > 0
            GROUP BY t.team_name
            ORDER BY bl.total_points DESC
            LIMIT 3
        `;
        const topTeams = await db.getAll(topTeamsQuery, [eventId]);

        // 🎯 Fetch Pattern Bonuses
        const patternBonusesQuery = `
            SELECT 
                bpa.pattern_key, 
                rr.rsn
            FROM bingo_patterns_awarded bpa
            JOIN registered_rsn rr ON rr.player_id = bpa.player_id
            WHERE bpa.event_id = ?
        `;
        const patternBonusesRaw = await db.getAll(patternBonusesQuery, [eventId]);

        // ✅ Calculate Bonus Points Using calculatePatternBonus()
        const patternBonuses = patternBonusesRaw.map((bonus) => {
            return {
                pattern_key: bonus.pattern_key,
                rsn: bonus.rsn,
                bonus_points: calculatePatternBonus(bonus.pattern_key),
            };
        });

        return { eventId, topPlayers, topTeams, patternBonuses };
    } catch (err) {
        logger.error(`[getFinalResultsEmbedData] Error: ${err.message}`);
        return null;
    }
}

/**
 *
 * @param eventId
 */
async function getNewCompletions(eventId) {
    const query = `
        SELECT 
            btp.event_id, 
            btp.task_id, 
            btp.player_id,
            rr.rsn, 
            bt.description AS taskName, 
            bt.parameter,
            btp.last_updated,
            btp.points_awarded,     
            be.embed_id,
            be.status
        FROM bingo_task_progress btp
        JOIN bingo_tasks bt ON bt.task_id = btp.task_id
        JOIN registered_rsn rr ON rr.player_id = btp.player_id
        LEFT JOIN bingo_embeds be 
            ON be.task_id = btp.task_id 
            AND be.player_id = btp.player_id 
            AND be.embed_type = 'progress'
        WHERE btp.status = 'completed'
          AND (be.embed_id IS NULL OR be.status = 'deleted')
        ORDER BY btp.last_updated DESC
    `;
    return await db.getAll(query, [eventId]);
}

/**
 *
 * @param eventId
 */
async function getPlayerProgress(eventId) {
    return await db.getAll(
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
}

/**
 * 📊 Get Team Progress for Leaderboard
 * - Sums up completed points, extra points, and completed tasks.
 * - A task is considered completed if total progress meets or exceeds the target.
 *
 * @param {number} eventId - The ID of the event
 * @returns {Promise<Array>} - Array of team progress objects
 */
async function getTeamProgress(eventId) {
    return await db.getAll(
        `
        SELECT 
            team_id,
            SUM(completed_points) AS completed_points,
            SUM(extra_points) AS extra_sum,
            COUNT(DISTINCT CASE WHEN total_progress >= target THEN task_id END) AS completed_tasks
        FROM (
            SELECT 
                btp.team_id,
                btp.task_id,
                SUM(btp.progress_value) AS total_progress,
                bt.value AS target,
                bt.base_points AS completed_points,
                btp.extra_points
            FROM bingo_task_progress btp
            JOIN bingo_tasks bt ON btp.task_id = bt.task_id
            WHERE btp.event_id = ?
              AND btp.team_id IS NOT NULL
              AND btp.team_id > 0
            GROUP BY btp.team_id, btp.task_id
        ) AS task_sums
        GROUP BY team_id
    `,
        [eventId],
    );
}

/**
 *
 * @param eventId
 */
async function getIndividualLeaderboard(eventId) {
    return await db.getAll(
        `
        SELECT 
            rr.rsn, 
            bl.total_points, 
            bl.completed_tasks,
            ROUND((bl.completed_tasks / (
                SELECT COUNT(*)
                FROM bingo_board_cells bbc
                JOIN bingo_boards bb ON bbc.board_id = bb.board_id
                WHERE bb.event_id = bl.event_id
            )) * 100, 2) AS completionPercent
        FROM bingo_leaderboard bl
        JOIN registered_rsn rr ON rr.player_id = bl.player_id
        WHERE bl.event_id = ?
          AND (
    bl.team_id = 0 OR 
    bl.team_id IS NULL OR 
    bl.player_id NOT IN (
        SELECT player_id 
        FROM bingo_team_members 
        WHERE event_id = ?
    )
)

        ORDER BY bl.total_points DESC
        LIMIT 10;
        `,
        [eventId],
    );
}

/**
 *
 * @param eventId
 */
async function getTeamLeaderboard(eventId) {
    return await db.getAll(
        `
        SELECT 
            t.team_name, 
            bl.total_points, 
            bl.completed_tasks,
            ROUND((bl.completed_tasks / (
                SELECT COUNT(*)
                FROM bingo_board_cells bbc
                JOIN bingo_boards bb ON bbc.board_id = bb.board_id
                WHERE bb.event_id = bl.event_id
            )) * 100, 2) AS completionPercent
        FROM bingo_leaderboard bl
        JOIN bingo_teams t ON t.team_id = bl.team_id
        WHERE bl.event_id = ?
          AND bl.team_id IS NOT NULL
        ORDER BY bl.total_points DESC
        `,
        [eventId],
    );
}

/**
 * 📝 Retrieves the task progress for a player in a specific event.
 * - Includes the task status to check for completion.
 *
 * @param {number} eventId - The ID of the event
 * @param {number} playerId - The ID of the player
 * @returns {Promise<Array>} - Array of task progress objects
 */
async function getPlayerTaskProgress(eventId, playerId) {
    const tasks = await db.getAll(
        `
            SELECT 
                bt.description AS task_name, 
                bt.parameter,
                COALESCE(SUM(btp.progress_value), 0) AS progress, 
                bt.value AS target,
                COALESCE(MAX(btp.status), 'incomplete') AS status
            FROM bingo_board_cells bbc
            JOIN bingo_tasks bt ON bbc.task_id = bt.task_id
            LEFT JOIN bingo_task_progress btp 
                ON btp.task_id = bt.task_id 
                AND btp.event_id = ? 
                AND btp.player_id = ?
            WHERE bbc.board_id = (SELECT board_id FROM bingo_state WHERE event_id = ?)
            GROUP BY bt.task_id
        `,
        [eventId, playerId, eventId],
    );
    return tasks;
}

/**
 *
 * @param eventId
 * @param teamId
 */
async function getTeamTaskProgress(eventId, teamId) {
    const tasks = await db.getAll(
        `
            SELECT 
                bt.description AS task_name, 
                bt.parameter,
                COALESCE(SUM(btp.progress_value), 0) AS progress, 
                bt.value AS target,
                COALESCE(MAX(btp.status), 'incomplete') AS status
            FROM bingo_board_cells bbc
            JOIN bingo_tasks bt ON bbc.task_id = bt.task_id
            LEFT JOIN bingo_task_progress btp 
                ON btp.task_id = bt.task_id 
                AND btp.event_id = ? 
                AND btp.team_id = ?
            WHERE bbc.board_id = (SELECT board_id FROM bingo_state WHERE event_id = ?)
            GROUP BY bt.task_id
        `,
        [eventId, teamId, eventId],
    );
    return tasks;
}

/**
 *
 * @param eventId
 */
async function getTopPlayers(eventId) {
    return await db.getAll(
        `
        SELECT rr.rsn, rr.player_id, bl.total_points, bl.completed_tasks
        FROM bingo_leaderboard bl
        JOIN registered_rsn rr ON rr.player_id = bl.player_id
        WHERE bl.event_id = ?
        ORDER BY bl.total_points DESC
        LIMIT 9
        `,
        [eventId],
    );
}

/**
 *
 * @param eventId
 */
async function getTopTeams(eventId) {
    return await db.getAll(
        `
        SELECT t.team_name, t.team_id, bl.total_points, bl.completed_tasks
        FROM bingo_leaderboard bl
        JOIN bingo_teams t ON t.team_id = bl.team_id
        WHERE bl.event_id = ?
        ORDER BY bl.total_points DESC
        LIMIT 5
        `,
        [eventId],
    );
}

module.exports = {
    getProgressEmbedData,
    getFinalResultsEmbedData,
    getNewCompletions,
    getPlayerProgress,
    getTeamProgress,
    getIndividualLeaderboard,
    getTeamLeaderboard,
    getPlayerTaskProgress,
    getTeamTaskProgress,
    getTopPlayers,
    getTopTeams,
};
