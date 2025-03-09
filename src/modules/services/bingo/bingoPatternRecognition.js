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
const { updatePlayerPoints } = require('../../utils/essentials/updatePlayerPoints');

/**
 * 🎲 Calculate Extra Points for Patterns
 * @param {string} patternType - Type of Bingo Pattern
 * @returns {number} - Bonus Points for the Pattern
 */
function calculatePatternBonus(patternType) {
    switch (patternType) {
    case 'line':
        return 40; // Simpler pattern: lower bonus
    case 'multiple_lines':
        return 120; // Slightly more challenging than a single line
    case 'diagonal':
        return 100; // Fewer cells in a diagonal on a 3x5, so lower bonus
    case 'both_diagonals':
        return 220; // Completing both diagonals is tougher
    case 'corners':
        return 180; // Four corners can be strategic but not as hard as full board
    case 'cross':
        return 260; // Middle row and column requires covering more area
    case 'x_pattern':
        return 180; // A well-formed X, but still similar in difficulty to corners
    case 'diagonal_crosshatch':
        return 240; // Overlapping diagonals, slightly harder than a single diagonal
    case 'checkerboard':
        return 450; // Requires a specific alternating pattern across the board
    case 'inversed_checkerboard':
        return 450; // Same as checkerboard but inverted
    case 'checkerboard_varietyz':
        return 600; // More challenging variation of the checkerboard pattern
    case 'outer_border':
        return 600; // Covering the entire border is a large commitment
    case 'zigzag':
        return 600; // Zigzag patterns across a rectangular board can be tricky
    case 'full_board':
        return 1000; // Completing every cell is the most challenging
    default:
        return 0;
    }
}

const AVAILABLE_PATTERNS = [
    'line',
    'multiple_lines',
    'diagonal',
    'both_diagonals',
    'corners',
    'cross',
    'x_pattern',
    'diagonal_crosshatch',
    'checkerboard',
    'inversed_checkerboard',
    'checkerboard_varietyz',
    'outer_border',
    'zigzag',
    'full_board', // Always included
];

/**
 * 🎲 Select Random Patterns for an Event (Ensures Rotation & Strategy)
 * @param {number} eventId - ID of the bingo event.
 */
