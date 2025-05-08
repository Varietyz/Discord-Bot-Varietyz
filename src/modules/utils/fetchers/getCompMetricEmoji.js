const logger = require('../essentials/logger');
const db = require('../essentials/dbUtils');

async function getMetricEmoji(guild, metric, competitionType) {
    try {
        const normalizedMetric = metric.toLowerCase().replace(/\s+/g, '_');
        logger.debug(`Normalized metric: ${normalizedMetric}`);
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
        const fallbackKey = competitionType === 'SOTW' ? 'emoji_overall' : 'emoji_slayer';
        logger.debug(`Using fallback key: ${fallbackKey}`);
        if (!guild) {
            logger.warn(`⚠️ **Warning:** Guild is undefined; cannot fetch emoji for \`${metric}\`.`);
            const fallbackFromDb = await db.guild.getOne('SELECT emoji_format FROM guild_emojis WHERE emoji_key = ?', [fallbackKey]);
            if (fallbackFromDb && fallbackFromDb.emoji_format) {
                return fallbackFromDb.emoji_format;
            }
            return '⚠️';
        }
        let emojiFromCache = guild.emojis.cache.find((e) => e.name.toLowerCase() === normalizedMetric);
        if (!emojiFromCache) {
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
        logger.warn(`⚠️ **Warning:** No emoji found for \`${metric}\`. Using fallback.`);
        const finalFallback = await db.guild.getOne('SELECT emoji_format FROM guild_emojis WHERE emoji_key = ?', [fallbackKey]);
        if (finalFallback && finalFallback.emoji_format) {
            return finalFallback.emoji_format;
        }
        return '⚠️';
    } catch (error) {
        logger.error(`🚫 **Error in getMetricEmoji:** ${error.message}`);
        return '⚠️';
    }
}
module.exports = { getMetricEmoji };
