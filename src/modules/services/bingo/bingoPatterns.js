// /modules/services/bingo/bingoPatterns.js

/**
 * 🎲 Get Line Patterns (Rows & Columns)
 * - Official Pattern: Completes an entire row or column.
 * - Pattern Type: 'line'
 * - Examples:
 *
 * Rows:
 *    ✅ ✅ ✅ ✅ ✅     ❌ ❌ ❌ ❌ ❌     ❌ ❌ ❌ ❌ ❌
 *    ❌ ❌ ❌ ❌ ❌     ✅ ✅ ✅ ✅ ✅     ❌ ❌ ❌ ❌ ❌
 *    ❌ ❌ ❌ ❌ ❌     ❌ ❌ ❌ ❌ ❌     ✅ ✅ ✅ ✅ ✅
 *
 * Columns:
 *    ✅ ❌ ❌ ❌ ❌     ❌ ✅ ❌ ❌ ❌     ❌ ❌ ❌ ❌ ✅
 *    ✅ ❌ ❌ ❌ ❌     ❌ ✅ ❌ ❌ ❌     ❌ ❌ ❌ ❌ ✅
 *    ✅ ❌ ❌ ❌ ❌     ❌ ✅ ❌ ❌ ❌     ❌ ❌ ❌ ❌ ✅
 *
 * @param {number} numRows - Number of Rows (e.g., 3)
 * @param {number} numCols - Number of Columns (e.g., 5)
 * @returns {Array} - Array of Line Patterns
 */
function getLinePatterns(numRows, numCols) {
    const patterns = [];

    // Rows
    for (let row = 0; row < numRows; row++) {
        patterns.push({
            patternKey: `row_${row}`,
            patternType: 'line',
            cells: Array.from({ length: numCols }, (_, col) => ({ row, col })),
        });
    }

    // Columns
    for (let col = 0; col < numCols; col++) {
        patterns.push({
            patternKey: `col_${col}`,
            patternType: 'line',
            cells: Array.from({ length: numRows }, (_, row) => ({ row, col })),
        });
    }

    return patterns;
}

/**
 * 🎲 Get Multiple Lines Pattern
 * - Official Pattern: Completes more than one line (row or column).
 * - Pattern Type: 'multiple_lines'
 * - Examples:
 *
 *    Multiple Rows:
 *       ✅ ✅ ✅ ❌ ❌     ❌ ❌ ❌ ❌ ❌
 *       ✅ ✅ ✅ ❌ ❌     ✅ ✅ ✅ ❌ ❌
 *       ✅ ✅ ✅ ❌ ❌     ✅ ✅ ✅ ❌ ❌
 *
 *    Multiple Columns:
 *       ❌ ❌ ✅ ✅ ✅     ✅ ❌ ❌ ✅ ✅
 *       ❌ ❌ ✅ ✅ ✅     ✅ ❌ ❌ ✅ ✅
 *       ❌ ❌ ✅ ✅ ✅     ✅ ❌ ❌ ✅ ✅
 *
 * - Explanation:
 *   - Completes more than one row or column.
 *   - Can be a combination of rows, columns, or both.
 *   - The number of lines required can be customized.
 *
 * @param {number} numRows - Number of Rows (e.g., 3)
 * @param {number} numCols - Number of Columns (e.g., 5)
 * @param {number} [numLines=2] - Number of lines required (default is 2)
 * @returns {Array} - Array of Multiple Lines Patterns
 */
