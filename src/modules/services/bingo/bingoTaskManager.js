const logger = require('../../utils/essentials/logger');
const db = require('../../utils/essentials/dbUtils');
const { calculateTeamEffectiveProgress } = require('./bingoCalculations');

async function updateAllTasks() {
    logger.info('[BingoTaskManager] updateAllTasks() → Start');
    await updateDataBasedTasks();
    logger.info('[BingoTaskManager] updateAllTasks() → Done');
}

async function updateDataBasedTasks() {
    const tasks = await db.getAll(`
        SELECT bbc.task_id, bt.type, bt.parameter, bt.value, bt.description
        FROM bingo_board_cells bbc
        JOIN bingo_tasks bt ON bbc.task_id = bt.task_id
        JOIN bingo_state bs ON bs.board_id = bbc.board_id
        WHERE bs.state = 'ongoing'
    `);

    if (tasks.length === 0) {
        logger.info('[BingoTaskManager] No data-based tasks found for ongoing events.');
        return;
    }

    for (const task of tasks) {
        await processDataTask(task);
    }
}

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

        const teamPlayers = await db.getAll(
            `
      SELECT btm.team_id, btm.player_id
      FROM bingo_team_members btm
      JOIN bingo_teams bt ON btm.team_id = bt.team_id
      WHERE bt.event_id = ?
      `,
            [event_id],
        );

        const soloPlayers = await db.getAll(
            `
      SELECT rr.player_id
      FROM registered_rsn rr
      JOIN clan_members cm ON rr.player_id = cm.player_id
      JOIN bingo_state bs ON bs.event_id = ?
      WHERE rr.player_id NOT IN (
        SELECT player_id FROM bingo_team_members WHERE event_id = ?
      )
      `,
            [event_id, event_id],
        );

        const teamIds = [...new Set(teamPlayers.map((p) => p.team_id))];
        for (const team_id of teamIds) {
            await processTeamTask(event_id, team_id, task_id, dataColumn, dataType, dataMetric, value);

        }

        for (const player of soloPlayers) {
            await processSoloPlayerTask(event_id, player.player_id, task_id, dataColumn, dataType, dataMetric, value);

        }
    }
}

async function processSoloPlayerTask(event_id, player_id, task_id, dataColumn, dataType, dataMetric, targetValue) {

    if (!dataColumn || !dataType || !dataMetric) {
        throw new Error('Missing required parameters: dataColumn, dataType, or dataMetric');
    }
    let team_id = await getPlayerTeamId(player_id);
    if (team_id === null) team_id = 0;

    if (team_id === 0) {

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

        const rawProgress = Math.max(0, currentValue - baselineValue);
        const cappedProgress = Math.min(rawProgress, targetValue);
        let status = 'incomplete';
        if (cappedProgress >= targetValue) {
            status = 'completed';
        } else if (cappedProgress > 0) {
            status = 'in-progress';
        }

        await upsertTaskProgress(event_id, player_id, task_id, cappedProgress, status);
    } else {
        logger.info(`skipping upsertTaskProgress for ${player_id} whos found in team id ${team_id}`);
    }
}

async function processTeamTask(event_id, team_id, task_id, dataColumn, dataType, dataMetric, targetValue) {

    if (!dataColumn || !dataType || !dataMetric) {
        throw new Error('Missing required parameters: dataColumn, dataType, or dataMetric');
    }

    await updateTeamEffectiveProgress(event_id, task_id, team_id, targetValue, dataColumn, dataType, dataMetric);
}

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

async function consolidateTeamTaskProgress(eventId) {
    const teamProgressRecords = await db.getAll(
        `
    SELECT team_id, task_id, status, SUM(progress_value) AS totalProgress
    FROM bingo_task_progress
    WHERE event_id = ?
      AND team_id IS NOT NULL
      AND team_id > 0
    GROUP BY team_id, task_id
    `,
        [eventId],
    );

    for (const record of teamProgressRecords) {
        const { team_id, task_id, status, totalProgress } = record;

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
        if (totalProgress > 0) logger.info(`[TeamProgress] Team ${team_id} contributed to task ${task_id} with a total progress of ${totalProgress}.`);
        if (totalProgress >= targetValue) {
            if (status !== 'completed')
                await db.runQuery(
                    `UPDATE bingo_task_progress
                 SET status = 'completed'
                 WHERE event_id = ?
                   AND team_id = ?
                   AND task_id = ?
                   AND status != 'completed'`,
                    [eventId, team_id, task_id],
                );
            logger.info(`[TeamProgress] Team ${team_id} has completed task ${task_id} with a total progress of ${totalProgress}.`);
        }
    }
}

