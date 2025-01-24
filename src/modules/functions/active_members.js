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
const logger = require('./logger');
const WOMApiClient = require('../../api/wise_old_man/apiClient');
const { VOICE_CHANNEL_ID } = require('../../config/constants');
/**
 * Object to store player progress data.
 * Keys are player names (RSNs), and values are Luxon DateTime objects representing the last progression date.
 *
 * @type {Object.<string, DateTime>}
 */
const playerProgress = {};

/**
 * Fetches player data from the WOM API and updates the `playerProgress` object.
 *
 * @async
 * @function updateVoiceData
 * @param {number} [maxRetries=3] - The maximum number of retry attempts in case of failure.
 * @param {number} [baseDelay=5000] - The base delay in milliseconds before retrying after a failure.
 * @returns {Promise<void>} - Resolves when data is successfully fetched and processed.
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
                groupDetails.memberships.forEach((membership) => {
                    const { player } = membership;
                    if (player?.lastChangedAt) {
                        const lastProgressed = DateTime.fromJSDate(player.lastChangedAt);
                        if (lastProgressed.isValid) {
                            playerProgress[player.username] = lastProgressed;
                        } else {
                            logger.warn(`Invalid date format for player: ${player.username}, Last Progress: ${player.lastChangedAt}`);
                        }
                    } else {
                        logger.info(`No progress data for player: ${player.username}`);
                    }
                });

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
 * Calculates the number of active players who have progressed in the last 7 days.
 *
 * @function calculateProgressCount
 * @returns {number} - The count of active players.
 * @example
 * const activeCount = calculateProgressCount();
 * logger.info(`Active Players: ${activeCount}`);
 */
function calculateProgressCount() {
    const currentTime = DateTime.now();
    const daysAgo = currentTime.minus({ days: 7 });
    return Object.entries(playerProgress).filter(([_, lastProgressed]) => lastProgressed >= daysAgo).length;
}

/**
 * Calculates the number of inactive players who have not progressed in the last 21 days.
 *
 * @function calculateInactivity
 * @returns {number} - The count of inactive players.
 * @example
 * const inactiveCount = calculateInactivity();
 * logger.info(`Inactive Players: ${inactiveCount}`);
 */
function calculateInactivity() {
    const currentTime = DateTime.now();
    const inactiveDaysAgo = currentTime.minus({ days: 21 });

    logger.info(`Calculating inactivity with threshold: ${inactiveDaysAgo.toISO()}`);

    return Object.entries(playerProgress).filter(([_, lastProgressed]) => lastProgressed < inactiveDaysAgo).length;
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
                const count = calculateProgressCount();
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
