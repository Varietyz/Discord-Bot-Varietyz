const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bingo-team')
        .setDescription('Manage Bingo teams')

        // /bingo-team create
        .addSubcommand((sub) =>
            sub
                .setName('create')
                .setDescription('Create a new Bingo team.')
                .addStringOption((o) => o.setName('team_name').setDescription('Team name').setRequired(true))
                .addStringOption((o) => o.setName('passkey').setDescription('Team passkey').setRequired(true)),
        )

        // /bingo-team join
        .addSubcommand((sub) =>
            sub
                .setName('join')
                .setDescription('Join an existing Bingo team.')
                .addStringOption((o) => o.setName('team_name').setDescription('Team name').setRequired(true))
                .addStringOption((o) => o.setName('passkey').setDescription('Passkey').setRequired(true)),
        )

        // /bingo-team leave
        .addSubcommand((sub) => sub.setName('leave').setDescription('Leave your current Bingo team.'))

        // /bingo-team list
        .addSubcommand((sub) => sub.setName('list').setDescription('List all current teams and their members.')),

    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'create') {
                await handleCreate(interaction);
            } else if (subcommand === 'join') {
                await handleJoin(interaction);
            } else if (subcommand === 'leave') {
                await handleLeave(interaction);
            } else if (subcommand === 'list') {
                await handleList(interaction);
            }
        } catch (err) {
            logger.error(`🚨 Error in /bingo-team subcommand: ${err.message}`);
            await interaction.reply({ content: '❌ An error occurred handling your request.', flags: 64 });
        }
    },
};

// =====================
// Subcommand Handlers
// =====================

/**
 *
 * @param interaction
 */
async function handleCreate(interaction) {
    const teamName = interaction.options.getString('team_name', true).trim();
    const passkey = interaction.options.getString('passkey', true).trim();

    const eventId = await getOngoingEventId();
    if (!eventId) {
        return interaction.reply({ content: '❌ No ongoing Bingo event found.', flags: 64 });
    }

    const { playerId } = await getActivePlayer(interaction.user.id);
    if (!playerId) {
        return interaction.reply({ content: '❌ You must have a registered RSN and be an active clan member to create a team.', flags: 64 });
    }

    // Check if the player is already in a team for this event
    const existingTeam = await db.getOne(
        `
        SELECT bt.team_name
        FROM bingo_team_members btm
        JOIN bingo_teams bt ON bt.team_id = btm.team_id
        WHERE btm.player_id = ?
          AND bt.event_id = ?
        `,
        [playerId, eventId],
    );
    if (existingTeam) {
        return interaction.reply({
            content: `❌ You are already part of **${existingTeam.team_name}**. You cannot join another team until you leave your current team.`,
            flags: 64,
        });
    }

    // Check if team name is already taken for this event
    const teamExists = await db.getOne(
        `
        SELECT team_id
        FROM bingo_teams
        WHERE event_id = ?
          AND LOWER(team_name) = LOWER(?)
        `,
        [eventId, teamName],
    );
    if (teamExists) {
        return interaction.reply({ content: `❌ A team with the name **${teamName}** already exists for this event.`, flags: 64 });
    }

    // Insert new team
    await db.runQuery(
        `
        INSERT INTO bingo_teams (event_id, team_name, captain_player_id, passkey)
        VALUES (?, ?, ?, ?)
        `,
        [eventId, teamName, playerId, passkey],
    );

    const teamRow = await db.getOne(
        `
        SELECT team_id, team_name
        FROM bingo_teams
        WHERE event_id = ?
          AND team_name = ?
        `,
        [eventId, teamName],
    );

    if (!teamRow) {
        return interaction.reply({ content: '❌ Failed to create team. Please try again later.', flags: 64 });
    }

    // Instead of blindly inserting, check if a membership record already exists.
    const existingMembership = await db.getOne(
        `
        SELECT btm.team_member_id
        FROM bingo_team_members btm
        JOIN bingo_teams bt ON bt.team_id = btm.team_id
        WHERE btm.player_id = ?
          AND bt.event_id = ?
        `,
        [playerId, eventId],
    );

    if (existingMembership) {
        // Update the existing record with the new team id and current timestamp
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
        // Insert a new membership record
        await db.runQuery(
            `
            INSERT INTO bingo_team_members (team_id, player_id, joined_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            `,
            [teamRow.team_id, playerId],
        );
        logger.info(`[Bingo-Team] Inserted new team membership for Player #${playerId} in Team ${teamRow.team_id}`);
    }

    // Update any related task progress to reflect the new team id.
    await db.runQuery(
        `
        UPDATE bingo_task_progress
        SET team_id = ?
        WHERE event_id = ?
          AND player_id = ?
        `,
        [teamRow.team_id, eventId, playerId],
    );

    const embed = new EmbedBuilder()
        .setTitle('🎉 Team Created')
        .setDescription(`**${teamRow.team_name}** (ID #${teamRow.team_id}) has been created, and you have joined as the captain!`)
        .setColor(0x57f287)
        .setFooter({ text: 'Bingo Team Creation' })
        .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: 64 });
}

