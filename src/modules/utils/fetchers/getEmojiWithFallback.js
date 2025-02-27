// /modules/utils/fetchers/getEmojiWithFallback.js

const getEmoji = require('./getEmoji');

/**
 * Fetches a custom emoji or returns a fallback if not found.
 * @param {string} key - The key for the custom emoji.
 * @param {string} fallback - The fallback emoji to use if the custom emoji isn't found.
 * @returns {Promise<string>} - The emoji to use.
 */
async function getEmojiWithFallback(key, fallback) {
    const emoji = await getEmoji(key);
    return emoji || fallback;
}

module.exports = getEmojiWithFallback;

// EXAMPLE USAGES
//
// IMPORT:
// const getEmojiWithFallback = require('../../utils/helpers/getEmojiWithFallback');
//

// const exampleEmoji = await getEmojiWithFallback('emoji_throphy', '🏆');
