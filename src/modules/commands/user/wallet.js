const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
const getPlayerLink = require('../../utils/fetchers/getPlayerLink');
const { getPlayerTotalPoints } = require('../../utils/fetchers/getPlayerPoints');

module.exports = {
    data: new SlashCommandBuilder().setName('wallet').setDescription('Check your total points, points per type, and recent transactions.'),

    async execute(interaction) {
        try {
            await interaction.deferReply({ flags: 64 });

            const userId = interaction.user.id;

            const player = await db.getOne(
                `
                SELECT rr.player_id, rr.rsn 
                FROM registered_rsn rr
                JOIN clan_members cm ON rr.player_id = cm.player_id
                WHERE rr.discord_id = ?
            `,
                [userId],
            );

            if (!player) {
                return interaction.editReply({ content: '❌ You are not registered in the system or not a clan member.' });
            }

            const playerId = player.player_id;

            const pointData = await db.getAll(
                `
                SELECT type, COALESCE(SUM(points), 0) AS total
                FROM player_points
                WHERE player_id = ?
                GROUP BY type
            `,
                [playerId],
            );

            const sentTransactions = await db.getAll(
                `
                SELECT t.type, t.points, t.transaction_date, rr.rsn AS receiver
                FROM player_point_transactions t
                JOIN registered_rsn rr ON t.receiver_id = rr.player_id
                WHERE t.sender_id = ?
                ORDER BY t.transaction_date DESC
                LIMIT 5
            `,
                [playerId],
            );

            const receivedTransactions = await db.getAll(
                `
                SELECT t.type, t.points, t.transaction_date, rr.rsn AS sender
                FROM player_point_transactions t
                JOIN registered_rsn rr ON t.sender_id = rr.player_id
                WHERE t.receiver_id = ?
                ORDER BY t.transaction_date DESC
                LIMIT 5
            `,
                [playerId],
            );

            const sentHistory = sentTransactions.length
                ? (
                    await Promise.all(
                        sentTransactions.map(async (t) => {
                            const playerLink = await getPlayerLink(t.receiver);
                            return `**${t.type}:** Sent **\`${t.points}\`** pts to ${playerLink} on \`${t.transaction_date}\``;
                        }),
                    )
                ).join('\n')
                : '_No sent transactions._';

            const receivedHistory = receivedTransactions.length
                ? (
                    await Promise.all(
                        receivedTransactions.map(async (t) => {
                            const playerLink = await getPlayerLink(t.sender);
                            return `**${t.type}:** Received **\`${t.points}\`** pts from ${playerLink} on \`${t.transaction_date}\``;
                        }),
                    )
                ).join('\n')
                : '_No received transactions._';

            const totalPoints = await getPlayerTotalPoints(playerId);

            const embed = new EmbedBuilder()
                .setTitle(`💰 ${player.rsn}'s Wallet`)
                .setColor(0xffd700)
                .setDescription('Here is an overview of your points and recent transactions.')
                .addFields({ name: '⭐ Total points', value: `**\`${totalPoints}\`** pts`, inline: false });

            if (pointData.length) {
                pointData.forEach((p) => {
                    embed.addFields({ name: `🏆 ${p.type} points`, value: `**\`${p.total}\`** pts`, inline: true });
                });
            } else {
                embed.addFields({ name: '📊 Points Per Type', value: '_No points available._', inline: false });
            }

            embed.addFields({ name: '🔼 Sent Transactions', value: sentHistory, inline: false }, { name: '🔽 Received Transactions', value: receivedHistory, inline: false }).setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            logger.error(`❌ Error executing /wallet: ${error.message}`);
            await interaction.editReply({
                content: '❌ **Error:** Unable to fetch your wallet information.',
            });
        }
    },
};
