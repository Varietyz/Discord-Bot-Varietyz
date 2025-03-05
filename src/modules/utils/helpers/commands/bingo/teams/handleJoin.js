const { EmbedBuilder } = require('discord.js');
const db = require('../../../../essentials/dbUtils');
const logger = require('../../../../essentials/logger');
const client = require('../../../../../../main');
const { reassignTeamProgress, getOngoingEventId, getActivePlayer, appendBingoProgression } = require('./teamCommandHelpers');
const handleLeave = require('./handleLeave');
const synchronizeTaskCompletion = require('../../../../essentials/syncTeamData');

/**
 * Handles a player joining a Bingo team with advanced task progression checks.
 * @param {Interaction} interaction - The Discord interaction.
 */
async function handleJoin(interaction) {
    try {
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

        logger.info(`[Bingo-Team] Player #${playerId} attempting to join team '${teamName}' with passkey.`);

        const teamRow = await db.getOne('SELECT team_id, team_name FROM bingo_teams WHERE event_id = ? AND LOWER(team_name) = LOWER(?) AND passkey = ?', [eventId, teamName, passkey]);

        if (!teamRow) {
            logger.warn(`[Bingo-Team] Join attempt failed: Invalid team name or passkey for '${teamName}'.`);
            return interaction.editReply({ content: `❌ Team **${teamName}** not found or invalid passkey.`, flags: 64 });
        }

        // Get completed task counts for the team and the player
        const teamCompletedCount = await db.getOne(
            `SELECT COUNT(*) AS completed FROM bingo_task_progress 
             WHERE event_id = ? AND team_id = ? AND status = 'completed'`,
            [eventId, teamRow.team_id],
        );

        const playerCompletedCount = await db.getOne(
            `SELECT COUNT(*) AS completed FROM bingo_task_progress 
             WHERE event_id = ? AND player_id = ? AND status = 'completed'`,
            [eventId, playerId],
        );

        if (playerCompletedCount.completed > teamCompletedCount.completed) {
            return interaction.editReply({ content: `⚠️ You have completed more tasks than **${teamName}**. You **cannot join** this team.`, flags: 64 });
        }

        const existingMembership = await db.getOne('SELECT team_id FROM bingo_team_members WHERE player_id = ? AND team_id IN (SELECT team_id FROM bingo_teams WHERE event_id = ?)', [playerId, eventId]);

        if (existingMembership && existingMembership.team_id !== teamRow.team_id) {
            logger.info(`[Bingo-Team] Player #${playerId} leaving current team before joining new team.`);
            await handleLeave(interaction);
        } else if (existingMembership) {
            return interaction.editReply({ content: `⚠️ You are already a member of **${teamName}**.`, flags: 64 });
        }

        await db.runQuery('INSERT INTO bingo_team_members (team_id, player_id, joined_at) VALUES (?, ?, CURRENT_TIMESTAMP)', [teamRow.team_id, playerId]);
        logger.info(`[Bingo-Team] Player #${playerId} successfully joined Team #${teamRow.team_id}.`);

        await reassignTeamProgress(eventId, playerId, teamRow.team_id);

        await synchronizeTaskCompletion(eventId, teamRow.team_id, playerId);

        const embed = new EmbedBuilder()
            .setTitle('✅ Joined Team')
            .setDescription(`You have successfully joined **${teamRow.team_name}** (ID #${teamRow.team_id}). Task progress has been synchronized.`)
            .setColor(0x3498db)
            .setFooter({ text: 'Bingo Team Join' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed], flags: 64 });
        await appendBingoProgression(client);
    } catch (error) {
        logger.error(`[TeamJoin] Error while processing team join: ${error.message}`);
        return interaction.editReply({ content: '❌ An error occurred while joining the team. Please try again later.', flags: 64 });
    }
}

module.exports = handleJoin;
