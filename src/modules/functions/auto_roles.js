// @ts-nocheck
/**
 * @fileoverview Utility functions for managing automatic role assignments in the Varietyz Bot.
 * This module handles fetching and processing player data, merging data from multiple RSNs,
 * and assigning or removing Discord roles based on players' hiscores and achievements.
 *
 * @module modules/functions/auto_roles
 */

const { EmbedBuilder } = require('discord.js');
const logger = require('./logger');
const { ROLE_CHANNEL_ID } = require('../../config/constants');
const { getAll } = require('../../utils/dbUtils');
const { standardizeName } = require('../../utils/normalize.js');

/**
 * Retrieves all RuneScape Names (RSNs) associated with a given Discord user from the database.
 *
 * @async
 * @function getUserRSNs
 * @param {string} userId - The Discord user ID.
 * @returns {Promise<string[]>} - A promise that resolves to an array of RSNs.
 * @example
 * const rsns = await getUserRSNs('123456789012345678');
 * logger.info(rsns); // ['PlayerOne', 'PlayerTwo']
 */
async function getUserRSNs(userId) {
    const rows = await getAll('SELECT rsn FROM registered_rsn WHERE user_id = ?', [userId]);
    return rows.map((row) => row.rsn);
}

/**
 * Fetches player data for a specific RSN from the database.
 * It standardizes the RSN before performing the query to ensure accurate retrieval.
 *
 * @async
 * @function getPlayerDataForRSN
 * @param {string} rsn - The RuneScape Name to fetch data for.
 * @returns {Promise<Object>} - A promise that resolves to an object mapping data keys to values.
 * @example
 * const playerData = await getPlayerDataForRSN('PlayerOne');
 * logger.info(playerData);
 */
async function getPlayerDataForRSN(rsn) {
    // Normalize RSN for comparison
    const normalizedRsn = standardizeName(rsn);

    // SQL query to normalize stored player_id and compare
    const query = `
        SELECT data_key, data_value 
        FROM player_data
        WHERE LOWER(REPLACE(REPLACE(player_id, '-', ' '), '_', ' ')) = LOWER(?)
    `;

    const rows = await getAll(query, [normalizedRsn]);

    // Convert rows into an object
    const result = {};
    for (const { data_key, data_value } of rows) {
        result[data_key] = data_value;
    }

    return result;
}

/**
 * Merges hiscores data from multiple RSNs, ensuring that the highest values are retained
 * for skills, boss kills, and activities. This allows treating multiple RSNs as a single
 * combined account for role assignments.
 *
 * @async
 * @function mergeRsnData
 * @param {string[]} rsns - An array of RSNs to merge data from.
 * @returns {Promise<Object>} - A promise that resolves to the merged hiscores data.
 * @example
 * const mergedData = await mergeRsnData(['PlayerOne', 'PlayerTwo']);
 * logger.info(mergedData);
 */
async function mergeRsnData(rsns) {
    const merged = {};

    for (const rsn of rsns) {
        // Pull data from DB (which is standardized)
        const data = await getPlayerDataForRSN(rsn);

        for (const [key, value] of Object.entries(data)) {
            // If it's a numeric skill, boss, or activity, store the max
            if ((key.startsWith('Skills ') && key.endsWith(' Level')) || (key.startsWith('Bosses ') && key.endsWith(' Kills')) || (key.startsWith('Activities ') && key.endsWith(' Score'))) {
                const oldVal = merged[key] ? parseInt(merged[key], 10) : 0;
                const newVal = parseInt(value, 10);
                merged[key] = Math.max(oldVal, newVal).toString();
            } else {
                // For top-level fields (DisplayName, Type, etc.), just overwrite or pick the first
                // We'll overwrite in this example.
                merged[key] = value;
            }
        }
    }

    return merged;
}

/**
 * Fetches and processes data for a Discord guild member based on their associated RSNs.
 * It retrieves RSNs from the database, fetches and merges hiscores data, and assigns
 * appropriate Discord roles based on the merged data.
 *
 * @async
 * @function fetchAndProcessMember
 * @param {Discord.Guild} guild - The Discord guild (server).
 * @param {string} userId - The Discord user ID.
 * @returns {Promise<void>} - Resolves when the member has been processed.
 * @example
 * await fetchAndProcessMember(guild, '123456789012345678');
 */
