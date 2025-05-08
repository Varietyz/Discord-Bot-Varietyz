const db = require('../essentials/dbUtils');
const logger = require('../essentials/logger');

const emojiCache = {};

async function getEmoji(emojiKey) {

    if (emojiCache[emojiKey]) {
        return emojiCache[emojiKey];
    }

    try {

        const rows = await db.guild.getAll(
            'SELECT emoji_format FROM guild_emojis WHERE emoji_key = ?',
            [emojiKey]
        );
        const emoji = rows.length > 0 ? rows[0].emoji_format : '';

        emojiCache[emojiKey] = emoji;
        return emoji;
    } catch (err) {
        logger.error(`Failed to fetch emoji for key "${emojiKey}": ${err.message}`);
        return '';
    }
}

module.exports = getEmoji;
