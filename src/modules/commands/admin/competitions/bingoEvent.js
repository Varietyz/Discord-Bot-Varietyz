const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { updateBingoProgress } = require('../../../services/bingo/bingoService');
const { updateLeaderboard } = require('../../../services/bingo/bingoLeaderboard');
const { autoTransitionEvents } = require('../../../services/bingo/autoTransitionEvents');
const db = require('../../../utils/essentials/dbUtils');
const logger = require('../../../utils/essentials/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bingo-event')
        .setDescription('ADMIN: Manage Bingo events')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addSubcommand((subcommand) => subcommand.setName('new').setDescription('End the current Bingo event manually and start a new one.'))
        .addSubcommand((subcommand) => subcommand.setName('status').setDescription('Check the status of the current Bingo event.'))
        .addSubcommand((subcommand) => subcommand.setName('leaderboard').setDescription('View the current Bingo leaderboard.')),
    async execute(interaction) {
        try {
            await interaction.deferReply({ flags: 64 });
            const subcommand = interaction.options.getSubcommand();

            switch (subcommand) {
            case 'new':
                await endEvent(interaction);
                break;
            case 'status':
                await updateBingoProgress();
                await eventStatus(interaction);
                break;
            case 'leaderboard':
                await showLeaderboard(interaction);
                break;
            default:
                await interaction.reply({ content: '❌ Unknown subcommand', flags: 64 });
            }
        } catch (error) {
            logger.error(`❌ Error executing /bingo-event command: ${error.message}`);
            await interaction.reply({
                content: '❌ **Error:** An error occurred while processing your request.',
                flags: 64,
            });
        }
    },
};

/**
 *
 * @param interaction
 */
async function endEvent(interaction) {
    // Check for an ongoing event
    const ongoingEvent = await db.getOne(`
        SELECT event_id 
        FROM bingo_state 
        WHERE state = 'ongoing' 
        LIMIT 1
    `);

    if (!ongoingEvent) {
        return interaction.reply({ content: '❌ No ongoing Bingo event to end.', flags: 64 });
    }

    // Update the event's end_time to now so that it meets the auto-transition condition.
    const nowIso = new Date().toISOString();
    await db.runQuery(
        `
        UPDATE bingo_state
        SET end_time = ?
        WHERE event_id = ?
    `,
        [nowIso, ongoingEvent.event_id],
    );

    await db.runQuery(
        `
            UPDATE bingo_state
            SET state='completed'
            WHERE event_id=?
        `,
        [ongoingEvent.event_id],
    );

    // Now invoke autoTransitionEvents to check for events whose end_time has passed.
    await autoTransitionEvents();

    return interaction.reply({ content: `🏁 Bingo event #${ongoingEvent.event_id} has been ended via auto-transition (end time reached).`, flags: 64 });
}

/**
 * /bingo-event status
 * Displays the status of the current Bingo event, including start and end times, and the state.
 * @param interaction
 */
async function eventStatus(interaction) {
    const event = await db.getOne(`
        SELECT event_id, state, start_time, end_time
        FROM bingo_state
        WHERE state IN ('upcoming', 'ongoing')
        ORDER BY start_time ASC
        LIMIT 1
    `);

    if (!event) {
        return interaction.reply({ content: '❌ No active Bingo event found.', flags: 64 });
    }

    await interaction.reply({
        content: `📊 Bingo Event #${event.event_id} is currently **${event.state}**.\n🕛 Start Time: ${event.start_time}\n🏁 End Time: ${event.end_time || 'Not set'}`,
        flags: 64,
    });
}

/**
 * /bingo-event leaderboard
 * Displays the current Bingo leaderboard, showing the top players or teams.
 * @param interaction
 */
async function showLeaderboard(interaction) {
    await updateLeaderboard();

    const topPlayers = await db.getAll(`
        SELECT rr.rsn, bl.total_points, bl.completed_tasks
        FROM bingo_leaderboard bl
        JOIN registered_rsn rr ON rr.player_id = bl.player_id
        WHERE bl.event_id = (SELECT event_id FROM bingo_state WHERE state='ongoing' LIMIT 1)
        ORDER BY bl.total_points DESC
        LIMIT 5
    `);

    if (topPlayers.length === 0) {
        return interaction.reply({ content: '📜 **No leaderboard data available.**', flags: 64 });
    }

    const embed = new EmbedBuilder()
        .setTitle('🏆 Bingo Leaderboard')
        .setColor(0xffc107)
        .setDescription(topPlayers.map((p, i) => `**${i + 1}. ${p.rsn}** - ${p.total_points} pts (Tasks: ${p.completed_tasks})`).join('\n'))
        .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: 64 });
}
