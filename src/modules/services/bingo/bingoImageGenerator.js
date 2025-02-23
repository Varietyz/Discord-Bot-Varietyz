// /modules/services/bingo/bingoImageGenerator.js
const logger = require('../../utils/essentials/logger');
const db = require('../../utils/essentials/dbUtils');
const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');

// Register the custom font
const fontPath = path.join(__dirname, '../../../assets/runescape_bold.ttf');
registerFont(fontPath, { family: 'RuneScape' });

// Dimensions from your Python code
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1248;
const CROSS_SIZE = 359;

// For each of the 15 tasks, a static coordinate on the 1920×1248 card
const TASK_COORDINATES = {
    1: { x: 19, y: 92 },
    2: { x: 400, y: 92 },
    3: { x: 781, y: 92 },
    4: { x: 1161, y: 92 },
    5: { x: 1542, y: 92 },
    6: { x: 19, y: 473 },
    7: { x: 400, y: 473 },
    8: { x: 781, y: 473 },
    9: { x: 1161, y: 473 },
    10: { x: 1542, y: 473 },
    11: { x: 19, y: 854 },
    12: { x: 400, y: 854 },
    13: { x: 781, y: 854 },
    14: { x: 1161, y: 854 },
    15: { x: 1542, y: 854 },
};

/**
 * Normalizes the parameter for item image URL construction.
 * - Capitalizes only the first letter of the entire item name
 * - Converts all other letters to lowercase
 *
 * @param {string} param - The item parameter to normalize.
 * @returns {string} - Normalized parameter for image URL.
 */
function normalizeItemParam(param) {
    if (!param) return '';

    // Lowercase everything first
    param = param.toLowerCase();

    // Capitalize only the first letter of the whole string
    return param.charAt(0).toUpperCase() + param.slice(1);
}

/**
 * Splits the task name into action and target.
 * - If a colon is present, the text before it is the action, and after it is the target.
 * - Otherwise, it keeps "XP in" together.
 * - If no special patterns, the first two words are the action, and the rest is the target.
 *
 * @param {string} name - The original task name.
 * @returns {Object} - An object containing action and target strings.
 */
function splitTaskName(name) {
    if (!name) return { action: '', target: '' };

    // Check if there's a colon (e.g., Drop tasks like "Receive a drop: Avernic Defender")
    if (name.includes(':')) {
        const [actionPart, targetPart] = name.split(/:(.+)/); // Split only at the first colon
        const action = actionPart.trim() + ':';
        const target = targetPart.trim();
        return { action, target };
    }

    // Handle "XP in" pattern to keep them together
    const xpInMatch = name.match(/(.+?) XP in (.+)/i);
    if (xpInMatch) {
        const action = xpInMatch[1] + ' XP';
        const target = xpInMatch[2];
        return { action, target };
    }

    // Default behavior for other tasks
    const words = name.split(' ');
    const action = words.slice(0, 2).join(' ');
    const target = words.slice(2).join(' ');

    return { action, target };
}

/**
 * Formats the target by:
 * - Replacing underscores with spaces
 * - Capitalizing the first letter of each word
 *
 * @param {string} target - The target part of the task name.
 * @returns {string} - Formatted target string.
 */
function formatTarget(target) {
    if (!target) return '';
    return target
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Helper function to wrap text into multiple lines.
 * Dynamically adjusts the number of lines based on the box width.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} text - Text to wrap
 * @param {number} maxWidth - Maximum width for each line
 * @returns {string[]} - Array of wrapped text lines
 */
function getWrappedText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let line = '';

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;

        if (testWidth > maxWidth && line.length > 0) {
            lines.push(line.trim());
            line = words[n] + ' ';
        } else {
            line = testLine;
        }
    }
    lines.push(line.trim());
    return lines;
}

/**
 *
 * @param boardId
 * @param playerId
 * @param isTeam
 */
