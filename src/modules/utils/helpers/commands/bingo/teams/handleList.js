const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const db = require('../../../../essentials/dbUtils');
const { getOngoingEventId } = require('./teamCommandHelpers');

async function handleList(interaction) {
    const eventId = await getOngoingEventId();
    if (!eventId) {
        return interaction.editReply({ content: '❌ No ongoing Bingo event found.', flags: 64 });
    }

    const teams = await db.getAll(
        `
        SELECT t.team_id, t.team_name, t.player_id
        FROM bingo_teams t
        WHERE t.event_id = ?
        ORDER BY t.team_name COLLATE NOCASE ASC
        `,
        [eventId],
    );

    if (teams.length === 0) {
        return interaction.editReply({ content: '❌ No teams exist for this event yet.', flags: 64 });
    }

    const embeds = [];
    for (const team of teams) {
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

        const totalTasks = await db.getOne(
            `
            SELECT COUNT(*) AS total
            FROM bingo_board_cells bbc
            JOIN bingo_state bs ON bs.board_id = bbc.board_id
            WHERE bs.event_id = ?
            `,
            [eventId],
        );

        const completedCount = Math.min(tasksCompleted.completed, totalTasks.total);

        let teamDescription = `**🔸 Team ID:** ${team.team_id}\n`;
        teamDescription += `**🏷️ Team Name:** ${team.team_name}\n`;
        teamDescription += `**👑 Captain:** ${members.find((m) => m.player_id === team.player_id)?.rsn || 'Unknown'}\n`;
        teamDescription += '**👥 Members:**\n';

        if (members.length === 0) {
            teamDescription += '   _No members yet._\n';
        } else {
            members.forEach((m) => {
                if (m.player_id !== team.player_id) {
                    teamDescription += `     👤 ${m.rsn || `(Player #${m.player_id})`}\n`;
                }
            });
        }

        teamDescription += `\n**✅ Tasks Completed:** ${completedCount} / ${totalTasks.total}\n`;

        const embed = new EmbedBuilder().setTitle('🏆 Bingo Team Overview').setDescription(teamDescription).setColor(0x3498db).setFooter({ text: 'Bingo Team List' }).setTimestamp();

        embeds.push(embed);
    }

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

    await interaction.editReply({ embeds: [embeds[currentIndex]], flags: 64 });

    const message = await interaction.fetchReply();
    const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000, 
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

module.exports = handleList;
