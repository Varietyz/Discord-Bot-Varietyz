const logger = require('../essentials/logger');
const db = require('../essentials/dbUtils');

/**
 *
 * @param guild
 * @param metric
 * @param competitionType
 * @returns
 */
async function getMetricEmoji(guild, metric, competitionType) {
    try {
        const normalizedMetric = metric.toLowerCase().replace(/\s+/g, '_');

        // **🔍 1. Fetch emoji from database**
        let foundEmoji;
        try {
            foundEmoji = await db.guild.getOne('SELECT emoji_format FROM guild_emojis WHERE emoji_key = ?', [`emoji_${normalizedMetric}`]);
        } catch (dbError) {
            logger.warn(`⚠️ **DB Error:** Failed to fetch emoji for \`${metric}\` - ${dbError.message}`);
        }

        if (foundEmoji) {
            logger.info(`✅ Using stored emoji for \`${metric}\`: ${foundEmoji.emoji_format}`);
            return foundEmoji.emoji_format;
        }

        // **🔍 2. Try fetching from Discord cache**
        if (!guild) {
            logger.warn(`⚠️ **Warning:** Guild is undefined; cannot fetch emoji for \`${metric}\`.`);
            return competitionType === 'SOTW' ? `${await db.guild.getOne('SELECT emoji_format FROM guild_emojis WHERE emoji_key = ?', ['emoji_overall'])}` : '⚔️'; // Default BOTW emoji
        }

        let emojiFromCache = guild.emojis.cache.find((e) => e.name.toLowerCase() === normalizedMetric);

        if (!emojiFromCache) {
            // **Fetch latest from API**
            try {
                const emojis = await guild.emojis.fetch();
                emojiFromCache = emojis?.find((e) => e.name.toLowerCase() === normalizedMetric);
            } catch (fetchError) {
                logger.warn(`⚠️ **Discord API Error:** Could not fetch emojis - ${fetchError.message}`);
            }
        }

        if (emojiFromCache && emojiFromCache.available) {
            logger.info(`✅ Using Discord emoji for \`${metric}\`: ${emojiFromCache.toString()}`);
            return emojiFromCache.toString();
        }

        // **🔍 3. Final Fallbacks**
        logger.warn(`⚠️ **Warning:** No emoji found for \`${metric}\`. Using fallback.`);
        return competitionType === 'SOTW' ? `${await db.guild.getOne('SELECT emoji_format FROM guild_emojis WHERE emoji_key = ?', ['emoji_overall'])}` : '⚔️'; // Default for BOTW
    } catch (error) {
        logger.error(`🚫 **Error in getMetricEmoji:** ${error.message}`);
        return '⚠️'; // Emergency fallback emoji
    }
}

module.exports = { getMetricEmoji };
