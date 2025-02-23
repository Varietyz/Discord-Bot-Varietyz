// /modules/services/bingo/bingoNotifications.js
const { EmbedBuilder } = require('discord.js');
const logger = require('../../utils/essentials/logger');
const db = require('../../utils/essentials/dbUtils');

/**
 * Gathers tasks that have changed to 'completed' in the last 30 mins,
 * and posts an embed to the configured channel (bingo_updates_channel).
 *
 * @param {Client} client - The Discord client (must be ready).
 */
async function sendProgressUpdates(client) {
    try {
        logger.info('[BingoNotifications] sendProgressUpdates() → Start');

        // Easily Customizable: timeframe
        const newCompletions = await db.getAll(`
      SELECT btp.event_id, btp.task_id, rr.rsn, bt.description AS taskName, btp.last_updated
      FROM bingo_task_progress btp
      JOIN bingo_tasks bt ON bt.task_id = btp.task_id
      JOIN registered_rsn rr ON rr.player_id = btp.player_id
      WHERE btp.status = 'completed'
        AND btp.last_updated >= DATETIME('now','-30 minutes')
      ORDER BY btp.last_updated DESC
    `);

        if (newCompletions.length === 0) {
            logger.info('[BingoNotifications] No new completions found.');
            return;
        }

        const channelInfo = await db.guild.getOne(
            `
      SELECT channel_id
      FROM setup_channels
      WHERE setup_key = ?
    `,
            ['bingo_updates_channel'],
        );

        if (!channelInfo) {
            logger.warn('[BingoNotifications] No bingo_updates_channel configured in setup_channels.');
            return;
        }
        const channelId = channelInfo.channel_id;

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

        // Build embed
        const embed = new EmbedBuilder().setTitle('🎉 Bingo Task Completions').setColor(0x48de6f).setTimestamp();

        let desc = '';
        for (const row of newCompletions) {
            desc += `• **${row.rsn}** completed **${row.taskName}** (Event #${row.event_id})\n`;
        }
        embed.setDescription(desc);

        await channel.send({ embeds: [embed] });
        logger.info(`[BingoNotifications] Posted ${newCompletions.length} new completions to #${channelId}.`);
    } catch (err) {
        logger.error(`[BingoNotifications] sendProgressUpdates error: ${err.message}`);
    }
}

/**
 * Called by endBingoEvent in bingoService to post final results.
 * Summarizes top participants or teams from bingo_leaderboard.
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

        const channelInfo = await db.guild.getOne(
            `
      SELECT channel_id
      FROM setup_channels
      WHERE setup_key = ?
    `,
            ['bingo_updates_channel'],
        );

        if (!channelInfo) {
            logger.warn('[BingoNotifications] No bingo_updates_channel for final results.');
            return;
        }

        const channelId = channelInfo.channel_id;
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

        const embed = new EmbedBuilder().setTitle(`🏁 Final Results: Bingo #${eventId}`).setColor(0xffc107).setTimestamp();

        // Player Results
        if (topPlayers.length === 0) {
            embed.addFields({
                name: 'Top Players',
                value: 'No individual completions.',
            });
        } else {
            let desc = `**Top ${topPlayers.length} Players**:\n`;
            topPlayers.forEach((r, i) => {
                desc += `\n**${i + 1})** ${r.rsn}: ${r.total_points} pts (Tasks: ${r.completed_tasks}, Bonus: ${r.pattern_bonus})`;
            });
            embed.addFields({ name: 'Top Players', value: desc });
        }

        // Team Results
        if (topTeams.length > 0) {
            let teamStr = '**Top 3 Teams**:\n';
            topTeams.forEach((t, i) => {
                teamStr += `\n**${i + 1})** ${t.team_name}: ${t.total_points} pts (Tasks: ${t.completed_tasks}, Bonus: ${t.pattern_bonus})`;
            });
            embed.addFields({ name: 'Teams', value: teamStr });
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
