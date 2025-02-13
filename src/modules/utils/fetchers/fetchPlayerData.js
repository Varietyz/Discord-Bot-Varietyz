/**
 * @fileoverview
 * **Player Data Fetcher** 🔍
 *
 * This module provides a function to retrieve player data for a specified RuneScape Name (RSN) from the Wise Old Man (WOM) API.
 * It handles common error scenarios such as non-existent players (404), rate limiting (429), and unexpected issues.
 *
 * **Key Features:**
 * - **Player Data Retrieval:** Fetches player data from the WOM API for a given RSN.
 * - **Error Handling:** Manages common API errors including 404 (player not found) and 429 (rate limiting).
 * - **Rate Limiting:** Throws an error if the WOM API returns a rate limit response.
 *
 * **External Dependencies:**
 * - **axios:** For making HTTP requests to the WOM API.
 * - **logger:** For logging warnings and errors during the fetch process.
 *
 * @module utils/fetchPlayerData
 */

const logger = require('../essentials/logger');
const axios = require('axios');

/**
 * 🎯 **Fetches Player Data from the Wise Old Man API**
 *
 * Retrieves data for a given RuneScape Name (RSN) from the Wise Old Man API.
 * Handles common scenarios including:
 * - 404 errors when the player is not found.
 * - 429 errors for rate limiting.
 * - Unexpected errors that may occur during the request.
 *
 * @async
 * @function fetchPlayerData
 * @param {string} rsn - The RuneScape Name (RSN) to fetch data for.
 * @returns {Promise<Object|null>} A promise that resolves to the player data as an object,
 * or `null` if the player is not found.
 *
 * @throws {Error} Throws an error if the WOM API rate limits the request or an unexpected error occurs.
 *
 * @example
 * // Example usage:
 * const playerData = await fetchPlayerData('PlayerOne');
 * if (playerData) {
 *     logger.info(playerData);
 * }
 */
async function fetchPlayerData(rsn) {
    const url = `https://api.wiseoldman.net/v2/players/${encodeURIComponent(rsn)}`;

    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            logger.warn(`❌ **Not Found:** RSN \`${rsn}\` was not found on Wise Old Man.`);
            return null;
        } else if (error.response && error.response.status === 429) {
            logger.warn('⚠️ **Rate Limit:** You have been rate limited by the WOM API. Please try again later.');
            throw new Error('Rate limited by WOM API.');
        } else {
            logger.error(`🚨 **Unexpected Error:** Error fetching RSN \`${rsn}\`: ${error.message}`);
            throw error;
        }
    }
}

module.exports = { fetchPlayerData };