/**
 *
 * @param interaction
 */
async function handleJoin(interaction) {
    const teamName = interaction.options.getString('team_name', true).trim();
    const passkey = interaction.options.getString('passkey', true).trim();

    const eventId = await getOngoingEventId();
    if (!eventId) {
        return interaction.reply({ content: '❌ No ongoing Bingo event found.', flags: 64 });
    }

    const { playerId } = await getActivePlayer(interaction.user.id);
    if (!playerId) {
        return interaction.reply({ content: '❌ You must have a registered RSN and be an active clan member to join a team.', flags: 64 });
    }

    // Verify team exists with the correct passkey
    const teamRow = await db.getOne(
        `
        SELECT team_id, team_name
        FROM bingo_teams
        WHERE event_id = ?
          AND LOWER(team_name) = LOWER(?)
          AND passkey = ?
        `,
        [eventId, teamName, passkey],
    );

    if (!teamRow) {
        return interaction.reply({ content: `❌ Either team **${teamName}** was not found or the passkey is invalid.`, flags: 64 });
    }

    // Check for an existing team membership for the current event.
    const existingMembership = await db.getOne(
        `
        SELECT btm.team_member_id
        FROM bingo_team_members btm
        JOIN bingo_teams bt ON bt.team_id = btm.team_id
        WHERE btm.player_id = ?
          AND bt.event_id = ?
        `,
        [playerId, eventId],
    );

    if (existingMembership) {
        // Update the existing membership record with the new team id and current timestamp.
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
        // Insert a new membership record if none exists.
        await db.runQuery(
            `
            INSERT INTO bingo_team_members (team_id, player_id, joined_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            `,
            [teamRow.team_id, playerId],
        );
        logger.info(`[Bingo-Team] Inserted new team membership for Player #${playerId} in Team ${teamRow.team_id}`);
    }

    // Update task progress to reflect the new team id.
    await db.runQuery(
        `
        UPDATE bingo_task_progress
        SET team_id = ?
        WHERE event_id = ?
          AND player_id = ?
        `,
        [teamRow.team_id, eventId, playerId],
    );
    // Query the tasks that are already completed by the team
    const teamCompletedTasks = await db.getAll(
        `
    SELECT task_id
    FROM bingo_task_progress
    WHERE event_id = ?
      AND team_id = ?
      AND status = 'completed'
    `,
        [eventId, teamRow.team_id],
    );

    // For each completed task, update or insert the player's progress record as completed
    for (const { task_id } of teamCompletedTasks) {
        // Check if the player already has a progress record for the task
        const playerProgress = await db.getOne(
            `
        SELECT progress_id, status
        FROM bingo_task_progress
        WHERE event_id = ?
          AND player_id = ?
          AND task_id = ?
        `,
            [eventId, playerId, task_id],
        );

        if (playerProgress) {
            // If the record exists and is not already marked as completed, update it
            if (playerProgress.status !== 'completed') {
                await db.runQuery(
                    `
                UPDATE bingo_task_progress
                SET status = 'completed', progress_value = (SELECT value FROM bingo_tasks WHERE task_id = ?), last_updated = CURRENT_TIMESTAMP
                WHERE progress_id = ?
                `,
                    [task_id, playerProgress.progress_id],
                );
            }
        } else {
            // Otherwise, insert a new record for the player with a completed status
            // Here, you may want to set progress_value based on the task's target value.
            await db.runQuery(
                `
            INSERT INTO bingo_task_progress (event_id, player_id, task_id, progress_value, status, team_id)
            VALUES (?, ?, ?, (SELECT value FROM bingo_tasks WHERE task_id = ?), 'completed', ?)
            `,
                [eventId, playerId, task_id, task_id, teamRow.team_id],
            );
        }
    }

    const embed = new EmbedBuilder().setTitle('✅ Joined Team').setDescription(`You have successfully joined **${teamRow.team_name}** (ID #${teamRow.team_id}).`).setColor(0x3498db).setFooter({ text: 'Bingo Team Join' }).setTimestamp();

    await interaction.reply({ embeds: [embed], flags: 64 });
}

