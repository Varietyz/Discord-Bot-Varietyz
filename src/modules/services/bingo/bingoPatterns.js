function getLinePatterns(numRows, numCols) {
    const patterns = [];

    for (let row = 0; row < numRows; row++) {
        patterns.push({
            patternKey: `row_${row}`,
            patternType: 'line',
            cells: Array.from({ length: numCols }, (_, col) => ({ row, col })),
        });
    }

    for (let col = 0; col < numCols; col++) {
        patterns.push({
            patternKey: `col_${col}`,
            patternType: 'line',
            cells: Array.from({ length: numRows }, (_, row) => ({ row, col })),
        });
    }

    return patterns;
}

function getMultipleLinesPattern(numRows, numCols, numLines = 2) {
    const patterns = [];

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

function getDiagonalPatterns(numRows, numCols) {

    const minDimension = Math.min(numRows, numCols);
    return [
        {
            patternKey: 'diag_main',
            patternType: 'diagonal',
            cells: Array.from({ length: minDimension }, (_, i) => ({ row: i, col: i })),
        },
    ];
}

function getBothDiagonalsPattern(numRows, numCols) {
    const mainDiagonal = [];
    const antiDiagonal = [];

    for (let i = 0; i < Math.min(numRows, numCols); i++) {
        mainDiagonal.push({ row: i, col: i });
    }

    for (let i = 0; i < Math.min(numRows, numCols); i++) {
        antiDiagonal.push({ row: i, col: numCols - 1 - i });
    }

    const cells = Array.from(new Set([...mainDiagonal, ...antiDiagonal].map((c) => JSON.stringify(c)))).map((s) => JSON.parse(s));

    return [
        {
            patternKey: 'both_diagonals',
            patternType: 'both_diagonals',
            cells,
        },
    ];
}

function getXPattern(numRows, numCols) {
    const patterns = [];

    const alternatingX = [];

    const leftColForEven = 0;
    const rightColForEven = 2; 
    const oddCol = Math.floor((leftColForEven + rightColForEven) / 2); 
    for (let row = 0; row < numRows; row++) {
        if (row % 2 === 0) {

            if (leftColForEven < numCols) {
                alternatingX.push({ row, col: leftColForEven });
            }
            if (rightColForEven < numCols) {
                alternatingX.push({ row, col: rightColForEven });
            }
        } else {

            if (oddCol < numCols) {
                alternatingX.push({ row, col: oddCol });
            }
        }
    }
    patterns.push({
        patternKey: 'x_pattern_alternating',
        patternType: 'x_pattern',
        cells: alternatingX,
    });

    const centeredX = [];
    const centerCol = Math.floor(numCols / 2);
    const farRightCol = numCols - 1;
    const midRow = Math.floor(numRows / 2);
    for (let row = 0; row < numRows; row++) {
        if (numRows % 2 === 1 && row === midRow) {

            centeredX.push({ row, col: Math.floor((centerCol + farRightCol) / 2) });
        } else {

            centeredX.push({ row, col: centerCol });
            centeredX.push({ row, col: farRightCol });
        }
    }
    patterns.push({
        patternKey: 'x_pattern_centered',
        patternType: 'x_pattern',
        cells: centeredX,
    });

    return patterns;
}

function getCornersPattern(numRows, numCols) {
    return {
        patternKey: 'corners',
        patternType: 'corners',
        cells: [
            { row: 0, col: 0 }, 
            { row: 0, col: numCols - 1 }, 
            { row: numRows - 1, col: 0 }, 
            { row: numRows - 1, col: numCols - 1 }, 
        ],
    };
}

function getCrossPattern(numRows, numCols) {
    const midRow = Math.floor(numRows / 2); 
    const midCol = Math.floor(numCols / 2); 

    const cells = [

        ...Array.from({ length: numCols }, (_, i) => ({ row: midRow, col: i })),

        ...Array.from({ length: numRows }, (_, i) => ({ row: i, col: midCol })),
    ];

    const uniqueCells = Array.from(new Set(cells.map((c) => JSON.stringify(c)))).map((s) => JSON.parse(s));

    return {
        patternKey: 'cross',
        patternType: 'cross',
        cells: uniqueCells,
    };
}

function getOuterBorderPattern(numRows, numCols) {
    const cells = [];

    for (let i = 0; i < numCols; i++) {

        cells.push({ row: 0, col: i }, { row: numRows - 1, col: i });
    }

    for (let i = 0; i < numRows; i++) {

        cells.push({ row: i, col: 0 }, { row: i, col: numCols - 1 });
    }

    const uniqueCells = Array.from(new Set(cells.map((c) => JSON.stringify(c)))).map((s) => JSON.parse(s));

    return {
        patternKey: 'outer_border',
        patternType: 'outer_border',
        cells: uniqueCells,
    };
}

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

function getCheckerboardPattern(numRows, numCols) {
    const cells = [];

    for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {

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

function getInversedCheckerboardPattern(numRows, numCols) {
    const cells = [];

    for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {

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

function getVarietyzPattern(numRows, numCols) {
    const cells = [];
    for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {

            if (row === col || row + col === numCols - 1 || (row === 1 && col === 2)) {
                cells.push({ row, col });
            }
        }
    }
    return [
        {
            patternKey: 'checkerboard_varietyz',
            patternType: 'checkerboard_varietyz',
            cells,
        },
    ];
}

function getZigZagPattern(numRows, numCols) {
    const cells = [];
    for (let row = 0; row < numRows; row++) {
        if (row % 2 === 0) {

            for (let col = 0; col < Math.floor(numCols * 0.6); col++) {
                cells.push({ row, col });
            }
        } else {

            for (let col = Math.ceil(numCols * 0.4); col < numCols; col++) {
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

function getDiagonalCrosshatch(numRows, numCols) {
    const cells = [];

    for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {

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
