// @ts-nocheck
/**
 * @fileoverview
 * **Auto Roles Service Utilities** 🤖
 *
 * This module contains utility functions for managing automatic role assignments based on player data in the Varietyz Bot.
 * It fetches and processes data from multiple RuneScape Names (RSNs), merges the data for role assignments,
 * and assigns or removes Discord roles based on hiscores and achievements (such as boss kills, activities, and skills).
 *
 * **Key Features:**
 * - **Role Assignment**: Automatically assigns roles based on boss kills, activity scores, and skill levels from RSN data.
 * - **Data Merging**: Combines data from multiple RSNs into a single profile for each player, ensuring the highest achievements are retained.
 * - **Dynamic Role Updates**: Removes outdated roles and assigns new ones based on the player's latest achievements.
 * - **Discord Notifications**: Sends embed messages in a designated channel to notify players of role assignments and removals.
 * - **Custom Mappings**: Maps boss and activity names to corresponding Discord role names for easier management.
 *
 * **External Dependencies:**
 * - **Wise Old Man (WOM) API**: Retrieves player data and achievements.
 * - **Discord.js**: For interacting with Discord (assigning roles, sending notifications, managing guild data).
 * - **dbUtils**: Handles database interactions.
 * - **normalizeRsn**: Provides utilities for normalizing RSNs.
 *
 * @module modules/services/autoRoles
 */

const { EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger.js');
const { ROLE_CHANNEL_ID } = require('../../config/constants.js');
const { getAll } = require('../utils/dbUtils.js');
const { normalizeRsn } = require('../utils/normalizeRsn.js');

/**
 * 🎯 **Maps a Boss Name to Its Corresponding Discord Role Name**
 *
 * Returns a custom-mapped role name for a given boss. If no mapping exists, it returns the original boss name.
 *
 * @function mapBossToRole
 * @param {string} bossName - The name of the boss.
 * @returns {string} The corresponding Discord role name.
 *
 * @example
 * const roleName = mapBossToRole("K'ril Tsutsaroth"); // Returns "K'ril Tsutsaroth"
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
 * 🎯 **Maps an Activity Name to Its Corresponding Discord Role Name**
 *
 * Returns a custom-mapped role name for a given activity. If no mapping exists, it returns the original activity name.
 *
 * @function mapActivityToRole
 * @param {string} activityName - The name of the activity.
 * @returns {string} The corresponding Discord role name.
 *
 * @example
 * const roleName = mapActivityToRole('Clue Scrolls All'); // Returns "Clue Solver"
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
 * 🎯 **Retrieves All RSNs for a Discord User**
 *
 * Queries the database for all RuneScape Names (RSNs) linked to a given Discord user ID.
 *
 * @async
 * @function getUserRSNs
 * @param {string} userId - The Discord user ID.
 * @returns {Promise<string[]>} A promise that resolves to an array of RSNs.
 *
 * @example
 * const rsns = await getUserRSNs('123456789012345678');
 * // Might log: ['PlayerOne', 'PlayerTwo']
 */
async function getUserRSNs(userId) {
    const rows = await getAll('SELECT rsn FROM registered_rsn WHERE user_id = ?', [userId]);
    return rows.map((row) => row.rsn);
}

/**
 * 🎯 **Fetches Player Data for a Given RSN**
 *
 * Normalizes the provided RSN and queries the database for associated player data.
 * Returns an object mapping data keys to their values.
 *
 * @async
 * @function getPlayerDataForRSN
 * @param {string} rsn - The RuneScape Name to fetch data for.
 * @returns {Promise<Object>} A promise that resolves to an object with player data.
 *
 * @example
 * const playerData = await getPlayerDataForRSN('PlayerOne');
 * logger.info(playerData);
 */
async function getPlayerDataForRSN(rsn) {
    // Normalize RSN for comparison
    const normalizedRsn = normalizeRsn(rsn);

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
 * 🎯 **Merges Hiscores Data from Multiple RSNs**
 *
 * Combines hiscores data from an array of RSNs so that the highest values are retained for skills,
 * boss kills, and activities. This effectively treats multiple RSNs as a single combined account.
 *
 * @async
 * @function mergeRsnData
 * @param {string[]} rsns - An array of RSNs to merge data from.
 * @returns {Promise<Object>} A promise that resolves to an object containing the merged hiscores data.
 *
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
            // If it's a numeric skill, boss, or activity, store the max value.
            if ((key.startsWith('Skills ') && key.endsWith(' Level')) || (key.startsWith('Bosses ') && key.endsWith(' Kills')) || (key.startsWith('Activities ') && key.endsWith(' Score'))) {
                const oldVal = merged[key] ? parseInt(merged[key], 10) : 0;
                const newVal = parseInt(value, 10);
                merged[key] = Math.max(oldVal, newVal).toString();
            } else {
                // For top-level fields (e.g., DisplayName), overwrite with the latest value.
                merged[key] = value;
            }
        }
    }

    return merged;
}

