const db = require('../../../../essentials/dbUtils');
const client = require('../../../../../discordClient');
const {
    reassignTeamProgress,
    getOngoingEventId,
    getActivePlayer,
    appendBingoProgression,
} = require('./teamCommandHelpers');

async function handleLeave(interaction) {
    const eventId = await getOngoingEventId();
    if (!eventId) {
        return interaction.editReply({
            content: '❌ No ongoing Bingo event found.',
            flags: 64,
        });
    }

    const { playerId } = await getActivePlayer(interaction.user.id);
    if (!playerId) {
        return interaction.editReply({
            content:
        '❌ You must have a registered RSN and be an active clan member to leave a team.',
            flags: 64,
        });
    }

    const memberRow = await db.getOne(
        `
        SELECT tm.team_id, t.team_name, t.player_id
        FROM bingo_team_members tm
        JOIN bingo_teams t ON t.team_id = tm.team_id
        WHERE tm.player_id = ?
          AND t.event_id = ?
        `,
        [playerId, eventId]
    );

    if (!memberRow) {
        return interaction.editReply({
            content: '❌ You are not in any team for this event.',
            flags: 64,
        });
    }

    if (memberRow.player_id === playerId) {
        const newCaptain = await db.getOne(
            `
            SELECT player_id
            FROM bingo_team_members
            WHERE team_id = ?
              AND player_id != ?
            ORDER BY joined_at ASC
            LIMIT 1
            `,
            [memberRow.team_id, playerId]
        );

        if (newCaptain) {
            await db.runQuery(
                `
                UPDATE bingo_teams
                SET player_id = ?
                WHERE team_id = ?
                `,
                [newCaptain.player_id, memberRow.team_id]
            );
            await db.runQuery(
                `
                DELETE FROM bingo_team_members
                WHERE team_id = ? AND player_id = ?
                `,
                [memberRow.team_id, playerId]
            );
            await db.runQuery(
                `
                UPDATE bingo_task_progress
                SET team_id = NULL
                WHERE event_id = ? AND player_id = ?
                `,
                [eventId, playerId]
            );

            await reassignTeamProgress(eventId, playerId, 0);

            interaction.editReply({
                content: `✅ You have left team **${memberRow.team_name}**. New captain has been assigned.`,
                flags: 64,
            });
            await appendBingoProgression(client);
            return;
        } else {
            await db.runQuery(
                `
                DELETE FROM bingo_team_members
                WHERE team_id = ?
                `,
                [memberRow.team_id]
            );
            await db.runQuery(
                `
                DELETE FROM bingo_teams
                WHERE team_id = ?
                `,
                [memberRow.team_id]
            );

            await reassignTeamProgress(eventId, playerId, 0);

            interaction.editReply({
                content: `✅ You have left team **${memberRow.team_name}**. As you were the only member, the team has been dissolved.`,
                flags: 64,
            });
            await appendBingoProgression(client);
            return;
        }
    } else {
        await db.runQuery(
            `
            DELETE FROM bingo_team_members
            WHERE team_id = ? AND player_id = ?
            `,
            [memberRow.team_id, playerId]
        );

        await reassignTeamProgress(eventId, playerId, 0);

        interaction.editReply({
            content: `✅ You have left team **${memberRow.team_name}**.`,
            flags: 64,
        });
        await appendBingoProgression(client);
        return;
    }
}

module.exports = handleLeave;
