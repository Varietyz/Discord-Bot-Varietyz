/**
 * @fileoverview Utility functions for validating RuneScape names (RSNs).
 * Ensures RSNs meet specific format criteria for consistent database storage and lookup.
 *
 * Key Features:
 * - **Format Validation**: Checks if RSNs are between 1 and 12 characters long, contain only letters, numbers, and single spaces, and exclude forbidden characters like hyphens or underscores.
 * - **Forbidden Phrase Detection**: Prevents RSNs containing phrases such as "Java", "Mod", or "Jagex".
 * - **Feedback Messages**: Provides clear validation messages for invalid RSNs.
 *
 * External Dependencies:
 * - None.
 *
 * @module utils/validateRsn
 */

/**
 * Validates the format of an RSN (RuneScape Name).
 *
 * @function validateRsn
 * @param {string} rsn - RSN to validate.
 * @returns {Object} - An object containing validation result and message.
 * @property {boolean} valid - Indicates whether the RSN is valid.
 * @property {string} message - Provides feedback on the validation result.
 * @example
 * const validation = validateRsn('PlayerOne');
 * logger.info(validation); // { valid: true, message: '' }
 */
const validateRsn = (rsn) => {
    if (typeof rsn !== 'string') {
        return {
            valid: false,
            message: 'RSN must be a string.',
        };
    }

    const trimmedRsn = rsn.trim();

    if (trimmedRsn.length < 1 || trimmedRsn.length > 12) {
        return {
            valid: false,
            message: 'RSN must be between 1 and 12 characters long.',
        };
    }

    // Allow letters, numbers, and single spaces between words
    // Disallow hyphens and underscores
    if (!/^[a-zA-Z0-9]+(?: [a-zA-Z0-9]+)*$/.test(trimmedRsn)) {
        return {
            valid: false,
            message: 'RSN can only contain letters, numbers, and single spaces between words. (If your RSN includes a hyphen or underscore, replace it with a space)',
        };
    }

    const forbiddenPhrases = ['Java', 'Mod', 'Jagex'];
    if (forbiddenPhrases.some((phrase) => trimmedRsn.toLowerCase().includes(phrase.toLowerCase()))) {
        return {
            valid: false,
            message: 'RSN cannot contain forbidden phrases like "Java", "Mod", or "Jagex".',
        };
    }

    return { valid: true, message: '' };
};

module.exports = { validateRsn };
