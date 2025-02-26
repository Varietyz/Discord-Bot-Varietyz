// /modules/services/bingo/bingoPatterns.js

/**
 * 🎲 Get Line Patterns (Rows & Columns)
 * - Official Pattern: Completes an entire row or column.
 * - Pattern Type: 'line'
 * @param {number} gridSize - Size of the Grid (e.g., 5 for 5x5)
 * @returns {Array} - Array of Line Patterns
 */
function getLinePatterns(gridSize) {
    const patterns = [];

    // Rows
    for (let row = 0; row < gridSize; row++) {
        patterns.push({
            patternKey: `row_${row}`,
            patternType: 'line',
            cells: Array.from({ length: gridSize }, (_, col) => ({ row, col })),
        });
    }

    // Columns
    for (let col = 0; col < gridSize; col++) {
        patterns.push({
            patternKey: `col_${col}`,
            patternType: 'line',
            cells: Array.from({ length: gridSize }, (_, row) => ({ row, col })),
        });
    }

    return patterns;
}

/**
 * 🎲 Get Diagonal Patterns (Main & Anti-Diagonal)
 * - Official Pattern: Completes a full diagonal from one corner to another.
 * - Pattern Type: 'diagonal'
 * @param {number} gridSize - Size of the Grid (e.g., 5 for 5x5)
 * @returns {Array} - Array of Diagonal Patterns
 */
function getDiagonalPatterns(gridSize) {
    return [
        {
            patternKey: 'diag_main',
            patternType: 'diagonal',
            cells: Array.from({ length: gridSize }, (_, i) => ({ row: i, col: i })),
        },
        {
            patternKey: 'diag_anti',
            patternType: 'diagonal',
            cells: Array.from({ length: gridSize }, (_, i) => ({ row: i, col: gridSize - 1 - i })),
        },
    ];
}

/**
 * 🎲 Get Both Diagonals Pattern (Main + Anti-Diagonal)
 * - Official Pattern: Completes both diagonals, forming an "X" shape.
 * - Pattern Type: 'x_pattern'
 * @param {number} gridSize - Size of the Grid (e.g., 5 for 5x5)
 * @returns {Object} - X Pattern Object
 */
function getXPattern(gridSize) {
    const mainDiag = Array.from({ length: gridSize }, (_, i) => ({ row: i, col: i }));
    const antiDiag = Array.from({ length: gridSize }, (_, i) => ({ row: i, col: gridSize - 1 - i }));

    // Combine and remove duplicates (middle point is shared)
    const cells = Array.from(new Set([...mainDiag, ...antiDiag].map((c) => JSON.stringify(c)))).map((s) => JSON.parse(s));

    return {
        patternKey: 'x_pattern',
        patternType: 'x_pattern',
        cells,
    };
}

/**
 * 🎲 Get Corners Pattern (All 4 Corners)
 * - Official Pattern: Completes all 4 corners.
 * - Pattern Type: 'corners'
 * @param {number} gridSize - Size of the Grid (e.g., 5 for 5x5)
 * @returns {Object} - Corners Pattern Object
 */
function getCornersPattern(gridSize) {
    return {
        patternKey: 'corners',
        patternType: 'corners',
        cells: [
            { row: 0, col: 0 },
            { row: 0, col: gridSize - 1 },
            { row: gridSize - 1, col: 0 },
            { row: gridSize - 1, col: gridSize - 1 },
        ],
    };
}

/**
 * 🎲 Get Cross Pattern (Both Diagonals + Middle Row + Middle Column)
 * - Official Pattern: Completes both diagonals + middle row + middle column.
 * - Pattern Type: 'cross'
 * @param {number} gridSize - Size of the Grid (e.g., 5 for 5x5)
 * @returns {Object} - Cross Pattern Object
 */
function getCrossPattern(gridSize) {
    const mid = Math.floor(gridSize / 2);

    // Both Diagonals + Middle Row + Middle Column
    const cells = [
        ...Array.from({ length: gridSize }, (_, i) => ({ row: i, col: i })), // Main Diagonal
        ...Array.from({ length: gridSize }, (_, i) => ({ row: i, col: gridSize - 1 - i })), // Anti-Diagonal
        ...Array.from({ length: gridSize }, (_, i) => ({ row: mid, col: i })), // Middle Row
        ...Array.from({ length: gridSize }, (_, i) => ({ row: i, col: mid })), // Middle Column
    ];

    // Remove duplicates (middle point is shared)
    const uniqueCells = Array.from(new Set(cells.map((c) => JSON.stringify(c)))).map((s) => JSON.parse(s));

    return {
        patternKey: 'cross',
        patternType: 'cross',
        cells: uniqueCells,
    };
}

/**
 * 🎲 Get Outer Border Pattern (All Cells on the Border)
 * - Official Pattern: Completes all cells along the outer border.
 * - Pattern Type: 'outer_border'
 * @param {number} gridSize - Size of the Grid (e.g., 5 for 5x5)
 * @returns {Object} - Outer Border Pattern Object
 */
function getOuterBorderPattern(gridSize) {
    const cells = [];

    for (let i = 0; i < gridSize; i++) {
        // Top and Bottom Row
        cells.push({ row: 0, col: i }, { row: gridSize - 1, col: i });
        // Left and Right Column
        cells.push({ row: i, col: 0 }, { row: i, col: gridSize - 1 });
    }

    // Remove duplicate corners (if gridSize > 2)
    const uniqueCells = Array.from(new Set(cells.map((c) => JSON.stringify(c)))).map((s) => JSON.parse(s));

    return {
        patternKey: 'outer_border',
        patternType: 'outer_border',
        cells: uniqueCells,
    };
}

/**
 * 🎲 Get Full Board Pattern (All Cells)
 * - Official Pattern: Completes all cells on the board.
 * - Pattern Type: 'full_board'
 * @param {number} gridSize - Size of the Grid (e.g., 5 for 5x5)
 * @returns {Object} - Full Board Pattern Object
 */
function getFullBoardPattern(gridSize) {
    return {
        patternKey: 'full_board',
        patternType: 'full_board',
        cells: Array.from({ length: gridSize }, (_, row) => Array.from({ length: gridSize }, (_, col) => ({ row, col }))).flat(),
    };
}

module.exports = {
    getLinePatterns,
    getDiagonalPatterns,
    getXPattern,
    getCornersPattern,
    getCrossPattern,
    getOuterBorderPattern,
    getFullBoardPattern,
};
