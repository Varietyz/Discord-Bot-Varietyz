/**
 * Module: patternNotificationManager.js
 *
 * Purpose:
 * - Query the bingo_patterns_awarded table (using awarded_at as the marker)
 *   for new pattern awards.
 * - Consolidate pattern awards into a **single embed per player** (if solo)
 *   or a **single embed per team** (if in a team).
 * - Prevent duplicate notifications by checking active embeds before sending.
 * - Store sent notifications using createEmbedRecord() to avoid redundant sends.
 */

const { EmbedBuilder } = require('discord.js');
const db = require('../../../utils/essentials/dbUtils');
const logger = require('../../../utils/essentials/logger');
const getEmojiWithFallback = require('../../../utils/fetchers/getEmojiWithFallback');
const getPlayerLink = require('../../../utils/fetchers/getPlayerLink');
const getChannelId = require('../../../utils/fetchers/getChannel');

// Embed Manager functions.
const { getActiveEmbeds, createEmbedRecord } = require('./handling/bingoEmbedManager');
const { getPatternDefinitionByKey } = require('../bingoPatternRecognition');

// In-memory marker for last notified timestamp per event.
const lastNotificationTimestamps = {};

/**
 * Helper: generatePatternGrid
 * Creates a string representation of a 3x5 grid.
 * Each cell is represented by a "V" if the cell is part of the pattern, otherwise an "X".
 * @param cells
 * @param numRows
 * @param numCols
 */
function generatePatternGrid(cells, numRows = 3, numCols = 5) {
    let grid = '';
    for (let r = 0; r < numRows; r++) {
        let rowStr = '> ';
        for (let c = 0; c < numCols; c++) {
            const marked = cells.some((cell) => cell.row === r && cell.col === c);
            rowStr += marked ? '✅ ' : '❌ ';
        }
        grid += rowStr.trim() + '\n';
    }
    return grid.trim();
}

/**
 * Generates **one consolidated embed per player** or **one per team**.
 *
 * @param {Object} groupedAwards - A mapping of player/team to awards.
 * @returns {Promise<Array>} - Array of EmbedBuilder instances.
 */
async function createPatternNotificationEmbeds(groupedAwards) {
    const patternEmoji = await getEmojiWithFallback('emoji_pattern_bonus', '🎯');
    const embeds = [];

    for (const key in groupedAwards) {
        const { players, awards } = groupedAwards[key];
        const isTeam = players.length > 1;
        const title = isTeam ? `${patternEmoji} Team Pattern Award` : `${patternEmoji} Pattern Award Notification`;

        // ✅ Format player or team name
        const playerLinks = (await Promise.all(players.map(async (p) => `- ${await getPlayerLink(p.rsn)}`))).join('\n');
        const description = isTeam ? `🏆 **Team Members:**\n${playerLinks}` : `${playerLinks}`;

        const fields = [];
        const numRows = 3,
            numCols = 5;

        for (const award of awards) {
            let patternDef = getPatternDefinitionByKey(award.pattern_key, numRows, numCols);
            if (!patternDef) {
                logger.warn(`[PatternNotifications] No pattern found for ${award.pattern_key}`);
                patternDef = { cells: [] };
            }

            const grid = generatePatternGrid(patternDef.cells, numRows, numCols);
            fields.push({
                name: `Completed: \`${award.pattern_name || award.pattern_key}\``,
                value: `\`(+${award.points_awarded} pts)\`\n${grid}`,
                inline: true,
            });
        }

        embeds.push(new EmbedBuilder().setTitle(title).setDescription(description).setColor(0x00aeff).setTimestamp().addFields(fields));
    }

    return embeds;
}

/**
 * Notifies new pattern awards for a given event.
 *
 * - **One embed per player** (if solo) or **one per team** (if in a team).
 * - **Avoids duplicate notifications** by checking active embeds.
 * - **Prevents players in teams from being reprocessed as solo entries.**
 *
 * @param client
 * @param eventId
 */
