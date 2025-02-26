// /modules/services/bingo/bingoNotifications.js
const { EmbedBuilder } = require('discord.js');
const logger = require('../../utils/essentials/logger');
const db = require('../../utils/essentials/dbUtils');
const bingoEmbedManager = require('./bingoEmbedManager');
const getChannelId = require('../../utils/fetchers/getChannel'); // Import helper

/**
 * Sends notifications for task completions that have not yet been notified
 * or whose notification embeds were deleted.
 *
 * Detailed task information is included in the embed.
 *
 * @param {Client} client - The Discord client (must be ready).
 */
async function sendProgressUpdates(client) {
    try {
        logger.info('[BingoNotifications] sendProgressUpdates() → Start');

        // Retrieve the channel ID using the helper.
        const channelId = await getChannelId('bingo_updates_channel');
        if (!channelId) {
            logger.warn('[BingoNotifications] No bingo_updates_channel configured.');
            return;
        }

        // Retrieve the guild and channel.
        const guild = client.guilds.cache.get(process.env.GUILD_ID);
        if (!guild) {
            logger.warn('[BingoNotifications] Guild not found.');
            return;
        }
        const channel = guild.channels.cache.get(channelId);
        if (!channel) {
            logger.warn(`[BingoNotifications] Channel #${channelId} not found in guild.`);
            return;
        }

        // Query for completed tasks that have not been notified yet,
        // or where a previous embed was deleted.
        const newCompletions = await db.getAll(`
    SELECT 
        btp.event_id, 
        btp.task_id, 
        btp.player_id,
        rr.rsn, 
        bt.description AS taskName, 
        btp.last_updated,
        btp.points_awarded,     -- Use actual points awarded
        be.embed_id,
        be.status
    FROM bingo_task_progress btp
    JOIN bingo_tasks bt ON bt.task_id = btp.task_id
    JOIN registered_rsn rr ON rr.player_id = btp.player_id
    LEFT JOIN bingo_embeds be 
        ON be.task_id = btp.task_id 
        AND be.player_id = btp.player_id 
        AND be.embed_type = 'progress'
    WHERE btp.status = 'completed'
      AND (be.embed_id IS NULL OR be.status = 'deleted')
    ORDER BY btp.last_updated DESC
`);

        if (newCompletions.length === 0) {
            logger.info('[BingoNotifications] No new completions found that require notification.');
            return;
        }

        // Process each new or deleted completion individually.
        for (const row of newCompletions) {
            // Check if task is team-based
            const isTeamTask = await db.getOne(
                `
    SELECT team_id 
    FROM bingo_task_progress
    WHERE event_id = ?
      AND task_id = ?
      AND player_id = ?
    `,
                [row.event_id, row.task_id, row.player_id],
            );

            if (isTeamTask?.team_id) {
                logger.info('[BingoNotifications] Team task completed. Notifying team members individually.');
            }

            // Create an embed with enhanced formatting.
            const embed = new EmbedBuilder()
                .setTitle('🎉 **Task Completed!**')
                .setColor(0x48de6f)
                .setTimestamp(new Date(row.last_updated))
                .setDescription(`**${row.rsn}** has just completed a task!`)
                .addFields({ name: '📝 Task', value: `**\`\`\`fix\n${row.taskName}\n\`\`\`**`, inline: true }, { name: '⭐ Points Earned', value: `**\`\`\`\n${row.points_awarded || 'N/A'}\n\`\`\`**`, inline: true });

            // Send the embed to the designated channel.
            const message = await channel.send({ embeds: [embed] });
            logger.info(`[BingoNotifications] Notification sent for task "${row.taskName}" by ${row.rsn}. New message ID: ${message.id}`);

            // If an embed record already exists (even if deleted), update it.
            if (row.embed_id) {
                const result = await db.runQuery(
                    `
                    UPDATE bingo_embeds
                    SET message_id = ?, status = 'active', last_updated = CURRENT_TIMESTAMP
                    WHERE embed_id = ?
                    `,
                    [message.id, row.embed_id],
                );
                logger.info(`[BingoNotifications] Updated embed record ${row.embed_id} with new message ID ${message.id}. Result: ${JSON.stringify(result)}`);
            } else {
                // Otherwise, create a new record.
                await bingoEmbedManager.createEmbedRecord(
                    row.event_id, // Event ID
                    row.player_id, // Player ID
                    null, // Team ID (null for player-specific notifications)
                    row.task_id, // Task ID (for record keeping)
                    message.id, // New Discord Message ID
                    channel.id, // Discord Channel ID
                    'progress', // Embed type
                );
                logger.info(`[BingoNotifications] Created new embed record for task "${row.taskName}" with message ID ${message.id}`);
            }
        }
    } catch (err) {
        logger.error(`[BingoNotifications] sendProgressUpdates error: ${err.message}`);
    }
}

