/* eslint-disable no-unused-vars */
// @ts-nocheck
/**
 * @fileoverview
 * **Active/Inactive Clan Member Activity Utilities** ⚡
 *
 * This module provides utility functions for managing active and inactive clan members within the Varietyz Bot.
 * It interacts with the WOM API to fetch player data, calculates member activity based on progress within specified
 * intervals, and dynamically updates a Discord voice channel name to reflect the number of active clan members.
 *
 * **Key Features:**
 * - **Activity Data Update**: Fetches player data from the WOM API and updates the `active_inactive` table in the database.
 * - **Activity Calculation**: Determines the number of active players (last 7 days) and inactive players (last 21 days) using Luxon.
 * - **Voice Channel Update**: Dynamically updates the Discord voice channel name with the current active member count.
 * - **Retry Mechanism**: Implements exponential backoff for retrying failed data fetch attempts from the WOM API.
 *
 * **External Dependencies:**
 * - **Luxon**: For date and time manipulation.
 * - **Wise Old Man (WOM) API**: To fetch player and group details.
 * - **Discord.js**: For interacting with the Discord guild and channels.
 * - **dbUtils**: For database interactions.
 *
 * @module modules/services/activeMembers
 */

const { DateTime } = require('luxon');
const logger = require('../utils/logger');
const WOMApiClient = require('../../api/wise_old_man/apiClient');
const { VOICE_CHANNEL_ID } = require('../../config/constants');
const { getAll, runQuery } = require('../utils/dbUtils');
const { calculateInactivity, calculateProgressCount, ensureActiveInactiveTable } = require('../utils/calculateActivity');

/**
 * Object to store player progress data.
 * Keys are player names (RSNs), and values are Luxon DateTime objects representing the last progression date.
 *
 * @type {Object.<string, DateTime>}
 */
const playerProgress = {};

/**
 * 🎯 **Fetches and Updates Player Activity Data**
 *
 * Retrieves player data from the WOM API and updates the `active_inactive` database table with each player's last progress date.
 * The function implements a retry mechanism with exponential backoff to handle intermittent failures.
 *
 * @async
 * @function updateActivityData
 * @param {number} [maxRetries=3] - The maximum number of retry attempts if fetching data fails.
 * @param {number} [baseDelay=5000] - The base delay (in milliseconds) before retrying.
 * @returns {Promise<void>} Resolves when the activity data has been successfully fetched and processed.
 *
 * @throws {Error} Throws an error if all retry attempts fail.
 *
 * @example
 * // Update activity data with up to 5 retries and a 10-second base delay:
 * await updateActivityData(5, 10000);
 */
async function updateActivityData(maxRetries = 3, baseDelay = 5000) {
    let retryCount = 0;
    logger.info(`Using WOM_GROUP_ID: ${WOMApiClient.groupId}`);

    while (retryCount < maxRetries) {
        try {
            const groupDetails = await WOMApiClient.request('groups', 'getGroupDetails', WOMApiClient.groupId);

            if (groupDetails?.memberships) {
                await ensureActiveInactiveTable();

                for (const membership of groupDetails.memberships) {
                    const { player } = membership;

                    if (player?.lastChangedAt) {
                        const lastProgressed = DateTime.fromJSDate(player.lastChangedAt);
                        if (lastProgressed.isValid) {
                            // Save to the database (insert or update on conflict)
                            await runQuery(
                                `INSERT INTO active_inactive (username, last_progressed)
                                 VALUES (?, ?)
                                 ON CONFLICT(username) DO UPDATE SET last_progressed = excluded.last_progressed`,
                                [player.username, lastProgressed.toISO()],
                            );
                        } else {
                            logger.warn(`Invalid date format for player: ${player.username}, Last Progress: ${player.lastChangedAt}`);
                        }
                    } else {
                        logger.info(`No progress data for player: ${player.username}`);
                    }
                }

                logger.info('Successfully fetched and processed player data.');
                return; // Success - exit function
            }

            throw new Error('Failed to fetch group details or memberships data.');
        } catch (error) {
            retryCount++;

            if (retryCount === maxRetries) {
                logger.error(`Failed to fetch data after ${maxRetries} attempts: ${error.message}`);
                throw error;
            }

            const delay = baseDelay * Math.pow(2, retryCount - 1);
            logger.warn(`Attempt ${retryCount}/${maxRetries} failed. Retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
}

/**
 * 🎯 **Updates the Discord Voice Channel Name Based on Active Members**
 *
 * Retrieves the current active member count (calculated from player progress data),
 * and updates the name of the designated Discord voice channel to display the number of active clan members.
 *
 * @async
 * @function updateVoiceChannel
 * @param {Discord.Client} client - The Discord client instance.
 * @returns {Promise<void>} Resolves when the voice channel name has been updated.
 *
 * @example
 * // Update the voice channel with the current active member count:
 * await updateVoiceChannel(client);
 */
async function updateVoiceChannel(client) {
    try {
        const guild = client.guilds.cache.get(process.env.GUILD_ID);
        if (guild) {
            const voiceChannel = guild.channels.cache.get(VOICE_CHANNEL_ID);
            if (voiceChannel) {
                // Update activity data before calculating the count.
                await updateActivityData(3, 5000);
                const emoji = '🟢';
                const count = await calculateProgressCount();
                const newChannelName = `${emoji}Active Clannies: ${count}`;

                await voiceChannel.setName(newChannelName);
                logger.info(`Voice channel name updated to ${newChannelName}`);
            } else {
                logger.error('Voice channel not found');
            }
        } else {
            logger.error('Guild not found');
        }
    } catch (error) {
        logger.error(`Error updating voice channel name: ${error.message}`);
    }
}

module.exports = {
    updateActivityData,
    calculateProgressCount,
    calculateInactivity,
    updateVoiceChannel,
};
