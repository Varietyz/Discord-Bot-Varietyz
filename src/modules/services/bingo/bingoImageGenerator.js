// /modules/services/bingo/bingoImageGenerator.js
const logger = require('../../utils/essentials/logger');
const db = require('../../utils/essentials/dbUtils');
const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');
const { computeOverallPercentage, computeTeamPartialPoints, computeIndividualPartialPoints } = require('./bingoCalculations');
const normalizeUpper = require('../../utils/normalizing/normalizeUpper');

const fontPath = path.join(__dirname, '../../../assets/runescape_bold.ttf');
registerFont(fontPath, { family: 'RuneScape' });

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1248;
const CROSS_SIZE = 359;

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
 *
 * @param name
 * @returns
 */
function splitTaskName(name) {
    if (!name) return { action: '', target: '' };

    const xpInMatch = name.match(/(.+?) XP in (.+)/i);
    if (xpInMatch) {
        const action = xpInMatch[1] + ' XP';
        const target = xpInMatch[2];
        return { action, target };
    }

    const words = name.split(' ');
    const action = words.slice(0, 2).join(' ');
    const target = words.slice(2).join(' ');

    return { action, target };
}

/**
 *
 * @param ctx
 * @param text
 * @param maxWidth
 * @returns
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
 * Generates a Bingo card image.
 *
 * @param {number} boardId - The board identifier.
 * @param {number} id - The player id (if individual) or team id (if team).
 * @param {boolean} isTeam - Flag indicating team mode.
 * @returns {Buffer} - The image buffer.
 */
