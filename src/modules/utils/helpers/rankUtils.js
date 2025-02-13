/**
 * @fileoverview
 * **RuneScape Clan Rank Utilities** 🎖️
 *
 * This module provides utility functions for managing RuneScape clan ranks in the Varietyz Bot.
 * It dynamically retrieves rank-specific details such as emojis and colors from the database.
 *
 * **Key Features:**
 * - **Dynamic Rank Emojis**: Fetches emojis from the database instead of hardcoded values.
 * - **Dynamic Rank Colors**: Loads colors from the database for accurate role assignments.
 * - **Experience Formatting**: Formats numerical experience points with commas for readability.
 * - **Rank String Normalization**: Converts rank identifiers to display-friendly formats.
 *
 * **External Dependencies:**
 * - `getRanks()` from `fetchRankEmojis.js` to dynamically retrieve rank metadata.
 *
 * @module utils/rankUtils
 */

const { getRanks } = require('../fetchers/fetchRankEmojis');
const logger = require('../essentials/logger');

let rankDataCache = null;

/**
 * 🎯 **Fetches and Caches Rank Data**
 *
 * Ensures ranks are loaded once into memory to avoid multiple DB queries.
 *
 * @async
 * @function loadRanks
 */
async function loadRanks() {
    if (!rankDataCache) {
        rankDataCache = await getRanks();
        logger.info('✅ Rank data cached successfully.');
    }
}

/**
 * 🎯 **Retrieves the Emoji for a Given Rank**
 *
 * Returns the emoji associated with the provided rank. Uses a cached version for efficiency.
 *
 * @async
 * @function getRankEmoji
 * @param {string} rank - The clan member's rank.
 * @returns {Promise<string>} The corresponding rank emoji, or `❌` if not found.
 *
 * @example
 * const emoji = await getRankEmoji('Leader');
 * console.log(emoji); // e.g., '<:Clan_icon__Owner:1223270860152901816>'
 */
async function getRankEmoji(rank) {
    await loadRanks();
    const safeRank = String(rank).toLowerCase();
    logger.debug(`getRankEmoji: Looking up key "${safeRank}" from available keys: ${Object.keys(rankDataCache).join(', ')}`);
    return rankDataCache?.[safeRank]?.emoji || '❌';
}

/**
 * 🎯 **Retrieves the Color for a Given Rank**
 *
 * Returns the hexadecimal color code associated with the provided rank.
 *
 * @async
 * @function getRankColor
 * @param {string} rank - The clan member's rank.
 * @returns {Promise<number>} The rank color in hexadecimal format (e.g., `0xff0000`), or `0xffff00` as a default.
 *
 * @example
 * const color = await getRankColor('Officer');
 * console.log(color); // e.g., 0xff0000
 */
async function getRankColor(rank) {
    await loadRanks();
    const safeRank = String(rank).toLowerCase();
    return rankDataCache?.[safeRank]?.color || 0xffff00; // Default to yellow if not found
}

/**
 * 🎯 **Formats Experience Points**
 *
 * Converts the provided experience value to an integer and formats it with commas
 * to improve readability.
 *
 * @function formatExp
 * @param {number|string} experience - The experience points to format.
 * @returns {string} The formatted experience with commas, or "0" if invalid.
 *
 * @throws {TypeError} If the input is neither a number nor a valid numeric string.
 *
 * @example
 * const formattedExp = formatExp(1234567);
 * console.log(formattedExp); // '1,234,567'
 */
function formatExp(experience) {
    // Convert to number safely
    const numericValue = typeof experience === 'number' ? experience : Number.parseInt(experience, 10);

    // Ensure it's a valid number
    if (isNaN(numericValue)) {
        return '0'; // Return default if invalid input
    }

    return numericValue.toLocaleString();
}

/**
 * 🎯 **Formats a Rank String for Display**
 *
 * Normalizes a rank string by replacing underscores with spaces and capitalizing each word.
 *
 * @function formatRank
 * @param {string} rank - The rank string to format.
 * @returns {string} The formatted rank string.
 *
 * @example
 * const formattedRank = formatRank('clan_leader');
 * console.log(formattedRank); // 'Clan Leader'
 */
function formatRank(rank) {
    return rank.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

module.exports = {
    getRankEmoji,
    getRankColor,
    formatExp,
    formatRank,
};
