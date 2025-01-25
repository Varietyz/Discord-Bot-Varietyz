// @ts-nocheck
/**
 * @fileoverview Utility functions for managing RuneScape clan ranks in the Varietyz Bot.
 * Provides tools for retrieving rank-specific details, formatting experience points, and normalizing rank strings.
 * These utilities enhance the presentation and handling of rank-related data in Discord interactions.
 *
 * Key Features:
 * - **Rank Emojis**: Retrieves emojis associated with specific ranks for better visualization.
 * - **Rank Colors**: Provides hexadecimal color codes for ranks, with a default fallback.
 * - **Experience Formatting**: Formats numerical experience points with commas for readability.
 * - **Rank String Normalization**: Converts rank identifiers to display-friendly formats.
 *
 * External Dependencies:
 * - `RANKS` object from the `../../config/constants` module, which defines rank metadata (e.g., emojis, colors).
 *
 * @module utils/rankUtils
 */

const { RANKS } = require('../../config/constants');

/**
 * Retrieves the emoji representation for a given rank.
 *
 * @function getRankEmoji
 * @param {string} rank - The rank of the clan member. Expected to be case-insensitive.
 * @returns {string} The corresponding rank emoji, or an empty string if no emoji is associated with the rank.
 * @example
 * // Example: Leader rank
 * const emoji = getRankEmoji('Leader');
 * console.log(emoji); // '👑'
 */
function getRankEmoji(rank) {
    const rankData = RANKS[rank.toLowerCase()];
    return rankData ? rankData.emoji : '';
}

/**
 * Retrieves the color associated with a given rank.
 *
 * @function getRankColor
 * @param {string} rank - The rank of the clan member. Expected to be case-insensitive.
 * @returns {number} The corresponding rank color in hexadecimal format (e.g., `0xff0000`),
 * or a default yellow color (`0xffff00`) if the rank is not found.
 * @example
 * // Example: Officer rank
 * const color = getRankColor('Officer');
 * console.log(color); // 0xff0000
 */
function getRankColor(rank) {
    const rankData = RANKS[rank.toLowerCase()];
    return rankData ? rankData.color : 0xffff00; // Default to yellow if rank not found
}

/**
 * Formats experience points by converting them to an integer and adding commas for readability.
 *
 * @function formatExp
 * @param {number|string} experience - The experience points to format. Can be a number or a string representation of a number.
 * @returns {string} The formatted experience points with commas.
 * @throws {TypeError} If the input cannot be parsed as a number.
 * @example
 * // Example: Formatting experience
 * const formattedExp = formatExp(1234567);
 * console.log(formattedExp); // '1,234,567'
 */
function formatExp(experience) {
    // @ts-ignore
    return Number.parseInt(experience).toLocaleString();
}

/**
 * Formats a rank string by replacing underscores with spaces and capitalizing each word.
 *
 * This function is useful for normalizing rank strings from storage formats to display formats.
 *
 * @function formatRank
 * @param {string} rank - The rank string to format. For example, 'clan_leader' will be formatted as 'Clan Leader'.
 * @returns {string} The formatted rank string with spaces and proper capitalization.
 * @example
 * // Example: Formatting a rank string
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
