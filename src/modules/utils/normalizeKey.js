/**
 * Normalizes names for database storage.
 * - Replaces `-` with `_`
 * - Removes leading/trailing `_`
 * - Converts to lowercase
 * @param {string} name - The name of the item
 * @param {string} type - The type of the item (role, channel, etc.)
 * @param {Set} existingKeys - A set to track duplicates
 * @returns {string} - The normalized key
 */
function normalizeKey(name, type, existingKeys) {
    const prepBaseKey = `${name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/gi, '') // Remove special characters & emojis, keep dashes
        .replace(/-/g, '_') // Replace dashes with underscores
        .replace(/\s+/g, '_')}` // Convert spaces to underscores
        .replace(/^_+|_+$/g, ''); // Remove leading and trailing underscores

    const baseKey = `${type}_${prepBaseKey}`;

    let newKey = baseKey;
    let index = 1;

    // If key already exists, append index to make it unique
    while (existingKeys.has(newKey)) {
        newKey = `${baseKey}_${index}`;
        index++;
    }
    existingKeys.add(newKey);
    return newKey;
}

module.exports = { normalizeKey };
