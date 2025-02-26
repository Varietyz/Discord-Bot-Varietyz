// /modules/services/bingo/bingoPatternRecognition.js
const logger = require('../../utils/essentials/logger');
const db = require('../../utils/essentials/dbUtils');
const { getLinePatterns, getDiagonalPatterns, getCornersPattern, getCrossPattern, getXPattern, getOuterBorderPattern, getFullBoardPattern } = require('./bingoPatterns');

/**
 * 🎲 Calculate Extra Points for Patterns
 * - Line (Row or Column) → 250 Points
 * - Multiple Lines → 500 Points
 * - Diagonal → 500 Points
 * - Both Diagonals → 1000 Points
 * - Corners → 750 Points
 * - Cross → 1500 Points
 * - X Pattern → 1000 Points
 * - Plus Pattern → 1000 Points
 * - Outer Border → 2000 Points
 * - Full Board → 3000 Points
 * @param {string} patternType - Type of Bingo Pattern
 * @returns {number} - Bonus Points for the Pattern
 */
function calculatePatternBonus(patternType) {
    switch (patternType) {
    case 'line':
        return 250;
    case 'multiple_lines':
        return 500;
    case 'diagonal':
        return 500;
    case 'both_diagonals':
        return 1000;
    case 'corners':
        return 750;
    case 'cross':
        return 1500;
    case 'x_pattern':
        return 1000;
    case 'plus':
        return 1000;
    case 'outer_border':
        return 2000;
    case 'full_board':
        return 3000;
    default:
        return 0;
    }
}

/**
 * 🎲 Main Function to Check Patterns for All Boards and Events
 */
async function checkPatterns() {
    logger.info('[BingoPatternRecognition] checkPatterns() → Start');
    try {
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
    } catch (err) {
        logger.error(`[BingoPatternRecognition] checkPatterns() error: ${err.message}`);
    }
    logger.info('[BingoPatternRecognition] checkPatterns() → Done');
}

/**
 * 🎲 Checks Patterns for Each Board and Player
 * @param {number} boardId - ID of the Bingo Board
 * @param {number} eventId - ID of the Bingo Event
 * @param {number} gridSize - Size of the Grid (e.g., 5 for 5x5)
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

    for (const { player_id } of participants) {
        const patternsToCheck = [...getLinePatterns(gridSize), ...getDiagonalPatterns(gridSize), getXPattern(gridSize), getCornersPattern(gridSize), getCrossPattern(gridSize), getOuterBorderPattern(gridSize), getFullBoardPattern(gridSize)];

        for (const pattern of patternsToCheck) {
            await checkSinglePattern(boardId, eventId, player_id, pattern);
        }
    }
}

/**
 * 🎲 Check and Award Bonus for a Single Pattern
 * @param {number} boardId - ID of the Bingo Board
 * @param {number} eventId - ID of the Bingo Event
 * @param {number} playerId - ID of the Player
 * @param {Object} pattern - Pattern Object
 * @param {string} pattern.patternKey - Unique Pattern Key
 * @param {string} pattern.patternType - Type of Pattern
 * @param {Array} pattern.cells - Array of Cells for the Pattern
 */
async function checkSinglePattern(boardId, eventId, playerId, { patternKey, patternType, cells }) {
    try {
        // 1) Check if Pattern Already Awarded
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
        if (alreadyAwarded) return; // Skip if already awarded

        // 2) Check if All Cells are Completed
        const statusRows = await db.getAll(
            `
            SELECT btp.status, btp.task_id
            FROM bingo_board_cells bbc
            JOIN bingo_task_progress btp 
                ON (bbc.task_id = btp.task_id AND btp.player_id = ?)
            WHERE bbc.board_id = ?
              AND (bbc.row || '-' || bbc.column) IN (${cells.map(() => '?').join(',')})
        `,
            [playerId, boardId, ...cells.map((c) => `${c.row}-${c.col}`)],
        );

        if (statusRows.length < cells.length) return; // Not all tasks exist
        if (!statusRows.every((r) => r.status === 'completed')) return; // Not all completed

        // 3) Calculate and Award Bonus Points
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

        // 4) Record Awarded Pattern to Prevent Duplicates
        await db.runQuery(
            `
            INSERT INTO bingo_patterns_awarded (board_id, event_id, player_id, pattern_key)
            VALUES (?, ?, ?, ?)
        `,
            [boardId, eventId, playerId, patternKey],
        );

        logger.info(`[BingoPatternRecognition] Awarded pattern bonus: ${patternKey} +${bonusPoints} → Player #${playerId}`);
    } catch (err) {
        logger.error(`[BingoPatternRecognition] checkSinglePattern() error: ${err.message}`);
    }
}

module.exports = {
    checkPatterns,
};
