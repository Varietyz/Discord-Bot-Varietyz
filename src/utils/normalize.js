/**
 * @fileoverview Utility functions for normalizing RuneScape names.
 * Provides functions to standardize RSNs for consistent database storage and lookup.
 *
 * @module utils/normalize
 */

/**
 * Normalizes a RuneScape Name (RSN) for consistent database storage and lookup.
 * The normalization process includes:
 * - Trimming leading and trailing spaces.
 * - Converting all characters to lowercase.
 * - Replacing runs of '-' or '_' with a single space.
 *
 * @param {string} rsn - The RuneScape name to normalize.
 * @returns {string} - The normalized RSN.
 * @example
 * // returns 'john doe'
 * standardizeName('  John_Doe-- ');
 */
function standardizeName(rsn) {
    return rsn.trim().toLowerCase().replace(/[-_]+/g, ' ');
}

module.exports = { standardizeName };
