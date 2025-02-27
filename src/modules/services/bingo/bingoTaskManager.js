// /modules/services/bingo/bingoTaskManager.js
const logger = require('../../utils/essentials/logger');
const db = require('../../utils/essentials/dbUtils');

/**
 *
 */
async function updateAllTasks() {
    logger.info('[BingoTaskManager] updateAllTasks() → Start');
    await updateDataBasedTasks();
    logger.info('[BingoTaskManager] updateAllTasks() → Done');
}

/**
 *
 */
async function updateDataBasedTasks() {
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
 *
 * @param type
 * @param parameter
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

    const ongoingEvents = await db.getAll(`
        SELECT event_id
        FROM bingo_state
        WHERE state = 'ongoing'
    `);
    if (ongoingEvents.length === 0) return;

    for (const { event_id } of ongoingEvents) {
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

        const individuals = await db.getAll(
            `
            SELECT rr.player_id
            FROM registered_rsn rr
            JOIN clan_members cm ON rr.player_id = cm.player_id
            JOIN bingo_state bs ON bs.event_id = ?
            WHERE rr.player_id NOT IN (
    SELECT player_id FROM bingo_team_members
    WHERE event_id = ?
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

    const progressIncrement = Math.max(0, currentValue - baselineValue);

    let status = 'incomplete';
    if (progressIncrement >= targetValue) {
        status = 'completed';
    } else if (progressIncrement > 0) {
        status = 'in-progress';
    }

    await upsertTaskProgress(event_id, player_id, task_id, progressIncrement, status);
}

/**
 *
 * @param type
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
 *
 * @param player_id
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
 *
 * @param event_id
 * @param task_id
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
 *
 * @param eventId
 */
async function consolidateTeamTaskProgress(eventId) {
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
        if (totalProgress >= targetValue) {
            await db.runQuery(
                `
        UPDATE bingo_task_progress
        SET status = 'completed'
        WHERE event_id = ?
          AND team_id = ?
          AND task_id = ?
        `,
                [eventId, team_id, task_id],
            );
            logger.info(`[TeamProgress] Team ${team_id} has completed task ${task_id} with a total progress of ${totalProgress}.`);
        }
    }
}

/**
 *
 * @param event_id
 * @param player_id
 * @param task_id
 * @param progressVal
 * @param status
 */
async function upsertTaskProgress(event_id, player_id, task_id, progressVal, status) {
    try {
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

        if (isCompleted?.status === 'completed') {
            logger.info(`[BingoTaskManager] Task #${task_id} is already completed for Player #${player_id}. Skipping upsert.`);
            return;
        }

        const team_id = await getPlayerTeamId(player_id);

        const existing = await db.getOne(
            `
            SELECT progress_id, progress_value, status
            FROM bingo_task_progress
            WHERE event_id = ?
              AND player_id = ?
              AND task_id = ?
            `,
            [event_id, player_id, task_id],
        );

        if (!existing) {
            const isOnBoard = await isTaskOnBoard(event_id, task_id);
            if (!isOnBoard) {
                logger.warn(`[BingoTaskManager] Task #${task_id} is not on the board for Event #${event_id}. Skipping insert.`);
                return;
            }

            await db.runQuery(
                `
                INSERT INTO bingo_task_progress (event_id, player_id, task_id, progress_value, status, team_id)
                VALUES (?, ?, ?, ?, ?, ?)
                `,
                [event_id, player_id, task_id, progressVal, status, team_id],
            );
            logger.info(`[BingoTaskManager] New progress record added for Player #${player_id}, Task #${task_id} - Progress: ${progressVal} (${status}), Team ID: ${team_id}`);
        } else {
            await db.runQuery(
                `
                UPDATE bingo_task_progress
                SET progress_value = ?,
                    status = ?,
                    team_id = ?,
                    last_updated = CURRENT_TIMESTAMP
                WHERE progress_id = ?
                `,
                [progressVal, status, team_id, existing.progress_id],
            );
        }
    } catch (error) {
        logger.error(`[BingoTaskManager] Error upserting progress for Player #${player_id}, Task #${task_id}: ${error.message}`);
    }
}

/**
 *
 * @param eventId
 */
async function recordEventBaseline(eventId) {
    logger.info(`[BingoTaskManager] recordEventBaseline for event #${eventId}`);

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

    const baselineRecords = [];
    for (const player of players) {
        for (const task of tasks) {
            const { type, parameter } = task;
            const dataColumn = getDataColumn(type);
            const { dataType, dataMetric } = getDataAttributes(type, parameter);

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
 *
 * @param eventId
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

/**
 *
 */
async function updateEventBaseline() {
    logger.info('[BingoTaskManager] updateEventBaseline() → Start');

    const ongoingEvents = await db.getAll(`
        SELECT event_id
        FROM bingo_state
        WHERE state = 'ongoing'
    `);

    for (const { event_id } of ongoingEvents) {
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
    recordEventBaseline,
    initializeTaskProgress,
    consolidateTeamTaskProgress,
    getDataColumn,
    getDataAttributes,
    upsertTaskProgress,
    updateEventBaseline,
};