/**
 * Leave the current Bingo team
 * @param {Interaction} interaction - The interaction object from Discord
 */
async function handleLeave(interaction) {
    const eventId = await getOngoingEventId();
    if (!eventId) {
        return interaction.reply({ content: '❌ No ongoing Bingo event found.', flags: 64 });
    }

    const { playerId } = await getActivePlayer(interaction.user.id);
    if (!playerId) {
        return interaction.reply({ content: '❌ You must have a registered RSN and be an active clan member to leave a team.', flags: 64 });
    }

    // Find the team membership for the current event
    const memberRow = await db.getOne(
        `
        SELECT tm.team_id, t.team_name
        FROM bingo_team_members tm
        JOIN bingo_teams t ON t.team_id = tm.team_id
        WHERE tm.player_id = ?
          AND t.event_id = ?
        `,
        [playerId, eventId],
    );

    if (!memberRow) {
        return interaction.reply({ content: '❌ You are not in any team for this event.', flags: 64 });
    }

    // Remove membership
    await db.runQuery(
        `
        DELETE FROM bingo_team_members
        WHERE team_id = ?
          AND player_id = ?
        `,
        [memberRow.team_id, playerId],
    );

    // Optionally remove team_id from progress rows
    await db.runQuery(
        `
        UPDATE bingo_task_progress
        SET team_id = 0
        WHERE event_id = ?
          AND player_id = ?
        `,
        [eventId, playerId],
    );

    return interaction.reply({ content: `✅ You have left team: **${memberRow.team_name}**.`, flags: 64 });
}

/**
 * List all current teams and their members for the ongoing event with pagination
 * @param {Interaction} interaction - The interaction object from Discord
 */
