require('dotenv').config();
const logger = require('../../utils/essentials/logger');
const db = require('../../utils/essentials/dbUtils');
const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');
const {
    computeOverallPercentage,
    computeTeamPartialPoints,
    computeIndividualPartialPoints,
} = require('./bingoCalculations');
const normalizeUpper = require('../../utils/normalizing/normalizeUpper');
const getPlayerRank = require('../../utils/fetchers/getPlayerRank');
const getTeamName = require('../../utils/fetchers/getTeamName');
const getPlayerRsn = require('../../utils/fetchers/getPlayerRsn');

const fontPath = path.join(__dirname, '../../../assets/runescape_bold.ttf');
registerFont(fontPath, { family: 'RuneScape' });

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1248;
const CROSS_SIZE = 359;

const BOTW_COLOR = '#fe695d'; 
const SOTW_COLOR = '#19ffe8'; 
const POINTS_COLOR = '#00ff00'; 
const OUTLINE_COLOR = '#000000'; 
const TEXT_COLOR = '#97ddfe'; 

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

async function generateBingoCard(boardId, id, isTeam = false) {

    logger.info(
        `[BingoImageGenerator] Generating card for board=${boardId}, id=${id}, isTeam=${isTeam}`
    );

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

        const overlaySotwPath = await getImagePath('overlay_sotw');
        let overlaySotwImg = null;
        if (overlaySotwPath) {
            overlaySotwImg = await loadImage(overlaySotwPath);
        }

        const overlayBotwPath = await getImagePath('overlay_botw');
        let overlayBotwImg = null;
        if (overlayBotwPath) {
            overlayBotwImg = await loadImage(overlayBotwPath);
        }

        const dividerPath = await getImagePath('divider');
        let dividerImg = null;
        if (dividerPath) {
            dividerImg = await loadImage(dividerPath);
        }

        const clanLogoPath = await getImagePath('clan_logo');
        let clanLogoImg = null;
        if (clanLogoPath) {
            clanLogoImg = await loadImage(clanLogoPath);
        }

        const comps = await db.getAll(`
      SELECT metric, type
      FROM competitions
      WHERE type IN ('SOTW','BOTW')
    `);

        const compNotifyMap = {};
        const compTypeMap = {};
        for (const c of comps) {
            compNotifyMap[c.metric] = `${c.metric}`;
            compTypeMap[c.metric] = c.type;
        }

        const notifImages = {};
        for (const metricKey in compNotifyMap) {
            const fileName = compNotifyMap[metricKey];
            const path = await getCompImagePath(fileName);
            if (path) {
                notifImages[metricKey] = await loadImage(path);
            }
        }

        let queryIds;
        let individualId = null;
        if (isTeam) {
            queryIds = [id];
        } else {
            queryIds = [id, 0];
            individualId = id;
        }

        const tasks = await getPlayerTasks(boardId, queryIds, isTeam);

        for (let cellNum = 1; cellNum <= 15; cellNum++) {
            const coords = TASK_COORDINATES[cellNum];
            if (!coords) continue;

            const t = tasks.find((row) => parseInt(row.cell_num) === cellNum);
            if (!t) {
                logger.warn(
                    `[BingoImageGenerator] No task found for cellNum=${cellNum}. Drawing empty box.`
                );
                drawEmptyBox(ctx, coords.x, coords.y, CROSS_SIZE);
                continue;
            }

            const { status, imagePath, task_name, parameter } = t;
            const compType = compTypeMap[parameter];

            drawEmptyBox(ctx, coords.x, coords.y, CROSS_SIZE);

            let iconImg;
            if (imagePath) {
                try {
                    iconImg = await loadImage(imagePath);
                } catch (imgErr) {
                    logger.warn(
                        `[BingoImageGenerator] Could not load custom image for task_id=${t.task_id}: ${imgErr.message}`
                    );
                }
            }

            if (status !== 'completed' && dividerImg) {
                const dividerOffsetX = 11; 
                const dividerOffsetY = 57; 
                ctx.drawImage(
                    dividerImg,
                    coords.x + dividerOffsetX,
                    coords.y + dividerOffsetY
                );
            }

            const isType = t.type === 'Exp' || t.type === 'Level';
            if (iconImg) {
                const originalWidth = iconImg.width;
                const originalHeight = iconImg.height;
                const scaleModifier = isType ? 0.4 : 0.6;
                const scaleFactor =
          Math.min(CROSS_SIZE / originalWidth, CROSS_SIZE / originalHeight) *
          scaleModifier;
                const newWidth = originalWidth * scaleFactor;
                const newHeight = originalHeight * scaleFactor;
                let centralOffset = isType ? 45 : 55;

                if (status === 'completed') {
                    centralOffset -= 30;
                }

                const xOffset = (CROSS_SIZE - newWidth) / 2;
                const yOffset = (CROSS_SIZE - newHeight) / 2 + centralOffset;
                ctx.drawImage(
                    iconImg,
                    coords.x + xOffset,
                    coords.y + yOffset,
                    newWidth,
                    newHeight
                );
            } else {
                ctx.fillStyle = '#ff0000';
                ctx.font = '25px RuneScape';
                ctx.textAlign = 'center';
                ctx.fillText(
                    'No Image',
                    coords.x + CROSS_SIZE / 2,
                    coords.y + CROSS_SIZE / 2
                );
            }

            if (status !== 'completed') {

                const textOffset = 15;
                const { action, target } = splitTaskName(task_name);
                ctx.fillStyle = OUTLINE_COLOR;
                ctx.font = '36px RuneScape';
                ctx.textAlign = 'center';
                ctx.fillText(
                    action,
                    coords.x + CROSS_SIZE / 2 - 1,
                    coords.y + 30 + textOffset - 1
                );
                ctx.fillText(
                    action,
                    coords.x + CROSS_SIZE / 2 + 1,
                    coords.y + 30 + textOffset - 1
                );
                ctx.fillText(
                    action,
                    coords.x + CROSS_SIZE / 2 - 1,
                    coords.y + 30 + textOffset + 1
                );
                ctx.fillText(
                    action,
                    coords.x + CROSS_SIZE / 2 + 1,
                    coords.y + 30 + textOffset + 1
                );

                if (compType === 'BOTW') {
                    ctx.fillStyle = BOTW_COLOR;
                    ctx.fillText(
                        action,
                        coords.x + CROSS_SIZE / 2,
                        coords.y + 30 + textOffset
                    );
                } else if (compType === 'SOTW') {
                    ctx.fillStyle = SOTW_COLOR;
                    ctx.fillText(
                        action,
                        coords.x + CROSS_SIZE / 2,
                        coords.y + 30 + textOffset
                    );
                } else {
                    ctx.fillStyle = TEXT_COLOR;
                    ctx.fillText(
                        action,
                        coords.x + CROSS_SIZE / 2,
                        coords.y + 30 + textOffset
                    );
                }

                const actionToTargetSpacing = 17;
                const targetStartY = coords.y + 70 + actionToTargetSpacing + textOffset;
                const formattedTarget = normalizeUpper(target);
                const wrappedTargetLines = getWrappedText(
                    ctx,
                    formattedTarget,
                    CROSS_SIZE - 20
                );
                const lineHeight = 28;

                wrappedTargetLines.forEach((line, index) => {
                    ctx.fillStyle = OUTLINE_COLOR;

                    ctx.fillText(
                        line,
                        coords.x + CROSS_SIZE / 2 - 1,
                        targetStartY + index * lineHeight - 1
                    );
                    ctx.fillText(
                        line,
                        coords.x + CROSS_SIZE / 2 + 1,
                        targetStartY + index * lineHeight - 1
                    );
                    ctx.fillText(
                        line,
                        coords.x + CROSS_SIZE / 2 - 1,
                        targetStartY + index * lineHeight + 1
                    );
                    ctx.fillText(
                        line,
                        coords.x + CROSS_SIZE / 2 + 1,
                        targetStartY + index * lineHeight + 1
                    );

                    if (compType === 'BOTW') {
                        ctx.fillStyle = BOTW_COLOR;
                        ctx.fillText(
                            line,
                            coords.x + CROSS_SIZE / 2,
                            targetStartY + index * lineHeight
                        );
                    } else if (compType === 'SOTW') {
                        ctx.fillStyle = SOTW_COLOR;
                        ctx.fillText(
                            line,
                            coords.x + CROSS_SIZE / 2,
                            targetStartY + index * lineHeight
                        );
                    } else {
                        ctx.fillStyle = TEXT_COLOR;
                        ctx.fillText(
                            line,
                            coords.x + CROSS_SIZE / 2,
                            targetStartY + index * lineHeight
                        );
                    }
                });
            }

            const notifImg = notifImages[parameter];
            const pointsText = `${t.points_reward} pts`;
            const bonusText = notifImg ? ' (+50)' : '';

            ctx.font = '28px RuneScape';
            ctx.textAlign = 'left';

            const leftMargin = 10; 
            const imageTextSpacing = 6; 
            const bonusOffset = 30; 

            let currentX = coords.x + leftMargin;

            const textY = coords.y + CROSS_SIZE - 10;

            let overlayToDraw = null;
            if (compType === 'SOTW' && overlaySotwImg) {
                overlayToDraw = overlaySotwImg;
            } else if (compType === 'BOTW' && overlayBotwImg) {
                overlayToDraw = overlayBotwImg;
            }

            if (overlayToDraw) {
                ctx.drawImage(
                    overlayToDraw,
                    coords.x,
                    coords.y,
                    CROSS_SIZE,
                    CROSS_SIZE
                );
            }

            if (status === 'completed' && completedCrossImg) {
                ctx.drawImage(
                    completedCrossImg,
                    coords.x,
                    coords.y,
                    CROSS_SIZE,
                    CROSS_SIZE
                );
            }

            if (notifImg) {
                const targetHeight = 28;
                const scaleFactor = targetHeight / notifImg.height;
                const targetWidth = notifImg.width * scaleFactor;
                const imageY = textY - 15 - targetHeight / 2;
                ctx.drawImage(notifImg, currentX, imageY, targetWidth, targetHeight);
                currentX += targetWidth + imageTextSpacing;
            }

            ctx.fillStyle = OUTLINE_COLOR; 
            for (const offset of [-1, 1]) {
                ctx.fillText(pointsText, currentX + offset, textY);
                ctx.fillText(pointsText, currentX, textY + offset);
            }

            if (compType === 'BOTW') {
                ctx.fillStyle = BOTW_COLOR;
            } else if (compType === 'SOTW') {
                ctx.fillStyle = SOTW_COLOR;
            } else {
                ctx.fillStyle = POINTS_COLOR;
            }

            ctx.fillText(pointsText, currentX, textY);

            if (bonusText) {

                ctx.font = '18px RuneScape';

                const textWidth = ctx.measureText(pointsText).width;

                const bonusX = currentX + textWidth + bonusOffset;

                ctx.fillStyle = OUTLINE_COLOR; 
                for (const offset of [-1, 1]) {
                    ctx.fillText(bonusText, bonusX + offset, textY - 2);
                    ctx.fillText(bonusText, bonusX, textY - 2 + offset);
                }

                if (compType === 'BOTW') {
                    ctx.fillStyle = BOTW_COLOR;
                    ctx.fillText(bonusText, bonusX, textY - 2);
                } else if (compType === 'SOTW') {
                    ctx.fillStyle = SOTW_COLOR;
                    ctx.fillText(bonusText, bonusX, textY - 2);
                }
            }
            if (status !== 'completed' && t.progress > 0) {
                ctx.font = '28px RuneScape';

                const progressText = `${t.progress}%`;
                ctx.textAlign = 'right';
                const hue = Math.floor((t.progress / 100) * 120);
                const progressColor = `hsl(${hue}, 100%, 50%)`;
                ctx.fillStyle = OUTLINE_COLOR;
                ctx.fillText(
                    progressText,
                    coords.x + CROSS_SIZE - 10 - 1,
                    coords.y + CROSS_SIZE - 10 - 1
                );
                ctx.fillText(
                    progressText,
                    coords.x + CROSS_SIZE - 10 + 1,
                    coords.y + CROSS_SIZE - 10 - 1
                );
                ctx.fillText(
                    progressText,
                    coords.x + CROSS_SIZE - 10 - 1,
                    coords.y + CROSS_SIZE - 10 + 1
                );
                ctx.fillText(
                    progressText,
                    coords.x + CROSS_SIZE - 10 + 1,
                    coords.y + CROSS_SIZE - 10 + 1
                );
                ctx.fillStyle = progressColor;
                ctx.fillText(
                    progressText,
                    coords.x + CROSS_SIZE - 10,
                    coords.y + CROSS_SIZE - 10
                );
            }
        }

        const eventId = await getEventId(boardId);
        if (eventId) {
            let overallStr;
            if (isTeam) {
                overallStr = await calculateOverallProgress(eventId, id, true);
            } else {
                overallStr = await calculateOverallProgress(
                    eventId,
                    individualId,
                    false
                );
            }
            const overall = Number(overallStr);
            const coordsX = 16;
            const coordsY = 58;
            const hue = Math.floor((overall / 100) * 120);
            const progressColor = `hsl(${hue}, 100%, 50%)`;
            ctx.font = '32px RuneScape';
            ctx.textAlign = 'left';
            if (overall > 0) {
                ctx.fillStyle = OUTLINE_COLOR;
                ctx.fillText('Overall:', coordsX - 1, coordsY - 1);
                ctx.fillText('Overall:', coordsX + 1, coordsY - 1);
                ctx.fillText('Overall:', coordsX - 1, coordsY + 1);
                ctx.fillText('Overall:', coordsX + 1, coordsY + 1);
                ctx.fillStyle = TEXT_COLOR;
                ctx.fillText('Overall:', coordsX, coordsY);

                const overallWidth = ctx.measureText('Overall:').width + 4;
                ctx.fillStyle = OUTLINE_COLOR;
                ctx.fillText(
                    `${overall.toFixed(2)}%`,
                    coordsX + overallWidth - 1,
                    coordsY - 1
                );
                ctx.fillText(
                    `${overall.toFixed(2)}%`,
                    coordsX + overallWidth + 1,
                    coordsY - 1
                );
                ctx.fillText(
                    `${overall.toFixed(2)}%`,
                    coordsX + overallWidth - 1,
                    coordsY + 1
                );
                ctx.fillText(
                    `${overall.toFixed(2)}%`,
                    coordsX + overallWidth + 1,
                    coordsY + 1
                );
                ctx.fillStyle = progressColor;
                ctx.fillText(`${overall.toFixed(2)}%`, coordsX + overallWidth, coordsY);
            }
        }

        const clanName = `${process.env.CLAN_NAME} — Bingo`;
        const spacing = 10; 
        const centerY = 45; 

        if (clanLogoImg) {

            const targetHeight = 32;
            const scaleFactor = targetHeight / clanLogoImg.height;
            const logoWidth = clanLogoImg.width * scaleFactor;

            ctx.font = '32px RuneScape';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            const textWidth = ctx.measureText(clanName).width;

            const totalWidth = logoWidth + spacing + textWidth;
            const startX = (CANVAS_WIDTH - totalWidth) / 2;

            ctx.drawImage(
                clanLogoImg,
                startX,
                centerY - targetHeight / 2,
                logoWidth,
                targetHeight
            );

            const textX = startX + logoWidth + spacing;

            ctx.fillStyle = OUTLINE_COLOR;
            ctx.fillText(clanName, textX - 1, centerY - 1);
            ctx.fillText(clanName, textX + 1, centerY - 1);
            ctx.fillText(clanName, textX - 1, centerY + 1);
            ctx.fillText(clanName, textX + 1, centerY + 1);

            ctx.fillStyle = TEXT_COLOR;
            ctx.fillText(clanName, textX, centerY);
        } else {

            ctx.font = '32px RuneScape';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.fillStyle = OUTLINE_COLOR;
            ctx.fillText(clanName, CANVAS_WIDTH / 2 - 1, centerY - 1);
            ctx.fillText(clanName, CANVAS_WIDTH / 2 + 1, centerY - 1);
            ctx.fillText(clanName, CANVAS_WIDTH / 2 - 1, centerY + 1);
            ctx.fillText(clanName, CANVAS_WIDTH / 2 + 1, centerY + 1);

            ctx.fillStyle = TEXT_COLOR;
            ctx.fillText(clanName, CANVAS_WIDTH / 2, centerY);
        }

        if (id > 0) {

            const senderName = isTeam
                ? await getTeamName(id)
                : await getPlayerRsn(id);
            const playerRank = await getPlayerRank(id);
            logger.info(`Collected Rank: ${playerRank}`);
            const clanRankPath = await getRankImagePath(`${playerRank}`);
            logger.info(`Found Path: ${clanRankPath}`);
            let clanRankImg = null;
            if (clanRankPath) {
                clanRankImg = await loadImage(clanRankPath);
            }

            let displayName = `${senderName}`;

            if (isTeam) {
                displayName = `Team: ${senderName}`;
            }

            const rightMargin = 16; 
            const spacing = 5; 
            const senderY = 45; 

            ctx.font = '32px RuneScape';
            ctx.textBaseline = 'middle'; 

            if (displayName !== 'null') {
                if (clanRankImg) {

                    const targetHeight = 24;

                    const scaleFactor = targetHeight / clanRankImg.height;
                    const rankWidth = clanRankImg.width * scaleFactor;

                    const textWidth = ctx.measureText(senderName).width;

                    const totalWidth = rankWidth + spacing + textWidth;

                    const startX = CANVAS_WIDTH - rightMargin - totalWidth;

                    ctx.drawImage(
                        clanRankImg,
                        startX,
                        senderY - targetHeight / 2,
                        rankWidth,
                        targetHeight
                    );

                    const textX = startX + rankWidth + spacing;

                    ctx.fillStyle = OUTLINE_COLOR;
                    ctx.fillText(displayName, textX - 1, senderY - 1);
                    ctx.fillText(displayName, textX + 1, senderY - 1);
                    ctx.fillText(displayName, textX - 1, senderY + 1);
                    ctx.fillText(displayName, textX + 1, senderY + 1);

                    ctx.fillStyle = TEXT_COLOR;
                    ctx.fillText(displayName, textX, senderY);
                } else {

                    ctx.textAlign = 'right';
                    ctx.fillStyle = OUTLINE_COLOR;
                    ctx.fillText(
                        displayName,
                        CANVAS_WIDTH - rightMargin - 1,
                        senderY - 1
                    );
                    ctx.fillText(
                        displayName,
                        CANVAS_WIDTH - rightMargin + 1,
                        senderY - 1
                    );
                    ctx.fillText(
                        displayName,
                        CANVAS_WIDTH - rightMargin - 1,
                        senderY + 1
                    );
                    ctx.fillText(
                        displayName,
                        CANVAS_WIDTH - rightMargin + 1,
                        senderY + 1
                    );
                    ctx.fillStyle = TEXT_COLOR;
                    ctx.fillText(displayName, CANVAS_WIDTH - rightMargin, senderY);
                }
            }
        }

        const finalBuffer = canvas.toBuffer('image/png');
        return finalBuffer;
    } catch (err) {
        logger.error(`[BingoImageGenerator] Error generating card: ${err.message}`);
        return null;
    }
}