/**
 * 🎯 **Fetches and Processes Member Data for Auto Role Assignment**
 *
 * Retrieves RSNs linked to a Discord user, merges hiscores data from those RSNs,
 * and then assigns or updates Discord roles based on the merged data.
 *
 * @async
 * @function fetchAndProcessMember
 * @param {Discord.Guild} guild - The Discord guild (server).
 * @param {string} userId - The Discord user ID.
 * @returns {Promise<void>} Resolves when the member has been processed.
 *
 * @example
 * await fetchAndProcessMember(guild, '123456789012345678');
 */
async function fetchAndProcessMember(guild, userId) {
    try {
        // 1) Get the user's RSNs from the database.
        const rsns = await getUserRSNs(userId);

        if (!rsns.length) {
            logger.info(`No RSNs linked to user ID: ${userId}`);
            return;
        }

        // 2) Attempt to fetch the corresponding GuildMember.
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) {
            logger.error(`Member with ID ${userId} not found in the guild`);
            return;
        }

        // 3) Merge data across all RSNs.
        const mergedData = await mergeRsnData(rsns);

        // 4) Assign roles based on the merged hiscores data.
        await handleHiscoresData(guild, member, rsns, mergedData);
        logger.info(`Processed data for RSNs: ${rsns.join(', ')} (User ID: ${userId})`);
    } catch (error) {
        logger.error(`Error processing member ID ${userId}: ${error.message}`);
    }
}

/**
 * 🎯 **Handles Role Assignments Based on Hiscores Data**
 *
 * Delegates to specific functions to assign OSRS roles (skill-based) and achievement-based roles.
 *
 * @async
 * @function handleHiscoresData
 * @param {Discord.Guild} guild - The Discord guild.
 * @param {Discord.GuildMember} member - The Discord guild member.
 * @param {string[]} rsns - Array of RSNs linked to the member.
 * @param {Object} hiscoresData - Merged hiscores data.
 * @returns {Promise<void>} Resolves when role assignments are complete.
 *
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
 * 🎯 **Assigns Achievement-Based Roles**
 *
 * Processes hiscores data to assign or update roles based on boss kills and activity scores.
 *
 * @async
 * @function createAchievementRoles
 * @param {Discord.Guild} guild - The Discord guild.
 * @param {Discord.GuildMember} member - The Discord guild member.
 * @param {Object} hiscoresData - Merged hiscores data.
 * @param {Discord.TextChannel} channelUpdate - The channel to send role update messages.
 * @returns {Promise<void>} Resolves when all achievement roles are processed.
 *
 * @example
 * await createAchievementRoles(guild, member, mergedData, channelUpdate);
 */
async function createAchievementRoles(guild, member, hiscoresData, channelUpdate) {
    // Use the first RSN for display purposes.
    const rsns = await getUserRSNs(member.id);
    const playerName = rsns.length > 0 ? rsns[0] : 'Unknown RSN';

    for (const key in hiscoresData) {
        const score = parseInt(hiscoresData[key], 10) || 0;
        if (score <= 0) continue; // Skip non-positive scores.

        // Boss kills.
        if (key.startsWith('Bosses ') && key.endsWith(' Kills')) {
            const bossName = key.replace('Bosses ', '').replace(' Kills', '');
            if (score >= 100) {
                await maybeAssignBossRole(guild, member, bossName, score, playerName, channelUpdate);
            }
        }

        // Activities.
        if (key.startsWith('Activities ') && key.endsWith(' Score')) {
            const activityName = key.replace('Activities ', '').replace(' Score', '');
            await maybeAssignActivityRole(guild, member, activityName, score, playerName, channelUpdate);
        }
    }
}

