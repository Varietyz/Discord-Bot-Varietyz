const logger = require('./logger');
const axios = require('axios');

/**
 * Fetches player data from the Wise Old Man (WOM) API.
 *
 * @async
 * @function fetchPlayerData
 * @param {string} rsn - The RSN to fetch data for.
 * @returns {Promise<Object|null>} - Player data from WOM API or `null` if unavailable.
 * @throws {Error} - Throws an error if rate limited or an unexpected error occurs.
 * @example
 * const playerData = await fetchPlayerData('PlayerOne');
 * if (playerData) {
 * logger.info(playerData);
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
