// @ts-nocheck
/**
 * @fileoverview
 * **RSN List Command** 📜
 *
 * This module defines the `/rsn_list` slash command for the Varietyz Bot.
 * It allows users to view all registered RuneScape Names (RSNs) along with their associated ranks for clan members.
 * The command displays the data in a paginated embed with interactive navigation buttons.
 *
 * ---
 *
 * 🔹 **Core Features:**
 * - Displays RSNs grouped by Discord user.
 * - Shows rank emojis and provides clickable links to Wise Old Man profiles.
 * - Supports paginated navigation via interactive buttons.
 *
 * 🔗 **External Dependencies:**
 * - **discord.js** for embeds, action rows, and buttons.
 * - **SQLite** for retrieving RSN and clan member data.
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
     * // 📌 Usage:
     * await execute(interaction);
     */
    async execute(interaction) {
        try {
            logger.info(`🔍 Command 'rsn_list' triggered by user: \`${interaction.user.username}\``);
            await interaction.deferReply({ flags: 64 });

            const rsnData = await getAll('SELECT discord_id, rsn FROM registered_rsn');
            const clanMembers = await getAll('SELECT rsn, rank FROM clan_members');

            if (!rsnData.length) {
                const embed = new EmbedBuilder().setTitle('No RSNs Registered').setDescription('⚠️ **Notice:** No RSNs are currently registered. Use `/rsn` to register your first one! 📝').setColor('Red');

                return await interaction.editReply({ embeds: [embed] });
            }

            const ITEMS_PER_PAGE = 10;
            //logger.debug(`🛠️ Paginating RSN data with \`${ITEMS_PER_PAGE}\` items per page.`);
            const pages = paginateRSNData(rsnData, clanMembers, ITEMS_PER_PAGE);
            //logger.debug(`✅ Generated \`${pages.length}\` page(s) of RSN data.`);

            let currentPage = 0;

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('previous').setLabel('◀️ Previous').setStyle(ButtonStyle.Primary).setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('Next ▶️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(pages.length === 1),
                new ButtonBuilder().setCustomId('close').setLabel('❌ Close').setStyle(ButtonStyle.Danger),
            );

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
                        content: '⛔ **Navigation Closed:** RSN list navigation closed.',
                        components: [],
                        embeds: [],
                    });
                }

                // Update button disabled states based on the current page
                row.components[0].setDisabled(currentPage === 0);
                row.components[1].setDisabled(currentPage === pages.length - 1);

                await i.update({
                    embeds: [pages[currentPage]],
                    components: [row],
                });
            });

            collector.on('end', async (collected, reason) => {
                if (reason === 'time' && collected.size === 0) {
                    await interaction.editReply({
                        content: '⏳ **Timeout:** RSN list navigation timed out.',
                        components: [],
                    });
                }
            });
        } catch (err) {
            logger.error(`❌ Error executing rsn_list command: \`${err.message}\``);
            await interaction.editReply({
                content: '❌ **Error:** An error occurred while executing the command. Please try again later. 🛠️',
            });
        }
    },
};

/**
 * 🎯 **Determines the Highest Rank Among RSNs for a User**
 *
 * For a given array of RSNs and the clan member data, this function determines which RSN corresponds
 * to the highest rank based on a predefined rank hierarchy. If no matching clan member is found, the rank defaults to 'guest'.
 *
 * @function getHighestRank
 * @param {Array<string>} rsns - An array of RSNs associated with a user.
 * @param {Array<Object>} clanMembers - An array of clan member records, each containing at least `name` and `rank`.
 * @returns {Object} An object with properties:
 * - `rsn`: The RSN with the highest rank.
 * - `rank`: The highest rank found.
 *
 * @example
 * const highest = getHighestRank(['PlayerOne', 'PlayerTwo'], clanMembers);
 * // Output: { rsn: 'PlayerOne', rank: 'Leader' }
 */
