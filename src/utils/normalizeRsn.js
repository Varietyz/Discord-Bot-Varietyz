/**
 * @fileoverview Utility functions for normalizing RuneScape names.
 * Provides functions to standardize RSNs for consistent database storage and lookup.
 *
 * @module utils/normalizeRsn
 */

/**
 * Normalizes a RuneScape Name (RSN) for consistent database storage and lookup.
 * The normalization process includes:
 * - Replacing consecutive '-' or '_' with a single space.
 * - Replacing multiple spaces with a single space.
 * - Trimming leading and trailing spaces.
 * - Converting all characters to lowercase.
 *
 * @param {string} rsn - The RuneScape name to normalize.
 * @returns {string} - The normalized RSN.
 * @example
 * // returns 'john doe'
 * normalizeRsn('  John_Doe-- ');
 */
function normalizeRsn(rsn) {
    return rsn.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

module.exports = { normalizeRsn };
