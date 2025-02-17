const logger = require('../essentials/logger');
const db = require('../essentials/dbUtils');

/**
 * Fetches an emoji for a given metric.
 *
 * Depending on the competition type:
 * - If competitionType is 'SOTW', the fallback emoji is the one stored as 'emoji_overall'.
 * - Otherwise (i.e. BOTW), the fallback emoji is the one stored as 'emoji_slayer'.
 *
 * @param guild - The Discord guild (server) object.
 * @param {string} metric - The metric for which to fetch the emoji.
 * @param {string} competitionType - The type of competition (e.g., 'SOTW' or BOTW).
 * @returns {Promise<string>} - The emoji string.
 */
async function getMetricEmoji(guild, metric, competitionType) {
    try {
        // Normalize the metric name to match the stored emoji key format.
        const normalizedMetric = metric.toLowerCase().replace(/\s+/g, '_');
        logger.debug(`Normalized metric: ${normalizedMetric}`);

        // **🔍 1. Attempt to fetch the emoji from the database**
        let foundEmoji;
        try {
            foundEmoji = await db.guild.getOne('SELECT emoji_format FROM guild_emojis WHERE emoji_key = ?', [`emoji_${normalizedMetric}`]);
        } catch (dbError) {
            logger.warn(`⚠️ **DB Error:** Failed to fetch emoji for \`${metric}\` - ${dbError.message}`);
        }

        if (foundEmoji && foundEmoji.emoji_format) {
            logger.info(`✅ Using stored emoji for \`${metric}\`: ${foundEmoji.emoji_format}`);
            return foundEmoji.emoji_format;
        }

        // Determine the fallback key based on the competition type.
        const fallbackKey = competitionType === 'SOTW' ? 'emoji_overall' : 'emoji_slayer';
        logger.debug(`Using fallback key: ${fallbackKey}`);

        // **🔍 2. Try fetching from Discord's emoji cache**
        if (!guild) {
            logger.warn(`⚠️ **Warning:** Guild is undefined; cannot fetch emoji for \`${metric}\`.`);
            const fallbackFromDb = await db.guild.getOne('SELECT emoji_format FROM guild_emojis WHERE emoji_key = ?', [fallbackKey]);
            if (fallbackFromDb && fallbackFromDb.emoji_format) {
                return fallbackFromDb.emoji_format;
            }
            // If the DB does not have a fallback emoji, return a literal default.
            return '⚠️';
        }

        // Attempt to find the emoji in the guild's cached emojis.
        let emojiFromCache = guild.emojis.cache.find((e) => e.name.toLowerCase() === normalizedMetric);

        if (!emojiFromCache) {
            // **Fetch the latest emojis from the API if not found in cache**
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
        const finalFallback = await db.guild.getOne('SELECT emoji_format FROM guild_emojis WHERE emoji_key = ?', [fallbackKey]);
        if (finalFallback && finalFallback.emoji_format) {
            return finalFallback.emoji_format;
        }
        // If all else fails, return an emergency fallback emoji.
        return '⚠️';
    } catch (error) {
        logger.error(`🚫 **Error in getMetricEmoji:** ${error.message}`);
        return '⚠️'; // Emergency fallback emoji in case of error
    }
}

module.exports = { getMetricEmoji };