async function generateBingoCard(boardId, id, isTeam = false) {
    // Log which id we received.
    logger.info(`[BingoImageGenerator] Generating card for board=${boardId}, id=${id}, isTeam=${isTeam}`);

    try {
        const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
        const ctx = canvas.getContext('2d');

        const backgroundPath = await getImagePath('template_card');
        let backgroundImg = null;
        if (backgroundPath) {
            backgroundImg = await loadImage(backgroundPath);
            ctx.drawImage(backgroundImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        } else {
            ctx.fillStyle = '#2c2f33';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }

        const completedCrossPath = await getImagePath('validated_cross');
        let completedCrossImg = null;

        if (completedCrossPath) {
            completedCrossImg = await loadImage(completedCrossPath);
        }

        // 2) Fetch competitions of type SOTW or BOTW (simplified).
        //    If you only want "active" ones, add date filters in your WHERE clause.
        const comps = await db.getAll(`
      SELECT metric, type
      FROM competitions
      WHERE type IN ('SOTW','BOTW')
    `);

        // 3) Build a map metric => 'sotw_notif.png' or 'botw_notif.png'
        //    e.g. "woodcutting" => "sotw_notif.png", "the_whisperer" => "botw_notif.png"
        const compNotifyMap = {};
        for (const c of comps) {
            compNotifyMap[c.metric] = `${c.metric}`;
        }

        // 4) Pre-load those notification images (optional).
        //    If you have many, you might store them in a small object cache:
        const notifImages = {};
        for (const metricKey in compNotifyMap) {
            const fileName = compNotifyMap[metricKey];
            const path = await getCompImagePath(fileName);
            if (path) {
                notifImages[metricKey] = await loadImage(path);
            }
        }

        // Determine what to pass to the SQL query:
        // In team mode, we use [teamId]
        // In individual mode, we want to use [playerId, 0] for the IN clause,
        // but we also want to preserve the actual playerId for later calculations.
        let queryIds;
        let individualId = null;
        if (isTeam) {
            queryIds = [id];
        } else {
            queryIds = [id, 0];
            individualId = id;
        }

        // Get tasks using our identifier array.
        const tasks = await getPlayerTasks(boardId, queryIds, isTeam);

        // Draw each cell.
        for (let cellNum = 1; cellNum <= 15; cellNum++) {
            const coords = TASK_COORDINATES[cellNum];
            if (!coords) continue;

            const t = tasks.find((row) => parseInt(row.cell_num) === cellNum);
            if (!t) {
                logger.warn(`[BingoImageGenerator] No task found for cellNum=${cellNum}. Drawing empty box.`);
                drawEmptyBox(ctx, coords.x, coords.y, CROSS_SIZE);
                continue;
            }

            const { status, imagePath, task_name, parameter } = t;

            drawEmptyBox(ctx, coords.x, coords.y, CROSS_SIZE);

            let iconImg;
            if (imagePath) {
                try {
                    iconImg = await loadImage(imagePath);
                } catch (imgErr) {
                    logger.warn(`[BingoImageGenerator] Could not load custom image for task_id=${t.task_id}: ${imgErr.message}`);
                }
            }

            const isType = t.type === 'Exp' || t.type === 'Level';
            if (iconImg) {
                const originalWidth = iconImg.width;
                const originalHeight = iconImg.height;
                const scaleModifier = isType ? 0.4 : 0.6;
                const scaleFactor = Math.min(CROSS_SIZE / originalWidth, CROSS_SIZE / originalHeight) * scaleModifier;
                const newWidth = originalWidth * scaleFactor;
                const newHeight = originalHeight * scaleFactor;
                let centralOffset = isType ? 45 : 55;

                // If the task is completed, move the icon upward by e.g. 20px
                if (status === 'completed') {
                    centralOffset -= 30;
                }

                const xOffset = (CROSS_SIZE - newWidth) / 2;
                const yOffset = (CROSS_SIZE - newHeight) / 2 + centralOffset;
                ctx.drawImage(iconImg, coords.x + xOffset, coords.y + yOffset, newWidth, newHeight);
            } else {
                ctx.fillStyle = '#ff0000';
                ctx.font = '25px RuneScape';
                ctx.textAlign = 'center';
                ctx.fillText('No Image', coords.x + CROSS_SIZE / 2, coords.y + CROSS_SIZE / 2);
            }

            if (status !== 'completed') {
                // Draw task objective text.
                const textOffset = 15;
                const { action, target } = splitTaskName(task_name);
                ctx.fillStyle = '#000000';
                ctx.font = '36px RuneScape';
                ctx.textAlign = 'center';
                ctx.fillText(action, coords.x + CROSS_SIZE / 2 - 1, coords.y + 30 + textOffset - 1);
                ctx.fillText(action, coords.x + CROSS_SIZE / 2 + 1, coords.y + 30 + textOffset - 1);
                ctx.fillText(action, coords.x + CROSS_SIZE / 2 - 1, coords.y + 30 + textOffset + 1);
                ctx.fillText(action, coords.x + CROSS_SIZE / 2 + 1, coords.y + 30 + textOffset + 1);
                ctx.fillStyle = '#dc8a00'; // Orange // ctx.fillStyle = '#ff7aa5'; // Pink Rosey
                ctx.fillText(action, coords.x + CROSS_SIZE / 2, coords.y + 30 + textOffset);

                const actionToTargetSpacing = 17;
                const targetStartY = coords.y + 70 + actionToTargetSpacing + textOffset;
                const formattedTarget = normalizeUpper(target);
                const wrappedTargetLines = getWrappedText(ctx, formattedTarget, CROSS_SIZE - 20);
                const lineHeight = 28;

                wrappedTargetLines.forEach((line, index) => {
                    ctx.fillStyle = '#000000';
                    // Create a drop-shadow effect for better legibility.
                    ctx.fillText(line, coords.x + CROSS_SIZE / 2 - 1, targetStartY + index * lineHeight - 1);
                    ctx.fillText(line, coords.x + CROSS_SIZE / 2 + 1, targetStartY + index * lineHeight - 1);
                    ctx.fillText(line, coords.x + CROSS_SIZE / 2 - 1, targetStartY + index * lineHeight + 1);
                    ctx.fillText(line, coords.x + CROSS_SIZE / 2 + 1, targetStartY + index * lineHeight + 1);
                    ctx.fillStyle = '#dc8a00'; // Orange // ctx.fillStyle = '#ff7aa5'; // Pink Rosey
                    ctx.fillText(line, coords.x + CROSS_SIZE / 2, targetStartY + index * lineHeight);
                });
            }
            if (status === 'completed' && completedCrossImg) {
                ctx.drawImage(completedCrossImg, coords.x, coords.y, CROSS_SIZE, CROSS_SIZE);
            }

            // 9) If there's a matching competition for this metric (parameter),
            //    draw the appropriate "sotw_notif.png" or "botw_notif.png" in the top-right corner
            const notifImg = notifImages[parameter];

            ctx.font = '28px RuneScape';
            ctx.textAlign = 'left';
            ctx.fillStyle = '#000000';

            const pointsText = `${t.points_reward} pts`;
            let bonusText = ''; // Separate text for (+50)

            if (notifImg) {
                // ✅ Draw the notification image
                const overlaySize = 32;
                const overlayX = coords.x + 12;
                const overlayY = coords.y + CROSS_SIZE + 10 - overlaySize - 47;
                ctx.drawImage(notifImg, overlayX, overlayY, overlaySize, overlaySize);

                bonusText = ' (+50)';
            }

            // ✅ Outline for the main text (28px)
            for (const offset of [-1, 1]) {
                ctx.fillText(pointsText, coords.x + 10 + offset, coords.y + CROSS_SIZE - 10);
                ctx.fillText(pointsText, coords.x + 10, coords.y + CROSS_SIZE - 10 + offset);
            }

            // ✅ Draw main points text (28px)
            ctx.fillStyle = notifImg ? '#19ffe8' : '#00ff00'; // Cyan if bonus, Green otherwise
            ctx.fillText(pointsText, coords.x + 10, coords.y + CROSS_SIZE - 10);

            // ✅ Draw the "+50" bonus in a **smaller font**
            if (bonusText) {
                ctx.font = '18px RuneScape';
                ctx.fillStyle = '#000000'; // Cyan color
                const textWidth = ctx.measureText(pointsText).width; // Align correctly
                for (const offset of [-1, 1]) {
                    ctx.fillText(bonusText, coords.x + 10 + textWidth + 30 + offset, coords.y + CROSS_SIZE - 12);
                    ctx.fillText(bonusText, coords.x + 10 + textWidth + 30, coords.y + CROSS_SIZE - 12 + offset);
                }
                ctx.fillStyle = '#19ffe8';
                ctx.fillText(bonusText, coords.x + 10 + textWidth + 30, coords.y + CROSS_SIZE - 12);
            }

            ctx.font = '28px RuneScape';
            // Draw progress text.
            const progressText = `${t.progress}%`;
            ctx.textAlign = 'right';
            const hue = Math.floor((t.progress / 100) * 120);
            const progressColor = `hsl(${hue}, 100%, 50%)`;
            ctx.fillStyle = '#000000';
            ctx.fillText(progressText, coords.x + CROSS_SIZE - 10 - 1, coords.y + CROSS_SIZE - 10 - 1);
            ctx.fillText(progressText, coords.x + CROSS_SIZE - 10 + 1, coords.y + CROSS_SIZE - 10 - 1);
            ctx.fillText(progressText, coords.x + CROSS_SIZE - 10 - 1, coords.y + CROSS_SIZE - 10 + 1);
            ctx.fillText(progressText, coords.x + CROSS_SIZE - 10 + 1, coords.y + CROSS_SIZE - 10 + 1);
            ctx.fillStyle = progressColor;
            ctx.fillText(progressText, coords.x + CROSS_SIZE - 10, coords.y + CROSS_SIZE - 10);
        }

        // Use the actual id for overall progress calculations.
        const eventId = await getEventId(boardId);
        if (eventId) {
            let overallStr;
            if (isTeam) {
                overallStr = await calculateOverallProgress(eventId, id, true);
            } else {
                overallStr = await calculateOverallProgress(eventId, individualId, false);
            }
            const overall = Number(overallStr);
            const coordsX = 16;
            const coordsY = 58;
            const hue = Math.floor((overall / 100) * 120);
            const progressColor = `hsl(${hue}, 100%, 50%)`;
            ctx.font = '32px RuneScape';
            ctx.textAlign = 'left';
            ctx.fillStyle = '#dc8a00'; // ctx.fillStyle = '#ff7aa5'; // Pink Rosey
            ctx.fillText('Overall:', coordsX, coordsY);
            const overallWidth = ctx.measureText('Overall:').width + 4;
            ctx.fillStyle = '#000000';
            ctx.fillText(`${overall.toFixed(2)}%`, coordsX + overallWidth - 1, coordsY - 1);
            ctx.fillText(`${overall.toFixed(2)}%`, coordsX + overallWidth + 1, coordsY - 1);
            ctx.fillText(`${overall.toFixed(2)}%`, coordsX + overallWidth - 1, coordsY + 1);
            ctx.fillText(`${overall.toFixed(2)}%`, coordsX + overallWidth + 1, coordsY + 1);
            ctx.fillStyle = progressColor;
            ctx.fillText(`${overall.toFixed(2)}%`, coordsX + overallWidth, coordsY);
        }

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
 * @returns
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
 *
 * @param fileName
 * @returns
 */
async function getCompImagePath(fileName) {
    const row = await db.image.getOne(
        `
    SELECT file_path
    FROM emojis
    WHERE file_name = ?
  `,
        [fileName],
    );
    return row ? row.file_path : null;
}

/**
 * Retrieves tasks for a given board and identifier(s).
 *
 * @param {number} boardId
 * @param {Array} playerIds - For team mode, an array with one element; for individual mode, [playerId, 0]
 * @param {boolean} isTeam - Indicates whether to query by team_id or player_id.
 * @returns {Array} Array of task objects.
 */
async function getPlayerTasks(boardId, playerIds, isTeam = false) {
    const playerIdsArray = Array.isArray(playerIds) ? playerIds : [playerIds];
    const idColumn = isTeam ? 'btp.team_id' : 'btp.player_id';
    const placeholders = playerIdsArray.map(() => '?').join(',');

    const sql = `
  SELECT 
      ((bbc.row) * 5 + (bbc.column + 1)) AS cell_num,
      bbc.task_id,
      bt.description AS task_name,
      bt.type,
      bt.parameter AS parameter,
      bt.value,
      COALESCE(SUM(btp.progress_value), 0) AS progress_value,
      bt.base_points AS points_reward,
      CASE
        WHEN SUM(CASE WHEN btp.status = 'completed' THEN 1 ELSE 0 END) > 0 THEN 'completed'
        WHEN SUM(CASE WHEN btp.status = 'in-progress' THEN 1 ELSE 0 END) > 0 THEN 'in-progress'
        ELSE 'incomplete'
      END AS status
  FROM bingo_board_cells bbc
  JOIN bingo_tasks bt ON bbc.task_id = bt.task_id
  LEFT JOIN bingo_task_progress btp
      ON btp.task_id = bt.task_id
      AND ${idColumn} IN (${placeholders})
      AND btp.event_id = ?
  JOIN bingo_state bs
      ON bs.board_id = bbc.board_id
  WHERE bbc.board_id = ?
    AND bs.state = 'ongoing'
  GROUP BY bbc.row, bbc.column
  ORDER BY cell_num ASC
  LIMIT 15
`;

    const eventId = await getEventId(boardId);
    const params = [...playerIdsArray, eventId, boardId];
    const rows = await db.getAll(sql, params);

    // Enrich rows with image paths based on task type.
    for (const row of rows) {
        if (['Exp', 'Level'].includes(row.type)) {
            const imageSkillRow = await db.image.getOne(
                `
            SELECT file_path
            FROM bingo
            WHERE file_name = ?
            `,
                [row.parameter],
            );
            if (imageSkillRow) {
                row.imagePath = imageSkillRow.file_path;
            }
        } else if (row.type === 'Kill') {
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
        } else if (row.type === 'Score') {
            const imageRow = await db.image.getOne(
                `
            SELECT file_path
            FROM hiscores_activities
            WHERE file_name = ?
            `,
                [row.parameter],
            );
            if (imageRow) {
                row.imagePath = imageRow.file_path;
            }
        }
    }

    let teamSize = null;
    if (isTeam) {
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

    rows.forEach((row) => {
        row.progress = calculateProgressPercentage(row.progress_value, row.value);
    });

    return rows.map((r) => ({
        cell_num: parseInt(r.cell_num),
        task_id: r.task_id,
        task_name: r.task_name || '(No Name)',
        type: r.type || null,
        parameter: r.parameter || null,
        imagePath: r.imagePath || null,
        points_reward: r.points_reward || 0,
        status: r.status,
        progress: r.progress,
    }));
}

/**
 *
 * @param progressValue
 * @param target
 * @returns
 */
function calculateProgressPercentage(progressValue, target) {
    const effectiveTarget = target;
    const percentage = Math.min((progressValue / effectiveTarget) * 100, 100);
    return percentage.toFixed(2);
}

/**
 *
 * @param eventId
 * @param id
 * @param isTeam
 * @returns
 */
async function calculateOverallProgress(eventId, id, isTeam = false) {
    if (isTeam) {
        const { teamTotalOverallPartial, totalBoardPoints } = await computeTeamPartialPoints(eventId, id);
        const result = totalBoardPoints > 0 ? computeOverallPercentage(teamTotalOverallPartial, totalBoardPoints) : 0;
        return result.toFixed(2);
    } else {
        const { partialPoints, totalBoardPoints } = await computeIndividualPartialPoints(eventId, id, true);
        const overallFloat = computeOverallPercentage(partialPoints, totalBoardPoints);
        const result = parseFloat(overallFloat.toFixed(2));
        return result;
    }
}

/**
 *
 * @param boardId
 * @returns
 */
async function getEventId(boardId) {
    const row = await db.getOne(
        `
        SELECT event_id
        FROM bingo_boards
        WHERE board_id = ?
        `,
        [boardId],
    );
    return row ? row.event_id : null;
}

module.exports = {
    generateBingoCard,
    getPlayerTasks,
    getEventId,
    calculateOverallProgress,
    calculateProgressPercentage,
};
