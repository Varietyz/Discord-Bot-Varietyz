// /modules/services/bingo/bingoTaskManager.js
const logger = require('../../utils/essentials/logger');
const db = require('../../utils/essentials/dbUtils');
const { updatePlayerPoints } = require('../../utils/essentials/updatePlayerPoints');

/**
 * Updates all tasks for both data-based and message-based tasks.
 */
async function updateAllTasks() {
    logger.info('[BingoTaskManager] updateAllTasks() → Start');
    await updateDataBasedTasks();
    await updateMessageBasedTasks();
    logger.info('[BingoTaskManager] updateAllTasks() → Done');
}

/**
 * Updates data-based tasks for team-based progression.
 * - Aggregates progress for teams.
 */
async function updateDataBasedTasks() {
    // Fetch tasks that are dynamic and data-based (excluding 'Drop')
    const tasks = await db.getAll(`
        SELECT bbc.task_id, bt.type, bt.parameter, bt.value, bt.description
        FROM bingo_board_cells bbc
        JOIN bingo_tasks bt ON bbc.task_id = bt.task_id
        JOIN bingo_state bs ON bs.board_id = bbc.board_id
        WHERE bs.state = 'ongoing'
            AND bt.type != 'Drop'
    `);

    if (tasks.length === 0) {
        logger.info('[BingoTaskManager] No data-based tasks found for ongoing events.');
        return;
    }

    for (const task of tasks) {
        await processDataTask(task);
    }
}

/**
 * Get data attributes for player_data lookup based on task type and parameter.
 * @param {string} type - The task type (Kill, Exp, Level, Score)
 * @param {string} parameter - The task parameter (e.g. vorkath, fishing, item_name)
 * @returns {Object} An object containing dataType, dataMetric, and dataKeyPattern
 */
function getDataAttributes(type, parameter) {
    let dataType, dataMetric, dataKeyPattern;
    switch (type) {
    case 'Kill':
        dataType = 'bosses';
        dataMetric = parameter;
        dataKeyPattern = `bosses_${parameter}_kills`;
        break;
    case 'Exp':
        dataType = 'skills';
        dataMetric = parameter;
        dataKeyPattern = `skills_${parameter}_exp`;
        break;
    case 'Level':
        dataType = 'skills';
        dataMetric = parameter;
        dataKeyPattern = `skills_${parameter}_level`;
        break;
    case 'Score':
        dataType = 'activities';
        dataMetric = parameter;
        dataKeyPattern = `activities_${parameter}_score`;
        break;
    default:
        throw new Error(`Unrecognized type: ${type}`);
    }
    return { dataType, dataMetric, dataKeyPattern };
}

/**
 *
 * @param task
 */
async function processDataTask(task) {
    const { task_id, type, parameter, value, description } = task;
    logger.info(`[BingoTaskManager] processDataTask: "${description}" (task #${task_id})`);

    const dataColumn = getDataColumn(type);
    const { dataType, dataMetric } = getDataAttributes(type, parameter);

    // Retrieve all ongoing events
    const ongoingEvents = await db.getAll(`
        SELECT event_id
        FROM bingo_state
        WHERE state = 'ongoing'
    `);
    if (ongoingEvents.length === 0) return;

    for (const { event_id } of ongoingEvents) {
        // Process team members
        const teamMembers = await db.getAll(
            `
            SELECT btm.team_id, btm.player_id
            FROM bingo_team_members btm
            JOIN bingo_teams bt ON btm.team_id = bt.team_id
            WHERE bt.event_id = ?
            `,
            [event_id],
        );
        for (const member of teamMembers) {
            await processPlayerTask(event_id, member.player_id, task_id, dataColumn, dataType, dataMetric, value);
        }

        // Process individuals (players who are not in any team)
        const individuals = await db.getAll(
            `
            SELECT rr.player_id
            FROM registered_rsn rr
            JOIN clan_members cm ON rr.player_id = cm.player_id
            JOIN bingo_state bs ON bs.event_id = ?
            WHERE rr.player_id NOT IN (
                SELECT player_id FROM bingo_team_members
            )
            `,
            [event_id],
        );
        for (const indiv of individuals) {
            await processPlayerTask(event_id, indiv.player_id, task_id, dataColumn, dataType, dataMetric, value);
        }
    }
}

