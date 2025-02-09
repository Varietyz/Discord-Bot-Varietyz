/* eslint-disable jsdoc/require-returns */
const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getRankEmoji } = require('../../utils/rankUtils');
const logger = require('../../utils/logger');
const { getAll } = require('../../utils/dbUtils');
const { normalizeRsn } = require('../../utils/normalizeRsn');
const { rankHierarchy } = require('../../../config/constants');

const PAGE_SIZE = 10; // Max users per embed

/**
 * Loads all registered RSNs from the database.
 */
const loadRSNData = async () => {
    const rows = await getAll('SELECT discord_id, rsn FROM registered_rsn');
    const rsnData = {};
    rows.forEach((row) => {
        if (!rsnData[row.discord_id]) rsnData[row.discord_id] = [];
        rsnData[row.discord_id].push(row.rsn);
    });
    return rsnData;
};

/**
 * Loads all clan members from the database.
 */
const loadClanMembers = async () => {
    const rows = await getAll('SELECT rsn, rank FROM clan_members');
    return rows.map((member) => ({
        rsn: member.rsn,
        rank: member.rank,
        rankIndex: rankHierarchy[member.rank.toLowerCase()] ?? -1, // Default to -1 if rank is unknown
    }));
};

/**
 * Prepares the embed content for a user by formatting their RSNs and associated ranks.
 * @param userId
 * @param rsns
 * @param clanMembers
 */
function prepareUserContent(userId, rsns, clanMembers) {
    const userTag = `\n<@${userId}>`;
    const rsnContent = rsns
        .map((rsn) => {
            const normalizedRSN = normalizeRsn(rsn);
            const member = clanMembers.find((member) => normalizeRsn(member.rsn) === normalizedRSN);
            const rank = member ? member.rank : '';
            const emoji = member ? getRankEmoji(rank) : '❔';
            const profileLink = `https://wiseoldman.net/players/${encodeURIComponent(rsn.replace(/ /g, '%20').toLowerCase())}`;
            return rank ? `- ${emoji} [${rsn}](${profileLink}) (**${rank}**)` : `- [${rsn}](${profileLink})`;
        })
        .join('\n');

    return `${userTag}\n${rsnContent}\n`;
}

module.exports.data = new SlashCommandBuilder().setName('rsnlist').setDescription('View all registered RSNs and their associated ranks for clan members.').setDefaultMemberPermissions(0);

/**
 * Handles pagination for the `/rsnlist` command.
 * @param interaction
 */
module.exports.execute = async (interaction) => {
    try {
        logger.info(`Command 'rsnlist' triggered by user: ${interaction.user.username}`);
        await interaction.deferReply({ flags: 64 });

        logger.info('Loading RSN data and clan members...');
        const rsnData = await loadRSNData();
        const clanMembers = await loadClanMembers();

        if (Object.keys(rsnData).length === 0) {
            const embed = new EmbedBuilder().setTitle('No RSNs Registered').setDescription('⚠️ No RSNs are currently registered. Use `/rsn` to register your first one! 📝').setColor('Red');
            return await interaction.editReply({ embeds: [embed] });
        }

        const users = Object.entries(rsnData);
        const totalPages = Math.ceil(users.length / PAGE_SIZE);

        let currentPage = 0;

        // Function to generate an embed for a given page
        const generateEmbed = (page) => {
            const startIdx = page * PAGE_SIZE;
            const endIdx = startIdx + PAGE_SIZE;
            const userChunk = users.slice(startIdx, endIdx);

            const embed = new EmbedBuilder().setTitle(`Registered RSNs - Page ${page + 1}/${totalPages}`).setColor('Green');

            let description = '';
            for (const [userId, rsns] of userChunk) {
                description += prepareUserContent(userId, rsns, clanMembers) + '\n';
            }

            embed.setDescription(description);
            return embed;
        };

        // Create pagination buttons
        const createPaginationButtons = (page) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('prev_page')
                    .setLabel('⬅️ Previous')
                    .setStyle(ButtonStyle.Secondary)

                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId('next_page')
                    .setLabel('Next ➡️')
                    .setStyle(ButtonStyle.Secondary)

                    .setDisabled(page === totalPages - 1),
            );
        };

        const replyMessage = await interaction.editReply({
            embeds: [generateEmbed(currentPage)],
            components: [createPaginationButtons(currentPage)],
        });

        // Create a collector for button interactions
        const collector = replyMessage.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async (buttonInteraction) => {
            if (buttonInteraction.user.id !== interaction.user.id) {
                return await buttonInteraction.reply({ content: '❌ You can\'t control this menu.', flags: 64 });
            }

            if (buttonInteraction.customId === 'prev_page') {
                currentPage = Math.max(0, currentPage - 1);
            } else if (buttonInteraction.customId === 'next_page') {
                currentPage = Math.min(totalPages - 1, currentPage + 1);
            }

            await buttonInteraction.update({
                embeds: [generateEmbed(currentPage)],
                components: [createPaginationButtons(currentPage)],
            });
        });

        collector.on('end', async () => {
            await interaction.editReply({ components: [] });
        });
    } catch (err) {
        logger.error(`Error executing rsnlist command: ${err.message}`);
        await interaction.editReply({
            content: '❌ An error occurred while executing the command. Please try again later. 🛠️',
            flags: 64,
        });
    }
};
