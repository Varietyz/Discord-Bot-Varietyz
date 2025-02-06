/**
 * @fileoverview
 * **RuneScape Clan Rank Utilities** 🎖️
 *
 * This module provides utility functions for managing RuneScape clan ranks in the Varietyz Bot.
 * It offers tools for retrieving rank-specific details (such as emojis and colors), formatting experience
 * points, and normalizing rank strings. These utilities enhance the presentation and handling of rank-related
 * data in Discord interactions.
 *
 * **Key Features:**
 * - **Rank Emojis**: Retrieves emojis associated with specific ranks.
 * - **Rank Colors**: Provides hexadecimal color codes for ranks, with a default fallback.
 * - **Experience Formatting**: Formats numerical experience points with commas for readability.
 * - **Rank String Normalization**: Converts rank identifiers to display-friendly formats.
 *
 * **External Dependencies:**
 * - The `RANKS` object from the `../../config/constants` module, which defines rank metadata (e.g., emojis, colors).
 *
 * @module utils/rankUtils
 */

const { RANKS } = require('../../config/constants');

/**
 * 🎯 **Retrieves the Emoji for a Given Rank**
 *
 * Returns the emoji associated with the provided rank. The lookup is case-insensitive.
 *
 * @function getRankEmoji
 * @param {string} rank - The clan member's rank.
 * @returns {string} The corresponding rank emoji, or an empty string if no emoji is defined.
 *
 * @example
 * const emoji = getRankEmoji('Leader');
 * console.log(emoji); // e.g., '👑'
 */
function getRankEmoji(rank) {
    const rankData = RANKS[rank.toLowerCase()];
    return rankData ? rankData.emoji : '';
}

/**
 * 🎯 **Retrieves the Color for a Given Rank**
 *
 * Returns the hexadecimal color code associated with the provided rank. The lookup is case-insensitive.
 * If the rank is not found, it returns a default yellow color.
 *
 * @function getRankColor
 * @param {string} rank - The clan member's rank.
 * @returns {number} The rank color in hexadecimal format (e.g., 0xff0000), or 0xffff00 as a default.
 *
 * @example
 * const color = getRankColor('Officer');
 * console.log(color); // e.g., 0xff0000
 */
function getRankColor(rank) {
    const rankData = RANKS[rank.toLowerCase()];
    return rankData ? rankData.color : 0xffff00;
}

/**
 * 🎯 **Formats Experience Points**
 *
 * Converts the provided experience value to an integer and formats it with commas
 * to improve readability.
 *
 * @function formatExp
 * @param {number|string} experience - The experience points to format.
 * @returns {string} The formatted experience with commas.
 *
 * @throws {TypeError} If the input cannot be parsed as a number.
 *
 * @example
 * const formattedExp = formatExp(1234567);
 * console.log(formattedExp); // '1,234,567'
 */
function formatExp(experience) {
    // @ts-ignore
    return Number.parseInt(experience).toLocaleString();
}

/**
 * 🎯 **Formats a Rank String for Display**
 *
 * Normalizes a rank string by replacing underscores with spaces and capitalizing each word.
 * This function converts storage format (e.g., "clan_leader") into a display-friendly format (e.g., "Clan Leader").
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