/**
 *
 * @param event_id
 * @param player_id
 * @param task_id
 * @param dataColumn
 * @param dataType
 * @param dataMetric
 * @param targetValue
 */
async function processPlayerTask(event_id, player_id, task_id, dataColumn, dataType, dataMetric, targetValue) {
    // Get current value from player_data
    const currentRow = await db.getOne(
        `
        SELECT ${dataColumn} AS currentValue
        FROM player_data
        WHERE player_id = ?
          AND type = ?
          AND metric = ?
        `,
        [player_id, dataType, dataMetric],
    );
    const currentValue = currentRow?.currentValue || 0;

    // Get baseline value from bingo_event_baseline
    const dataKey = `${dataType}_${dataMetric}_${dataColumn}`;
    const baselineRow = await db.getOne(
        `
        SELECT data_value AS baselineValue
        FROM bingo_event_baseline
        WHERE event_id = ?
          AND player_id = ?
          AND data_key = ?
        `,
        [event_id, player_id, dataKey],
    );
    const baselineValue = baselineRow?.baselineValue || 0;

    // Calculate incremental progress made during the event
    const progressIncrement = Math.max(0, currentValue - baselineValue);

    // Determine status
    let status = 'incomplete';
    if (progressIncrement >= targetValue) {
        status = 'completed';
    } else if (progressIncrement > 0) {
        status = 'in-progress';
    }

    // Upsert the progress
    await upsertTaskProgress(event_id, player_id, task_id, progressIncrement, status);
}

/**
 * Get the correct data column based on task type.
 * @param {string} type - The task type (Kill, Exp, Level, Score)
 * @returns {string} The corresponding column in player_data
 */
function getDataColumn(type) {
    switch (type) {
    case 'Kill':
        return 'kills';
    case 'Exp':
        return 'exp';
    case 'Level':
        return 'level';
    case 'Score':
        return 'score';
    default:
        throw new Error(`Unrecognized type: ${type}`);
    }
}

/**
 * Updates message-based tasks.
 * - Note: Since baseline data is only applicable for dynamic data-based tasks, drop tasks are not handled here.
 */
async function updateMessageBasedTasks() {
    // Fetch ongoing events
    const ongoingEvents = await db.getAll(`
        SELECT event_id, start_time, end_time
        FROM bingo_state
        WHERE state='ongoing'
    `);

    if (ongoingEvents.length === 0) {
        logger.info('[BingoTaskManager] No ongoing events found.');
        return;
    }

    // Fetch all Drop tasks (if needed for messaging, but baseline does not include them)
    const tasks = await db.getAll(`
        SELECT task_id, parameter
        FROM bingo_tasks
        WHERE is_dynamic = 1
          AND type = 'Drop'
    `);

    if (tasks.length === 0) {
        logger.info('[BingoTaskManager] No Drop tasks found.');
        return;
    }

    for (const event of ongoingEvents) {
        const { event_id, start_time, end_time } = event;

        for (const task of tasks) {
            const { task_id, parameter } = task;

            // Query drops and raid_drops from messages.db
            const dropMessages = await db.messages.getAll(
                `
                SELECT rsn, COUNT(*) AS dropCount
                FROM (
                    SELECT rsn, message FROM drops WHERE timestamp BETWEEN ? AND ? AND message LIKE ?
                    UNION ALL
                    SELECT rsn, message FROM raid_drops WHERE timestamp BETWEEN ? AND ? AND message LIKE ?
                ) AS all_drops
                GROUP BY rsn
                `,
                [start_time, end_time, `%${parameter}%`, start_time, end_time, `%${parameter}%`],
            );

            // Match RSNs to player_id using the main database
            const combinedCounts = {};
            for (const { rsn, dropCount } of dropMessages) {
                const player = await db.getOne(
                    `
                    SELECT player_id 
                    FROM registered_rsn 
                    WHERE LOWER(rsn) = LOWER(?)
                    `,
                    [rsn],
                );

                if (player) {
                    combinedCounts[player.player_id] = (combinedCounts[player.player_id] || 0) + dropCount;
                }
            }

            // Update progress for each player
            for (const [player_id, progressVal] of Object.entries(combinedCounts)) {
                const status = progressVal > 0 ? 'completed' : 'incomplete';
                await upsertTaskProgress(event_id, player_id, task_id, progressVal, status);
            }
        }
    }

    logger.info('[BingoTaskManager] updateMessageBasedTasks() → Completed');
}

