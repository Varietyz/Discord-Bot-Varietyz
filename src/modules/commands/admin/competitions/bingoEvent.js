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
            // Defer the reply so we have more time to process the command.
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
                await interaction.editReply({ content: '❌ Unknown subcommand' });
            }
        } catch (error) {
            logger.error(`❌ Error executing /bingo-event command: ${error.message}`);
            await interaction.editReply({
                content: '❌ **Error:** An error occurred while processing your request.',
            });
        }
    },
};

/**
 * Ends the current event.
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
        return interaction.editReply({ content: '❌ No ongoing Bingo event to end.' });
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

    // Invoke autoTransitionEvents to check for events whose end_time has passed.
    await autoTransitionEvents();

    return interaction.editReply({ content: `🏁 Bingo event #${ongoingEvent.event_id} has been ended via auto-transition (end time reached).` });
}

/**
 * Displays the status of the current Bingo event.
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
        return interaction.editReply({ content: '❌ No active Bingo event found.' });
    }

    await interaction.editReply({
        content: `📊 Bingo Event #${event.event_id} is currently **${event.state}**.\n🕛 Start Time: ${event.start_time}\n🏁 End Time: ${event.end_time || 'Not set'}`,
    });
}

/**
 * Displays the current Bingo leaderboard with detailed progress information.
 * For each top player, shows:
 * - Overall progress percentage (calculated similarly to the bingoImageGenerator)
 * - Total points and number of completed tasks
 * - A bullet list of tasks (by name) with their individual progress percentages
 *
 * This function uses non-inline embed fields to ensure that detailed info fits nicely.
 *
 * @param {Interaction} interaction
 */