async function handleList(interaction) {
    const eventId = await getOngoingEventId();
    if (!eventId) {
        return interaction.reply({ content: '❌ No ongoing Bingo event found.', flags: 64 });
    }

    // Fetch all teams for the event
    const teams = await db.getAll(
        `
        SELECT t.team_id, t.team_name, t.captain_player_id
        FROM bingo_teams t
        WHERE t.event_id = ?
        ORDER BY t.team_name COLLATE NOCASE ASC
        `,
        [eventId],
    );

    if (teams.length === 0) {
        return interaction.reply({ content: '❌ No teams exist for this event yet.', flags: 64 });
    }

    // Prepare all embeds for pagination
    const embeds = [];
    for (const team of teams) {
        // Get members for this team
        const members = await db.getAll(
            `
            SELECT tm.player_id, rr.rsn
            FROM bingo_team_members tm
            LEFT JOIN registered_rsn rr ON rr.player_id = tm.player_id
            WHERE tm.team_id = ?
            ORDER BY rr.rsn COLLATE NOCASE ASC
            `,
            [team.team_id],
        );

        // Get tasks completed by this team
        const tasksCompleted = await db.getOne(
            `
            SELECT COUNT(*) AS completed
            FROM bingo_task_progress
            WHERE team_id = ?
              AND event_id = ?
              AND status = 'completed'
            `,
            [team.team_id, eventId],
        );

        // Get total tasks for the event
        const totalTasks = await db.getOne(
            `
            SELECT COUNT(*) AS total
            FROM bingo_board_cells bbc
            JOIN bingo_state bs ON bs.board_id = bbc.board_id
            WHERE bs.event_id = ?
            `,
            [eventId],
        );

        // Correcting the tasks completed counter
        const completedCount = Math.min(tasksCompleted.completed, totalTasks.total);

        // Create Team Description
        let teamDescription = `**🔸 Team ID:** ${team.team_id}\n`;
        teamDescription += `**🏷️ Team Name:** ${team.team_name}\n`;
        teamDescription += `**👑 Captain:** ${members.find((m) => m.player_id === team.captain_player_id)?.rsn || 'Unknown'}\n`;
        teamDescription += '**👥 Members:**\n';

        if (members.length === 0) {
            teamDescription += '   _No members yet._\n';
        } else {
            members.forEach((m) => {
                // Don't list captain twice
                if (m.player_id !== team.captain_player_id) {
                    teamDescription += `     👤 ${m.rsn || `(Player #${m.player_id})`}\n`;
                }
            });
        }

        // Task Completion Summary
        teamDescription += `\n**✅ Tasks Completed:** ${completedCount} / ${totalTasks.total}\n`;

        // Create an embed for each team
        const embed = new EmbedBuilder().setTitle('🏆 Bingo Team Overview').setDescription(teamDescription).setColor(0x3498db).setFooter({ text: 'Bingo Team List' }).setTimestamp();

        embeds.push(embed);
    }

    // Pagination Controls
    let currentIndex = 0;
    const updateEmbed = async () => {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('prev')
                .setLabel('⬅️ Previous')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentIndex === 0),
            new ButtonBuilder()
                .setCustomId('next')
                .setLabel('➡️ Next')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentIndex === embeds.length - 1),
        );

        await interaction.editReply({ embeds: [embeds[currentIndex]], components: [row] });
    };

    await interaction.reply({ embeds: [embeds[currentIndex]], flags: 64 });

    const message = await interaction.fetchReply();
    const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000, // 1 minute
    });

    collector.on('collect', async (i) => {
        if (i.user.id !== interaction.user.id) {
            return i.reply({ content: '❌ You cannot control this embed.', flags: 64 });
        }

        if (i.customId === 'prev') {
            currentIndex--;
        } else if (i.customId === 'next') {
            currentIndex++;
        }

        await i.deferUpdate();
        await updateEmbed();
    });

    collector.on('end', async () => {
        await interaction.editReply({ components: [] });
    });
}

/**
 * Get the ongoing event ID
 * @returns {Promise<number|null>} The event ID or null if no ongoing event
 */
async function getOngoingEventId() {
    const ongoing = await db.getOne(`
        SELECT event_id
        FROM bingo_state
        WHERE state = 'ongoing'
        LIMIT 1
    `);
    return ongoing ? ongoing.event_id : null;
}

/**
 * Get the player's active RSN and ID
 * Ensures the player is registered and an active clan member
 * @param {string} discordId - Discord user ID
 * @returns {Promise<Object>} The player's info ({ playerId, rsn }) or null if not active
 */
async function getActivePlayer(discordId) {
    const playerRow = await db.getOne(
        `
        SELECT rr.player_id, rr.rsn
        FROM registered_rsn rr
        JOIN clan_members cm ON rr.player_id = cm.player_id
        WHERE rr.discord_id = ?
          AND LOWER(rr.rsn) = LOWER(cm.rsn)
        LIMIT 1
        `,
        [discordId],
    );
    return playerRow ? { playerId: playerRow.player_id, rsn: playerRow.rsn } : null;
}