/**
 * Checks if the player is in a team and returns the team_id or null.
 * @param {number} player_id - The ID of the player
 * @returns {number|null} - The ID of the team or null if not in a team
 */
async function getPlayerTeamId(player_id) {
    try {
        const team = await db.getOne(
            `
            SELECT team_id
            FROM bingo_team_members
            WHERE player_id = ?
        `,
            [player_id],
        );
        return team ? team.team_id : null;
    } catch (error) {
        logger.error(`[BingoTaskManager] Error checking team for Player #${player_id}: ${error.message}`);
        return null;
    }
}

/**
 * Checks if the task is present on the board for the given event.
 * @param {number} event_id - The ID of the bingo event
 * @param {number} task_id - The ID of the task
 * @returns {boolean} - True if the task is on the board, False otherwise
 */
async function isTaskOnBoard(event_id, task_id) {
    const boardCheck = await db.getOne(
        `
        SELECT 1
        FROM bingo_board_cells bbc
        JOIN bingo_state bs ON bbc.board_id = bs.board_id
        WHERE bs.event_id = ?
          AND bbc.task_id = ?
        `,
        [event_id, task_id],
    );
    return !!boardCheck;
}

/**
 * Consolidates team task progress by summing individual contributions.
 * If the total progress for a team on a given task meets or exceeds the task's target value,
 * it marks that team's task progress as 'completed'.
 *
 * @param {number} eventId - The current event ID.
 */
async function consolidateTeamTaskProgress(eventId) {
    // Query to aggregate progress for each task by team.
    // This groups all progress entries (from team members) by team_id and task_id.
    const teamProgressRecords = await db.getAll(
        `
    SELECT team_id, task_id, SUM(progress_value) AS totalProgress
    FROM bingo_task_progress
    WHERE event_id = ?
      AND team_id IS NOT NULL
      AND team_id > 0
    GROUP BY team_id, task_id
    `,
        [eventId],
    );

    for (const record of teamProgressRecords) {
        const { team_id, task_id, totalProgress } = record;

        // Retrieve the target value for the task from the bingo_tasks table.
        const task = await db.getOne(
            `
      SELECT value
      FROM bingo_tasks
      WHERE task_id = ?
      `,
            [task_id],
        );

        if (!task) continue;
        const targetValue = task.value;
        logger.info(`[TeamProgress] Team ${team_id} contributed to task ${task_id} with a total progress of ${totalProgress}.`);
        // If the combined progress meets or exceeds the target, update the progress record for the team.
        if (totalProgress >= targetValue) {
            await db.runQuery(
                `
        UPDATE bingo_task_progress
        SET status = 'completed',
            progress_value = ?
        WHERE event_id = ?
          AND team_id = ?
          AND task_id = ?
        `,
                [totalProgress, eventId, team_id, task_id],
            );
            // You might also want to log or notify about the completion.
            logger.info(`[TeamProgress] Team ${team_id} has completed task ${task_id} with a total progress of ${totalProgress}.`);
        }
    }
}

/**
 * 🎯 Enhanced Task Progress Upsert Function
 * - Calculates points proportionally and rounds up for fairness.
 * - Distributes the exact base points without over or under.
 * - Adjusts the last contributor to balance the total.
 * - Supports both individual and team contributions.
 *
 * @param {number} event_id - The ID of the bingo event
 * @param {number} player_id - The ID of the player
 * @param {number} task_id - The ID of the task
 * @param {number} progressVal - The value of the progress made
 * @param {string} status - The status of the task ('incomplete', 'in-progress', 'completed')
 */
