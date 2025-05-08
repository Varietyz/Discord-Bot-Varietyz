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

function calculatePatternBonus(patternType) {
    switch (patternType) {
    case 'line':
        return 40; 
    case 'multiple_lines':
        return 120; 
    case 'diagonal':
        return 100; 
    case 'both_diagonals':
        return 220; 
    case 'corners':
        return 180; 
    case 'cross':
        return 260; 
    case 'x_pattern':
        return 180; 
    case 'diagonal_crosshatch':
        return 240; 
    case 'checkerboard':
        return 450; 
    case 'inversed_checkerboard':
        return 450; 
    case 'checkerboard_varietyz':
        return 600; 
    case 'outer_border':
        return 600; 
    case 'zigzag':
        return 600; 
    case 'full_board':
        return 1000; 
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
    'full_board', 
];

async function selectPatternsForEvent(eventId) {
    try {

        const lastEventPatterns = await db.getAll('SELECT pattern_key FROM bingo_pattern_rotation WHERE event_id = (SELECT MAX(event_id) FROM bingo_pattern_rotation)');
        const previousPatterns = new Set(lastEventPatterns.map((p) => p.pattern_key));

        const selectedPatterns = new Set(['full_board']);

        const shuffled = AVAILABLE_PATTERNS.filter((p) => p !== 'full_board').sort(() => Math.random() - 0.5);

        let hasSingleLine = false;
        let hasMultipleLines = false;

        const freshPatterns = shuffled.filter((p) => !previousPatterns.has(p));
        const oldPatterns = shuffled.filter((p) => previousPatterns.has(p));

        while (selectedPatterns.size < 4 && freshPatterns.length > 0) {
            const candidate = freshPatterns.pop();

            if (candidate.includes('line') && hasSingleLine) continue;
            if (candidate.includes('multiple_lines') && hasMultipleLines) continue;

            selectedPatterns.add(candidate);

            if (candidate.includes('line')) hasSingleLine = true;
            if (candidate.includes('multiple_lines')) hasMultipleLines = true;
        }

        while (selectedPatterns.size < 6) {
            const candidate = (freshPatterns.length > 0 ? freshPatterns : oldPatterns).pop();

            if (candidate.includes('line') && hasSingleLine) continue;
            if (candidate.includes('multiple_lines') && hasMultipleLines) continue;

            selectedPatterns.add(candidate);

            if (candidate.includes('line')) hasSingleLine = true;
            if (candidate.includes('multiple_lines')) hasMultipleLines = true;
        }

        const insertQueries = [...selectedPatterns].map((pattern) => db.runQuery('INSERT INTO bingo_pattern_rotation (event_id, pattern_key) VALUES (?, ?)', [eventId, pattern]));

        await Promise.all(insertQueries);
        logger.info(`✅ Selected strategic patterns for event #${eventId}: ${[...selectedPatterns].join(', ')}`);
    } catch (err) {
        logger.error(`❌ Error selecting patterns for event #${eventId}: ${err.message}`);
    }
}

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

    } catch (err) {
        logger.error(`[BingoPatternRecognition] checkPatterns() error: ${err.message}`);
    }
    logger.info('[BingoPatternRecognition] checkPatterns() → Done');
}

