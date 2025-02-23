// /modules/services/bingo/bingoPatternRecognition.js
const logger = require('../../utils/essentials/logger');
const db = require('../../utils/essentials/dbUtils');

/**
 * Calculate Extra Points for Patterns
 * - Line (Row or Column) → 25 Points
 * - Full Board → 100 Points
 * @param patternType
 */
function calculatePatternBonus(patternType) {
    switch (patternType) {
    case 'line':
        return 250;
    case 'full_board':
        return 1000;
    default:
        return 0;
    }
}

/**
 * Checks for rows, columns, diagonals, corners on boards for events in 'ongoing'.
 * If completed, awards a pattern bonus to the user or team.
 * We also store the pattern in bingo_patterns_awarded to avoid duplicating points.
 */
async function checkPatterns() {
    logger.info('[BingoPatternRecognition] checkPatterns() → Start');

    // Only check boards that are 'active' and linked to ongoing events
    const boards = await db.getAll(`
        SELECT bs.event_id, bs.board_id, bb.grid_size
        FROM bingo_state bs
        JOIN bingo_boards bb ON bb.board_id = bs.board_id
        WHERE bs.state='ongoing'
          AND bb.is_active=1
    `);

    for (const b of boards) {
        await checkPatternsForBoard(b.board_id, b.event_id, b.grid_size);
    }

    logger.info('[BingoPatternRecognition] checkPatterns() → Done');
}

/**
 * Checks each participant on a given board for row/column/diagonal/corner completions.
 * @param boardId
 * @param eventId
 * @param gridSize
 */
async function checkPatternsForBoard(boardId, eventId, gridSize) {
    const participants = await db.getAll(
        `
        SELECT DISTINCT btp.player_id
        FROM bingo_board_cells bbc
        JOIN bingo_task_progress btp
          ON (bbc.task_id = btp.task_id)
        WHERE bbc.board_id = ?
        `,
        [boardId],
    );

    // Define which cell coordinates must be completed for corners, etc.
    const corners = [
        { row: 0, col: 0 },
        { row: 0, col: gridSize - 1 },
        { row: gridSize - 1, col: 0 },
        { row: gridSize - 1, col: gridSize - 1 },
    ];

    for (const { player_id } of participants) {
        // Check each row
        for (let row = 0; row < gridSize; row++) {
            await checkSinglePattern(boardId, eventId, player_id, {
                patternKey: `row_${row}`,
                patternType: 'line',
                cells: Array.from({ length: gridSize }, (_, col) => ({ row, col })),
            });
        }

        // Check columns
        for (let col = 0; col < gridSize; col++) {
            await checkSinglePattern(boardId, eventId, player_id, {
                patternKey: `col_${col}`,
                patternType: 'line',
                cells: Array.from({ length: gridSize }, (_, row) => ({ row, col })),
            });
        }

        // Check main diagonal
        await checkSinglePattern(boardId, eventId, player_id, {
            patternKey: 'diag_main',
            patternType: 'diagonal',
            cells: Array.from({ length: gridSize }, (_, i) => ({ row: i, col: i })),
        });

        // Check anti-diagonal
        await checkSinglePattern(boardId, eventId, player_id, {
            patternKey: 'diag_anti',
            patternType: 'diagonal',
            cells: Array.from({ length: gridSize }, (_, i) => ({ row: i, col: gridSize - 1 - i })),
        });

        // Check corners
        await checkSinglePattern(boardId, eventId, player_id, {
            patternKey: 'corners',
            patternType: 'corners',
            cells: corners,
        });

        // Check Full Board
        const allCells = Array.from({ length: gridSize }, (_, row) => Array.from({ length: gridSize }, (_, col) => ({ row, col }))).flat();

        await checkSinglePattern(boardId, eventId, player_id, {
            patternKey: 'full_board',
            patternType: 'full_board',
            cells: allCells,
        });
    }
}

/**
 * Checks if the given set of cells is fully completed, and if so, awards bonus once only.
 * @param boardId
 * @param eventId
 * @param playerId
 * @param root0
 * @param root0.patternKey
 * @param root0.patternType
 * @param root0.cells
 */
async function checkSinglePattern(boardId, eventId, playerId, { patternKey, patternType, cells }) {
    // 1) See if pattern already awarded
    const alreadyAwarded = await db.getOne(
        `
        SELECT awarded_id
        FROM bingo_patterns_awarded
        WHERE board_id = ?
          AND event_id = ?
          AND player_id = ?
          AND pattern_key = ?
        `,
        [boardId, eventId, playerId, patternKey],
    );
    if (alreadyAwarded) {
        // Already awarded, skip
        return;
    }

    // 2) Check if all cells are 'completed'
    const statusRows = await db.getAll(
        `
        SELECT btp.status, btp.task_id
        FROM bingo_board_cells bbc
        JOIN bingo_task_progress btp 
            ON (bbc.task_id = btp.task_id AND btp.player_id = ?)
        WHERE bbc.board_id = ?
          AND (bbc.row||'-'||bbc.column) IN (
            ${cells.map(() => '?').join(',')}
          )
        `,
        [playerId, boardId, ...cells.map((c) => `${c.row}-${c.col}`)],
    );

    if (statusRows.length < cells.length) {
        // Not all tasks exist in progress, so can't be complete
        return;
    }

    const isComplete = statusRows.every((r) => r.status === 'completed');
    if (!isComplete) {
        return;
    }

    // 3) If complete, calculate and award pattern bonus
    const bonusPoints = calculatePatternBonus(patternType);
    const taskIdsArray = statusRows.map((row) => row.task_id);

    await db.runQuery(
        `
        UPDATE bingo_task_progress
        SET extra_points = extra_points + ?
        WHERE task_id IN (${taskIdsArray.join(',')})
        `,
        [bonusPoints],
    );

    await db.runQuery(
        `
        UPDATE bingo_leaderboard
        SET pattern_bonus = pattern_bonus + ?
        WHERE event_id = ?
          AND player_id = ?
        `,
        [bonusPoints, eventId, playerId],
    );

    // 4) Insert record into bingo_patterns_awarded
    await db.runQuery(
        `
        INSERT INTO bingo_patterns_awarded (board_id, event_id, player_id, pattern_key)
        VALUES (?, ?, ?, ?)
        `,
        [boardId, eventId, playerId, patternKey],
    );

    logger.info(`[BingoPatternRecognition] Awarded pattern bonus: ${patternKey} +${bonusPoints} → Player #${playerId}`);
}

module.exports = {
    checkPatterns,
};