async function selectPatternsForEvent(eventId) {
    try {
        // Fetch previous event patterns to reduce repetition
        const lastEventPatterns = await db.getAll('SELECT pattern_key FROM bingo_pattern_rotation WHERE event_id = (SELECT MAX(event_id) FROM bingo_pattern_rotation)');
        const previousPatterns = new Set(lastEventPatterns.map((p) => p.pattern_key));

        // Ensure full_board is always included
        const selectedPatterns = new Set(['full_board']);

        // Randomly shuffle remaining patterns
        const shuffled = AVAILABLE_PATTERNS.filter((p) => p !== 'full_board').sort(() => Math.random() - 0.5);

        // ✅ Strategic Rules:
        let hasSingleLine = false;
        let hasMultipleLines = false;

        // Prioritize patterns **not used in the last event** first
        const freshPatterns = shuffled.filter((p) => !previousPatterns.has(p));
        const oldPatterns = shuffled.filter((p) => previousPatterns.has(p));

        while (selectedPatterns.size < 4 && freshPatterns.length > 0) {
            const candidate = freshPatterns.pop();

            // 🚨 Avoid selecting both 'line' and 'multiple_lines' in the same event
            if (candidate.includes('line') && hasSingleLine) continue;
            if (candidate.includes('multiple_lines') && hasMultipleLines) continue;

            selectedPatterns.add(candidate);

            // Track line-based patterns
            if (candidate.includes('line')) hasSingleLine = true;
            if (candidate.includes('multiple_lines')) hasMultipleLines = true;
        }

        // Fill remaining slots with a mix of old and new
        while (selectedPatterns.size < 6) {
            const candidate = (freshPatterns.length > 0 ? freshPatterns : oldPatterns).pop();

            // 🚨 Continue avoiding excessive line-based patterns
            if (candidate.includes('line') && hasSingleLine) continue;
            if (candidate.includes('multiple_lines') && hasMultipleLines) continue;

            selectedPatterns.add(candidate);

            // Track line-based patterns
            if (candidate.includes('line')) hasSingleLine = true;
            if (candidate.includes('multiple_lines')) hasMultipleLines = true;
        }

        // Store selected patterns in the database
        const insertQueries = [...selectedPatterns].map((pattern) => db.runQuery('INSERT INTO bingo_pattern_rotation (event_id, pattern_key) VALUES (?, ?)', [eventId, pattern]));

        await Promise.all(insertQueries);
        logger.info(`✅ Selected strategic patterns for event #${eventId}: ${[...selectedPatterns].join(', ')}`);
    } catch (err) {
        logger.error(`❌ Error selecting patterns for event #${eventId}: ${err.message}`);
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
        // ✅ Fetch allowed patterns for this event
        const activePatterns = await db.getAll('SELECT pattern_key FROM bingo_pattern_rotation WHERE event_id = ?', [eventId]);
        const allowedPatterns = new Set(activePatterns.map((p) => p.pattern_key));

        if (allowedPatterns.size === 0) {
            logger.warn(`[BingoPatternRecognition] No active patterns found for event #${eventId}. Skipping.`);
            return;
        }

        const numRows = 3;
        const numCols = 5;

        // ✅ Fetch all participants for the current board
        const participants = await db.getAll(
            `
            SELECT DISTINCT btp.player_id
            FROM bingo_board_cells bbc
            JOIN bingo_task_progress btp ON (bbc.task_id = btp.task_id)
            WHERE bbc.board_id = ?
        `,
            [boardId],
        );

        for (const { player_id } of participants) {
            const patternsToCheck = [
                ...(allowedPatterns.has('line') ? getLinePatterns(numRows, numCols) : []),
                ...(allowedPatterns.has('multiple_lines') ? getMultipleLinesPattern(numRows, numCols) : []),
                ...(allowedPatterns.has('diagonal') ? getDiagonalPatterns(numRows, numCols) : []),
                ...(allowedPatterns.has('both_diagonals') ? getBothDiagonalsPattern(numRows, numCols) : []),
                ...(allowedPatterns.has('x_pattern') ? getXPattern(numRows, numCols) : []),
                ...(allowedPatterns.has('corners') ? [getCornersPattern(numRows, numCols)] : []),
                ...(allowedPatterns.has('cross') ? [getCrossPattern(numRows, numCols)] : []),
                ...(allowedPatterns.has('outer_border') ? [getOuterBorderPattern(numRows, numCols)] : []),
                ...(allowedPatterns.has('full_board') ? [getFullBoardPattern(numRows, numCols)] : []),
                ...(allowedPatterns.has('zigzag') ? [getZigZagPattern(numRows, numCols)] : []),
                ...(allowedPatterns.has('checkerboard') ? [getCheckerboardPattern(numRows, numCols)] : []),
                ...(allowedPatterns.has('inversed_checkerboard') ? [getInversedCheckerboardPattern(numRows, numCols)] : []),
                ...(allowedPatterns.has('diagonal_crosshatch') ? [getDiagonalCrosshatch(numRows, numCols)] : []),
            ];

            for (const pattern of patternsToCheck) {
                await checkSinglePattern(boardId, eventId, player_id, pattern);
            }
        }
    } catch (err) {
        logger.error(`[BingoPatternRecognition] checkPatternsForBoard() error: ${err.message}`);
    }
}

/**
 * Helper: getPatternDefinitionByKey
 * Returns the pattern definition (object with 'cells') for a given patternKey.
 * This mapping can be extended as needed.
 *
 * @param {string} patternKey
 * @param {number} numRows
 * @param {number} numCols
 * @returns {Object|null} - Pattern definition or null if not found.
 */