function getMultipleLinesPattern(numRows, numCols, numLines = 2) {
    const patterns = [];

    // ✅ Multiple Rows
    for (let rowStart = 0; rowStart <= numRows - numLines; rowStart++) {
        const rows = [];
        for (let i = 0; i < numLines; i++) {
            rows.push(...Array.from({ length: numCols }, (_, col) => ({ row: rowStart + i, col })));
        }
        patterns.push({
            patternKey: `multiple_lines_rows_${rowStart}_${numLines}`,
            patternType: 'multiple_lines',
            cells: rows,
        });
    }

    // ✅ Multiple Columns
    for (let colStart = 0; colStart <= numCols - numLines; colStart++) {
        const cols = [];
        for (let i = 0; i < numLines; i++) {
            cols.push(...Array.from({ length: numRows }, (_, row) => ({ row, col: colStart + i })));
        }
        patterns.push({
            patternKey: `multiple_lines_cols_${colStart}_${numLines}`,
            patternType: 'multiple_lines',
            cells: cols,
        });
    }

    return patterns;
}

/**
 * 🎲 Get Diagonal Patterns (Main Diagonal Only)
 * - Official Pattern: Completes a diagonal from top-left to bottom-right.
 * - Pattern Type: 'diagonal'
 * - Example:
 *
 *    ✅ ❌ ❌ ❌ ❌
 *    ❌ ✅ ❌ ❌ ❌
 *    ❌ ❌ ✅ ❌ ❌
 *
 * @param {number} numRows - Number of Rows (e.g., 3)
 * @param {number} numCols - Number of Columns (e.g., 5)
 * @returns {Array} - Array of Diagonal Patterns
 */
function getDiagonalPatterns(numRows, numCols) {
    // Only Main Diagonal is possible
    const minDimension = Math.min(numRows, numCols);
    return [
        {
            patternKey: 'diag_main',
            patternType: 'diagonal',
            cells: Array.from({ length: minDimension }, (_, i) => ({ row: i, col: i })),
        },
    ];
}

/**
 * 🎲 Get Both Diagonals Pattern
 * - Official Pattern: Completes both main and anti-diagonals.
 * - Pattern Type: 'both_diagonals'
 * - Example:
 *
 *    ✅ ❌ ❌ ❌ ✅
 *    ❌ ✅ ❌ ✅ ❌
 *    ✅ ❌ ✅ ❌ ✅
 *
 * - Explanation:
 *   - The **main diagonal** goes from the top-left to the bottom-right.
 *   - The **anti-diagonal** goes from the top-right to the bottom-left.
 *   - Both diagonals must be completed to achieve this pattern.
 *
 * @param {number} numRows - Number of Rows (e.g., 3)
 * @param {number} numCols - Number of Columns (e.g., 5)
 * @returns {Array} - Both Diagonals Pattern Array
 */
function getBothDiagonalsPattern(numRows, numCols) {
    const mainDiagonal = [];
    const antiDiagonal = [];

    // Main Diagonal: Top-left to bottom-right
    for (let i = 0; i < Math.min(numRows, numCols); i++) {
        mainDiagonal.push({ row: i, col: i });
    }

    // Anti-Diagonal: Top-right to bottom-left
    for (let i = 0; i < Math.min(numRows, numCols); i++) {
        antiDiagonal.push({ row: i, col: numCols - 1 - i });
    }

    // Combine both diagonals and remove duplicates (shared center cell)
    const cells = Array.from(new Set([...mainDiagonal, ...antiDiagonal].map((c) => JSON.stringify(c)))).map((s) => JSON.parse(s));

    return [
        {
            patternKey: 'both_diagonals',
            patternType: 'both_diagonals',
            cells,
        },
    ];
}

/**
 * 🎲 Get Enhanced X Pattern Variations
 * - Official Pattern: Supports multiple X pattern styles.
 * - Pattern Type: 'x_pattern'
 * - Variations:
 *
 * Pattern 1:
 *    ❌ ✅ ❌ ✅ ❌
 *    ❌ ❌ ✅ ❌ ❌
 *    ❌ ✅ ❌ ✅ ❌
 *
 * Pattern 2:
 *    ✅ ❌ ✅ ❌ ❌
 *    ❌ ✅ ❌ ❌ ❌
 *    ✅ ❌ ✅ ❌ ❌
 *
 * Pattern 3:
 *    ❌ ❌ ✅ ❌ ✅
 *    ❌ ❌ ❌ ✅ ❌
 *    ❌ ❌ ✅ ❌ ✅
 *
 * @param {number} numRows - Number of Rows (e.g., 3)
 * @param {number} numCols - Number of Columns (e.g., 5)
 * @returns {Array} - Array of X Pattern Variations
 */
