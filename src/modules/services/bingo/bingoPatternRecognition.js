// /modules/services/bingo/bingoPatternRecognition.js
const logger = require('../../utils/essentials/logger');
const db = require('../../utils/essentials/dbUtils');
const {
    getLinePatterns,
    getDiagonalPatterns,
    getCornersPattern,
    getCrossPattern,
    getXPattern,
    getOuterBorderPattern,
    getFullBoardPattern,
    getZigZagPattern,
    getCheckerboardPattern,
    getVarietyzPattern,
    getInversedCheckerboardPattern,
    getDiagonalCrosshatch,
    getMultipleLinesPattern,
    getBothDiagonalsPattern,
} = require('./bingoPatterns');

/**
 * 🎲 Calculate Extra Points for Patterns
 * @param {string} patternType - Type of Bingo Pattern
 * @returns {number} - Bonus Points for the Pattern
 */
function calculatePatternBonus(patternType) {
    switch (patternType) {
    case 'line':
        return 50;
    case 'multiple_lines':
        return 150;
    case 'diagonal':
        return 150;
    case 'both_diagonals':
        return 200;
    case 'corners':
        return 200;
    case 'cross':
        return 250;
    case 'x_pattern':
        return 200;
    case 'diagonal_crosshatch':
        return 250;
    case 'checkerboard':
        return 500;
    case 'inversed_checkerboard':
        return 500;
    case 'checkerboard_varietyz':
        return 700;
    case 'outer_border':
        return 700;
    case 'zigzag':
        return 700;
    case 'full_board':
        return 1000;
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
            SELECT bs.event_id, bs.board_id
            FROM bingo_state bs
            JOIN bingo_boards bb ON bb.board_id = bs.board_id
            WHERE bs.state='ongoing'
              AND bb.is_active=1
        `);

        for (const b of boards) {
            await checkPatternsForBoard(b.board_id, b.event_id);
        }
        // 🔄 After checking all patterns, end the event if full board was completed
    } catch (err) {
        logger.error(`[BingoPatternRecognition] checkPatterns() error: ${err.message}`);
    }
    logger.info('[BingoPatternRecognition] checkPatterns() → Done');
}

/**
 * 🎲 Checks Patterns for Each Board and Player
 * @param {number} boardId - ID of the Bingo Board
 * @param {number} eventId - ID of the Bingo Event
 */
async function checkPatternsForBoard(boardId, eventId) {
    try {
        // ✅ Fetch grid size dynamically for the current board
        const boardInfo = await db.getOne(
            `
            SELECT grid_size
            FROM bingo_boards
            WHERE board_id = ?
            `,
            [boardId],
        );

        if (!boardInfo || !boardInfo.grid_size) {
            logger.error(`[BingoPatternRecognition] No grid size found for board #${boardId}. Skipping.`);
            return;
        }

        const numRows = 3;
        const numCols = 5;

        // ✅ Fetch all participants for the current board
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
            const patternsToCheck = [
                ...getLinePatterns(numRows, numCols),
                ...getDiagonalPatterns(numRows, numCols),
                ...getMultipleLinesPattern(numRows, numCols),
                ...getBothDiagonalsPattern(numRows, numCols),
                ...getXPattern(numRows, numCols),
                getCornersPattern(numRows, numCols),
                getCrossPattern(numRows, numCols),
                getOuterBorderPattern(numRows, numCols),
                getFullBoardPattern(numRows, numCols),
                getZigZagPattern(numRows, numCols),
                getCheckerboardPattern(numRows, numCols),
                ...getVarietyzPattern(numRows, numCols),
                getInversedCheckerboardPattern(numRows, numCols),
                getDiagonalCrosshatch(numRows, numCols),
            ];

            for (const pattern of patternsToCheck) {
                // ✅ Skip invalid patterns
                if (!pattern.cells || !Array.isArray(pattern.cells) || pattern.cells.length === 0) {
                    logger.warn(`[BingoPatternRecognition] Invalid cells for pattern "${pattern.patternKey}". Skipping.`);
                    continue;
                }

                await checkSinglePattern(boardId, eventId, player_id, pattern);
            }
        }
    } catch (err) {
        logger.error(`[BingoPatternRecognition] checkPatternsForBoard() error: ${err.message}`);
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
        // Validate cells.
        if (!Array.isArray(cells) || cells.length === 0) {
            logger.error(`[BingoPatternRecognition] Pattern "${patternKey}" is invalid. Skipping.`);
            return;
        }

        // Skip if bonus already awarded.
        const alreadyAwarded = await db.getOne(
            `
            SELECT awarded_id
            FROM bingo_patterns_awarded
            WHERE board_id = ? AND event_id = ? AND player_id = ? AND pattern_key = ?
            `,
            [boardId, eventId, playerId, patternKey],
        );
        if (alreadyAwarded) return;

        // Retrieve task progress for cells.
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

        // Ensure all required cells are completed.
        if (statusRows.length < cells.length || !statusRows.every((r) => r.status === 'completed')) return;

        // Calculate bonus and adjust for team members.
        const bonusPoints = calculatePatternBonus(patternType);
        let adjustedBonusPoints = bonusPoints;
        const teamRecord = await db.getOne(
            `
            SELECT team_id
            FROM bingo_team_members
            WHERE player_id = ?
            `,
            [playerId],
        );
        if (teamRecord && teamRecord.team_id) {
            const teamCountRow = await db.getOne(
                `
                SELECT COUNT(*) AS teamCount
                FROM bingo_team_members
                WHERE team_id = ?
                `,
                [teamRecord.team_id],
            );
            const teamCount = teamCountRow ? teamCountRow.teamCount : 1;
            adjustedBonusPoints = Math.floor(bonusPoints / teamCount);
        }

        // Award bonus points.
        await db.runQuery(
            `
            UPDATE bingo_leaderboard
            SET pattern_bonus = pattern_bonus + ?
            WHERE event_id = ? AND player_id = ?
            `,
            [adjustedBonusPoints, eventId, playerId],
        );
        await db.runQuery(
            `
            INSERT INTO bingo_patterns_awarded (board_id, event_id, player_id, pattern_key)
            VALUES (?, ?, ?, ?)
            `,
            [boardId, eventId, playerId, patternKey],
        );

        logger.info(`[BingoPatternRecognition] Awarded pattern bonus: ${patternKey} +${adjustedBonusPoints} → Player #${playerId}`);
    } catch (err) {
        logger.error(`[BingoPatternRecognition] checkSinglePattern() error: ${err.message}`);
    }
}

module.exports = {
    checkPatterns,
    calculatePatternBonus,
};