async function fetchAndProcessMember(guild, userId) {
    try {
        // 1) Get the user's RSNs from the database
        const rsns = await getUserRSNs(userId);

        if (!rsns.length) {
            logger.info(`No RSNs linked to user ID: ${userId}`);
            return;
        }

        // 2) Attempt to fetch the corresponding GuildMember
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) {
            logger.error(`Member with ID ${userId} not found in the guild`);
            return;
        }

        // 3) Merge data across all RSNs
        const mergedData = await mergeRsnData(rsns);

        // 4) Assign roles based on the merged hiscores data
        await handleHiscoresData(guild, member, rsns, mergedData);
        logger.info(`Processed data for RSNs: ${rsns.join(', ')} (User ID: ${userId})`);
    } catch (error) {
        logger.error(`Error processing member ID ${userId}: ${error.message}`);
    }
}

/**
 * Handles the assignment of roles based on hiscores data. It delegates to specific
 * functions for OSRS roles and achievement-based roles.
 *
 * @async
 * @function handleHiscoresData
 * @param {Discord.Guild} guild - The Discord guild (server).
 * @param {Discord.GuildMember} member - The Discord guild member.
 * @param {string[]} rsns - Array of RSNs linked to the member.
 * @param {Object} hiscoresData - Merged hiscores data.
 * @returns {Promise<void>} - Resolves when all role assignments are complete.
 * @example
 * await handleHiscoresData(guild, member, ['PlayerOne'], mergedData);
 */
async function handleHiscoresData(guild, member, rsns, hiscoresData) {
    const channelUpdate = guild.channels.cache.get(ROLE_CHANNEL_ID);
    if (!channelUpdate) {
        logger.error(`Role channel with ID ${ROLE_CHANNEL_ID} not found.`);
        return;
    }

    await Promise.all([createUpdateOsrsRoles(guild, member, hiscoresData, channelUpdate), createAchievementRoles(guild, member, hiscoresData, channelUpdate)]);
}

/**
 * Assigns or updates boss kill and activity-based roles based on players' achievements.
 *
 * @async
 * @function createAchievementRoles
 * @param {Discord.Guild} guild - The Discord guild (server).
 * @param {Discord.GuildMember} member - The Discord guild member.
 * @param {Object} hiscoresData - Merged hiscores data.
 * @param {Discord.TextChannel} channelUpdate - The channel to send role update messages.
 * @returns {Promise<void>} - Resolves when all achievement roles are processed.
 * @example
 * await createAchievementRoles(guild, member, mergedData, channelUpdate);
 */
async function createAchievementRoles(guild, member, hiscoresData, channelUpdate) {
    // Use the first RSN for display purposes
    const rsns = await getUserRSNs(member.id);
    const playerName = rsns.length > 0 ? rsns[0] : 'Unknown RSN';

    for (const key in hiscoresData) {
        const score = parseInt(hiscoresData[key], 10) || 0;
        if (score <= 0) continue; // Skip zero or non-numeric

        // Boss kills
        if (key.startsWith('Bosses ') && key.endsWith(' Kills')) {
            const bossName = key.replace('Bosses ', '').replace(' Kills', '');
            if (score >= 100) {
                await maybeAssignBossRole(guild, member, bossName, score, playerName, channelUpdate);
            }
        }

        // Activities
        if (key.startsWith('Activities ') && key.endsWith(' Score')) {
            const activityName = key.replace('Activities ', '').replace(' Score', '');
            await maybeAssignActivityRole(guild, member, activityName, score, playerName, channelUpdate);
        }
    }
}

/**
 * Maps a boss name to its corresponding Discord role name.
 *
 * @function mapBossToRole
 * @param {string} bossName - The name of the boss.
 * @returns {string} - The corresponding Discord role name.
 * @example
 * const roleName = mapBossToRole('K\'ril Tsutsaroth'); // 'K\'ril Tsutsaroth'
 */
function mapBossToRole(bossName) {
    const roleMap = {
        'Chambers Of Xeric Challenge Mode': 'CoX: Challenge Mode',
        'Theatre Of Blood Hard Mode': 'ToB: Hard Mode',
        'Tombs Of Amascut Expert': 'ToA: Expert Mode',
        'Kree\'Arra': 'Kree\'Arra',
        'K\'ril Tsutsaroth': 'K\'ril Tsutsaroth',
        'Calvar\'ion': 'Calvar\'ion',
        'Vet\'ion': 'Vet\'ion',
        // Add more mappings as needed
    };
    return roleMap[bossName] || bossName;
}

/**
 * Maps an activity name to its corresponding Discord role name.
 *
 * @function mapActivityToRole
 * @param {string} activityName - The name of the activity.
 * @returns {string} - The corresponding Discord role name.
 * @example
 * const roleName = mapActivityToRole('Clue Scrolls All'); // 'Clue Solver'
 */
