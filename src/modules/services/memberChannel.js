// @ts-nocheck
/**
 * @fileoverview
 * **Member Channel Service Utilities** 🛠️
 *
 * This module provides utility functions for managing clan members and updating their data in the Varietyz Bot.
 * It interacts with the WOM API to fetch member information, manages role assignments in Discord based on ranks,
 * updates the SQLite database (`clan_members` table) with the latest member data, and refreshes the designated Discord
 * channels with up-to-date clan member information.
 *
 * **Key Features:**
 * - **Role Assignment**: Dynamically assigns or removes roles based on player rank.
 * - **Clan Member Updates**: Fetches and processes player data, updating roles and channel messages.
 * - **Database Management**: Ensures the `clan_members` table reflects the latest clan member data.
 * - **Discord Notifications**: Notifies a designated channel about rank updates and member changes.
 * - **Data Purging**: Clears outdated channel messages before posting new information.
 *
 * **External Dependencies:**
 * - **Wise Old Man (WOM) API**: Fetches player data.
 * - **Discord.js**: Manages interactions with Discord (sending messages, role management).
 * - **dbUtils**: Handles database operations.
 * - **rankUtils**: Provides utilities for rank formatting and color/emoji retrieval.
 *
 * @module modules/services/memberChannel
 */

const { EmbedBuilder } = require('discord.js');
const WOMApiClient = require('../../api/wise_old_man/apiClient');
const logger = require('../utils/logger');
const { RANKS, MEMBER_CHANNEL_ID, ROLE_CHANNEL_ID, rankHierarchy } = require('../../config/constants');
const { getRankEmoji, formatExp, formatRank, getRankColor } = require('../utils/rankUtils');
const { purgeChannel } = require('../utils/purgeChannel');
const { getAll, runQuery } = require('../utils/dbUtils');
require('dotenv').config();

/**
 * 🎯 **Handles Role Assignment for a Guild Member**
 *
 * Assigns the appropriate role to the given Discord guild member based on their rank. It also removes any lower-ranked roles
 * to ensure that the member has only the most relevant role.
 *
 * @async
 * @function handleMemberRoles
 * @param {Discord.GuildMember} member - The guild member whose roles are to be updated.
 * @param {string} roleName - The name of the role to assign (e.g., `Iron`).
 * @param {Discord.Guild} guild - The Discord guild where the member resides.
 * @param {string} player - The player's RuneScape name (RSN).
 * @param {string} rank - The current rank of the player.
 * @returns {Promise<void>} Resolves when role updates are complete.
 *
 * @example
 * // Update roles for a member:
 * await handleMemberRoles(member, 'Iron', guild, 'PlayerOne', 'Iron');
 */
async function handleMemberRoles(member, roleName, guild, player, rank) {
    const targetRole = guild.roles.cache.find((r) => r.name.toLowerCase() === roleName.toLowerCase());

    if (!targetRole) {
        logger.warn(`[handleMemberRoles] Role '${roleName}' not found in the guild.`);
        return;
    }

    const targetRolePosition = rankHierarchy[roleName.toLowerCase()];

    // Filter roles to remove based on hierarchy
    const rolesToRemove = member.roles.cache.filter((r) => {
        const position = rankHierarchy[r.name.toLowerCase()];
        return position !== undefined && position < targetRolePosition;
    });

    if (rolesToRemove.size > 0) {
        const removedRoles = rolesToRemove.map((r) => r.name).join(', ');
        await member.roles.remove(rolesToRemove);

        const roleChannel = await guild.channels.fetch(ROLE_CHANNEL_ID);
        const color = getRankColor(rank);

        const embed = new EmbedBuilder()
            .setTitle('Rank Updated!')
            .setDescription(`<@${member.id}>\n🎉 **Good news!** Your rank has been updated to ${targetRole}.\n\nThe following roles were removed to reflect the change:\n- ${removedRoles}. 🔄`)
            .setColor(color);

        await roleChannel.send({ embeds: [embed] });
        logger.info(`[handleMemberRoles] Removed roles for ${player}: ${removedRoles}`);
    }

    if (!member.roles.cache.has(targetRole.id)) {
        await member.roles.add(targetRole);
        logger.info(`[handleMemberRoles] Assigned role '${roleName}' to ${player}`);
    }
}

/**
 * 🎯 **Updates Clan Member Data**
 *
 * Fetches the latest clan member data from the WOM API, processes the data to update roles in the Discord guild,
 * and refreshes the clan channel with updated information. Optionally forces a channel update.
 *
 * @async
 * @function updateData
 * @param {Discord.Client} client - The Discord client instance.
 * @param {Object} [options] - Optional configuration.
 * @param {boolean} [options.forceChannelUpdate=false] - If `true`, forces the clan channel to update even if no changes are detected.
 * @returns {Promise<void>} Resolves when the update process is complete.
 *
 * @example
 * // Update data and force a channel update:
 * await updateData(client, { forceChannelUpdate: true });
 */
