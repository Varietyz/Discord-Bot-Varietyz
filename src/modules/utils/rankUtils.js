// @ts-nocheck
/**
 * @fileoverview Utility functions for the Varietyz Bot.
 * Provides helper functions for normalizing RSNs, handling ranks, managing rate limits,
 * interacting with Discord channels, and making HTTP requests with retry logic.
 *
 * @module utils/rankUtils
 */

const { RANKS } = require('../../config/constants');

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
    return rank.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

module.exports = {
    getRankEmoji,
    getRankColor,
    formatExp,
    formatRank,
};
