// @ts-nocheck
/**
 * @fileoverview Utility functions for managing active and inactive clan members within the Varietyz Bot.
 * This module handles fetching player data from the WOM API, processing player activity,
 * calculating active and inactive member counts, and updating Discord voice channel names
 * based on member activity.
 *
 * @module modules/functions/active_members
 */

const axios = require('axios');
const { DateTime } = require('luxon');
const logger = require('./logger');
const { sleep } = require('../utils');
const { VOICE_CHANNEL_ID, WOM_API_URL, WOM_GROUP_ID } = require('../../config/constants');

/**
 * Object to store player progress data.
 * Keys are player names (RSNs), and values are Luxon DateTime objects representing the last progression date.
 *
 * @type {Object.<string, DateTime>}
 */
const playerProgress = {}; // Object to store player progress data

/**
 * Fetches player data from the WOM API and updates the `playerProgress` object.
 * Implements retry logic with exponential backoff in case of failures or rate limiting.
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

    while (retryCount < maxRetries) {
        try {
            const response = await axios.get(`${WOM_API_URL}/groups/${WOM_GROUP_ID}/csv`);

            if (response.status === 200) {
                const rows = response.data.split('\n');
                rows.shift(); // Skip the header row

                rows.forEach((row, index) => {
                    if (!row || row.trim() === '') {
                        logger.warn(`Skipping empty or invalid row at index ${index + 1}`);
                        return;
                    }

                    const [player, , , lastProgressedStr] = row.split(',');

                    if (lastProgressedStr) {
                        const lastProgressed = DateTime.fromFormat(lastProgressedStr, 'M/d/yyyy HH:mm:ss');

                        if (lastProgressed.isValid) {
                            playerProgress[player] = lastProgressed;
                        } else {
                            logger.warn(`Invalid date format for player: ${player}, Last Progress: ${lastProgressedStr}`);
                        }
                    } else {
                        logger.info(`No progress data for player: ${player}`);
                    }
                });

                logger.info('Successfully fetched and processed player data.');
                return; // Success - exit function
            }

            throw new Error(`API returned status code: ${response.status}`);
        } catch (error) {
            retryCount++;

            if (error.response?.status === 429) {
                const retryAfter = error.response.headers['retry-after'] || baseDelay / 1000;
                logger.warn(`Rate limited. Attempt ${retryCount}/${maxRetries}. Waiting ${retryAfter}s...`);
                await sleep(retryAfter * 1000);
                continue;
            }

            if (retryCount === maxRetries) {
                logger.error(`Failed to fetch data after ${maxRetries} attempts: ${error.message}`);
                throw error;
            }

            const delay = baseDelay * Math.pow(2, retryCount - 1);
            logger.warn(`Attempt ${retryCount}/${maxRetries} failed. Retrying in ${delay}ms...`);
            await sleep(delay);
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
    // eslint-disable-next-line no-unused-vars
    const count = Object.entries(playerProgress).filter(([player, lastProgressed]) => {
        const isActive = lastProgressed >= daysAgo;
        return isActive;
    }).length;
    return count;
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

    // eslint-disable-next-line no-unused-vars
    const countInactive = Object.entries(playerProgress).filter(([player, lastProgressed]) => {
        const isInactive = lastProgressed < inactiveDaysAgo;
        return isInactive;
    }).length;

    logger.info(`Inactive players count: ${countInactive}, Current time: ${currentTime.toISO()}, Threshold date: ${inactiveDaysAgo.toISO()}`);
    return countInactive;
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