function getXPattern(numRows, numCols) {
    const patterns = [];

    // ✅ Pattern 1: Zigzagging X
    //    ❌ ✅ ❌ ✅ ❌
    //    ❌ ❌ ✅ ❌ ❌
    //    ❌ ✅ ❌ ✅ ❌
    const zigzagX = [];
    for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {
            // Zigzag: Alternates between cells in a zigzag pattern
            if ((row + col) % 2 === 1) {
                zigzagX.push({ row, col });
            }
        }
    }
    patterns.push({
        patternKey: 'x_pattern_zigzag',
        patternType: 'x_pattern',
        cells: zigzagX,
    });

    // ✅ Pattern 2: Alternating Diagonals
    //    ✅ ❌ ✅ ❌ ❌
    //    ❌ ✅ ❌ ❌ ❌
    //    ✅ ❌ ✅ ❌ ❌
    const alternatingX = [];
    for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {
            // Alternating Diagonals: Alternates diagonally across the grid
            if ((row + col) % 2 === 0 && col < numCols - row) {
                alternatingX.push({ row, col });
            }
        }
    }
    patterns.push({
        patternKey: 'x_pattern_alternating',
        patternType: 'x_pattern',
        cells: alternatingX,
    });

    // ✅ Pattern 3: Centered Diagonal X
    //    ❌ ❌ ✅ ❌ ✅
    //    ❌ ❌ ❌ ✅ ❌
    //    ❌ ❌ ✅ ❌ ✅
    const centeredX = [];
    for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {
            // Centered X: Central diagonal with mirrored arms
            if (row === col || col === numCols - 1 - row) {
                centeredX.push({ row, col });
            }
        }
    }
    patterns.push({
        patternKey: 'x_pattern_centered',
        patternType: 'x_pattern',
        cells: centeredX,
    });

    return patterns;
}

/**
 * 🎲 Get Corners Pattern (All 4 Corners)
 * - Official Pattern: Completes all 4 corners.
 * - Pattern Type: 'corners'
 * - Example:
 *
 *    ✅ ❌ ❌ ❌ ✅
 *    ❌ ❌ ❌ ❌ ❌
 *    ✅ ❌ ❌ ❌ ✅
 *
 * @param {number} numRows - Number of Rows (e.g., 3)
 * @param {number} numCols - Number of Columns (e.g., 5)
 * @returns {Object} - Corners Pattern Object
 */
function getCornersPattern(numRows, numCols) {
    return {
        patternKey: 'corners',
        patternType: 'corners',
        cells: [
            { row: 0, col: 0 }, // Top-Left
            { row: 0, col: numCols - 1 }, // Top-Right
            { row: numRows - 1, col: 0 }, // Bottom-Left
            { row: numRows - 1, col: numCols - 1 }, // Bottom-Right
        ],
    };
}

/**
 * 🎲 Get Cross Pattern (Middle Row + Middle Column)
 * - Official Pattern: Completes the middle row and middle column.
 * - Pattern Type: 'cross'
 * - Example:
 *
 *    ❌ ❌ ✅ ❌ ❌
 *    ✅ ✅ ✅ ✅ ✅
 *    ❌ ❌ ✅ ❌ ❌
 *
 * - Explanation:
 *   - The middle row (`row 1`) and middle column (`col 2`) are completed.
 *   - The center cell (`row 1, col 2`) is shared between the row and column.
 *
 * @param {number} numRows - Number of Rows (e.g., 3)
 * @param {number} numCols - Number of Columns (e.g., 5)
 * @returns {Object} - Cross Pattern Object
 */