async function showLeaderboard(interaction) {
    // First, update the leaderboard data in the database.
    await updateLeaderboard();

    // Retrieve the current ongoing event ID.
    const currentEvent = await db.getOne(`
        SELECT event_id FROM bingo_state WHERE state = 'ongoing' LIMIT 1
    `);
    if (!currentEvent) {
        return interaction.editReply({ content: '📜 **No leaderboard data available.**' });
    }
    const eventId = currentEvent.event_id;

    // Query top players from the leaderboard.
    // Note: We include rr.player_id so we can later fetch detailed progress.
    const topPlayers = await db.getAll(
        `
        SELECT rr.rsn, rr.player_id, bl.total_points, bl.completed_tasks
        FROM bingo_leaderboard bl
        JOIN registered_rsn rr ON rr.player_id = bl.player_id
        WHERE bl.event_id = ?
        ORDER BY bl.total_points DESC
        LIMIT 9
    `,
        [eventId],
    );

    // Query top teams from the leaderboard.
    const topTeams = await db.getAll(
        `
        SELECT t.team_name, t.team_id, bl.total_points, bl.completed_tasks
        FROM bingo_leaderboard bl
        JOIN bingo_teams t ON t.team_id = bl.team_id
        WHERE bl.event_id = ?
        ORDER BY bl.total_points DESC
        LIMIT 5
    `,
        [eventId],
    );

    if (topPlayers.length === 0 && topTeams.length === 0) {
        return interaction.editReply({ content: '📜 **No leaderboard data available.**' });
    }

    // Import the overall progress calculation from your bingoImageGenerator module.
    const { calculateOverallProgress } = require('../../../services/bingo/bingoImageGenerator');

    /**
     * Retrieves all tasks on the board with their progress for a given player.
     * This joins the board cells with any progress the player has made.
     * Tasks with no progress will return 0 progress.
     *
     * @param {number} playerId
     * @returns {Promise<Array>} List of tasks with task_name, progress, and target.
     */
    async function getPlayerTaskProgress(playerId) {
        const tasks = await db.getAll(
            `
            SELECT 
                bt.description AS task_name, 
                COALESCE(SUM(btp.progress_value), 0) AS progress, 
                bt.value AS target
            FROM bingo_board_cells bbc
            JOIN bingo_tasks bt ON bbc.task_id = bt.task_id
            LEFT JOIN bingo_task_progress btp 
                ON btp.task_id = bt.task_id 
                AND btp.event_id = ? 
                AND btp.player_id = ?
            WHERE bbc.board_id = (SELECT board_id FROM bingo_state WHERE event_id = ?)
            GROUP BY bt.task_id
        `,
            [eventId, playerId, eventId],
        );
        return tasks;
    }

    /**
     * Retrieves all tasks on the board with their progress for a given team.
     *
     * @param {number} teamId
     * @returns {Promise<Array>} List of tasks with task_name, progress, and target.
     */
    async function getTeamTaskProgress(teamId) {
        const tasks = await db.getAll(
            `
            SELECT 
                bt.description AS task_name, 
                COALESCE(SUM(btp.progress_value), 0) AS progress, 
                bt.value AS target
            FROM bingo_board_cells bbc
            JOIN bingo_tasks bt ON bbc.task_id = bt.task_id
            LEFT JOIN bingo_task_progress btp 
                ON btp.task_id = bt.task_id 
                AND btp.event_id = ? 
                AND btp.team_id = ?
            WHERE bbc.board_id = (SELECT board_id FROM bingo_state WHERE event_id = ?)
            GROUP BY bt.task_id
        `,
            [eventId, teamId, eventId],
        );
        return tasks;
    }

    // Build an embed with a polished layout.
    const embed = new EmbedBuilder().setTitle('🏆 **Detailed Bingo Leaderboard**').setColor(0xffc107).setTimestamp().setDescription('Here are the top performers with their overall progress, points, and task breakdowns.');

    let fieldsAdded = 0;

    // Process individual players.
    for (const player of topPlayers) {
        // Compute overall progress percentage.
        const overall = await calculateOverallProgress(eventId, player.player_id, false);
        // Retrieve task progress.
        const taskProgress = await getPlayerTaskProgress(player.player_id);

        // Only skip this player if BOTH overall progress is 0 and every task has 0 progress.
        if (parseFloat(overall) === 0 && taskProgress.every((task) => parseFloat(task.progress) === 0)) {
            continue;
        }

        let taskProgressStr = '';
        taskProgress.forEach((task) => {
            // Calculate percentage (capped at 100%).
            const rawPercent = (task.progress / task.target) * 100;
            const percent = Math.min(rawPercent, 100).toFixed(2);
            // Only list tasks if there is some progress (even if not complete).
            if (parseFloat(task.progress) > 0) {
                taskProgressStr += `\n- **${task.task_name}**: \`${percent}%\``;
            }
        });
        if (taskProgressStr === '') {
            taskProgressStr = '\n_No task progress found._';
        }

        const fieldValue = `📊 **Overall:** \`${overall}%\`\n⭐ **Points:** \`${player.total_points} pts\`\n✅ **Completed Tasks:** \`${player.completed_tasks}\`${taskProgressStr}`;
        embed.addFields({ name: `👤 ${player.rsn}`, value: fieldValue, inline: true });
        fieldsAdded++;
    }

    // Process teams.
    for (const team of topTeams) {
        // Compute overall progress for the team.
        const overall = await calculateOverallProgress(eventId, team.team_id, true);
        // Retrieve team task progress.
        const taskProgress = await getTeamTaskProgress(team.team_id);

        // Only skip this team if both overall progress and task progress are 0.
        if (parseFloat(overall) === 0 && taskProgress.every((task) => parseFloat(task.progress) === 0)) {
            continue;
        }

        let taskProgressStr = '';
        taskProgress.forEach((task) => {
            const rawPercent = (task.progress / task.target) * 100;
            const percent = Math.min(rawPercent, 100).toFixed(2);
            if (parseFloat(task.progress) > 0) {
                taskProgressStr += `\n- **${task.task_name}**: \`${percent}%\``;
            }
        });
        if (taskProgressStr === '') {
            taskProgressStr = '\n_No task progress found._';
        }

        const fieldValue = `📊 **Overall:** \`${overall}%\`\n⭐ **Points:** \`${team.total_points} pts\`\n✅ **Completed Tasks:** \`${team.completed_tasks}\`${taskProgressStr}`;
        embed.addFields({ name: `👥 Team: \`${team.team_name}\``, value: fieldValue, inline: true });
        fieldsAdded++;
    }

    if (fieldsAdded === 0) {
        return interaction.editReply({ content: '📜 **No leaderboard data available.**' });
    }

    // Send the detailed leaderboard embed.
    return interaction.editReply({ embeds: [embed] });
}