async function checkPatternsForBoard(boardId, eventId) {
    try {

        const activePatterns = await db.getAll('SELECT pattern_key FROM bingo_pattern_rotation WHERE event_id = ?', [eventId]);
        const allowedPatterns = new Set(activePatterns.map((p) => p.pattern_key));

        if (allowedPatterns.size === 0) {
            logger.warn(`[BingoPatternRecognition] No active patterns found for event #${eventId}. Skipping.`);
            return;
        }

        const numRows = 3;
        const numCols = 5;

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

function getPatternDefinitionByKey(patternKey, numRows, numCols) {

    if (patternKey.startsWith('row_') || patternKey.startsWith('col_') || patternKey.startsWith('multiple_lines_')) {
        return getLinePatterns(numRows, numCols).find((p) => p.patternKey === patternKey) || getMultipleLinesPattern(numRows, numCols).find((p) => p.patternKey === patternKey) || null;
    }

    const mapping = {

        diag_main: () => getDiagonalPatterns(numRows, numCols)[0],
        both_diagonals: () => getBothDiagonalsPattern(numRows, numCols)[0],

        x_pattern_alternating: () => getXPattern(numRows, numCols).find((p) => p.patternKey === 'x_pattern_alternating'),
        x_pattern_centered: () => getXPattern(numRows, numCols).find((p) => p.patternKey === 'x_pattern_centered'),

        corners: () => getCornersPattern(numRows, numCols),

        cross: () => getCrossPattern(numRows, numCols),

        outer_border: () => getOuterBorderPattern(numRows, numCols),

        full_board: () => getFullBoardPattern(numRows, numCols),

        checkerboard: () => getCheckerboardPattern(numRows, numCols),
        inversed_checkerboard: () => getInversedCheckerboardPattern(numRows, numCols),
        checkerboard_varietyz: () => {
            const arr = getVarietyzPattern(numRows, numCols);
            return arr.length ? arr[0] : null;
        },

        zigzag: () => getZigZagPattern(numRows, numCols),
        diagonal_crosshatch: () => getDiagonalCrosshatch(numRows, numCols),
    };

    const getter = mapping[patternKey];
    return getter ? getter() : null;
}

async function calculateStrategicPatternBonus(boardId, eventId, playerId, pattern, numRows, numCols) {

    const baseBonus = calculatePatternBonus(pattern.patternType);

    const awarded = await db.getAll(
        `SELECT pattern_key FROM bingo_patterns_awarded 
         WHERE board_id = ? AND event_id = ? AND player_id = ?`,
        [boardId, eventId, playerId],
    );

    const awardedCells = new Set();
    for (const award of awarded) {
        const def = getPatternDefinitionByKey(award.pattern_key, numRows, numCols);
        if (def && Array.isArray(def.cells)) {
            def.cells.forEach((cell) => awardedCells.add(`${cell.row}-${cell.col}`));
        }
    }

    const totalCells = pattern.cells.length;
    const overlapCount = pattern.cells.filter((cell) => awardedCells.has(`${cell.row}-${cell.col}`)).length;
    const overlapRatio = totalCells > 0 ? overlapCount / totalCells : 0;

    let multiplier = 1 - overlapRatio; 

    if (multiplier < 0.1) multiplier = 0.1;

    const finalBonus = Math.ceil(baseBonus * multiplier);
    return finalBonus;
}

async function checkSinglePattern(boardId, eventId, playerId, pattern) {
    try {

        if (!Array.isArray(pattern.cells) || pattern.cells.length === 0) {
            logger.error(`[BingoPatternRecognition] Pattern "${pattern.patternKey}" is invalid. Skipping.`);
            return;
        }

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

        const alreadyAwarded = await db.getOne(
            `SELECT awarded_id
             FROM bingo_patterns_awarded
             WHERE board_id = ? AND event_id = ? AND player_id = ? AND pattern_key = ?`,
            [boardId, eventId, playerId, pattern.patternKey],
        );
        if (alreadyAwarded) return;

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

        if (statusRows.length < pattern.cells.length || !statusRows.every((r) => r.status === 'completed')) return;

        const numRows = 3,
            numCols = 5;

        const bonusPoints = await calculateStrategicPatternBonus(boardId, eventId, playerId, pattern, numRows, numCols);
        if (bonusPoints <= 0) {
            logger.info(`[BingoPatternRecognition] Strategic bonus for pattern "${pattern.patternKey}" is zero. Skipping award for Player #${playerId}.`);
            return;
        }

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

        await db.runQuery(
            `UPDATE bingo_leaderboard
             SET pattern_bonus = pattern_bonus + ?
             WHERE event_id = ? AND player_id = ?`,
            [adjustedBonusPoints, eventId, playerId],
        );
        await updatePlayerPoints(playerId, 'bingo', adjustedBonusPoints);

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
                pattern.patternType, 
                pattern.patternKey, 
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
