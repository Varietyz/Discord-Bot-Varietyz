// utils/normalize.js

/**
 * Normalizes an RSN for consistent database storage/lookup.
 * - Trim leading/trailing spaces
 * - Lowercase everything
 * - Replace runs of '-' or '_' with a single space
 * 
 * @param {string} rsn - The RuneScape name to normalize.
 * @returns {string} - The normalized RSN.
 */
function standardizeName(rsn) {
  return rsn.trim().toLowerCase().replace(/[-_]+/g, " ");
}

module.exports = { standardizeName };
