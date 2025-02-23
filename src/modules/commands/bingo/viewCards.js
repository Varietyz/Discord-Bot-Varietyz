const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
const { generateBingoCard, getPlayerTasks } = require('../../services/bingo/bingoImageGenerator');

module.exports = {
    data: new SlashCommandBuilder().setName('bingo-cards').setDescription('View your Bingo Card (Individual or Team) automatically.'),

    async execute(interaction) {
        try {
            // 1) Defer reply (Ephemeral: only visible to the user)
            await interaction.deferReply({ flags: 64 });

            // 2) Identify the ongoing event & board
            const ongoing = await db.getOne(`
                SELECT board_id
                FROM bingo_state
                WHERE state = 'ongoing'
                LIMIT 1
            `);
            if (!ongoing) {
                return interaction.editReply({ content: '❌ No ongoing Bingo event found.' });
            }
            const { board_id: boardId } = ongoing;

            // 3) Get the user's player IDs and team status
            const discordId = interaction.user.id;
            const userRows = await db.getAll(
                `
                SELECT rr.player_id, rr.rsn, bt.team_id, bt.team_name
                FROM registered_rsn rr
                JOIN clan_members cm ON rr.player_id = cm.player_id
                LEFT JOIN bingo_team_members btm ON btm.player_id = rr.player_id
                LEFT JOIN bingo_teams bt ON bt.team_id = btm.team_id
                WHERE rr.discord_id = ?
                AND cm.player_id = rr.player_id
                AND LOWER(rr.rsn) = LOWER(cm.rsn) 
                COLLATE NOCASE
                `,
                [discordId],
            );

            if (userRows.length === 0) {
                return interaction.editReply({
                    content: '❌ You are either not registered or not an active clan member. Join the clan and register your RSN to participate in Bingo.',
                });
            }

            // 4) Check if the user is in a team
            const teamMember = userRows.find((row) => row.team_id);
            if (teamMember) {
                // 🟡 Team Card Generation
                logger.info(`[BingoCards] User is in a team (${teamMember.team_name}). Generating team card...`);
                return await generateTeamCard(interaction, boardId, teamMember.team_id, teamMember.team_name);
            } else {
                // 🔵 Individual Card Generation with Pagination
                logger.info('[BingoCards] User has multiple RSNs. Generating paginated individual cards...');
                return await paginateIndividualCards(interaction, boardId, userRows);
            }
        } catch (err) {
            logger.error('Error executing /bingo-cards command:', err);
            await interaction.editReply({
                content: '❌ An error occurred while displaying your Bingo card.',
            });
        }
    },
};

/**
 * Paginate Individual Cards for Multiple RSNs
 * @param {Interaction} interaction - Discord interaction object
 * @param {number} boardId - The current Bingo board ID
 * @param {Array} userRows - Array of player objects
 */
async function paginateIndividualCards(interaction, boardId, userRows) {
    let currentIndex = 0;
    const total = userRows.length;

    const showCard = async (index) => {
        const { player_id, rsn } = userRows[index];
        const buffer = await generateBingoCard(boardId, player_id);

        const file = new AttachmentBuilder(buffer, { name: 'bingo_card.png' });
        const embed = new EmbedBuilder()
            .setTitle(`My Bingo Card — ${rsn}`)
            .setColor(0x3498db)
            .setImage('attachment://bingo_card.png')
            .setFooter({ text: `Bingo Cards: Individual (${index + 1}/${total})` })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('prev')
                .setLabel('⬅️ Previous')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(index === 0),
            new ButtonBuilder()
                .setCustomId('next')
                .setLabel('➡️ Next')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(index === total - 1),
        );

        await interaction.editReply({
            embeds: [embed],
            files: [file],
            components: [row],
        });
    };

    await showCard(currentIndex);

    const collector = interaction.channel.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async (i) => {
        if (i.customId === 'prev') {
            currentIndex--;
        } else if (i.customId === 'next') {
            currentIndex++;
        }

        await i.deferUpdate();
        await showCard(currentIndex);
    });

    collector.on('end', async () => {
        await interaction.editReply({ components: [] });
    });
}

/**
 * Generates a Consolidated Team Card
 * @param {Interaction} interaction - Discord interaction object
 * @param {number} boardId - The current Bingo board ID
 * @param {number} teamId - The team ID
 * @param {string} teamName - The team's name
 */
async function generateTeamCard(interaction, boardId, teamId, teamName) {
    try {
        // Fetch tasks for the entire team by aggregating progress
        const tasks = await getPlayerTasks(boardId, teamId, true);

        if (!tasks || tasks.length === 0) {
            return interaction.editReply({
                content: `❌ No tasks found for Team **${teamName}**.`,
                flags: 64,
            });
        }

        // Generate the card as an image buffer
        const buffer = await generateBingoCard(boardId, teamId, true);

        if (!buffer) {
            return interaction.editReply({
                content: `❌ Could not generate card for Team **${teamName}**.`,
                flags: 64,
            });
        }

        const file = new AttachmentBuilder(buffer, { name: 'bingo_card_team.png' });
        const embed = new EmbedBuilder()
            .setTitle(`Team Card — ${teamName}`)
            .setDescription(`Progress of all members in **${teamName}**`)
            .setColor(0xf1c40f)
            .setImage('attachment://bingo_card_team.png')
            .setFooter({ text: 'Bingo Cards: Team' })
            .setTimestamp();

        return interaction.editReply({
            embeds: [embed],
            files: [file],
            flags: 64,
        });
    } catch (err) {
        logger.error(`[BingoCards] Error generating team card: ${err.message}`);
        return interaction.editReply({
            content: '❌ An error occurred while generating your Team Bingo card.',
            flags: 64,
        });
    }
}