async function upsertTaskProgress(event_id, player_id, task_id, progressVal, status) {
    try {

        let team_id = await getPlayerTeamId(player_id);
        if (team_id === null) {
            team_id = 0;
        }

        if (team_id !== 0) {
            logger.info(`[BingoTaskManager] Player #${player_id} is part of a team. Skipping solo upsert.`);
            return;
        }

        const taskDetails = await db.getOne('SELECT value FROM bingo_tasks WHERE task_id = ?', [task_id]);
        const targetValue = taskDetails?.value || 0;

        const isCompleted = await db.getOne('SELECT status FROM bingo_task_progress WHERE event_id = ? AND player_id = ? AND task_id = ?', [event_id, player_id, task_id]);
        if (isCompleted?.status === 'completed') {
            logger.info(`[BingoTaskManager] Task #${task_id} is already completed for Player #${player_id}. Skipping upsert.`);
            return;
        }

        const existing = await db.getOne(
            `SELECT progress_id, progress_value, status FROM bingo_task_progress 
     WHERE event_id = ? AND player_id = ? AND task_id = ?`,
            [event_id, player_id, task_id],
        );

        const newCappedProgress = Math.min(progressVal, targetValue);

        if (existing) {
            const storedProgress = existing.progress_value;

            if (newCappedProgress - storedProgress <= 0) {

                return;
            }
        }

        if (!existing) {
            if (newCappedProgress === 0) return;

            const isOnBoard = await isTaskOnBoard(event_id, task_id);
            if (!isOnBoard) {
                logger.warn(`[BingoTaskManager] Task #${task_id} is not on the board for Event #${event_id}. Skipping insert.`);
                return;
            }

            await db.runQuery(
                `INSERT INTO bingo_task_progress (event_id, player_id, task_id, progress_value, status, team_id)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [event_id, player_id, task_id, newCappedProgress, status, team_id],
            );
            logger.info(`[BingoTaskManager] New progress record added for Player #${player_id}, Task #${task_id} - Progress: ${newCappedProgress} (${status})`);
        } else {

            await db.runQuery(
                `UPDATE bingo_task_progress
                 SET progress_value = ?, 
                     status = ?, 
                     team_id = ?, 
                     last_updated = CURRENT_TIMESTAMP
                 WHERE progress_id = ?`,
                [newCappedProgress, status, team_id, existing.progress_id],
            );
            logger.info(`[BingoTaskManager] Updated progress for Player #${player_id}, Task #${task_id} - New Progress: ${newCappedProgress} (${status})`);
        }
    } catch (error) {
        logger.error(`[BingoTaskManager] Error upserting progress for Player #${player_id}, Task #${task_id}: ${error.message}`);
    }
}

async function updateTeamEffectiveProgress(event_id, task_id, team_id, targetValue, dataColumn, dataType, dataMetric) {

    if (!dataColumn || !dataType || !dataMetric) {
        throw new Error('Missing required parameters: dataColumn, dataType, or dataMetric');
    }

    const dataKey = `${dataType}_${dataMetric}_${dataColumn}`;

    const teamData = await db.getAll(
        `
        SELECT tm.player_id,
               COALESCE(pd.${dataColumn}, 0) AS currentValue,
               COALESCE(be.data_value, 0) AS baselineValue,
               pt.progress_id,
               pt.progress_value,
               pt.status,
               pt.last_updated
        FROM bingo_team_members tm
        LEFT JOIN player_data pd 
            ON tm.player_id = pd.player_id 
           AND pd.type = ? 
           AND pd.metric = ?
        LEFT JOIN bingo_event_baseline be 
            ON be.player_id = tm.player_id 
           AND be.event_id = ? 
           AND be.data_key = ?
        LEFT JOIN bingo_task_progress pt 
            ON pt.player_id = tm.player_id 
           AND pt.event_id = ? 
           AND pt.task_id = ?
        WHERE tm.team_id = ?
        `,
        [dataType, dataMetric, event_id, dataKey, event_id, task_id, team_id],
    );

    const teamProgress = teamData.map((member) => ({
        playerId: member.player_id,
        progress: Math.max(0, member.currentValue - member.baselineValue),
        last_updated: member.last_updated,
    }));

    const effectiveResults = calculateTeamEffectiveProgress(teamProgress, targetValue);

    for (const result of effectiveResults) {
        const memberRecord = teamData.find((m) => m.player_id === result.playerId);
        if (!memberRecord) continue;

        const newStatus = result.effectiveProgress >= targetValue ? 'completed' : result.effectiveProgress > 0 ? 'in-progress' : 'incomplete';

        if (memberRecord.progress_id) {
            const storedProgress = memberRecord.progress_value || 0;
            if (result.effectiveProgress - storedProgress <= 0) {

                continue;
            }
            await db.runQuery(
                `
                UPDATE bingo_task_progress
                SET progress_value = ?,
                    status = ?,
                    team_id = ?,
                    last_updated = CURRENT_TIMESTAMP
                WHERE progress_id = ?
                `,
                [result.effectiveProgress, newStatus, team_id, memberRecord.progress_id],
            );

            logger.info(`[BingoTaskManager] Updated team progress for Player #${result.playerId}, Task #${task_id} - New Effective Progress: ${result.effectiveProgress} (${newStatus})`);
        } else {
            const isOnBoard = await isTaskOnBoard(event_id, task_id);
            if (!isOnBoard) {
                logger.warn(`[BingoTaskManager] Task #${task_id} is not on the board for Event #${event_id}. Skipping insert for Player #${result.playerId}.`);
                continue;
            }
            await db.runQuery(
                `
                INSERT INTO bingo_task_progress (event_id, player_id, task_id, progress_value, status, team_id)
                VALUES (?, ?, ?, ?, ?, ?)
                `,
                [event_id, result.playerId, task_id, result.effectiveProgress, newStatus, team_id],
            );
            logger.info(`[BingoTaskManager] Inserted team progress for Player #${result.playerId}, Task #${task_id} - Effective Progress: ${result.effectiveProgress} (${newStatus})`);
        }
    }
}

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