function mapActivityToRole(activityName) {
    const roleMap = {
        'Clue Scrolls All': 'Clue Solver',
        'Colosseum Glory': 'Colosseum',
        'Last Man Standing': 'Last Man Standing (LMS)',
        'Soul Wars Zeal': 'Soul Wars',
        'League Points': 'League Compete',
        'Pvp Arena': 'PvP Arena',
        // Add more mappings as needed
    };
    return roleMap[activityName] || activityName;
}

/**
 * Assigns a boss-related Discord role to a member if they meet the kill threshold.
 * Sends an embed message to the designated channel upon successful role assignment.
 *
 * @async
 * @function maybeAssignBossRole
 * @param {Discord.Guild} guild - The Discord guild (server).
 * @param {Discord.GuildMember} member - The Discord guild member.
 * @param {string} bossName - The name of the boss.
 * @param {number} kills - Number of kills the member has achieved.
 * @param {string} playerName - The RSN of the player.
 * @param {Discord.TextChannel} channelUpdate - The channel to send role update messages.
 * @returns {Promise<void>} - Resolves when the role assignment is complete.
 * @example
 * await maybeAssignBossRole(guild, member, 'K\'ril Tsutsaroth', 150, 'PlayerOne', channelUpdate);
 */
async function maybeAssignBossRole(guild, member, bossName, kills, playerName, channelUpdate) {
    const roleName = mapBossToRole(bossName);
    const role = guild.roles.cache.find((r) => r.name === roleName);
    if (role && !member.roles.cache.has(role.id)) {
        await member.roles.add(role);
        const embed = new EmbedBuilder()
            .setTitle('Role Assigned!')
            .setDescription(`🎉 **Congratulations, <@${member.id}>!**\n<a:redutility4:1224115732632309760> You have defeated \`${bossName}\` \`${kills}\` times and earned the role <@&${role.id}>. 🏆`)
            .setColor(0x48de6f)
            .setTimestamp();

        await channelUpdate.send({ embeds: [embed] });
        logger.info(`Assigned role "${roleName}" to RSN: ${playerName} (User ID: ${member.id})`);
    }
}

/**
 * Assigns an activity-related Discord role to a member if they meet the score threshold.
 * Sends an embed message to the designated channel upon successful role assignment.
 *
 * @async
 * @function maybeAssignActivityRole
 * @param {Discord.Guild} guild - The Discord guild (server).
 * @param {Discord.GuildMember} member - The Discord guild member.
 * @param {string} activityName - The name of the activity.
 * @param {number} score - The activity score the member has achieved.
 * @param {string} playerName - The RSN of the player.
 * @param {Discord.TextChannel} channelUpdate - The channel to send role update messages.
 * @returns {Promise<void>} - Resolves when the role assignment is complete.
 * @example
 * await maybeAssignActivityRole(guild, member, 'Clue Scrolls All', 200, 'PlayerOne', channelUpdate);
 */
async function maybeAssignActivityRole(guild, member, activityName, score, playerName, channelUpdate) {
    let threshold = 50;
    if (['Clue Scrolls All', 'Colosseum Glory'].includes(activityName)) {
        threshold = 150;
    }
    if (activityName === 'Clue Scrolls All') {
        threshold = 500;
    }

    if (score >= threshold) {
        const roleName = mapActivityToRole(activityName);
        const role = guild.roles.cache.find((r) => r.name === roleName);
        if (role && !member.roles.cache.has(role.id)) {
            await member.roles.add(role);
            const embed = new EmbedBuilder()
                .setTitle('Role Assigned!')
                .setDescription(`🎉 **Awesome job, <@${member.id}>!**\n<a:redutility4:1224115732632309760> You completed \`${score}\` \`${activityName}\` and unlocked the role <@&${role.id}>. 🏅`)
                .setColor(0x48de6f)
                .setTimestamp();

            await channelUpdate.send({ embeds: [embed] });
            logger.info(`Assigned role "${roleName}" to RSN: ${playerName} (User ID: ${member.id})`);
        }
    }
}

/**
 * Assigns or updates OSRS skill-based roles (e.g., 99 Attack, 2277 Total) based on hiscores data.
 * It also removes any 99 skill roles that the member no longer qualifies for.
 *
 * @async
 * @function createUpdateOsrsRoles
 * @param {Discord.Guild} guild - The Discord guild (server).
 * @param {Discord.GuildMember} member - The Discord guild member.
 * @param {Object} hiscoresData - Merged hiscores data.
 * @param {Discord.TextChannel} channelUpdate - The channel to send role update messages.
 * @returns {Promise<void>} - Resolves when all OSRS roles are processed.
 * @example
 * await createUpdateOsrsRoles(guild, member, mergedData, channelUpdate);
 */
