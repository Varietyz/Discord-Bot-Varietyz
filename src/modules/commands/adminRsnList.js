/* eslint-disable no-process-exit */
// @ts-nocheck
/**
 * @fileoverview
 * **RSN List Command** 📜
 *
 * Defines the `/rsn_list` slash command for the Varietyz Bot.
 * This command allows users to view all registered RuneScape Names (RSNs) along with their associated ranks for clan members.
 * The command displays the data in a paginated embed with interactive navigation buttons.
 *
 * **Core Features:**
 * - Displays RSNs grouped by Discord user.
 * - Shows rank emojis and provides links to Wise Old Man profiles.
 * - Supports paginated navigation via buttons.
 *
 * **External Dependencies:**
 * - discord.js for embeds, actions rows, buttons.
 * - SQLite for retrieving RSN and clan member data.
 *
 * @module modules/commands/adminRsnList
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

    /**
     * 🎯 **Executes the /rsn_list Command**
     *
     * Fetches RSN data from the database and clan member data, then paginates and displays the RSNs in an embed.
     * The embed includes interactive navigation buttons for paging through the results.
     *
     * @async
     * @function execute
     * @param {Discord.CommandInteraction} interaction - The command interaction object.
     * @returns {Promise<void>} Resolves when the command execution is complete.
     *
     * @example
     * // Invoked when a user runs /rsn_list.
     * await execute(interaction);
     */
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

                // Update button disabled states based on the current page.
                // @ts-ignore
                row.components[0].setDisabled(currentPage === 0);
                // @ts-ignore
                row.components[1].setDisabled(currentPage === pages.length - 1);

                await i.update({
                    embeds: [pages[currentPage]],
                    components: [row],
                });
            });

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
 * 🎯 **Determines the Highest Rank Among RSNs for a User**
 *
 * For a given array of RSNs and clan member data, this function determines which RSN corresponds to the highest rank
 * based on a predefined rank hierarchy. If no clan member data is found, the rank defaults to 'guest'.
 *
 * @function getHighestRank
 * @param {Array<string>} rsns - The user's RSNs.
 * @param {Array<Object>} clanMembers - The clan member data.
 * @returns {Object} An object containing the highest rank and its associated RSN.
 *
 * @example
 * const highest = getHighestRank(['PlayerOne', 'PlayerTwo'], clanMembers);
 * console.log(highest); // { rsn: 'PlayerOne', rank: 'Leader' }
 */
function getHighestRank(rsns, clanMembers) {
    const rankedRsns = rsns.map((rsn) => {
        const normalizedRSN = normalizeRsn(rsn);
        const member = clanMembers.find((member) => normalizeRsn(member.name) === normalizedRSN);
        const rank = member ? member.rank : 'guest'; // Default to 'guest' if not found.
        return { rsn, rank };
    });

    // Sort RSNs by rank hierarchy (highest first).
    rankedRsns.sort((a, b) => rankHierarchy[b.rank.toLowerCase()] - rankHierarchy[a.rank.toLowerCase()]);

    return rankedRsns[0];
}

/**
 * 🎯 **Paginates RSN Data into Embed Pages**
 *
 * Splits the RSN data (grouped by user) into multiple pages for display.
 * Each page is represented by an EmbedBuilder object containing RSN information and pagination details.
 *
 * @function paginateRSNData
 * @param {Array<Object>} rsnData - The RSN data from the database.
 * @param {Array<Object>} clanMembers - The clan member data from the database.
 * @param {number} itemsPerPage - The maximum number of users per page.
 * @returns {EmbedBuilder[]} An array of embeds, each representing a page.
 *
 * @example
 * const pages = paginateRSNData(rsnData, clanMembers, 10);
 * console.log(`Generated ${pages.length} pages.`);
 */
function paginateRSNData(rsnData, clanMembers, itemsPerPage) {
    const rsnGroupedByUser = groupRSNByUser(rsnData);

    // Sort user IDs based on highest rank hierarchy, placing 'guest' users at the end.
    const sortedUserIds = Object.keys(rsnGroupedByUser).sort((a, b) => {
        const rankA = getHighestRank(rsnGroupedByUser[a], clanMembers);
        const rankB = getHighestRank(rsnGroupedByUser[b], clanMembers);

        if (rankA.rank === 'guest' && rankB.rank !== 'guest') return 1;
        if (rankB.rank === 'guest' && rankA.rank !== 'guest') return -1;

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
 * 🎯 **Prepares Formatted Content for a User's RSN List**
 *
 * Generates a formatted string for a user's RSNs, including a Discord mention,
 * rank emojis, and clickable links to Wise Old Man profiles.
 *
 * @function prepareUserContent
 * @param {string} userId - The Discord user ID.
 * @param {Array<string>} rsns - The RSNs associated with the user.
 * @param {Array<Object>} clanMembers - The clan member data.
 * @returns {string} A formatted string containing the user's mention and their RSNs.
 *
 * @example
 * const content = prepareUserContent('123456789012345678', ['PlayerOne'], clanMembers);
 * console.log(content);
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
        .sort((a, b) => rankHierarchy[b.rank.toLowerCase()] - rankHierarchy[a.rank.toLowerCase()]); // Sort by rank.

    return `${userMention}\n${rankedRsns.map((entry) => entry.content).join('\n')}`;
}

/**
 * 🎯 **Groups RSNs by Discord User**
 *
 * Organizes RSN data into an object where each key is a user ID and each value is an array of RSNs for that user.
 *
 * @function groupRSNByUser
 * @param {Array<Object>} rsnData - An array of objects containing `user_id` and `rsn` properties.
 * @returns {Object} An object mapping user IDs to arrays of RSNs.
 *
 * @example
 * const grouped = groupRSNByUser(rsnData);
 * console.log(grouped); // { 'user1': ['RSN1', 'RSN2'], 'user2': ['RSN3'] }
 */
function groupRSNByUser(rsnData) {
    const grouped = {};
    rsnData.forEach(({ user_id, rsn }) => {
        if (!grouped[user_id]) grouped[user_id] = [];
        grouped[user_id].push(rsn);
    });
    return grouped;
}