async function upsertTaskProgress(event_id, player_id, task_id, progressVal, status) {
    try {
        // ✅ Check if the task is already marked as completed
        const isCompleted = await db.getOne(
            `
            SELECT status
            FROM bingo_task_progress
            WHERE event_id = ?
              AND player_id = ?
              AND task_id = ?
            `,
            [event_id, player_id, task_id],
        );

        // ✅ Skip upsert if task is already completed
        if (isCompleted?.status === 'completed') {
            logger.info(`[BingoTaskManager] Task #${task_id} is already completed for Player #${player_id}. Skipping upsert.`);
            return;
        }

        // Retrieve the player's team ID internally
        const team_id = await getPlayerTeamId(player_id);

        // Check if the task progress already exists
        const existing = await db.getOne(
            `
            SELECT progress_id, progress_value, status, points_awarded
            FROM bingo_task_progress
            WHERE event_id = ?
              AND player_id = ?
              AND task_id = ?
            `,
            [event_id, player_id, task_id],
        );

        // ✅ Only upsert progress for incomplete or in-progress tasks
        if (status === 'incomplete' || status === 'in-progress') {
            // Calculate Points Proportionally with Rounding Up
            let points = 0;
            let basePoints = 0;
            let totalRequirement = 0;
            let totalPointsDistributed = 0;
            let lastPlayerIndex = -1;
            const allPoints = [];

            const task = await db.getOne(
                `
                SELECT base_points, value
                FROM bingo_tasks 
                WHERE task_id = ?
                `,
                [task_id],
            );
            basePoints = task?.base_points || 0;
            totalRequirement = task?.value || 1;

            // Get all contributors for this task
            const contributors = await db.getAll(
                `
                SELECT player_id, progress_value
                FROM bingo_task_progress
                WHERE event_id = ?
                  AND task_id = ?
                  AND (status = 'in-progress' OR status = 'incomplete')
                `,
                [event_id, task_id],
            );

            // Include current player in contributors
            contributors.push({ player_id, progress_value: progressVal });

            // Calculate points for each contributor with rounding up
            for (const contributor of contributors) {
                const contributionPercentage = (contributor.progress_value / totalRequirement) * 100;
                const calculatedPoints = Math.ceil((contributionPercentage / 100) * basePoints);

                // Store calculated points and total
                allPoints.push({ playerId: contributor.player_id, points: calculatedPoints });
                totalPointsDistributed += calculatedPoints;
                lastPlayerIndex++;
            }

            // Adjust the last contributor's points to balance the total
            const pointDifference = totalPointsDistributed - basePoints;
            if (pointDifference !== 0) {
                allPoints[lastPlayerIndex].points -= pointDifference;
            }

            // Get points for current player
            points = allPoints.find((p) => p.playerId === player_id)?.points || 0;

            await updatePlayerPoints(player_id, 'Bingo', points);

            // If player is in a team, also add points to the team's total
            if (team_id) {
                await db.runQuery(
                    `
                    UPDATE bingo_task_progress
                    SET progress_value = ?,
                        status = ?,
                        points_awarded = ?,
                        team_id = ?,
                        last_updated = CURRENT_TIMESTAMP
                    WHERE event_id = ?
                      AND team_id = ?
                      AND task_id = ?
                      AND player_id = ?
                    `,
                    [progressVal, status, points, team_id, event_id, team_id, task_id, player_id],
                );
                logger.info(`[BingoTaskManager] Awarded ${points} points to Player #${player_id} in Team #${team_id} for Task #${task_id}`);
            }

            if (!existing) {
                // Check if task is on the board before inserting
                const isOnBoard = await isTaskOnBoard(event_id, task_id);
                if (!isOnBoard) {
                    logger.warn(`[BingoTaskManager] Task #${task_id} is not on the board for Event #${event_id}. Skipping insert.`);
                    return;
                }
                // Insert new record if not present
                await db.runQuery(
                    `
                    INSERT INTO bingo_task_progress (event_id, player_id, task_id, progress_value, status, team_id, points_awarded)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    `,
                    [event_id, player_id, task_id, progressVal, status, team_id, points],
                );
                logger.info(`[BingoTaskManager] New progress record added for Player #${player_id}, Task #${task_id} - Progress: ${progressVal} (${status}), Team ID: ${team_id}, Points: ${points}`);
            } else {
                // Update the existing record
                await db.runQuery(
                    `
                    UPDATE bingo_task_progress
                    SET progress_value = ?,
                        status = ?,
                        points_awarded = ?,
                        team_id = ?,
                        last_updated = CURRENT_TIMESTAMP
                    WHERE progress_id = ?
                    `,
                    [progressVal, status, points, team_id, existing.progress_id],
                );
                logger.info(`[BingoTaskManager] Updated progress for Player #${player_id}, Task #${task_id} - New Progress: ${progressVal} (${status}), Team ID: ${team_id}, Points: ${points}`);
            }
        }
    } catch (error) {
        logger.error(`[BingoTaskManager] Error upserting progress for Player #${player_id}, Task #${task_id}: ${error.message}`);
    }
}