async function updateData(client, { forceChannelUpdate = false } = {}) {
    try {
        const csvData = await WOMApiClient.request('groups', 'getMembersCSV', process.env.WOM_GROUP_ID);
        const csvRows = csvData.split('\n').slice(1);
        const guild = await client.guilds.fetch(process.env.GUILD_ID);
        const newData = [];
        const cachedData = [];
        const discordIdCache = {};

        for (const row of csvRows) {
            const [player, rank, experience, lastProgressed, lastUpdated] = row.split(',');
            if (!player || rank.toLowerCase() === 'private') continue;

            const formattedRank = formatRank(rank);
            newData.push({ player, rank: formattedRank });
            cachedData.push({
                player,
                rank: formattedRank,
                experience: experience || 'N/a',
                lastProgressed: lastProgressed || 'N/a',
                lastUpdated: lastUpdated || 'N/a',
            });

            const roleName = RANKS[formattedRank.toLowerCase()]?.role;
            if (!roleName) continue;

            // Use cached Discord IDs or query once
            if (!discordIdCache[player.toLowerCase()]) {
                const result = await getAll('SELECT user_id FROM registered_rsn WHERE LOWER(rsn) = LOWER(?)', [player]);
                if (result.length > 0) discordIdCache[player.toLowerCase()] = result[0].user_id;
            }

            const discordId = discordIdCache[player.toLowerCase()];
            if (discordId) {
                const member = await guild.members.fetch(discordId).catch(() => null);
                if (member) await handleMemberRoles(member, roleName, guild, player, rank);
            }
        }

        const changesDetected = await updateDatabase(newData);
        if (changesDetected || forceChannelUpdate) {
            await updateClanChannel(client, cachedData);
        } else {
            logger.info('No changes detected. Skipping channel purge and update.');
        }
    } catch (error) {
        logger.error(`Failed to update data: ${error.message}`);
    }
}

/**
 * 🎯 **Updates the Clan Members Database**
 *
 * Compares new clan member data with the current data in the `clan_members` table.
 * If differences are detected, it updates the table accordingly.
 *
 * @async
 * @function updateDatabase
 * @param {Array<Object>} newData - Array of objects each containing `player` (name) and `rank` properties.
 * @returns {Promise<boolean>} Returns `true` if changes were detected and the database was updated; otherwise `false`.
 *
 * @example
 * const changes = await updateDatabase(newData);
 * if (changes) {
 *   logger.info('Database updated.');
 * }
 */
async function updateDatabase(newData) {
    const currentData = await getAll('SELECT name, rank FROM clan_members');
    const currentDataSet = new Set(currentData.map(({ name, rank }) => `${name},${rank}`));
    const newDataSet = new Set(newData.map(({ player, rank }) => `${player},${rank}`));

    if (currentDataSet.size !== newDataSet.size || ![...newDataSet].every((entry) => currentDataSet.has(entry))) {
        await runQuery('DELETE FROM clan_members');
        const insertQuery = 'INSERT INTO clan_members (name, rank) VALUES (?, ?)';
        await Promise.all(newData.map(({ player, rank }) => runQuery(insertQuery, [player, rank])));
        logger.info('Database updated with new clan member data.');
        return true;
    }

    return false;
}

/**
 * 🎯 **Splits an Array into Chunks**
 *
 * Divides a given array into smaller arrays (chunks) of a specified maximum size.
 *
 * @function chunkArray
 * @param {Array} array - The array to split.
 * @param {number} chunkSize - The maximum number of elements per chunk.
 * @returns {Array<Array>} An array containing the chunked arrays.
 *
 * @example
 * const chunks = chunkArray([1, 2, 3, 4, 5], 2);
 * // Result: [[1, 2], [3, 4], [5]]
 */
function chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}

/**
 * 🎯 **Sends Embeds in Batches to a Discord Channel**
 *
 * Discord allows a maximum of 10 embeds per message. This function splits the embeds into batches
 * and sends each batch to the specified channel sequentially to avoid rate limits.
 *
 * @async
 * @function sendEmbedsInBatches
 * @param {Discord.TextBasedChannel} channel - The channel where embeds should be sent.
 * @param {Array<EmbedBuilder>} embeds - An array of embed objects to be sent.
 * @returns {Promise<void>} Resolves when all embed batches have been sent.
 *
 * @example
 * await sendEmbedsInBatches(channel, embeds);
 */
async function sendEmbedsInBatches(channel, embeds) {
    // Discord allows up to 10 embeds per message.
    const batches = chunkArray(embeds, 10);

    // Process batches sequentially to avoid rate limits.
    for (const batch of batches) {
        try {
            await channel.send({ embeds: batch });
        } catch (error) {
            logger.error(`Error sending embed batch: ${error.message}`);
            // Optionally, implement retry or backoff logic here.
        }
    }
}

/**
 * 🎯 **Updates the Discord Clan Channel**
 *
 * Purges existing messages from the designated clan channel and sends updated clan member data
 * as formatted embeds.
 *
 * @async
 * @function updateClanChannel
 * @param {Discord.Client} client - The Discord client instance.
 * @param {Array<Object>} cachedData - Array of objects containing player data including `player`, `rank`,
 * `experience`, and `lastProgressed` values.
 * @returns {Promise<void>} Resolves when the clan channel has been successfully updated.
 *
 * @example
 * await updateClanChannel(client, cachedData);
 */
async function updateClanChannel(client, cachedData) {
    const channel = await client.channels.fetch(MEMBER_CHANNEL_ID);
    await purgeChannel(channel);

    const embeds = [];
    let index = 1;

    for (const { player, rank, experience, lastProgressed } of cachedData) {
        const rankEmoji = getRankEmoji(rank);
        const color = getRankColor(rank);
        const playerNameForLink = encodeURIComponent(player.replace(/ /g, '%20'));

        const embed = new EmbedBuilder()
            .setTitle(`${index}. ${rankEmoji} **${player}**`)
            .setURL(`https://wiseoldman.net/players/${playerNameForLink}`)
            .setColor(color)
            .addFields({ name: '**Rank:**', value: `\`${rank}\``, inline: true }, { name: '**Total Exp:**', value: `\`${formatExp(experience)}\``, inline: true }, { name: '⏳ **Last Progressed:**', value: `\`${lastProgressed}\``, inline: false });

        embeds.push(embed);
        index++;
    }

    // Send all embeds in batches (max 10 embeds per message)
    await sendEmbedsInBatches(channel, embeds);
    logger.info('Clan channel updated with new data.');
}

module.exports = { updateData, updateClanChannel };
