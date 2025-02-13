/**
 * @fileoverview
 * **RSN Validator Utilities** 🔍
 *
 * This module provides utility functions for validating RuneScape names (RSNs) to ensure they meet specific format criteria.
 * This helps guarantee that RSNs are stored consistently in the database and can be reliably looked up.
 *
 * **Key Features:**
 * - **Format Validation**: Ensures RSNs are between 1 and 12 characters long and contain only letters, numbers, and single spaces (no hyphens or underscores).
 * - **Forbidden Phrase Detection**: Rejects RSNs containing prohibited phrases like `Java`, `Mod`, or `Jagex`.
 * - **Feedback Messages**: Returns detailed validation messages indicating any issues with the RSN.
 *
 * @module utils/validateRsn
 */

/**
 * Validates the format of a RuneScape Name (RSN).
 *
 * This function checks that the RSN:
 * - Is a string.
 * - Has a length between 1 and 12 characters after trimming.
 * - Contains only letters, numbers, and single spaces between words (hyphens and underscores are not allowed).
 * - Does not contain forbidden phrases like `Java`, `Mod`, or `Jagex`.
 *
 * @function validateRsn
 * @param {string} rsn - The RSN to validate.
 * @returns {Object} An object containing:
 * - {boolean} valid - Indicates whether the RSN is valid.
 * - {string} message - Provides feedback on the validation result (empty if valid).
 *
 * @example
 * const validation = validateRsn('PlayerOne');
 * // Expected output: { valid: true, message: '' }
 *
 * const invalid = validateRsn('Player_One');
 * // Expected output: { valid: false, message: '❌ **Invalid Format:** RSN can only contain letters, numbers, and single spaces between words. (Replace hyphens/underscores with spaces.)' }
 */
const validateRsn = (rsn) => {
    if (typeof rsn !== 'string') {
        return {
            valid: false,
            message: '❌ **Invalid RSN:** RSN must be a string.',
        };
    }

    const trimmedRsn = rsn.trim();

    if (trimmedRsn.length < 1 || trimmedRsn.length > 12) {
        return {
            valid: false,
            message: '❌ **Invalid Length:** RSN must be between 1 and 12 characters long.',
        };
    }

    if (!/^[a-zA-Z0-9]+(?: [a-zA-Z0-9]+)*$/.test(trimmedRsn)) {
        return {
            valid: false,
            message: '❌ **Invalid Format:** RSN can only contain letters, numbers, and single spaces between words. (Replace hyphens/underscores with spaces.)',
        };
    }

    const forbiddenPhrases = ['Java', 'Mod', 'Jagex'];
    if (forbiddenPhrases.some((phrase) => trimmedRsn.toLowerCase().includes(phrase.toLowerCase()))) {
        return {
            valid: false,
            message: '❌ **Forbidden Phrase Detected:** RSN cannot contain phrases like `Java`, `Mod`, or `Jagex`.',
        };
    }

    return { valid: true, message: '' };
};

module.exports = { validateRsn };