/**
 * Posts final results using the current logic.
 * (This function remains unchanged except for minor embed style tweaks.)
 *
 * @param {Client} client - The Discord client (must be ready).
 * @param {number} eventId - The ID of the bingo event.
 */
async function sendFinalResults(client, eventId) {
    try {
        logger.info(`[BingoNotifications] sendFinalResults(#${eventId}) → Start`);

        // We'll list top 5 players
        const topPlayers = await db.getAll(
            `
            SELECT rr.rsn, bl.total_points, bl.completed_tasks, bl.pattern_bonus
            FROM bingo_leaderboard bl
            JOIN registered_rsn rr ON rr.player_id = bl.player_id
            WHERE bl.event_id = ?
              AND (bl.team_id = 0 OR bl.team_id IS NULL)
            ORDER BY bl.total_points DESC
            LIMIT 5
            `,
            [eventId],
        );

        // We'll also list top 3 teams
        const topTeams = await db.getAll(
            `
            SELECT t.team_name, bl.total_points, bl.completed_tasks, bl.pattern_bonus
            FROM bingo_leaderboard bl
            JOIN bingo_teams t ON t.team_id = bl.team_id
            WHERE bl.event_id = ?
              AND bl.team_id > 0
            ORDER BY bl.total_points DESC
            LIMIT 3
            `,
            [eventId],
        );

        // Retrieve the channel ID using the helper.
        const channelId = await getChannelId('bingo_updates_channel');
        if (!channelId) {
            logger.warn('[BingoNotifications] No bingo_updates_channel configured for final results.');
            return;
        }

        const guild = client.guilds.cache.get(process.env.GUILD_ID);
        if (!guild) {
            logger.warn('[BingoNotifications] Guild not found.');
            return;
        }
        const channel = guild.channels.cache.get(channelId);
        if (!channel) {
            logger.warn(`[BingoNotifications] Channel #${channelId} not found in guild.`);
            return;
        }

        // Create an embed for final results with a polished layout.
        const embed = new EmbedBuilder().setTitle(`🏁 **Final Results: Bingo #${eventId}**`).setColor(0xffc107).setTimestamp();

        // Player Results
        if (topPlayers.length === 0) {
            embed.addFields({ name: '👤 Top Players', value: 'No individual completions.' });
        } else {
            let desc = `**Top ${topPlayers.length} Players**:\n`;
            topPlayers.forEach((r, i) => {
                desc += `\n**${i + 1}.** \`${r.rsn}\`: **${r.total_points} pts** (Tasks: \`${r.completed_tasks}\`, Bonus: \`${r.pattern_bonus}\`)`;
            });
            embed.addFields({ name: '👤 Top Players', value: desc });
        }

        // Team Results
        if (topTeams.length > 0) {
            let teamStr = '**Top 3 Teams**:\n';
            topTeams.forEach((t, i) => {
                teamStr += `\n**${i + 1}.** \`${t.team_name}\`: **${t.total_points} pts** (Tasks: \`${t.completed_tasks}\`, Bonus: \`${t.pattern_bonus}\`)`;
            });
            embed.addFields({ name: '👥 Teams', value: teamStr });
        }

        await channel.send({ embeds: [embed] });
        logger.info(`[BingoNotifications] Final results posted for event #${eventId}.`);
    } catch (err) {
        logger.error(`[BingoNotifications] sendFinalResults() error: ${err.message}`);
    }
}

module.exports = {
    sendProgressUpdates,
    sendFinalResults,
};
