const { EmbedBuilder } = require('discord.js');
const db = require('../../../../essentials/dbUtils');
const logger = require('../../../../essentials/logger');
const client = require('../../../../../../main');
const { reassignTeamProgress, getOngoingEventId, getActivePlayer, appendBingoProgression } = require('./teamCommandHelpers');
const { computePartialPoints, calculateTeamEffectiveProgress } = require('../../../../../services/bingo/bingoCalculations');

/**
 *
 * @param interaction
 */
async function handleJoin(interaction) {
    const teamName = interaction.options.getString('team_name', true).trim();
    const passkey = interaction.options.getString('passkey', true).trim();

    const eventId = await getOngoingEventId();
    if (!eventId) {
        return interaction.editReply({ content: '❌ No ongoing Bingo event found.', flags: 64 });
    }

    const { playerId } = await getActivePlayer(interaction.user.id);
    if (!playerId) {
        return interaction.editReply({ content: '❌ You must have a registered RSN and be an active clan member to join a team.', flags: 64 });
    }

    const teamRow = await db.getOne(
        `
        SELECT team_id, team_name
        FROM bingo_teams
        WHERE event_id = ? AND LOWER(team_name) = LOWER(?) AND passkey = ?
        `,
        [eventId, teamName, passkey],
    );

    if (!teamRow) {
        return interaction.editReply({
            content: `❌ Either team **${teamName}** was not found or the passkey is invalid.`,
            flags: 64,
        });
    }

    const existingMembership = await db.getOne(
        `
        SELECT btm.team_member_id
        FROM bingo_team_members btm
        JOIN bingo_teams bt ON bt.team_id = btm.team_id
        WHERE btm.player_id = ? AND bt.event_id = ?
        `,
        [playerId, eventId],
    );

    if (existingMembership) {
        await db.runQuery(
            `
            UPDATE bingo_team_members
            SET team_id = ?, joined_at = CURRENT_TIMESTAMP
            WHERE team_member_id = ?
            `,
            [teamRow.team_id, existingMembership.team_member_id],
        );
        logger.info(`[Bingo-Team] Updated team membership for Player #${playerId} to Team ${teamRow.team_id}`);
    } else {
        await db.runQuery(
            `
            INSERT INTO bingo_team_members (team_id, player_id, joined_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            `,
            [teamRow.team_id, playerId],
        );
        logger.info(`[Bingo-Team] Inserted new team membership for Player #${playerId} in Team ${teamRow.team_id}`);
    }

    // Update player's task progress to reflect new team membership.
    await db.runQuery(
        `
        UPDATE bingo_task_progress
        SET team_id = ?
        WHERE event_id = ? AND player_id = ?
        `,
        [teamRow.team_id, eventId, playerId],
    );

    // Process tasks where the team is already marked as completed.
    const teamCompletedTasks = await db.getAll(
        `
    SELECT task_id
    FROM bingo_task_progress
    WHERE event_id = ? AND team_id = ? AND status = 'completed'
    `,
        [eventId, teamRow.team_id],
    );

    for (const { task_id } of teamCompletedTasks) {
        const joinerRecord = await db.getOne(
            `
        SELECT progress_value
        FROM bingo_task_progress
        WHERE event_id = ? AND player_id = ? AND task_id = ?
        `,
            [eventId, playerId, task_id],
        );
        const joinerProgress = joinerRecord ? joinerRecord.progress_value : 0;

        const task = await db.getOne('SELECT value, base_points FROM bingo_tasks WHERE task_id = ?', [task_id]);
        if (!task) continue;
        const targetValue = task.value;
        const basePoints = task.base_points;

        // Calculate team's progress excluding the joiner.
        const teamProgressRow = await db.getOne(
            `
        SELECT SUM(progress_value) AS teamProgress
        FROM bingo_task_progress
        WHERE event_id = ? AND team_id = ? AND player_id != ?
        GROUP BY task_id
        `,
            [eventId, teamRow.team_id, playerId],
        );
        const teamProgress = teamProgressRow ? teamProgressRow.teamProgress : 0;
        const gap = targetValue - teamProgress;

        // Determine how much of the joiner's progress fills the gap.
        const rawContribution = Math.min(joinerProgress, gap);
        const effectiveContribution = Math.max(0, rawContribution);

        // Here, computePartialPoints is used to translate effectiveContribution into points.
        const pointsAwarded = computePartialPoints(effectiveContribution, targetValue, basePoints);

        // Then, update the joiner's record with the computed points.
        const playerProgress = await db.getOne(
            `
        SELECT progress_id, status
        FROM bingo_task_progress
        WHERE event_id = ? AND player_id = ? AND task_id = ?
        `,
            [eventId, playerId, task_id],
        );
        if (playerProgress) {
            if (playerProgress.status !== 'completed') {
                await db.runQuery(
                    `
                UPDATE bingo_task_progress
                SET status = 'completed', points_awarded = ?,
                    last_updated = CURRENT_TIMESTAMP
                WHERE progress_id = ?
                `,
                    [pointsAwarded, playerProgress.progress_id],
                );
            }
        } else {
            await db.runQuery(
                `
            INSERT INTO bingo_task_progress (event_id, player_id, task_id, status, team_id, points_awarded)
            VALUES (?, ?, ?, 'completed', ?, ?)
            `,
                [eventId, playerId, task_id, teamRow.team_id, pointsAwarded],
            );
        }
    }

    // --- Effective Team Progress Calculation ---
    // For every task, recalculate effective progress for the team (including the new joiner)
    // and update each member's record accordingly.
    const allTeamTasks = await db.getAll(
        `
        SELECT task_id, value AS target
        FROM bingo_tasks
        `,
    );

    for (const { task_id, target } of allTeamTasks) {
        const teamMembers = await db.getAll(
            `
            SELECT player_id, progress_value, last_updated
            FROM bingo_task_progress
            WHERE event_id = ? AND team_id = ? AND task_id = ?
            `,
            [eventId, teamRow.team_id, task_id],
        );

        if (!teamMembers || teamMembers.length === 0) continue;

        const effectiveResults = calculateTeamEffectiveProgress(
            teamMembers.map((m) => ({
                playerId: m.player_id,
                progress: m.progress_value,
                last_updated: m.last_updated,
            })),
            target,
        );

        for (const result of effectiveResults) {
            await db.runQuery(
                `
                UPDATE bingo_task_progress
                SET progress_value = ?, last_updated = CURRENT_TIMESTAMP
                WHERE event_id = ? AND team_id = ? AND player_id = ? AND task_id = ?
                `,
                [result.effectiveProgress, eventId, teamRow.team_id, result.playerId, task_id],
            );
        }
    }
    // --- End Effective Team Progress Calculation ---

    // Reassign team progress (this function should handle any additional recalculations).
    await reassignTeamProgress(eventId, playerId, teamRow.team_id);

    const embed = new EmbedBuilder().setTitle('✅ Joined Team').setDescription(`You have successfully joined **${teamRow.team_name}** (ID #${teamRow.team_id}).`).setColor(0x3498db).setFooter({ text: 'Bingo Team Join' }).setTimestamp();

    await interaction.editReply({ embeds: [embed], flags: 64 });
    await appendBingoProgression(client);
}

module.exports = handleJoin;
