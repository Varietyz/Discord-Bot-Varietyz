// @ts-nocheck
/**
 * @fileoverview Utility functions for the Varietyz Bot.
 * Provides helper functions for normalizing RSNs, handling ranks, managing rate limits,
 * interacting with Discord channels, and making HTTP requests with retry logic.
 *
 * @module modules/utils
 */

const { RANKS } = require('../config/constants');
const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Normalizes a RuneScape Name (RSN) for consistent comparison.
 * Removes spaces, converts to lowercase.
 *
 * @param {string} rsn - RSN string to normalize.
 * @returns {string} Normalized RSN.
 * @example
 * // returns 'johndoe'
 * normalizeRSN('John Doe');
 */
function normalizeRSN(rsn) {
    return rsn.replace(' ', '').toLowerCase();
}

/**
 * Retrieves the emoji representation for a given rank.
 *
 * @param {string} rank - The rank of the clan member.
 * @returns {string} Corresponding rank emoji, or an empty string if not found.
 * @example
 * // returns '👑'
 * getRankEmoji('Leader');
 */
function getRankEmoji(rank) {
    const rankData = RANKS[rank.toLowerCase()];
    return rankData ? rankData.emoji : '';
}

/**
 * Retrieves the color associated with a given rank.
 *
 * @param {string} rank - The rank of the clan member.
 * @returns {number} Corresponding rank color in hexadecimal, or yellow (`0xffff00`) if not found.
 * @example
 * // returns 0xff0000
 * getRankColor('Officer');
 */
function getRankColor(rank) {
    const rankData = RANKS[rank.toLowerCase()];
    return rankData ? rankData.color : 0xffff00; // Default to yellow if rank not found
}

/**
 * Deletes all messages in a specified Discord channel.
 * Fetches and deletes messages in batches to handle large volumes.
 *
 * @param {Discord.TextChannel} channel - The Discord channel to purge.
 * @returns {Promise<void>}
 * @example
 * // Purge messages in the specified channel
 * purgeChannel(channel);
 */
async function purgeChannel(channel) {
    let messagesToDelete = [];
    try {
        // Fetch up to 100 messages at a time
        do {
            const fetchedMessages = await channel.messages.fetch({
                limit: 100
            });
            if (fetchedMessages.size === 0) {
                break;
            }
            messagesToDelete = fetchedMessages;
            await channel.bulkDelete(messagesToDelete, true); // Bulk delete the fetched messages
            logger.info(`[Util] Deleted ${messagesToDelete.size} messages.`);

            // Adding a delay between deletions to avoid hitting rate limits
            await sleep(1000);
        } while (messagesToDelete.size > 0); // Repeat until no more messages left
    } catch (error) {
        logger.error(`[Util] Error deleting messages: ${error}`);
        await sleep(2000); // Delay on error to avoid hitting rate limits
    }
}

/**
 * Formats experience points by converting them to an integer and adding commas.
 *
 * @param {number|string} experience - The experience points to format.
 * @returns {string} Formatted experience points with commas.
 * @example
 * // returns '1,234,567'
 * formatExp(1234567);
 */
function formatExp(experience) {
    // @ts-ignore
    return Number.parseInt(experience).toLocaleString();
}

/**
 * Formats a rank string by replacing underscores with spaces and capitalizing each word.
 *
 * @param {string} rank - The rank string to format.
 * @returns {string} Formatted rank string.
 * @example
 * // returns 'Clan Leader'
 * formatRank('clan_leader');
 */
function formatRank(rank) {
    return rank
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Pauses execution for a specified number of milliseconds.
 *
 * @param {number} ms - Milliseconds to sleep.
 * @returns {Promise<void>}
 * @example
 * // Sleeps for 2 seconds
 * await sleep(2000);
 */
async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Makes an HTTP GET request with retry logic in case of failures.
 * Handles rate limiting and not-found errors specifically.
 *
 * @param {string} url - The URL to fetch.
 * @param {Object} headers - HTTP headers to include in the request.
 * @param {number} [retries=10] - Number of retry attempts.
 * @param {number} [delay=10000] - Delay between retries in milliseconds.
 * @returns {Promise<Object>} - The response data.
 * @throws {Error} - Throws an error if all retries fail or if a 404 error occurs.
 * @example
 * // Fetch data with retries
 * const data = await fetchWithRetry('https://api.example.com/data', { Authorization: 'Bearer token' });
 */
async function fetchWithRetry(url, headers, retries = 10, delay = 10000) {
    let attempt = 0;
    while (attempt < retries) {
        try {
            const response = await axios.get(url, { headers });
            return response.data;
        } catch (error) {
            if (error.response?.status === 429) {
                const retryAfter =
                    error.response.headers['retry-after'] || delay / 1000;
                logger.warn(
                    `Rate-limited. Retrying in ${retryAfter} seconds...`
                );
                await sleep(retryAfter * 1000);
            } else if (error.response?.status === 404) {
                logger.error(`Player not found (404) for URL: ${url}`);
                throw new Error('404: Player not found');
            } else {
                logger.error(
                    `Request failed for URL: ${url} - ${error.message}`
                );
                throw error;
            }
        }
        attempt++;
    }
    logger.error(`Max retries reached for URL: ${url}`);
    throw new Error('Max retries reached');
}

module.exports = {
    normalizeRSN,
    getRankEmoji,
    getRankColor,
    purgeChannel,
    formatExp,
    formatRank,
    sleep,
    fetchWithRetry
};