/**
 * 🎯 **Assigns a Boss-Related Role if Criteria Are Met**
 *
 * Checks if the member has not yet been assigned the role corresponding to the given boss.
 * If the member's boss kill count meets or exceeds the threshold (>= 100), the role is assigned,
 * and a notification embed is sent to the designated channel.
 *
 * @async
 * @function maybeAssignBossRole
 * @param {Discord.Guild} guild - The Discord guild.
 * @param {Discord.GuildMember} member - The guild member.
 * @param {string} bossName - The boss name.
 * @param {number} kills - The number of kills achieved.
 * @param {string} playerName - The RSN of the player.
 * @param {Discord.TextChannel} channelUpdate - The channel to send role update messages.
 * @returns {Promise<void>} Resolves when the role assignment is complete.
 *
 * @example
 * await maybeAssignBossRole(guild, member, "K'ril Tsutsaroth", 150, 'PlayerOne', channelUpdate);
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
 * 🎯 **Assigns an Activity-Related Role if Criteria Are Met**
 *
 * Checks if the member's activity score for a specific activity meets the threshold.
 * If so, the corresponding role is assigned and a notification embed is sent.
 *
 * @async
 * @function maybeAssignActivityRole
 * @param {Discord.Guild} guild - The Discord guild.
 * @param {Discord.GuildMember} member - The guild member.
 * @param {string} activityName - The name of the activity.
 * @param {number} score - The achieved score.
 * @param {string} playerName - The RSN of the player.
 * @param {Discord.TextChannel} channelUpdate - The channel to send role update messages.
 * @returns {Promise<void>} Resolves when the role assignment is complete.
 *
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
 * 🎯 **Assigns or Updates OSRS Skill-Based Roles**
 *
 * Evaluates hiscores data for each skill to assign "99" roles when applicable,
 * and removes any "99" roles that the member should no longer have.
 *
 * @async
 * @function createUpdateOsrsRoles
 * @param {Discord.Guild} guild - The Discord guild.
 * @param {Discord.GuildMember} member - The guild member.
 * @param {Object} hiscoresData - Merged hiscores data.
 * @param {Discord.TextChannel} channelUpdate - The channel to send role update messages.
 * @returns {Promise<void>} Resolves when all OSRS roles have been processed.
 *
 * @example
 * await createUpdateOsrsRoles(guild, member, mergedData, channelUpdate);
 */
async function createUpdateOsrsRoles(guild, member, hiscoresData, channelUpdate) {
    // Use the first RSN for display purposes.
    const rsns = await getUserRSNs(member.id);
    const playerName = rsns.length > 0 ? rsns[0] : 'Unknown RSN';

    const currentRoles = new Set(member.roles.cache.map((role) => role.name));
    // Track new 99 roles assigned to avoid removing them later.
    const newlyAssigned99Roles = new Set();

    // 1) Check each "Skills X Level" for level 99.
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

    // 2) Check for overall achievements (e.g., 2277 Total Level and Max Cape).
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

    // 3) Remove any 99 skill roles that the member should no longer have.
    for (const roleName of currentRoles) {
        if (!roleName.startsWith('99 ')) continue;
        if (!newlyAssigned99Roles.has(roleName)) {
            const role = guild.roles.cache.find((r) => r.name === roleName);
            if (role) {
                await member.roles.remove(role);
                const embed = new EmbedBuilder()
                    .setTitle('Role Removed!')
                    .setDescription(`⚠️ **Hey, <@${member.id}>!**\n<a:redutility4:1224115732632309760> It seems the role \`${roleName}\` isn’t supposed to be assigned to you. Removing it now. 🔄`)
                    .setColor(0xff0000)
                    .setTimestamp();

                await channelUpdate.send({ embeds: [embed] });
                logger.info(`Removed role "${roleName}" from RSN: ${playerName} (User ID: ${member.id})`);
            }
        }
    }
}

module.exports = { fetchAndProcessMember };
