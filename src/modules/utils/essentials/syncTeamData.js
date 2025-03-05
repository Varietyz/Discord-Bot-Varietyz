const { calculateTeamEffectiveProgress } = require('../../services/bingo/bingoCalculations');
const db = require('./dbUtils');
const logger = require('./logger');

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
                `SELECT player_id, progress_value, status FROM bingo_task_progress 
                 WHERE event_id = ? AND team_id = ? AND task_id = ?`,
                [eventId, teamId, task_id],
            );

            const taskTarget = await db.getOne('SELECT value FROM bingo_tasks WHERE task_id = ?', [task_id]);
            if (!taskTarget || !taskTarget.value) continue;

            const teamMembersProgress = teamProgressData.map((member) => ({
                playerId: member.player_id,
                progress: member.progress_value,
                status: member.status,
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

/**
 * Synchronizes task completion when a player joins a team while ensuring progression capping.
 * @param {number} eventId - The event ID.
 * @param {number} teamId - The team ID.
 * @param {number} playerId - The joining player ID.
 
async function synchronizeTaskCompletion(eventId, teamId, playerId) {
    try {
        logger.info(`[TeamJoinSync] Checking task completion for Player #${playerId} in Team #${teamId}.`);
 
        const teamTasks = await db.getAll('SELECT DISTINCT task_id FROM bingo_task_progress WHERE event_id = ? AND team_id = ?', [eventId, teamId]);
 
        for (const { task_id } of teamTasks) {
            const teamProgressData = await db.getAll(
                `SELECT player_id, progress_value FROM bingo_task_progress 
                 WHERE event_id = ? AND team_id = ? AND task_id = ?`,
                [eventId, teamId, task_id],
            );
 
            const taskTarget = await db.getOne('SELECT value FROM bingo_tasks WHERE task_id = ?', [task_id]);
 
            if (!taskTarget || !taskTarget.value) continue;
 
            const teamMembersProgress = teamProgressData.map((member) => ({
                playerId: member.player_id,
                progress: member.progress_value,
            }));
 
            const effectiveProgress = calculateTeamEffectiveProgress(teamMembersProgress, taskTarget.value);
            const playerEffectiveProgress = effectiveProgress.find((entry) => entry.playerId === playerId);
 
            if (playerEffectiveProgress) {
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
 
            if (isTaskCompletedByTeam) {
                await db.runQuery(
                    `UPDATE bingo_task_progress 
                     SET status = 'completed' 
                     WHERE event_id = ? AND player_id = ? AND task_id = ?`,
                    [eventId, playerId, task_id],
                );
                logger.info(`[TeamJoinSync] Player #${playerId} marked as completed for Task #${task_id}.`);
            }
        }
    } catch (error) {
        logger.error(`[TeamJoinSync] Error while synchronizing tasks: ${error.message}`);
    }
}
 */

module.exports = synchronizeTaskCompletion;