function getHighestRank(rsns, clanMembers) {
    const rankedRsns = rsns.map((rsn) => {
        const normalizedRSN = normalizeRsn(rsn);
        const member = clanMembers.find((member) => normalizeRsn(member.name) === normalizedRSN);
        const rank = member ? member.rank : 'guest';
        return { rsn, rank };
    });

    rankedRsns.sort((a, b) => rankHierarchy[b.rank.toLowerCase()] - rankHierarchy[a.rank.toLowerCase()]);
    return rankedRsns[0];
}

/**
 * 🎯 **Paginates RSN Data into Embed Pages**
 *
 * Groups RSN data by Discord user, sorts users based on their highest rank, and paginates the results.
 * Each page is represented by an embed that contains the formatted RSN information.
 *
 * @function paginateRSNData
 * @param {Array<Object>} rsnData - An array of objects containing `discord_id` and `rsn` properties.
 * @param {Array<Object>} clanMembers - An array of clan member data.
 * @param {number} itemsPerPage - The maximum number of users per page.
 * @returns {Array<EmbedBuilder>} An array of embeds, each representing a paginated page of RSN data.
 *
 * @example
 * const pages = paginateRSNData(rsnData, clanMembers, 10);
 * console.log(`Generated ${pages.length} pages.`);
 */
function paginateRSNData(rsnData, clanMembers, itemsPerPage) {
    //logger.debug('🛠️ Grouping RSN data by user...');
    const rsnGroupedByUser = groupRSNByUser(rsnData);

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
        const description = pageUserIds.map((discordId) => prepareUserContent(discordId, rsnGroupedByUser[discordId], clanMembers)).join('\n\n');

        const embed = new EmbedBuilder()
            .setTitle('📜 Registered RSNs')
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
 * 🎯 **Prepares Formatted RSN Content for a User**
 *
 * Generates a formatted string for a user's RSNs by:
 * - Mentioning the user via their Discord ID.
 * - Sorting the user's RSNs by rank.
 * - Formatting each RSN with its corresponding rank emoji and a clickable link to the Wise Old Man profile.
 *
 * @function prepareUserContent
 * @param {string} discordId - The Discord user ID.
 * @param {Array<string>} rsns - An array of RSNs associated with the user.
 * @param {Array<Object>} clanMembers - An array of clan member records.
 * @returns {string} A formatted string containing the user's mention and their RSN listings.
 *
 * @example
 * const content = prepareUserContent('123456789012345678', ['PlayerOne'], clanMembers);
 * console.log(content);
 */
function prepareUserContent(discordId, rsns, clanMembers) {
    //logger.debug(`🛠️ Preparing RSN content for user \`${discordId}\`...`);
    const userMention = `<@${discordId}>`;
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
        .sort((a, b) => rankHierarchy[b.rank.toLowerCase()] - rankHierarchy[a.rank.toLowerCase()]);

    return `${userMention}\n${rankedRsns.map((entry) => entry.content).join('\n')}`;
}

/**
 * 🎯 **Groups RSN Data by Discord User**
 *
 * Organizes RSN data into an object where each key is a Discord user ID and each value is an array of RSNs
 * registered by that user.
 *
 * @function groupRSNByUser
 * @param {Array<Object>} rsnData - An array of objects containing properties `discord_id` and `rsn`.
 * @returns {Object} An object mapping each Discord user ID to an array of RSNs.
 *
 * @example
 * const grouped = groupRSNByUser(rsnData);
 * // Output: { 'user1': ['RSN1', 'RSN2'], 'user2': ['RSN3'] }
 */
function groupRSNByUser(rsnData) {
    //logger.debug(`🛠️ Grouping ${rsnData.length} RSN record(s) by user...`);
    const grouped = {};
    rsnData.forEach(({ discord_id, rsn }) => {
        if (!grouped[discord_id]) grouped[discord_id] = [];
        grouped[discord_id].push(rsn);
    });
    return grouped;
}
