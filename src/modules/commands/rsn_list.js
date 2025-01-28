/**
 * @fileoverview Defines the `/rsn_list` slash command for the Varietyz Bot.
 * This command allows users with appropriate permissions to view a comprehensive list of
 * all registered RuneScape Names (RSNs) and their associated ranks for clan members.
 * It provides a paginated view, sorted by rank hierarchy, and allows for navigation
 * through interactive buttons.
 *
 * Core Features: (Administrator-only command)
 * - Displays RSNs grouped by Discord user.
 * - Includes rank emojis and links to Wise Old Man profiles.
 * - Paginated display with navigation controls.
 * - Data is sorted by rank hierarchy, with guests listed last.
 *
 * External Dependencies:
 * - **Discord.js**: For handling slash commands, creating embeds, and managing interactive components like buttons.
 * - **Wise Old Man API**: For fetching player profiles and rank details.
 * - **SQLite**: For managing registered RSN data in the database.
 *
 * @module modules/commands/rsn_list
 */

const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('../utils/logger');
const { getAll } = require('../utils/dbUtils');
const { normalizeRsn } = require('../utils/normalizeRsn');
const { getRankEmoji } = require('../utils/rankUtils');
const { rankHierarchy } = require('../../config/constants');

module.exports = {
    data: new SlashCommandBuilder().setName('rsn_list').setDescription('View all registered RSNs and their associated ranks for clan members.').setDefaultMemberPermissions(0),

    async execute(interaction) {
        try {
            logger.info(`Command 'rsnlist' triggered by user: ${interaction.user.username}`);
            await interaction.deferReply({ flags: 64 });

            const rsnData = await getAll('SELECT user_id, rsn FROM registered_rsn');
            const clanMembers = await getAll('SELECT name, rank FROM clan_members');

            if (!rsnData.length) {
                const embed = new EmbedBuilder().setTitle('No RSNs Registered').setDescription('⚠️ No RSNs are currently registered. Use `/rsn` to register your first one! 📝').setColor('Red');

                return await interaction.editReply({ embeds: [embed] });
            }

            // Paginate the data
            const ITEMS_PER_PAGE = 10;
            const pages = paginateRSNData(rsnData, clanMembers, ITEMS_PER_PAGE);

            let currentPage = 0;

            // Create navigation buttons
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('previous').setLabel('Previous').setStyle(ButtonStyle.Primary).setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(pages.length === 1),
                new ButtonBuilder().setCustomId('close').setLabel('Close').setStyle(ButtonStyle.Danger),
            );

            // Send the first page
            const message = await interaction.editReply({
                embeds: [pages[currentPage]],
                components: [row],
            });

            const collector = message.createMessageComponentCollector({
                filter: (i) => i.user.id === interaction.user.id,
                time: 60000,
            });

            collector.on('collect', async (i) => {
                if (i.customId === 'previous') {
                    currentPage--;
                } else if (i.customId === 'next') {
                    currentPage++;
                } else if (i.customId === 'close') {
                    collector.stop('closed');
                    return await i.update({
                        content: '⛔ list navigation closed.',
                        components: [],
                        embeds: [],
                    });
                }

                // @ts-ignore
                row.components[0].setDisabled(currentPage === 0);
                // @ts-ignore
                row.components[1].setDisabled(currentPage === pages.length - 1);

                await i.update({
                    embeds: [pages[currentPage]],
                    components: [row],
                });
            });

            // @ts-ignore
            // @ts-ignore
            collector.on('end', async (collected, reason) => {
                if (reason === 'time') {
                    await interaction.editReply({
                        content: '⏳ RSN list navigation timed out.',
                        components: [],
                    });
                }
            });
        } catch (err) {
            logger.error(`Error executing rsnlist command: ${err.message}`);
            await interaction.editReply({
                content: '❌ An error occurred while executing the command. Please try again later. 🛠️',
            });
        }
    },
};

/**
 * Gets the highest rank of a user's RSNs.
 *
 * @param {Array} rsns - The user's RSNs.
 * @param {Array} clanMembers - The clan member data.
 * @returns {Object} - An object containing the highest rank and the RSN associated with it.
 */
