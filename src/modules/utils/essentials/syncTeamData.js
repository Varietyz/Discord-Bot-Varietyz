const { calculateTeamEffectiveProgress } = require('../../services/bingo/bingoCalculations');
const db = require('./dbUtils');
const logger = require('./logger');

/**
 *
 */
async function fixMismatchedTeamIds() {
    const query = `
        WITH current_event AS (
            SELECT event_id FROM bingo_state ORDER BY event_id DESC LIMIT 1
        )
        UPDATE bingo_task_progress AS btp
        SET team_id = btm.team_id
        FROM bingo_team_members AS btm, current_event
        WHERE btp.event_id = current_event.event_id
        AND btp.player_id = btm.player_id
        AND btp.team_id <> btm.team_id;
    `;

    try {
        const result = await db.runQuery(query);
        logger.info(`[fixMismatchedTeamIds] ✅ Updated ${result.changes || 0} mismatched team assignments.`);
    } catch (error) {
        logger.error(`[fixMismatchedTeamIds] ❌ Error updating team IDs: ${error.message}`);
    }
}

/**
 *
 * @param eventId
 * @param teamId
 * @param playerId
 */
async function synchronizeTaskCompletion(eventId, teamId, playerId) {
    try {
        logger.info(`[TeamJoinSync] Checking task completion for Player #${playerId} in Team #${teamId}.`);

        const teamTasks = await db.getAll('SELECT DISTINCT task_id FROM bingo_task_progress WHERE event_id = ? AND team_id = ?', [eventId, teamId]);

        for (const { task_id } of teamTasks) {
            const teamProgressData = await db.getAll(
                `SELECT player_id, progress_value, status, last_updated FROM bingo_task_progress 
                 WHERE event_id = ? AND team_id = ? AND task_id = ?`,
                [eventId, teamId, task_id],
            );

            const taskTarget = await db.getOne('SELECT value FROM bingo_tasks WHERE task_id = ?', [task_id]);
            if (!taskTarget || !taskTarget.value) continue;

            const teamMembersProgress = teamProgressData.map((member) => ({
                playerId: member.player_id,
                progress: member.progress_value,
                status: member.status,
                last_updated: member.last_updated,
            }));

            // Check if the player already has a completion recorded.
            const playerRecord = teamMembersProgress.find((entry) => entry.playerId === playerId);
            const alreadyCompleted = playerRecord && playerRecord.status === 'completed';

            const effectiveProgress = calculateTeamEffectiveProgress(teamMembersProgress, taskTarget.value);
            const playerEffectiveProgress = effectiveProgress.find((entry) => entry.playerId === playerId);

            // If the player's own record indicates a completion, respect that.
            if (alreadyCompleted) {
                logger.info(`[TeamJoinSync] Player #${playerId} already has a completed record for Task #${task_id}.`);
            } else if (playerEffectiveProgress) {
                await db.runQuery(
                    `INSERT INTO bingo_task_progress (event_id, player_id, task_id, progress_value, status, last_updated) 
                     VALUES (?, ?, ?, ?, 'in-progress', CURRENT_TIMESTAMP) 
                     ON CONFLICT(event_id, player_id, task_id) 
                     DO UPDATE SET progress_value = ?, last_updated = CURRENT_TIMESTAMP`,
                    [eventId, playerId, task_id, playerEffectiveProgress.effectiveProgress, playerEffectiveProgress.effectiveProgress],
                );
                logger.info(`[TeamJoinSync] Player #${playerId} capped at ${playerEffectiveProgress.effectiveProgress} progress for Task #${task_id}.`);
            }

            const isTaskCompletedByTeam = await db.getOne(
                `SELECT 1 FROM bingo_task_progress 
                 WHERE event_id = ? AND team_id = ? AND task_id = ? AND status = 'completed' 
                 LIMIT 1`,
                [eventId, teamId, task_id],
            );

            if (isTaskCompletedByTeam && !alreadyCompleted) {
                await db.runQuery(
                    `UPDATE bingo_task_progress 
                     SET status = 'completed' 
                     WHERE event_id = ? AND player_id = ? AND task_id = ?`,
                    [eventId, playerId, task_id],
                );
                logger.info(`[TeamJoinSync] Player #${playerId} marked as completed for Task #${task_id} due to team-wide completion.`);
            }
        }
    } catch (error) {
        logger.error(`[TeamJoinSync] Error while synchronizing tasks: ${error.message}`);
    }
}

module.exports = { fixMismatchedTeamIds, synchronizeTaskCompletion };
