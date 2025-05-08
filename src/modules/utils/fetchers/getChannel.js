const db = require('../essentials/dbUtils');
const logger = require('../essentials/logger');

const channelCache = {};

async function getChannelId(channelKey) {
    if (channelCache[channelKey]) {
        return channelCache[channelKey];
    }

    try {
        const row = await db.guild.getOne(
            `
            SELECT channel_id
            FROM ensured_channels
            WHERE channel_key = ?
            `,
            [channelKey]
        );
        const channelId = row ? row.channel_id : null;
        channelCache[channelKey] = channelId;
        return channelId;
    } catch (err) {
        logger.error(`[getChannelId] Failed to fetch channel ID for ${channelKey}: ${err.message}`);
        return null;
    }
}

module.exports = getChannelId;