function getPatternDefinitionByKey(patternKey, numRows, numCols) {
    // Ensure all row, col, and multi-line patterns return a grid
    if (patternKey.startsWith('row_') || patternKey.startsWith('col_') || patternKey.startsWith('multiple_lines_')) {
        return getLinePatterns(numRows, numCols).find((p) => p.patternKey === patternKey) || getMultipleLinesPattern(numRows, numCols).find((p) => p.patternKey === patternKey) || null;
    }

    // Map known pattern keys to their generating functions.
    const mapping = {
        // Diagonals
        diag_main: () => getDiagonalPatterns(numRows, numCols)[0],
        both_diagonals: () => getBothDiagonalsPattern(numRows, numCols)[0],
        // X patterns
        x_pattern_alternating: () => getXPattern(numRows, numCols).find((p) => p.patternKey === 'x_pattern_alternating'),
        x_pattern_centered: () => getXPattern(numRows, numCols).find((p) => p.patternKey === 'x_pattern_centered'),
        // Corners
        corners: () => getCornersPattern(numRows, numCols),
        // Cross
        cross: () => getCrossPattern(numRows, numCols),
        // Outer Border
        outer_border: () => getOuterBorderPattern(numRows, numCols),
        // Full Board
        full_board: () => getFullBoardPattern(numRows, numCols),
        // Checkerboard patterns
        checkerboard: () => getCheckerboardPattern(numRows, numCols),
        inversed_checkerboard: () => getInversedCheckerboardPattern(numRows, numCols),
        checkerboard_varietyz: () => {
            const arr = getVarietyzPattern(numRows, numCols);
            return arr.length ? arr[0] : null;
        },
        // ZigZag and Diagonal Crosshatch
        zigzag: () => getZigZagPattern(numRows, numCols),
        diagonal_crosshatch: () => getDiagonalCrosshatch(numRows, numCols),
    };

    const getter = mapping[patternKey];
    return getter ? getter() : null;
}

/**
 * Calculate a strategic bonus for a pattern based on overlap with previously awarded patterns.
 *
 * @param {number} boardId - ID of the current board.
 * @param {number} eventId - ID of the current event.
 * @param {number} playerId - ID of the player.
 * @param {Object} pattern - The pattern being evaluated (with patternKey, patternType, cells).
 * @param {number} numRows - Number of rows (e.g., 3).
 * @param {number} numCols - Number of columns (e.g., 5).
 * @returns {Promise<number>} - Final bonus points after adjustment.
 */
async function calculateStrategicPatternBonus(boardId, eventId, playerId, pattern, numRows, numCols) {
    // Get base bonus from existing function.
    const baseBonus = calculatePatternBonus(pattern.patternType);

    // Retrieve all patterns already awarded for this board, event, and player.
    const awarded = await db.getAll(
        `SELECT pattern_key FROM bingo_patterns_awarded 
         WHERE board_id = ? AND event_id = ? AND player_id = ?`,
        [boardId, eventId, playerId],
    );

    // Build a set of already-used cell identifiers (e.g., "row-col").
    const awardedCells = new Set();
    for (const award of awarded) {
        const def = getPatternDefinitionByKey(award.pattern_key, numRows, numCols);
        if (def && Array.isArray(def.cells)) {
            def.cells.forEach((cell) => awardedCells.add(`${cell.row}-${cell.col}`));
        }
    }

    // Calculate overlap: count how many cells in the new pattern have already been used.
    const totalCells = pattern.cells.length;
    const overlapCount = pattern.cells.filter((cell) => awardedCells.has(`${cell.row}-${cell.col}`)).length;
    const overlapRatio = totalCells > 0 ? overlapCount / totalCells : 0;

    // Apply a multiplier: less bonus when overlap is high.
    let multiplier = 1 - overlapRatio; // For example, 50% overlap gives 0.5 multiplier.
    // Ensure a minimum multiplier so that some bonus is still awarded.
    if (multiplier < 0.1) multiplier = 0.1;

    const finalBonus = Math.ceil(baseBonus * multiplier);
    return finalBonus;
}

/**
 * Refactored checkSinglePattern function.
 * Checks if the pattern has been fully completed for a player,
 * calculates a strategic bonus, and awards the bonus if not already awarded.
 *
 * @param {number} boardId - ID of the Bingo Board.
 * @param {number} eventId - ID of the Bingo Event.
 * @param {number} playerId - ID of the Player.
 * @param {Object} pattern - Pattern object containing patternKey, patternType, and cells.
 */