function getHighestRank(rsns, clanMembers) {
    const rankedRsns = rsns.map((rsn) => {
        const normalizedRSN = normalizeRsn(rsn);
        const member = clanMembers.find((member) => normalizeRsn(member.name) === normalizedRSN);
        const rank = member ? member.rank : 'guest'; // Default to 'guest' if no rank found
        return { rsn, rank };
    });

    // Sort by rank hierarchy, with highest rank first
    rankedRsns.sort((a, b) => rankHierarchy[b.rank.toLowerCase()] - rankHierarchy[a.rank.toLowerCase()]);

    return rankedRsns[0]; // Return the highest rank and associated RSN
}

/**
 * Paginates the RSN data into an array of EmbedBuilder objects, sorted by rank.
 *
 * @param {Array} rsnData - The RSN data from the database.
 * @param {Array} clanMembers - The clan member data from the database.
 * @param {number} itemsPerPage - The number of items per page.
 * @returns {EmbedBuilder[]} - An array of EmbedBuilder objects.
 */
function paginateRSNData(rsnData, clanMembers, itemsPerPage) {
    const rsnGroupedByUser = groupRSNByUser(rsnData);

    // Sort user IDs based on highest rank hierarchy, with `guest` users at the end
    const sortedUserIds = Object.keys(rsnGroupedByUser).sort((a, b) => {
        const rankA = getHighestRank(rsnGroupedByUser[a], clanMembers);
        const rankB = getHighestRank(rsnGroupedByUser[b], clanMembers);

        // Sort `guest` rank after all other ranks
        if (rankA.rank === 'guest' && rankB.rank !== 'guest') return 1;
        if (rankB.rank === 'guest' && rankA.rank !== 'guest') return -1;

        // Sort by rank hierarchy
        return rankHierarchy[rankB.rank.toLowerCase()] - rankHierarchy[rankA.rank.toLowerCase()];
    });

    const pages = [];
    for (let i = 0; i < sortedUserIds.length; i += itemsPerPage) {
        const pageUserIds = sortedUserIds.slice(i, i + itemsPerPage);
        const description = pageUserIds
            .map((userId) => {
                const rsns = rsnGroupedByUser[userId];
                return prepareUserContent(userId, rsns, clanMembers);
            })
            .join('\n\n');

        const embed = new EmbedBuilder()
            .setTitle('Registered RSNs')
            .setDescription(description)
            .setColor('Green')
            .setFooter({
                text: `Page ${Math.ceil(i / itemsPerPage) + 1}/${Math.ceil(sortedUserIds.length / itemsPerPage)}`,
            });

        pages.push(embed);
    }

    return pages;
}

/**
 * Prepares the user content for the embed, prioritizing RSNs with rank emojis.
 *
 * @param {string} userId - The Discord user ID.
 * @param {Array} rsns - An array of RSNs linked to the user.
 * @param {Array} clanMembers - The clan member data.
 * @returns {string} - A formatted string for the user's RSNs and ranks.
 */
function prepareUserContent(userId, rsns, clanMembers) {
    const userMention = `<@${userId}>`;
    const rankedRsns = rsns
        .map((rsn) => {
            const normalizedRSN = normalizeRsn(rsn);
            const member = clanMembers.find((member) => normalizeRsn(member.name) === normalizedRSN);
            const rank = member ? member.rank : 'guest';
            const emoji = member ? getRankEmoji(rank) : '';
            const profileLink = `https://wiseoldman.net/players/${encodeURIComponent(rsn.replace(/ /g, '%20').toLowerCase())}`;
            return {
                rank,
                content: rank ? `- ${emoji}[${rsn}](${profileLink})` : `- [${rsn}](${profileLink})`,
            };
        })
        .sort((a, b) => rankHierarchy[b.rank.toLowerCase()] - rankHierarchy[a.rank.toLowerCase()]); // Sort by rank

    return `${userMention}\n${rankedRsns.map((entry) => entry.content).join('\n')}`;
}

/**
 * Groups RSNs by user ID.
 *
 * @param {Array} rsnData - The RSN data from the database.
 * @returns {Object} - An object where keys are user IDs and values are arrays of RSNs.
 */
function groupRSNByUser(rsnData) {
    const grouped = {};
    rsnData.forEach(({ user_id, rsn }) => {
        if (!grouped[user_id]) grouped[user_id] = [];
        grouped[user_id].push(rsn);
    });
    return grouped;
}