async function createUpdateOsrsRoles(guild, member, hiscoresData, channelUpdate) {
    // Use the first RSN for display purposes
    const rsns = await getUserRSNs(member.id);
    const playerName = rsns.length > 0 ? rsns[0] : 'Unknown RSN';

    const currentRoles = new Set(member.roles.cache.map((role) => role.name));

    // Track new 99 roles we assign so we don't remove them afterwards
    const newlyAssigned99Roles = new Set();

    // 1) Check each "Skills X Level" for 99
    for (const key in hiscoresData) {
        if (!key.startsWith('Skills ') || !key.endsWith(' Level')) continue;

        const levelNum = parseInt(hiscoresData[key], 10) || 0;
        if (levelNum === 99) {
            const skillName = key.replace('Skills ', '').replace(' Level', '');
            const roleName = `99 ${skillName}`;

            newlyAssigned99Roles.add(roleName);
            const role = guild.roles.cache.find((r) => r.name === roleName);
            if (role && !member.roles.cache.has(role.id)) {
                await member.roles.add(role);
                const embed = new EmbedBuilder()
                    .setTitle('Role Assigned!')
                    .setDescription(`🎉 **Well done, <@${member.id}>!**\n<a:redutility4:1224115732632309760> You’ve reached \`${roleName}\` and earned the role <@&${role.id}>. 🎊`)
                    .setColor(0x48de6f)
                    .setTimestamp();

                await channelUpdate.send({ embeds: [embed] });
                logger.info(`Assigned role "${roleName}" to RSN: ${playerName} (User ID: ${member.id})`);
            }
        }
    }

    // 2) Check for 2277 total or Max Cape
    const overallKey = 'Skills Overall Level';
    if (hiscoresData[overallKey] && hiscoresData[overallKey] === '2277') {
        const role2277Total = guild.roles.cache.find((r) => r.name === '2277 Total');
        const roleMaxCape = guild.roles.cache.find((r) => r.name === 'Max Cape');

        if (role2277Total && !member.roles.cache.has(role2277Total.id)) {
            await member.roles.add(role2277Total);
            const embed = new EmbedBuilder()
                .setTitle('Role Assigned!')
                .setDescription(`🎉 **Fantastic achievement, <@${member.id}>!**\n<a:redutility4:1224115732632309760> You’ve reached \`2277 Total level\` and earned the role \`${role2277Total.name}\`. 🎊`)
                .setColor(0x48de6f)
                .setTimestamp();

            await channelUpdate.send({ embeds: [embed] });
            logger.info(`Assigned role "2277 Total" to RSN: ${playerName} (User ID: ${member.id})`);
        }

        if (roleMaxCape && !member.roles.cache.has(roleMaxCape.id)) {
            await member.roles.add(roleMaxCape);
            const embed = new EmbedBuilder()
                .setTitle('Role Assigned!')
                .setDescription(`🎉 **Incredible work, <@${member.id}>!**\n<a:redutility4:1224115732632309760> You’ve earned the prestigious \`Max Cape\` and the role \`${roleMaxCape.name}\`. 🏆`)
                .setColor(0x48de6f)
                .setTimestamp();

            await channelUpdate.send({ embeds: [embed] });
            logger.info(`Assigned role "Max Cape" to RSN: ${playerName} (User ID: ${member.id})`);
        }
    }

    // 3) Remove any 99 skill roles the user shouldn't have
    for (const roleName of currentRoles) {
        if (!roleName.startsWith('99 ')) continue;
        if (!newlyAssigned99Roles.has(roleName)) {
            const role = guild.roles.cache.find((r) => r.name === roleName);
            if (role) {
                await member.roles.remove(role);
                const embed = new EmbedBuilder()
                    .setTitle('Role Removed!')
                    .setDescription(`⚠️ **Hey, <@${member.id}>!**\n<a:redutility4:1224115732632309760> It seems the role \`${roleName}\` isn’t supposed to be assigned to you. Let me take care of that and remove it for you! 🔄`)
                    .setColor(0xff0000)
                    .setTimestamp();

                await channelUpdate.send({ embeds: [embed] });
                logger.info(`Removed role "${roleName}" from RSN: ${playerName} (User ID: ${member.id})`);
            }
        }
    }
}

/**
 * Exports the main function responsible for fetching and processing member data.
 */
module.exports = { fetchAndProcessMember };
