/* eslint-disable no-unused-vars */
// @ts-nocheck
/**
 * @fileoverview Utility functions for managing active and inactive clan members within the Varietyz Bot.
 * This module interacts with the WOM API to fetch player data, calculate member activity,
 * and update Discord voice channel names based on member activity.
 *
 * @module modules/functions/active_members
 */

const { DateTime } = require('luxon');
const logger = require('../../utils/logger');
const WOMApiClient = require('../../api/wise_old_man/apiClient');
const { VOICE_CHANNEL_ID } = require('../../config/constants');
const { getAll, runQuery } = require('../../utils/dbUtils');
const { calculateInactivity, calculateProgressCount, ensureActiveInactiveTable } = require('../../utils/calculateActivity');
/**
 * Object to store player progress data.
 * Keys are player names (RSNs), and values are Luxon DateTime objects representing the last progression date.
 *
 * @type {Object.<string, DateTime>}
 */
const playerProgress = {};

/**
 * Fetches player data from the WOM API and updates the 'active_inactive' database table.
 *
 * @async
 * @function updateVoiceData
 * @param {number} [maxRetries=3] - The maximum number of retry attempts in case of failure.
 * @param {number} [baseDelay=5000] - The base delay in milliseconds before retrying after a failure.
 * @returns {Promise<void>} Resolves when data is successfully fetched and processed.
 * @throws {Error} - Throws an error if all retry attempts fail.
 * @example
 * await updateVoiceData(5, 10000);
 */
async function updateVoiceData(maxRetries = 3, baseDelay = 5000) {
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
                            // Save to the database
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
 * Updates the Discord voice channel name to reflect the current number of active clan members.
 * It fetches and processes player data, calculates the active member count, and updates the channel name accordingly.
 *
 * @async
 * @function updateVoiceChannel
 * @param {Discord.Client} client - The Discord client instance.
 * @returns {Promise<void>} - Resolves when the voice channel name has been updated.
 * @example
 * await updateVoiceChannel(client);
 */
async function updateVoiceChannel(client) {
    try {
        const guild = client.guilds.cache.get(process.env.GUILD_ID);
        if (guild) {
            const voiceChannel = guild.channels.cache.get(VOICE_CHANNEL_ID);
            if (voiceChannel) {
                await updateVoiceData(3, 5000);
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
    updateVoiceData,
    calculateProgressCount,
    calculateInactivity,
    updateVoiceChannel,
};
