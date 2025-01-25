/**
 * @fileoverview Utility function for fetching player data from the Wise Old Man (WOM) API.
 * This module provides a function to retrieve player data for a specified RuneScape Name (RSN),
 * handling potential errors such as non-existent players, rate limiting, and unexpected issues.
 *
 * Key Features:
 * - **Player Data Retrieval**: Fetches player data from the WOM API for a given RSN.
 * - **Error Handling**: Manages common API errors including 404 (player not found) and 429 (rate limiting).
 * - **Rate Limiting**: Throws an error if the WOM API returns a rate limit response.
 *
 * External Dependencies:
 * - **axios**: For making HTTP requests to the WOM API.
 * - **logger**: For logging warnings and errors during the fetch process.
 *
 * @module utils/fetchPlayerData
 */

const logger = require('./logger');
const axios = require('axios');

/**
 * Fetches player data from the Wise Old Man (WOM) API.
 *
 * This function retrieves data for a given RuneScape Name (RSN) from the Wise Old Man API.
 * Handles common scenarios such as non-existent players, rate limiting, and unexpected errors.
 *
 * @async
 * @function fetchPlayerData
 * @param {string} rsn - The RuneScape Name (RSN) to fetch data for.
 * @returns {Promise<Object|null>} Player data from the WOM API as an object, or `null` if the player is not found.
 * @throws {Error} Throws an error if rate limited or an unexpected issue occurs.
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
            logger.warn(`[fetchPlayerData] RSN '${rsn}' not found on Wise Old Man.`);
            return null; // Handle 404 errors gracefully
        } else if (error.response && error.response.status === 429) {
            logger.warn('[fetchPlayerData] Rate limited by WOM API. Please try again later.');
            throw new Error('Rate limited by WOM API.');
        } else {
            logger.error(`[fetchPlayerData] Unexpected error fetching RSN '${rsn}': ${error.message}`);
            throw error; // Rethrow unexpected errors
        }
    }
}

module.exports = { fetchPlayerData };