async function generateBingoCard(boardId, playerId, isTeam = false) {
    logger.info(`[BingoImageGenerator] Generating card for board=${boardId}, player=${playerId}`);

    try {
        // 1) Create a blank canvas (1920×1248) to match your Python layout
        const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
        const ctx = canvas.getContext('2d');

        // 1) Load background image from DB
        const backgroundPath = await getImagePath('template_card');
        let backgroundImg = null;
        if (backgroundPath) {
            backgroundImg = await loadImage(backgroundPath);
            ctx.drawImage(backgroundImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        } else {
            // fallback: fillRect
            ctx.fillStyle = '#2c2f33';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }

        // 2) Load your "completed" cross image from DB
        const completedCrossPath = await getImagePath('validated_cross');
        let completedCrossImg = null;
        if (completedCrossPath) {
            completedCrossImg = await loadImage(completedCrossPath);
        }

        const playerIdsArray = Array.isArray(playerId) ? playerId : [playerId];
        const tasks = await getPlayerTasks(boardId, playerIdsArray, isTeam);

        // 4) For each cell #1..#15, draw an outline box, the task text/icon, and overlay cross if completed
        for (let cellNum = 1; cellNum <= 15; cellNum++) {
            const coords = TASK_COORDINATES[cellNum];
            if (!coords) continue;

            // Attempt to find a matching record from tasks[] by its "cell_num"
            const t = tasks.find((row) => parseInt(row.cell_num) === cellNum);
            if (!t) {
                logger.warn(`[BingoImageGenerator] No task found for cellNum=${cellNum}. Drawing empty box.`);
                drawEmptyBox(ctx, coords.x, coords.y, CROSS_SIZE);
                continue;
            }

            // For clarity
            const { status, imagePath, task_name } = t;

            // (A) Draw the empty box outline first
            drawEmptyBox(ctx, coords.x, coords.y, CROSS_SIZE);

            // (C) Draw the Task Image (Center)
            let iconImg;
            let urlImg;

            if (imagePath) {
                try {
                    iconImg = await loadImage(imagePath);
                } catch (imgErr) {
                    logger.warn(`[BingoImageGenerator] Could not load custom image for task_id=${t.task_id}: ${imgErr.message}`);
                }
            }

            // ✅ Load URL Image if available
            if (t.urlImagePath) {
                try {
                    urlImg = await loadImage(t.urlImagePath);
                    logger.info(`[BingoImageGenerator] Loaded item image from OSRS Wiki: ${t.urlImagePath}`);
                } catch (imgErr) {
                    logger.warn(`[BingoImageGenerator] Could not load item image from OSRS Wiki for ${t.parameter}: ${imgErr.message}`);
                }
            }

            if (iconImg) {
                // ✅ Resize local images
                const originalWidth = iconImg.width;
                const originalHeight = iconImg.height;

                // 🔄 Shrink the image more by reducing the scale factor
                const scaleFactor = Math.min(CROSS_SIZE / originalWidth, CROSS_SIZE / originalHeight) * 0.6;

                // Calculate new dimensions for the image
                const newWidth = originalWidth * scaleFactor;
                const newHeight = originalHeight * scaleFactor;

                // Center the image within the box
                const xOffset = (CROSS_SIZE - newWidth) / 2;
                const yOffset = (CROSS_SIZE - newHeight) / 2 + 55;

                ctx.drawImage(iconImg, coords.x + xOffset, coords.y + yOffset, newWidth, newHeight);
            } else if (urlImg) {
                // ✅ Draw URL images at original size without resizing
                const originalWidth = urlImg.width;
                const originalHeight = urlImg.height;

                // 🔄 Shrink the image more by reducing the scale factor
                const scaleFactor = Math.min(CROSS_SIZE / originalWidth, CROSS_SIZE / originalHeight) * 0.2;

                // Calculate new dimensions for the image
                const newWidth = originalWidth * scaleFactor;
                const newHeight = originalHeight * scaleFactor;

                // Center the image within the box
                const xOffset = (CROSS_SIZE - newWidth) / 2;
                const yOffset = (CROSS_SIZE - newHeight) / 2 + 55;

                // ✅ Draw the image at its natural size
                ctx.drawImage(urlImg, coords.x + xOffset, coords.y + yOffset, newWidth, newHeight);
            } else {
                // Draw placeholder if no image was successfully loaded
                ctx.fillStyle = '#ff0000';
                ctx.font = '25px RuneScape';
                ctx.textAlign = 'center';
                ctx.fillText('No Image', coords.x + CROSS_SIZE / 2, coords.y + CROSS_SIZE / 2);
            }

            // 🔄 Offset to move the text block downward
            const textOffset = 15;

            // (B) Draw the Task Name (Split & Wrapped Text)
            const { action, target } = splitTaskName(task_name);

            // Draw Action Line (Top) with 1px Black Outline
            ctx.fillStyle = '#000000'; // Black outline
            ctx.font = '36px RuneScape';
            ctx.textAlign = 'center';

            // 🔄 Draw outline by drawing text multiple times with slight offsets
            ctx.fillText(action, coords.x + CROSS_SIZE / 2 - 1, coords.y + 30 + textOffset - 1); // Top-Left
            ctx.fillText(action, coords.x + CROSS_SIZE / 2 + 1, coords.y + 30 + textOffset - 1); // Top-Right
            ctx.fillText(action, coords.x + CROSS_SIZE / 2 - 1, coords.y + 30 + textOffset + 1); // Bottom-Left
            ctx.fillText(action, coords.x + CROSS_SIZE / 2 + 1, coords.y + 30 + textOffset + 1); // Bottom-Right

            // 🔄 Now draw the main text in the desired color on top
            ctx.fillStyle = '#dc8a00'; // Orange
            ctx.fillText(action, coords.x + CROSS_SIZE / 2, coords.y + 30 + textOffset); // Main Text

            // 🔄 Increase Vertical Space between Action and Target
            const actionToTargetSpacing = 17; // Adjust as needed
            const targetStartY = coords.y + 70 + actionToTargetSpacing + textOffset; // ⬇️ Add offset here

            // Draw Target Lines (Wrapped)
            const formattedTarget = formatTarget(target);
            const wrappedTargetLines = getWrappedText(ctx, formattedTarget, CROSS_SIZE - 20);

            // Apply slightly more vertical space between lines
            const lineHeight = 28;
            wrappedTargetLines.forEach((line, index) => {
                ctx.fillText(line, coords.x + CROSS_SIZE / 2, targetStartY + index * lineHeight);
            });

            // If status === 'completed', overlay the cross
            if (status === 'completed' && completedCrossImg) {
                ctx.drawImage(completedCrossImg, coords.x, coords.y, CROSS_SIZE, CROSS_SIZE);
            }

            const pointsText = `${t.points_reward} pts`; // FIXED HERE
            ctx.font = '32px RuneScape';
            ctx.textAlign = 'left';
            ctx.fillStyle = '#000000';
            ctx.fillText(pointsText, coords.x + 10 - 1, coords.y + CROSS_SIZE - 10 - 1); // Top-Left
            ctx.fillText(pointsText, coords.x + 10 + 1, coords.y + CROSS_SIZE - 10 - 1); // Top-Right
            ctx.fillText(pointsText, coords.x + 10 - 1, coords.y + CROSS_SIZE - 10 + 1); // Bottom-Left
            ctx.fillText(pointsText, coords.x + 10 + 1, coords.y + CROSS_SIZE - 10 + 1); // Bottom-Right

            ctx.fillStyle = '#00ff00';
            ctx.fillText(pointsText, coords.x + 10, coords.y + CROSS_SIZE - 10);

            // (F) Draw the Progress Percentage (Bottom Right with Color Grading)
            const progressText = `${t.progress}%`;
            ctx.font = '28px RuneScape';
            ctx.textAlign = 'right';

            // 🔄 Calculate color from Red (0%) to Green (100%)
            const hue = Math.floor((t.progress / 100) * 120);
            const progressColor = `hsl(${hue}, 100%, 50%)`;

            // Draw outline (Black) for better visibility
            ctx.fillStyle = '#000000';
            ctx.fillText(progressText, coords.x + CROSS_SIZE - 10 - 1, coords.y + CROSS_SIZE - 10 - 1); // Top-Left
            ctx.fillText(progressText, coords.x + CROSS_SIZE - 10 + 1, coords.y + CROSS_SIZE - 10 - 1); // Top-Right
            ctx.fillText(progressText, coords.x + CROSS_SIZE - 10 - 1, coords.y + CROSS_SIZE - 10 + 1); // Bottom-Left
            ctx.fillText(progressText, coords.x + CROSS_SIZE - 10 + 1, coords.y + CROSS_SIZE - 10 + 1); // Bottom-Right

            // Draw the main text with color grading
            ctx.fillStyle = progressColor;
            ctx.fillText(progressText, coords.x + CROSS_SIZE - 10, coords.y + CROSS_SIZE - 10);
        }

        // 5) Convert canvas to PNG buffer
        const finalBuffer = canvas.toBuffer('image/png');
        return finalBuffer;
    } catch (err) {
        logger.error(`[BingoImageGenerator] Error generating card: ${err.message}`);
        return null;
    }
}

/**
 *
 * @param ctx
 * @param x
 * @param y
 * @param size
 */
function drawEmptyBox(ctx, x, y, size) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0)';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, size, size);
}

