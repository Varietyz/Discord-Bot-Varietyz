const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
const getEmojiWithFallback = require('../../utils/fetchers/getEmojiWithFallback');
const { updatePlayerPoints } = require('../../utils/essentials/updatePlayerPoints');
const getPlayerLink = require('../../utils/fetchers/getPlayerLink');
const { updateBingoProgress } = require('../../services/bingo/bingoService');
const client = require('../../../main');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('share-points')
        .setDescription('Share your points with a friend!')
        .addStringOption((option) => option.setName('rsn').setDescription('The RSN to share points with.').setAutocomplete(true).setRequired(true))
        .addStringOption((option) => option.setName('type').setDescription('The type of points to transfer.').setRequired(true).setAutocomplete(true))
        .addIntegerOption((option) => option.setName('amount').setDescription('The number of points to share (must be within available balance).').setAutocomplete(true).setRequired(true)),

    async execute(interaction) {
        try {
            await interaction.deferReply({ flags: 64 });

            const senderDiscordId = interaction.user.id;
            const recipientRSN = interaction.options.getString('rsn');
            const pointType = interaction.options.getString('type');
            let amount = interaction.options.getInteger('amount');

            // 🔍 Fetch sender's RSN and their available points for the selected type
            const sender = await db.getOne(
                `
                SELECT rr.player_id, rr.rsn, COALESCE(SUM(pp.points), 0) AS total_points
                FROM registered_rsn rr
                JOIN clan_members cm ON rr.player_id = cm.player_id
                LEFT JOIN player_points pp ON rr.player_id = pp.player_id
                WHERE rr.discord_id = ? 
                  AND pp.type = ?
                GROUP BY rr.player_id
            `,
                [senderDiscordId, pointType],
            );

            if (!sender) {
                return interaction.editReply({ content: '❌ You are not registered in the system or do not have points in this category.' });
            }

            const senderPoints = sender.total_points;

            // ❌ Prevent selecting an amount greater than available points
            if (amount > senderPoints) {
                return interaction.editReply({
                    content: `❌ Invalid amount! You only have **${senderPoints}** ${pointType} points available.`,
                });
            }

            // If user selects `(Max)`, set amount to their max available points
            if (amount === -1) {
                amount = senderPoints;
            }

            // 🔍 Get recipient's player ID
            const recipient = await db.getOne(
                `
                SELECT rr.player_id, rr.discord_id
                FROM registered_rsn rr
                JOIN clan_members cm ON rr.player_id = cm.player_id
                WHERE LOWER(rr.rsn) = LOWER(?)
            `,
                [recipientRSN],
            );

            if (!recipient) {
                return interaction.editReply({ content: `❌ RSN **${recipientRSN}** is not a registered clan member.` });
            }

            // ❌ Prevent self-transfer
            if (sender.player_id === recipient.player_id) {
                return interaction.editReply({ content: '❌ You cannot send points to yourself!' });
            }

            // ✅ Transfer points within the selected pool
            await updatePlayerPoints(sender.player_id, pointType, -amount); // Deduct from sender
            await updatePlayerPoints(recipient.player_id, pointType, amount); // Add to recipient

            // 🔹 Log the transaction in `player_point_transactions`
            await db.runQuery(
                `
                INSERT INTO player_point_transactions (sender_id, receiver_id, type, points, transaction_date)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            `,
                [sender.player_id, recipient.player_id, pointType, amount],
            );

            const playerLink = await getPlayerLink(recipientRSN);
            const checkmark = await getEmojiWithFallback('emoji_logoa_check', '✅');
            const embed = new EmbedBuilder()
                .setTitle(`${checkmark} Points Transferred Successfully!`)
                .setColor(0x00ff00)
                .setDescription(`You have successfully sent ⭐ **\`${amount}\`** pts from **${pointType}** to ${playerLink}.\n\n`)
                .addFields({ name: '📊 View Your Transactions', value: 'Use `/wallet` to check your balance and past transactions!' })
                .setTimestamp();

            // 🔔 **Send a DM to the recipient (if possible)**
            if (recipient.discord_id) {
                try {
                    const recipientUser = await client.users.fetch(recipient.discord_id);
                    if (recipientUser) {
                        const recipientDM = new EmbedBuilder()
                            .setTitle('📩 You\'ve Received Points!')
                            .setColor(0x3498db)
                            .setDescription(`🎉 You have received ⭐ **\`${amount}\`** pts towards ** ${pointType}** from **${sender.rsn}**!`)
                            .addFields({ name: '🔍 Check Your Balance', value: 'Use `/wallet` in the server to see your updated points!' })
                            .setTimestamp();

                        await recipientUser.send({ embeds: [recipientDM] });
                    }
                } catch (dmError) {
                    logger.warn(`⚠️ Could not send DM to user ${recipient.discord_id}: ${dmError.message}`);
                }
            }

            await updateBingoProgress(client);
            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            logger.error(`❌ Error executing /share-points: ${error.message}`);
            await interaction.editReply({
                content: '❌ **Error:** An issue occurred while processing your request.',
            });
        }
    },

    async autocomplete(interaction) {
        try {
            const focusedOption = interaction.options.getFocused(true);

            if (focusedOption.name === 'rsn') {
                const results = await db.getAll(
                    `
                    SELECT DISTINCT rr.rsn
                    FROM registered_rsn rr
                    JOIN clan_members cm ON rr.player_id = cm.player_id
                    WHERE LOWER(rr.rsn) LIKE ?
                    COLLATE NOCASE
                `,
                    [`%${focusedOption.value}%`],
                );

                const choices = results.map((row) => ({ name: row.rsn, value: row.rsn })).slice(0, 25);
                await interaction.respond(choices);
            } else if (focusedOption.name === 'type') {
                const results = await db.getAll(`
                    SELECT DISTINCT type FROM player_points
                `);

                const choices = results.map((row) => ({ name: row.type, value: row.type })).slice(0, 25);
                await interaction.respond(choices);
            } else if (focusedOption.name === 'amount') {
                // Get sender's ID to fetch max points
                const senderDiscordId = interaction.user.id;
                const pointType = interaction.options.getString('type');

                if (!pointType) {
                    return interaction.respond([]); // Return empty if type isn't selected yet
                }

                const sender = await db.getOne(
                    `
                    SELECT COALESCE(SUM(pp.points), 0) AS total_points
                    FROM registered_rsn rr
                    JOIN player_points pp ON rr.player_id = pp.player_id
                    WHERE rr.discord_id = ? 
                      AND pp.type = ?
                    GROUP BY rr.player_id
                `,
                    [senderDiscordId, pointType],
                );

                const maxPoints = sender ? sender.total_points : 0;
                const choices = [
                    { name: '5', value: 5 },
                    { name: '20', value: 20 },
                    { name: '50', value: 50 },
                    { name: '100', value: 100 },
                    { name: '200', value: 200 },
                    { name: `(Max: ${maxPoints})`, value: -1 },
                ].filter((choice) => choice.value <= maxPoints || choice.value === -1);

                await interaction.respond(choices);
            }
        } catch (error) {
            logger.error(`❌ Autocomplete error: ${error.message}`);
            await interaction.respond([]);
        }
    },
};