function drawEmptyBox(ctx, x, y, size) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0)';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, size, size);
}

async function getImagePath(fileName) {
    const row = await db.image.getOne(
        `
    SELECT file_path
    FROM bingo
    WHERE file_name = ?
  `,
        [fileName]
    );
    return row ? row.file_path : null;
}

async function getRankImagePath(fileName) {
    const row = await db.image.getOne(
        `
    SELECT file_path
    FROM ranks
    WHERE file_name = ?
  `,
        [fileName]
    );
    return row ? row.file_path : null;
}

async function getCompImagePath(fileName) {
    const row = await db.image.getOne(
        `
    SELECT file_path
    FROM emojis
    WHERE file_name = ?
  `,
        [fileName]
    );
    return row ? row.file_path : null;
}

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

    for (const row of rows) {
        if (['Exp', 'Level'].includes(row.type)) {
            const imageSkillRow = await db.image.getOne(
                `
            SELECT file_path
            FROM bingo
            WHERE file_name = ?
            `,
                [row.parameter]
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
                [row.parameter]
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
                [row.parameter]
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
            [playerIdsArray[0]]
        );
        teamSize = teamInfo ? teamInfo.count : 1;
        logger.info(
            `[BingoImageGenerator] Team size for team ${playerIdsArray[0]}: ${teamSize}`
        );
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

function calculateProgressPercentage(progressValue, target) {
    const effectiveTarget = target;
    const percentage = Math.min((progressValue / effectiveTarget) * 100, 100);
    return percentage.toFixed(2);
}

async function calculateOverallProgress(eventId, id, isTeam = false) {
    if (isTeam) {
        const { teamTotalOverallPartial, totalBoardPoints } =
      await computeTeamPartialPoints(eventId, id);
        const result =
      totalBoardPoints > 0
          ? computeOverallPercentage(teamTotalOverallPartial, totalBoardPoints)
          : 0;
        return result.toFixed(2);
    } else {
        const { partialPoints, totalBoardPoints } =
      await computeIndividualPartialPoints(eventId, id, true);
        const overallFloat = computeOverallPercentage(
            partialPoints,
            totalBoardPoints
        );
        const result = parseFloat(overallFloat.toFixed(2));
        return result;
    }
}

async function getEventId(boardId) {
    const row = await db.getOne(
        `
        SELECT event_id
        FROM bingo_boards
        WHERE board_id = ?
        `,
        [boardId]
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