function getCrossPattern(numRows, numCols) {
    const midRow = Math.floor(numRows / 2); // Middle Row (1)
    const midCol = Math.floor(numCols / 2); // Middle Column (2)

    const cells = [
        // Middle Row
        ...Array.from({ length: numCols }, (_, i) => ({ row: midRow, col: i })),
        // Middle Column
        ...Array.from({ length: numRows }, (_, i) => ({ row: i, col: midCol })),
    ];

    // Remove duplicates (shared center cell)
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
 * - Example:
 *
 *    ✅ ✅ ✅ ✅ ✅
 *    ✅ ❌ ❌ ❌ ✅
 *    ✅ ✅ ✅ ✅ ✅
 *
 * - Explanation:
 *   - Completes all cells on the outermost edges of the grid.
 *   - The center cells are not included.
 *   - Corners are shared between rows and columns.
 *
 * @param {number} numRows - Number of Rows (e.g., 3)
 * @param {number} numCols - Number of Columns (e.g., 5)
 * @returns {Object} - Outer Border Pattern Object
 */
function getOuterBorderPattern(numRows, numCols) {
    const cells = [];

    for (let i = 0; i < numCols; i++) {
        // Top and Bottom Row
        cells.push({ row: 0, col: i }, { row: numRows - 1, col: i });
    }

    for (let i = 0; i < numRows; i++) {
        // Left and Right Column
        cells.push({ row: i, col: 0 }, { row: i, col: numCols - 1 });
    }

    // Remove duplicate corners
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
 * - Example:
 *
 *    ✅ ✅ ✅ ✅ ✅
 *    ✅ ✅ ✅ ✅ ✅
 *    ✅ ✅ ✅ ✅ ✅
 *
 * - Explanation:
 *   - Every cell on the grid is completed.
 *   - This is the most challenging pattern to complete.
 *
 * @param {number} numRows - Number of Rows (e.g., 3)
 * @param {number} numCols - Number of Columns (e.g., 5)
 * @returns {Object} - Full Board Pattern Object
 */
function getFullBoardPattern(numRows, numCols) {
    const cells = [];

    for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {
            cells.push({ row, col });
        }
    }

    return {
        patternKey: 'full_board',
        patternType: 'full_board',
        cells,
    };
}

/**
 * 🎲 Get Checkerboard Pattern
 * - Official Pattern: Alternates between filled and empty cells.
 * - Pattern Type: 'checkerboard'
 * - Example:
 *
 *    ✅ ❌ ✅ ❌ ✅
 *    ❌ ✅ ❌ ✅ ❌
 *    ✅ ❌ ✅ ❌ ✅
 *
 * - Explanation:
 *   - Alternates between filled and empty cells like a chessboard.
 *   - If the sum of row and column is even, the cell is filled.
 *
 * @param {number} numRows - Number of Rows (e.g., 3)
 * @param {number} numCols - Number of Columns (e.g., 5)
 * @returns {Object} - Checkerboard Pattern Object
 */
function getCheckerboardPattern(numRows, numCols) {
    const cells = [];

    for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {
            // Checkerboard pattern: sum of row and col is even
            if ((row + col) % 2 === 0) {
                cells.push({ row, col });
            }
        }
    }

    return {
        patternKey: 'checkerboard',
        patternType: 'checkerboard',
        cells,
    };
}

/**
 * 🎲 Get Inversed Checkerboard Pattern
 * - Inverse of the standard checkerboard pattern.
 * - Pattern Type: 'inversed_checkerboard'
 * - Example:
 *
 *    ❌ ✅ ❌ ✅ ❌
 *    ✅ ❌ ✅ ❌ ✅
 *    ❌ ✅ ❌ ✅ ❌
 *
 * - Explanation:
 *   - This is the exact inverse of the regular checkerboard.
 *   - If the sum of row and column is even, the cell is **empty**.
 *   - If the sum of row and column is odd, the cell is **filled**.
 *
 * @param {number} numRows - Number of Rows (e.g., 3)
 * @param {number} numCols - Number of Columns (e.g., 5)
 * @returns {Object} - Inversed Checkerboard Pattern Object
 */
