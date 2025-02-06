/**
 * @fileoverview
 * **RuneScape Name (RSN) Normalizer** 🔄
 *
 * This module provides a utility function for normalizing RuneScape names (RSNs).
 * It ensures that RSNs are stored in a consistent format for database operations and efficient lookups.
 *
 * **Key Features:**
 * - **RSN Normalization:** Converts RSNs to a standard format by removing unwanted characters, collapsing multiple spaces, and converting the entire string to lowercase.
 * - **Error Handling:** Validates that the input is a string, throwing an error if not.
 *
 * @module utils/normalizeRsn
 */

/**
 * Normalizes a RuneScape Name (RSN) for consistent database storage and lookup.
 *
 * The normalization process ensures RSNs are stored in a uniform format by:
 * - Replacing consecutive `-` or `_` characters with a single space.
 * - Collapsing multiple spaces into a single space.
 * - Trimming leading and trailing spaces.
 * - Converting all characters to lowercase.
 *
 * @function normalizeRsn
 * @param {string} rsn - The RuneScape name to normalize. Must be a non-empty string.
 * @returns {string} The normalized RSN in lowercase with standardized spacing.
 * @throws {TypeError} If the provided `rsn` is not a string.
 *
 * @example
 * // Example of normalizing an RSN:
 * const normalized = normalizeRsn('  John_Doe-- ');
 * console.log(normalized); // 'john doe'
 */
function normalizeRsn(rsn) {
    if (typeof rsn !== 'string') {
        throw new TypeError('🚨 **Invalid Input:** The RSN must be a string.');
    }
    return rsn.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

module.exports = { normalizeRsn };
