const { EmbedBuilder } = require('discord.js');
const db = require('../../../../essentials/dbUtils');
const logger = require('../../../../essentials/logger');
const client = require('../../../../../discordClient');
const {
    getOngoingEventId,
    getActivePlayer,
    appendBingoProgression,
} = require('./teamCommandHelpers');

async function handleCreate(interaction) {
    const teamName = interaction.options.getString('team_name', true).trim();
    const passkey = interaction.options.getString('passkey', true).trim();

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
        '❌ You must have a registered RSN and be an active clan member to create a team.',
            flags: 64,
        });
    }

    const existingTeam = await db.getOne(
        `
        SELECT bt.team_name
        FROM bingo_team_members btm
        JOIN bingo_teams bt ON bt.team_id = btm.team_id
        WHERE btm.player_id = ?
          AND bt.event_id = ?
        `,
        [playerId, eventId]
    );
    if (existingTeam) {
        return interaction.editReply({
            content: `❌ You are already part of **${existingTeam.team_name}**. You cannot join another team until you leave your current team.`,
            flags: 64,
        });
    }

    const teamExists = await db.getOne(
        `
        SELECT team_id
        FROM bingo_teams
        WHERE event_id = ?
          AND LOWER(team_name) = LOWER(?)
        `,
        [eventId, teamName]
    );
    if (teamExists) {
        return interaction.editReply({
            content: `❌ A team with the name **${teamName}** already exists for this event.`,
            flags: 64,
        });
    }

    await db.runQuery(
        `
        INSERT INTO bingo_teams (event_id, team_name, player_id, passkey)
        VALUES (?, ?, ?, ?)
        `,
        [eventId, teamName, playerId, passkey]
    );

    const teamRow = await db.getOne(
        `
        SELECT team_id, team_name
        FROM bingo_teams
        WHERE event_id = ?
          AND team_name = ?
        `,
        [eventId, teamName]
    );

    if (!teamRow) {
        return interaction.editReply({
            content: '❌ Failed to create team. Please try again later.',
            flags: 64,
        });
    }

    const existingMembership = await db.getOne(
        `
        SELECT btm.team_member_id
        FROM bingo_team_members btm
        JOIN bingo_teams bt ON bt.team_id = btm.team_id
        WHERE btm.player_id = ?
          AND bt.event_id = ?
        `,
        [playerId, eventId]
    );

    if (existingMembership) {
        await db.runQuery(
            `
            UPDATE bingo_team_members
            SET team_id = ?, joined_at = CURRENT_TIMESTAMP
            WHERE team_member_id = ?
            `,
            [teamRow.team_id, existingMembership.team_member_id]
        );
        logger.info(
            `[Bingo-Team] Updated team membership for Player #${playerId} to Team ${teamRow.team_id}`
        );
    } else {
        await db.runQuery(
            `
            INSERT INTO bingo_team_members (team_id, player_id, joined_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            `,
            [teamRow.team_id, playerId]
        );
        logger.info(
            `[Bingo-Team] Inserted new team membership for Player #${playerId} in Team ${teamRow.team_id}`
        );
    }

    await db.runQuery(
        `
        UPDATE bingo_task_progress
        SET team_id = ?
        WHERE event_id = ?
          AND player_id = ?
        `,
        [teamRow.team_id, eventId, playerId]
    );

    await appendBingoProgression(client);

    const embed = new EmbedBuilder()
        .setTitle('🎉 Team Created')
        .setDescription(
            `**${teamRow.team_name}** (ID #${teamRow.team_id}) has been created, and you have joined as the captain!`
        )
        .setColor(0x57f287)
        .setFooter({ text: 'Bingo Team Creation' })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed], flags: 64 });
}

module.exports = handleCreate;
