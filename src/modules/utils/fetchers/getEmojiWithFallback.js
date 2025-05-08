const getEmoji = require('./getEmoji');

async function getEmojiWithFallback(key, fallback) {
    const emoji = await getEmoji(key);

    if (emoji) return emoji;

    return fallback !== undefined ? fallback : '❌';
}

module.exports = getEmojiWithFallback;
