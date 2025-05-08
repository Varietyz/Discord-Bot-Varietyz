const {
    computeIndividualPartialPoints,
    computeTeamPartialPoints,
    computeOverallPercentage,
} = require('../../modules/services/bingo/bingoCalculations');
const db = require('../../modules/utils/essentials/dbUtils');

const CACHE_TIME = 1 * 60 * 1000; 
const EVENT_DURATION = 28 * 24 * 60 * 60 * 1000; 

let cachedData = {
    lastFetch: 0,
    data: {},
};

async function fetchBingoData() {
    const now = Date.now();
    if (now - cachedData.lastFetch < CACHE_TIME) return cachedData.data;

    try {

        const activeEvent = await db.getOne(
            `SELECT * FROM bingo_state 
       WHERE state IN ('ongoing', 'upcoming') 
       ORDER BY event_id DESC LIMIT 1`
        );
        if (!activeEvent) throw new Error('No active event found');

        const activeBoard = await db.getOne(
            'SELECT * FROM bingo_boards WHERE board_id = ? LIMIT 1',
            [activeEvent.board_id]
        );

        const activeCells = await db.getAll(
            `SELECT 
           bbc.*,
           bt.description,
           bt.parameter,
           bt.value AS target,
           bt.base_points,
           bt.extra_points
       FROM bingo_board_cells bbc
       JOIN bingo_tasks bt ON bbc.task_id = bt.task_id
       WHERE bbc.board_id = ?
       ORDER BY row, column`,
            [activeBoard.board_id]
        );

        const compMetricsRows = await db.getAll(
            'SELECT metric FROM competitions WHERE type IN (\'SOTW\',\'BOTW\')'
        );
        const activeCompMetrics = compMetricsRows.map((row) => row.metric);
        activeCells.forEach((cell) => {
            if (activeCompMetrics.includes(cell.parameter)) {
                cell.activeMetric = true;
            }
        });

        const totalBoardPoints = activeCells.reduce(
            (sum, cell) => sum + (cell.base_points || 0),
            0
        );

        const activePatterns = await db.getAll(
            'SELECT * FROM bingo_pattern_rotation WHERE event_id = ?',
            [activeEvent.event_id]
        );

        const eventStart = activeEvent.start_time
            ? new Date(activeEvent.start_time)
            : null;
        const eventEnd = activeEvent.end_time
            ? new Date(activeEvent.end_time)
            : null;
        const elapsedTime = eventStart ? now - eventStart.getTime() : null;
        const timeUntilRotation = eventEnd ? eventEnd.getTime() - now : null;
        const nextEventStart = eventStart
            ? new Date(eventStart.getTime() + EVENT_DURATION).toISOString()
            : null;

        const latestTaskRotation = await db.getOne(
            'SELECT * FROM bingo_task_rotation ORDER BY last_selected DESC LIMIT 1'
        );
        const latestPatternRotation = await db.getOne(
            'SELECT * FROM bingo_pattern_rotation ORDER BY created_at DESC LIMIT 1'
        );

        const rotationInfo = {
            currentStart: eventStart ? eventStart.toISOString() : null,
            currentEnd: eventEnd ? eventEnd.toISOString() : null,
            elapsedTime, 
            timeUntilRotation,
            estimatedNextEventStart: nextEventStart,
            latestTaskRotation,
            latestPatternRotation,
            progressPercentage:
        eventEnd && totalBoardPoints > 0
            ? Number(
                computeOverallPercentage(
                    elapsedTime,
                    eventEnd.getTime() - eventStart.getTime()
                ).toFixed(2)
            )
            : 0,
        };

        const eventsPassedRow = await db.getOne(
            'SELECT COUNT(*) AS count FROM bingo_state WHERE state = \'completed\''
        );
        const eventsPassed = eventsPassedRow ? eventsPassedRow.count : 0;

        const pastEvents = await db.getAll(
            `SELECT event_id, COUNT(*) AS tasksCompleted, SUM(points_awarded) AS totalPoints, MAX(completed_at) AS lastCompleted
       FROM bingo_history
       GROUP BY event_id
       ORDER BY completed_at DESC
       LIMIT 5`
        );

        const playerProgress = await db.getAll(
            'SELECT * FROM bingo_task_progress WHERE event_id = ?',
            [activeEvent.event_id]
        );

        const contributedTasksMap = {};

        for (const row of playerProgress) {
            if (
                row.event_id === activeEvent.event_id &&
        row.status === 'completed' &&
        row.team_id > 0 &&
        row.points_awarded > 0
            ) {
                contributedTasksMap[row.player_id] =
          (contributedTasksMap[row.player_id] || 0) + 1;
            }
        }

        const playerHistory = await db.getAll(
            `SELECT player_id, team_id, event_id, status, points_awarded 
   FROM bingo_history 
   WHERE status = 'completed' AND team_id > 0 AND points_awarded > 0`
        );

        for (const row of playerHistory) {
            contributedTasksMap[row.player_id] =
        (contributedTasksMap[row.player_id] || 0) + 1;
        }

        const rawPlayerAgg = await db.getAll(
            `SELECT player_id, COUNT(*) AS tasksCompleted, SUM(points_awarded) AS totalPoints
       FROM bingo_task_progress
       WHERE event_id = ? AND status = 'completed'
       GROUP BY player_id`,
            [activeEvent.event_id]
        );

        const eventsParticipatedRows = await db.getAll(
            `SELECT player_id, COUNT(DISTINCT event_id) AS eventsParticipated
       FROM bingo_event_baseline
       GROUP BY player_id`
        );
        const eventsParticipatedMap = {};
        for (const row of eventsParticipatedRows) {
            eventsParticipatedMap[row.player_id] = row.eventsParticipated;
        }

        const playerBaselineRows = await db.getAll(
            'SELECT * FROM bingo_event_baseline WHERE event_id = ?',
            [activeEvent.event_id]
        );
        const baselineMap = {};
        for (const row of playerBaselineRows) {
            if (!baselineMap[row.player_id]) baselineMap[row.player_id] = {};
            baselineMap[row.player_id][row.data_key] = row.data_value;
        }

        const clanMembers = await db.getAll(
            'SELECT player_id, rsn, rank, joined_at FROM clan_members'
        );
        const clanMap = {};
        clanMembers.forEach((member) => {
            clanMap[member.player_id] = member;
        });

        const allRegisteredRsns = await db.getAll(
            'SELECT player_id, discord_id, rsn, registered_at FROM registered_rsn'
        );

        const registeredRsns = allRegisteredRsns.filter((reg) =>
            Object.prototype.hasOwnProperty.call(clanMap, reg.player_id)
        );

        const registeredMap = {};
        registeredRsns.forEach((rec) => {
            registeredMap[rec.player_id] = rec;
        });

        const allTimePointsRows = await db.getAll(
            'SELECT player_id, points FROM player_points WHERE type = \'bingo\''
        );
        const allTimePointsMap = {};
        allTimePointsRows.forEach(({ player_id, points }) => {
            allTimePointsMap[player_id] = points;
        });

        const playersMap = {};

        for (const agg of rawPlayerAgg) {
            const playerId = agg.player_id;
            const reg = registeredMap[playerId] || {};
            const clan = clanMap[playerId];
            playersMap[playerId] = {
                player_id: playerId,
                rsn: reg.rsn || (clan ? clan.rsn : null),
                discord_id: reg.discord_id || null,
                isClanMember: Boolean(clan),
                clanRank: clan ? clan.rank : null,
                joined_at: clan ? clan.joined_at : null,
                tasksCompleted: agg.tasksCompleted,
                totalPoints: agg.totalPoints || 0,
                eventsParticipated: eventsParticipatedMap[playerId] || 1,
                baseline: baselineMap[playerId] || {},
                contributedTasks: contributedTasksMap[playerId] || 0,
                allTimePoints: allTimePointsMap[playerId] || 0,
            };
        }

        const allPlayerIds = new Set([
            ...Object.keys(baselineMap),
            ...Object.keys(registeredMap),
            ...Object.keys(contributedTasksMap),
        ]);
        allPlayerIds.forEach((playerId) => {
            if (!playersMap[playerId] && clanMap[playerId]) {
                const reg = registeredMap[playerId] || {};
                const clan = clanMap[playerId];
                playersMap[playerId] = {
                    player_id: Number(playerId),
                    rsn: reg.rsn || clan.rsn,
                    discord_id: reg.discord_id || null,
                    isClanMember: true,
                    clanRank: clan.rank,
                    joined_at: clan.joined_at,
                    tasksCompleted: 0,
                    totalPoints: 0,
                    eventsParticipated: eventsParticipatedMap[playerId] || 1,
                    baseline: baselineMap[playerId] || {},
                    contributedTasks: contributedTasksMap[playerId] || 0,
                    allTimePoints: allTimePointsMap[playerId] || 0,
                };
            }
        });

        let players = Object.values(playersMap);

        players = await Promise.all(
            players.map(async (player) => {
                const { partialPoints } = await computeIndividualPartialPoints(
                    activeEvent.event_id,
                    player.player_id
                );
                const overallPercentage =
          totalBoardPoints > 0
              ? Number(
                  computeOverallPercentage(
                      partialPoints,
                      totalBoardPoints
                  ).toFixed(2)
              )
              : 0;
                return { ...player, overallPercentage };
            })
        );

        const activeTeams = await db.getAll(
            `SELECT team_id, event_id, team_name 
   FROM bingo_teams 
   WHERE event_id = ? ORDER BY created_at ASC`,
            [activeEvent.event_id]
        );
        const teamMembersRows = await db.getAll(
            'SELECT team_id, player_id FROM bingo_team_members'
        );

        const teams = await Promise.all(
            activeTeams.map(async (team) => {

                const members = teamMembersRows
                    .filter((tm) => tm.team_id === team.team_id)
                    .map((tm) => playersMap[tm.player_id] || { player_id: tm.player_id });

                const teamProgress = await computeTeamPartialPoints(
                    activeEvent.event_id,
                    team.team_id
                );
                const teamOverallPercentage =
          teamProgress.totalBoardPoints > 0
              ? Number(
                  computeOverallPercentage(
                      teamProgress.teamTotalOverallPartial,
                      teamProgress.totalBoardPoints
                  ).toFixed(2)
              )
              : 0;

                const enrichedMembers = await Promise.all(
                    members.map(async (member) => {
                        const { partialPoints } = await computeIndividualPartialPoints(
                            activeEvent.event_id,
                            member.player_id
                        );
                        const overallPercentage =
              totalBoardPoints > 0
                  ? Number(
                      computeOverallPercentage(
                          partialPoints,
                          totalBoardPoints
                      ).toFixed(2)
                  )
                  : 0;
                        return { ...member, overallPercentage };
                    })
                );

                const maxTasksCompleted = enrichedMembers.reduce(
                    (max, member) => Math.max(max, member.tasksCompleted || 0),
                    0
                );

                return {
                    team_id: team.team_id,
                    event_id: team.event_id,
                    team_name: team.team_name,
                    members: enrichedMembers,
                    aggregated: {
                        totalPoints: teamProgress.teamTotalPartial,

                        tasksCompleted: maxTasksCompleted,
                        overallPercentage: teamOverallPercentage,
                    },
                };
            })
        );

        const cleanedData = {
            activeEvent,
            activeBoard,
            activeCells,
            activePatterns,
            rotationInfo,
            eventsPassed,
            pastEvents,
            players,
            teams,
            rawPlayerProgress: playerProgress,
            totalBoardPoints,
        };

        cachedData = { lastFetch: now, data: cleanedData };
        return cleanedData;
    } catch (err) {
        throw new Error(`Failed to fetch cleaned bingo data: ${err.message}`);
    }
}

module.exports = {
    fetchBingoData,
};