/**
 * Refactored: Records event baseline for all players when the event starts.
 * - Correctly populates the baseline table with initial values.
 * - Excludes drop tasks by only handling tasks of type 'Kill', 'Exp', 'Level', and 'Score'.
 * @param {number} eventId - The ID of the event.
 */
async function recordEventBaseline(eventId) {
    logger.info(`[BingoTaskManager] recordEventBaseline for event #${eventId}`);

    // Get all players registered for this event
    const players = await db.getAll(
        `
        SELECT rr.player_id, rr.rsn
        FROM registered_rsn rr
        JOIN bingo_state bs ON bs.event_id = ?
        WHERE bs.state = 'ongoing'
    `,
        [eventId],
    );

    if (players.length === 0) {
        logger.warn(`[BingoTaskManager] No players found for event #${eventId}`);
        return;
    }

    // Get all dynamic tasks linked to this board (excluding 'Drop')
    const tasks = await db.getAll(
        `
        SELECT bbc.task_id, bt.type, bt.parameter
        FROM bingo_board_cells bbc
        JOIN bingo_tasks bt ON bbc.task_id = bt.task_id
        JOIN bingo_state bs ON bs.board_id = bbc.board_id
        WHERE bs.event_id = ?
          AND bt.is_dynamic = 1
          AND bt.type IN ('Kill', 'Exp', 'Level', 'Score')
    `,
        [eventId],
    );

    if (tasks.length === 0) {
        logger.warn(`[BingoTaskManager] No dynamic data-based tasks found for event #${eventId}`);
        return;
    }

    // Construct baseline records
    const baselineRecords = [];
    for (const player of players) {
        for (const task of tasks) {
            const { type, parameter } = task;
            const dataColumn = getDataColumn(type);
            const { dataType, dataMetric } = getDataAttributes(type, parameter);

            // Fetch current value from player_data
            const dataRow = await db.getOne(
                `
                SELECT ${dataColumn} AS baselineValue
                FROM player_data
                WHERE player_id = ?
                  AND type = ?
                  AND metric = ?
                `,
                [player.player_id, dataType, dataMetric],
            );

            const baselineValue = dataRow?.baselineValue || 0;
            const dataKey = `${dataType}_${dataMetric}_${dataColumn}`;

            // Prepare baseline record including RSN for context
            baselineRecords.push({
                eventId,
                playerId: player.player_id,
                rsn: player.rsn,
                dataKey,
                baselineValue,
            });

            logger.debug(`[BingoTaskManager] Player ${player.player_id} (${player.rsn}) baseline value: ${baselineValue} (Key: ${dataKey})`);
        }
    }

    // Insert baselines into bingo_event_baseline table using INSERT OR REPLACE
    let successfulInserts = 0;
    for (const record of baselineRecords) {
        try {
            const result = await db.runQuery(
                `
                INSERT OR REPLACE INTO bingo_event_baseline
                (event_id, player_id, rsn, data_key, data_value, baseline_type)
                VALUES (?, ?, ?, ?, ?, 'initial')
                `,
                [record.eventId, record.playerId, record.rsn, record.dataKey, record.baselineValue],
            );

            if (result.changes > 0) {
                successfulInserts++;
                logger.info(`[BingoTaskManager] Baseline recorded for Player ${record.playerId} (${record.rsn}) - ${record.dataKey}: ${record.baselineValue}`);
            } else {
                logger.warn(`[BingoTaskManager] No changes made for Player ${record.playerId} (${record.rsn}) - ${record.dataKey}`);
            }
        } catch (error) {
            logger.error(`[BingoTaskManager] Failed to insert baseline for Player ${record.playerId} (${record.rsn}) - ${error.message}`);
        }
    }

    logger.info(`[BingoTaskManager] Event baseline recorded for event #${eventId}. Successful inserts: ${successfulInserts}`);
}

/**
 * Initializes task progress for all players when the event starts.
 * Ensures that all players have a row in bingo_task_progress for each task.
 * @param {number} eventId - The ID of the event.
 */