async function notifyPatternAwards(client, eventId) {
    try {
        const lastNotified = lastNotificationTimestamps[eventId] || '2025-01-01 00:00:00';

        const query = `
        SELECT 
          bpa.awarded_id,
          bpa.board_id,
          bpa.event_id,
          bpa.player_id,
          bpa.pattern_key,
          bpa.pattern_name,
          bpa.awarded_at,
          bpa.points_awarded,
          SUM(bpa.points_awarded) OVER (PARTITION BY bpa.player_id) AS total_points,
          rr.rsn,
          COALESCE(btm.team_id, 0) AS team_id,
          bt.team_name
        FROM bingo_patterns_awarded bpa
        JOIN registered_rsn rr ON rr.player_id = bpa.player_id
        LEFT JOIN bingo_team_members btm ON btm.player_id = bpa.player_id
        LEFT JOIN bingo_teams bt ON bt.team_id = btm.team_id
        WHERE bpa.event_id = ? AND bpa.awarded_at > ?
        ORDER BY bpa.awarded_at ASC
        `;

        const awards = await db.getAll(query, [eventId, lastNotified]);

        if (!awards.length) {
            logger.info(`[PatternNotification] No new pattern awards for event ${eventId} since ${lastNotified}.`);
            return;
        }

        // **Step 1: Prevent duplicate notifications**
        const activeEmbeds = await getActiveEmbeds(eventId, 'pattern_notification');
        const notifiedAwards = new Set();
        const groupedAwards = {};
        const processedPlayers = new Set(); // ✅ Track players already processed in teams

        for (const award of awards) {
            const exists = activeEmbeds.some((embed) => embed.player_id === award.player_id && embed.task_id === award.pattern_key);
            if (exists) continue; // Skip if already notified

            const isInTeam = award.team_id > 0;
            const key = isInTeam ? `team-${award.team_id}` : `player-${award.player_id}`;

            // ✅ Skip processing players who are already in a team notification
            if (isInTeam) {
                processedPlayers.add(award.player_id);
            } else if (processedPlayers.has(award.player_id)) {
                continue; // If already processed in a team, do not process as solo
            }

            if (!groupedAwards[key]) {
                groupedAwards[key] = {
                    players: [],
                    patterns: new Set(), // Store unique patterns per team
                    awards: [],
                };
            }

            if (!groupedAwards[key].players.some((p) => p.rsn === award.rsn)) {
                groupedAwards[key].players.push({ rsn: award.rsn, id: award.player_id });
            }

            if (!groupedAwards[key].patterns.has(award.pattern_key)) {
                groupedAwards[key].patterns.add(award.pattern_key); // ✅ Ensure pattern is only added **once per team**
                groupedAwards[key].awards.push(award); // ✅ Add unique pattern award
            }

            notifiedAwards.add(award.pattern_key);
        }

        if (Object.keys(groupedAwards).length === 0) {
            logger.info(`[PatternNotification] All awards already notified for event ${eventId}.`);
            return;
        }

        // **Step 2: Send Notifications**
        const embeds = await createPatternNotificationEmbeds(groupedAwards);
        const channelId = await getChannelId('bingo_patterns_channel');
        if (!channelId) throw new Error('Pattern notification channel not configured.');
        const channel = client.channels.cache.get(channelId);
        if (!channel) throw new Error(`Channel with ID ${channelId} not found.`);

        for (const embed of embeds) {
            const message = await channel.send({ embeds: [embed] });
            logger.info(`[PatternNotification] Sent pattern notification embed for event ${eventId}.`);

            for (const key in groupedAwards) {
                const { awards } = groupedAwards[key];

                for (const award of awards) {
                    await createEmbedRecord(eventId, award.player_id, award.team_id, award.pattern_key, message.id, channel.id, 'pattern_notification');
                }
            }
        }

        // **Step 3: Update last notified timestamp**
        const latestTimestamp = awards[awards.length - 1].awarded_at;
        lastNotificationTimestamps[eventId] = latestTimestamp;
        logger.info(`[PatternNotification] Updated last notification timestamp for event ${eventId} to ${latestTimestamp}.`);
    } catch (err) {
        logger.error(`[PatternNotification] Error: ${err.message}`);
    }
}

module.exports = {
    notifyPatternAwards,
};