/**
 *
 * @param fileName
 */
async function getImagePath(fileName) {
    const row = await db.image.getOne(
        `
    SELECT file_path
    FROM bingo
    WHERE file_name = ?
  `,
        [fileName],
    );
    return row ? row.file_path : null;
}

/**
 * Retrieves tasks for the player's bingo card for an active board.
 * This version calculates `cell_num` from row and column and adjusts join logic.
 *
 * @param {number} boardId
 * @param {number|Array<number>} playerIds - For teams, pass the team id.
 * @param {boolean} isTeam - Whether to generate a team card.
 * @returns {Promise<Array>}
 */
async function getPlayerTasks(boardId, playerIds, isTeam = false) {
    const playerIdsArray = Array.isArray(playerIds) ? playerIds : [playerIds];

    // Use team_id (if team card) in the join; otherwise, use player_id.
    const idColumn = isTeam ? 'btp.team_id' : 'btp.player_id';
    const placeholders = playerIdsArray.map(() => '?').join(',');

    const sql = `
    SELECT 
        ((bbc.row) * 5 + (bbc.column + 1)) AS cell_num,
        bbc.task_id,
        bt.description AS task_name,
        bt.type,
        bt.parameter,
        bt.value,
        COALESCE(SUM(btp.progress_value), 0) AS progress_value,
        bt.base_points AS points_reward,
        CASE
            WHEN SUM(btp.progress_value) >= bt.value THEN 'completed'
            WHEN SUM(btp.progress_value) > 0 THEN 'in-progress'
            ELSE 'incomplete'
        END AS status
    FROM bingo_board_cells bbc
    JOIN bingo_tasks bt ON bbc.task_id = bt.task_id
    LEFT JOIN bingo_task_progress btp 
        ON btp.task_id = bt.task_id 
        AND ${idColumn} IN (${placeholders})
    JOIN bingo_state bs 
        ON bs.board_id = bbc.board_id
    WHERE bbc.board_id = ?
      AND bs.state = 'ongoing'
    GROUP BY bbc.row, bbc.column
    ORDER BY cell_num ASC
    LIMIT 15
`;

    logger.info(`[BingoImageGenerator] Running SQL: ${sql}`);
    const params = [...playerIdsArray, boardId];
    const rows = await db.getAll(sql, params);
    logger.info(`[BingoImageGenerator] Using parameters: ${JSON.stringify(params)}`);
    logger.info(`[BingoImageGenerator] Collected tasks: ${JSON.stringify(rows, null, 2)}`);

    // Retrieve image paths for Skill/Boss and Drop tasks
    for (const row of rows) {
        if (['Kill', 'Exp', 'Level'].includes(row.type)) {
            const imageRow = await db.image.getOne(
                `
                SELECT file_path
                FROM skills_bosses
                WHERE file_name = ?
                `,
                [row.parameter],
            );
            if (imageRow) {
                row.imagePath = imageRow.file_path;
            }
        }
        if (row.type === 'Drop' && row.parameter) {
            const normalizedParam = normalizeItemParam(row.parameter);
            row.urlImagePath = `https://oldschool.runescape.wiki/images/${normalizedParam}.png`;
        }
    }

    let teamSize = null;
    if (isTeam) {
        // Query the team size from the database using the team id.
        // Here, playerIdsArray[0] is assumed to be the team id.
        const teamInfo = await db.getOne(
            `
            SELECT COUNT(*) AS count 
            FROM bingo_team_members 
            WHERE team_id = ?
            `,
            [playerIdsArray[0]],
        );
        teamSize = teamInfo ? teamInfo.count : 1;
        logger.info(`[BingoImageGenerator] Team size for team ${playerIdsArray[0]}: ${teamSize}`);
    }

    // Compute progress percentage for each row.
    rows.forEach((row) => {
        row.progress = calculateProgressPercentage(row.progress_value, row.value, isTeam, teamSize);
    });

    // Map rows to the desired output structure.
    return rows.map((r) => ({
        cell_num: parseInt(r.cell_num),
        task_id: r.task_id,
        task_name: r.task_name || '(No Name)',
        type: r.type || null,
        parameter: r.parameter || null,
        imagePath: r.imagePath || null,
        urlImagePath: r.urlImagePath || null,
        points_reward: r.points_reward || 0,
        status: r.status,
        progress: r.progress, // Computed percentage
    }));
}

/**
 * Calculates progress percentage with two decimal places.
 *
 * @param {number} progressValue - The aggregated progress (incremental) for the team.
 * @param {number} target - The target value as stored in the task.
 * @param {boolean} isTeam - Whether this calculation is for a team card.
 * @param {number} [teamSize] - (Optional) The number of players on the team.
 * @returns {string} - A string representing the progress percentage with two decimals.
 */
function calculateProgressPercentage(progressValue, target) {
    // For consolidated team progress, we want the target to be the same as the individual target.
    const effectiveTarget = target; // do not multiply by teamSize for consolidated progress
    const percentage = Math.min((progressValue / effectiveTarget) * 100, 100);
    return percentage.toFixed(2);
}

module.exports = {
    generateBingoCard,
    getPlayerTasks,
};
