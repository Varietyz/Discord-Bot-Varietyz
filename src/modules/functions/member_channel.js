// @ts-nocheck
/**
 * @fileoverview Utility functions for managing clan members within the Varietyz Bot.
 * This module handles role assignments based on player ranks, updates clan member data,
 * interacts with the WOM API to fetch player information, and manages Discord channel updates.
 *
 * @module modules/functions/member_channel
 */

const { EmbedBuilder } = require('discord.js');
const logger = require('./logger');
const { RANKS, WOM_API_URL, WOM_GROUP_ID, MEMBER_CHANNEL_ID, ROLE_CHANNEL_ID } = require('../../config/constants');
const { getRankEmoji, purgeChannel, formatExp, formatRank, getRankColor } = require('../utils');
const { getAll, runQuery } = require('../../utils/dbUtils');
require('dotenv').config();

/**
 * Represents the hierarchy of roles based on their rank names.
 * Lower index indicates a lower rank.
 *
 * @constant {Array<string>}
 */
const roleRange = [
    'guest',
    'bronze',
    'iron',
    'steel',
    'mithril',
    'adamant',
    'rune',
    'dragon',
    'onyx',
    'zenyte',
    'legend',
    'myth',
    'tztok',
    'tzkal',
    'soul',
    'wild',
    'quester',
    'looter',
    'helper',
    'competitor',
    'special',
    'bingo jury',
    'nurse',
    'moderator',
];

/**
 * Maps each role name to its hierarchy index for quick reference.
 *
 * @constant {Object.<string, number>}
 */
const rankHierarchy = roleRange.reduce((acc, roleName, index) => {
    acc[roleName.toLowerCase()] = index;
    return acc;
}, {});

/**
 * Handles the assignment and removal of roles for a Discord guild member based on their rank.
 * It removes lower-ranked roles and assigns the appropriate role if not already present.
 *
 * @async
 * @function handleMemberRoles
 * @param {Discord.GuildMember} member - The Discord guild member to update roles for.
 * @param {string} roleName - The name of the role to assign to the member.
 * @param {Discord.Guild} guild - The Discord guild where the member resides.
 * @param {string} player - The player's RuneScape Name (RSN).
 * @param {string} rank - The current rank of the player.
 * @returns {Promise<void>} - Resolves when role updates are complete.
 * @example
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
 * Updates clan member data by fetching the latest information from the WOM API,
 * updating roles, and refreshing the clan channel in Discord.
 *
 * @async
 * @function updateData
 * @param {Discord.Client} client - The Discord client instance.
 * @returns {Promise<void>} - Resolves when the update process is complete.
 * @example
 * await updateData(client);
 */
async function updateData(client) {
    try {
        const response = await fetch(`${WOM_API_URL}/groups/${WOM_GROUP_ID}/csv`);
        if (!response.ok) throw new Error(`API request failed: ${response.status}`);

        const csvData = await response.text();
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
        if (changesDetected) {
            await updateClanChannel(client, cachedData);
        } else {
            logger.info('No changes detected. Skipping channel purge and update.');
        }
    } catch (error) {
        logger.error(`Failed to update data: ${error.message}`);
    }
}

/**
 * Updates the 'clan_members' table in the database with new clan member data.
 * It compares the current data with the new data and updates the database if changes are detected.
 *
 * @async
 * @function updateDatabase
 * @param {Array<Object>} newData - An array of objects containing player names and their ranks.
 * @returns {Promise<boolean>} - Returns `true` if changes were detected and the database was updated, `false` otherwise.
 * @example
 * const changes = await updateDatabase(newData);
 * if (changes) {
 * logger.info('Database updated.');
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
 * Updates the Discord clan channel with the latest clan member data.
 * It purges existing messages and sends updated information as embeds.
 *
 * @async
 * @function updateClanChannel
 * @param {Discord.Client} client - The Discord client instance.
 * @param {Array<Object>} cachedData - An array of objects containing player data for the embeds.
 * @returns {Promise<void>} - Resolves when the clan channel is updated.
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
        const profileLink = `https://wiseoldman.net/players/${playerNameForLink}`;

        const embed = new EmbedBuilder()
            .setTitle(`${index}. ${rankEmoji} **${player}**`)
            .setColor(color)
            .addFields(
                { name: '**Rank:**', value: `\`${rank}\``, inline: true },
                {
                    name: '**Total Exp:**',
                    value: `\`${formatExp(experience)}\``,
                    inline: true,
                },
                {
                    name: '⏳**Last Progressed:**',
                    value: `\`${lastProgressed}\`\n🔗[Profile Link](${profileLink})`,
                    inline: false,
                },
            );

        embeds.push(embed);
        index++;
    }

    await Promise.all(embeds.map((embed) => channel.send({ embeds: [embed] })));
    logger.info('Clan channel updated with new data.');
}

module.exports = { updateData };