function getInversedCheckerboardPattern(numRows, numCols) {
    const cells = [];

    for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {
            // Inversed Checkerboard: sum of row and col is odd
            if ((row + col) % 2 !== 0) {
                cells.push({ row, col });
            }
        }
    }

    return {
        patternKey: 'inversed_checkerboard',
        patternType: 'inversed_checkerboard',
        cells,
    };
}

/**
 * 🎲 Get Checkerboard A Pattern
 * - Pattern Type: 'checkerboard_varietyz'
 * - Example:
 *    ✅ ❌ ❌ ❌ ✅
 *    ❌ ✅ ❌ ✅ ❌
 *    ❌ ❌ ✅ ❌ ❌
 *
 * @param {number} numRows - Number of Rows (e.g., 3)
 * @param {number} numCols - Number of Columns (e.g., 5)
 * @returns {Array} - Array containing the Checkerboard Varietyz Pattern Object
 */
function getVarietyzPattern(numRows, numCols) {
    const cells = [];

    for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {
            // Pattern A: (row + col) % 4 === 0
            if ((row + col) % 4 === 0) {
                cells.push({ row, col });
            }
        }
    }

    // Return an array containing the pattern object
    return cells.length > 0
        ? [
            {
                patternKey: 'checkerboard_varietyz',
                patternType: 'checkerboard_varietyz',
                cells,
            },
        ]
        : [];
}

/**
 * 🎲 Get ZigZag Pattern
 * - Official Pattern: Moves left to right on even rows and right to left on odd rows.
 * - Pattern Type: 'zigzag'
 * - Example:
 *
 *    ➡️ ➡️ ➡️ ➡️ ➡️
 *                ⬅️ ⬅️ ⬅️ ⬅️ ⬅️
 *    ➡️ ➡️ ➡️ ➡️ ➡️
 *
 * - Explanation:
 *   - Alternates the direction on each row.
 *   - Even rows go left to right.
 *   - Odd rows go right to left.
 *
 * @param {number} numRows - Number of Rows (e.g., 3)
 * @param {number} numCols - Number of Columns (e.g., 5)
 * @returns {Object} - ZigZag Pattern Object
 */
function getZigZagPattern(numRows, numCols) {
    const cells = [];

    for (let row = 0; row < numRows; row++) {
        if (row % 2 === 0) {
            // Even row (0, 2, ...) → Left to Right
            for (let col = 0; col < numCols; col++) {
                cells.push({ row, col });
            }
        } else {
            // Odd row (1, 3, ...) → Right to Left
            for (let col = numCols - 1; col >= 0; col--) {
                cells.push({ row, col });
            }
        }
    }

    return {
        patternKey: 'zigzag',
        patternType: 'zigzag',
        cells,
    };
}

/**
 * 🎲 Get Diagonal Crosshatch Pattern
 * - Pattern Type: 'diagonal_crosshatch'
 * - Example:
 *    ❌ ✅ ❌ ✅ ❌
 *    ❌ ✅ ❌ ✅ ❌
 *    ❌ ❌ ✅ ❌ ❌
 * @param {number} numRows - Number of Rows (e.g., 3)
 * @param {number} numCols - Number of Columns (e.g., 5)
 * @returns {Object} - Diagonal Crosshatch Pattern Object
 */
function getDiagonalCrosshatch(numRows, numCols) {
    const cells = [];

    for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {
            // Diagonal Crosshatch: (row * col) % 2 === 0
            if ((row * col) % 2 === 0) {
                cells.push({ row, col });
            }
        }
    }

    return {
        patternKey: 'diagonal_crosshatch',
        patternType: 'diagonal_crosshatch',
        cells,
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
    getZigZagPattern,
    getCheckerboardPattern,
    getVarietyzPattern,
    getInversedCheckerboardPattern,
    getDiagonalCrosshatch,
    getMultipleLinesPattern,
    getBothDiagonalsPattern,
};