async function checkSinglePattern(boardId, eventId, playerId, pattern) {
    try {
        // Validate cells.
        if (!Array.isArray(pattern.cells) || pattern.cells.length === 0) {
            logger.error(`[BingoPatternRecognition] Pattern "${pattern.patternKey}" is invalid. Skipping.`);
            return;
        }
        // Prevent awarding both "both_diagonals" and any "x_pattern"
        const overlappingPatterns = ['both_diagonals', 'x_pattern_centered', 'x_pattern_alternating'];
        const existingAwards = await db.getAll(
            `
    SELECT pattern_key FROM bingo_patterns_awarded
    WHERE board_id = ? AND event_id = ? AND player_id = ?
`,
            [boardId, eventId, playerId],
        );

        if (existingAwards.some((a) => overlappingPatterns.includes(a.pattern_key)) && overlappingPatterns.includes(pattern.patternKey)) {
            logger.info(`[BingoPatternRecognition] Skipping redundant pattern "${pattern.patternKey}" for Player #${playerId}.`);
            return;
        }

        // Skip if bonus for this pattern was already awarded.
        const alreadyAwarded = await db.getOne(
            `SELECT awarded_id
             FROM bingo_patterns_awarded
             WHERE board_id = ? AND event_id = ? AND player_id = ? AND pattern_key = ?`,
            [boardId, eventId, playerId, pattern.patternKey],
        );
        if (alreadyAwarded) return;

        // Retrieve player's progress for the required cells.
        const statusRows = await db.getAll(
            `SELECT btp.status, btp.task_id
             FROM bingo_board_cells bbc
             JOIN bingo_task_progress btp 
               ON (bbc.task_id = btp.task_id AND btp.player_id = ?)
             WHERE bbc.board_id = ?
               AND (bbc.row || '-' || bbc.column) IN (${pattern.cells.map(() => '?').join(',')})
            `,
            [playerId, boardId, ...pattern.cells.map((c) => `${c.row}-${c.col}`)],
        );

        // Ensure all required cells are completed.
        if (statusRows.length < pattern.cells.length || !statusRows.every((r) => r.status === 'completed')) return;

        // For a 3x5 card, we set dimensions explicitly.
        const numRows = 3,
            numCols = 5;

        // Calculate the strategic bonus.
        const bonusPoints = await calculateStrategicPatternBonus(boardId, eventId, playerId, pattern, numRows, numCols);
        if (bonusPoints <= 0) {
            logger.info(`[BingoPatternRecognition] Strategic bonus for pattern "${pattern.patternKey}" is zero. Skipping award for Player #${playerId}.`);
            return;
        }

        // Adjust bonus for team members, if applicable.
        let adjustedBonusPoints = bonusPoints;
        const teamRecord = await db.getOne(
            `SELECT team_id
             FROM bingo_team_members
             WHERE player_id = ?`,
            [playerId],
        );
        if (teamRecord && teamRecord.team_id) {
            const teamCountRow = await db.getOne(
                `SELECT COUNT(*) AS teamCount
                 FROM bingo_team_members
                 WHERE team_id = ?`,
                [teamRecord.team_id],
            );
            const teamCount = teamCountRow ? teamCountRow.teamCount : 1;
            adjustedBonusPoints = Math.ceil(bonusPoints / teamCount);
        }

        // Award bonus points: update leaderboard and player points.
        await db.runQuery(
            `UPDATE bingo_leaderboard
             SET pattern_bonus = pattern_bonus + ?
             WHERE event_id = ? AND player_id = ?`,
            [adjustedBonusPoints, eventId, playerId],
        );
        await updatePlayerPoints(playerId, 'bingo', adjustedBonusPoints);

        // Insert into bingo_patterns_awarded with new column points_awarded.
        await db.runQuery(
            `INSERT INTO bingo_patterns_awarded 
      (board_id, event_id, player_id, team_id, points_awarded, pattern_name, pattern_key)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                boardId,
                eventId,
                playerId,
                teamRecord && teamRecord.team_id ? teamRecord.team_id : 0,
                adjustedBonusPoints,
                pattern.patternType, // This is the friendly name, as defined in your bonus switch statement.
                pattern.patternKey, // This is the unique identifier for the pattern.
            ],
        );
        logger.info(`[BingoPatternRecognition] Awarded strategic pattern bonus: ${pattern.patternKey} +${adjustedBonusPoints} pts → Player #${playerId}`);
    } catch (err) {
        logger.error(`[BingoPatternRecognition] checkSinglePattern() error: ${err.message}`);
    }
}

module.exports = {
    checkPatterns,
    calculatePatternBonus,
    getPatternDefinitionByKey,
    selectPatternsForEvent,
};