async function initializeTaskProgress(eventId) {
    logger.info(`[BingoTaskManager] initializeTaskProgress for event #${eventId}`);

    const players = await db.getAll(
        `
        SELECT rr.player_id
        FROM registered_rsn rr
        JOIN clan_members cm ON rr.player_id = cm.player_id
        JOIN bingo_state bs ON bs.event_id = ?
    `,
        [eventId],
    );

    const tasks = await db.getAll(
        `
        SELECT bbc.task_id
        FROM bingo_board_cells bbc
        JOIN bingo_state bs ON bs.board_id = bbc.board_id
        WHERE bs.event_id = ?
    `,
        [eventId],
    );

    for (const player of players) {
        for (const task of tasks) {
            await db.runQuery(
                `
                INSERT OR IGNORE INTO bingo_task_progress (event_id, player_id, task_id, progress_value, status, extra_points)
                VALUES (?, ?, ?, 0, 'incomplete', 0)
            `,
                [eventId, player.player_id, task.task_id],
            );
        }
    }

    logger.info(`[BingoTaskManager] Task progress initialized for event #${eventId}`);
}

// /modules/services/bingo/bingoTaskManager.js

/**
 * Updates event baseline for new members who joined after the event started.
 * - Checks ongoing events and adds baselines for newly registered players.
 */
async function updateEventBaseline() {
    logger.info('[BingoTaskManager] updateEventBaseline() → Start');

    // Get all ongoing events
    const ongoingEvents = await db.getAll(`
        SELECT event_id
        FROM bingo_state
        WHERE state = 'ongoing'
    `);

    for (const { event_id } of ongoingEvents) {
        // Get all players who registered after the event started and don't have a baseline
        const newPlayers = await db.getAll(
            `
            SELECT rr.player_id, rr.rsn
            FROM registered_rsn rr
            JOIN clan_members cm ON rr.player_id = cm.player_id
            LEFT JOIN bingo_event_baseline beb
                ON beb.player_id = rr.player_id AND beb.event_id = ?
            WHERE beb.event_id IS NULL
        `,
            [event_id],
        );

        if (newPlayers.length === 0) {
            logger.info(`[BingoTaskManager] No new players found for event #${event_id}`);
            continue;
        }

        for (const player of newPlayers) {
            logger.info(`[BingoTaskManager] Recording baseline for new player: ${player.rsn} (player_id=${player.player_id})`);

            // Get dynamic tasks linked to this board (excluding 'Drop')
            const tasks = await db.getAll(
                `
                SELECT bbc.task_id, bt.type, bt.parameter
                FROM bingo_board_cells bbc
                JOIN bingo_tasks bt ON bbc.task_id = bt.task_id
                JOIN bingo_state bs ON bs.board_id = bbc.board_id
                WHERE bs.event_id = ?
                  AND bt.is_dynamic = 1
                  AND bt.type IN ('Kill', 'Exp', 'Level', 'Score')
            `,
                [event_id],
            );

            for (const task of tasks) {
                const { type, parameter } = task;
                const dataColumn = getDataColumn(type);
                const { dataType, dataMetric } = getDataAttributes(type, parameter);

                // Fetch current value from player_data
                const dataRow = await db.getOne(
                    `
                    SELECT ${dataColumn} AS baselineValue
                    FROM player_data
                    WHERE player_id = ?
                      AND type = ?
                      AND metric = ?
                    `,
                    [player.player_id, dataType, dataMetric],
                );

                const baselineValue = dataRow?.baselineValue || 0;
                const dataKey = `${dataType}_${dataMetric}_${dataColumn}`;

                // Insert baseline into bingo_event_baseline
                await db.runQuery(
                    `
                    INSERT OR REPLACE INTO bingo_event_baseline
                    (event_id, player_id, rsn, data_key, data_value, baseline_type)
                    VALUES (?, ?, ?, ?, ?, 'late_join')
                    `,
                    [event_id, player.player_id, player.rsn, dataKey, baselineValue],
                );

                logger.info(`[BingoTaskManager] Baseline recorded for new player ${player.rsn} (player_id=${player.player_id}) - ${dataKey}: ${baselineValue}`);
            }
        }
    }

    logger.info('[BingoTaskManager] updateEventBaseline() → Completed');
}

module.exports = {
    updateAllTasks,
    updateDataBasedTasks,
    updateMessageBasedTasks,
    recordEventBaseline,
    initializeTaskProgress,
    consolidateTeamTaskProgress,
    getDataColumn,
    getDataAttributes,
    upsertTaskProgress,
    updateEventBaseline,
};
