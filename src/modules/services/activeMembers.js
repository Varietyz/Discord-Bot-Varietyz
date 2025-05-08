const { DateTime } = require('luxon');
const logger = require('../utils/essentials/logger');
const WOMApiClient = require('../../api/wise_old_man/apiClient');
const db = require('../utils/essentials/dbUtils');
const { calculateInactivity, calculateProgressCount } = require('../utils/helpers/calculateActivity');

async function updateActivityData(maxRetries = 3, baseDelay = 5000) {
    let retryCount = 0;
    logger.info(`📡 Using WOM Group ID: ${WOMApiClient.groupId}`);
    while (retryCount < maxRetries) {
        try {
            const groupDetails = await WOMApiClient.request('groups', 'getGroupDetails', WOMApiClient.groupId);
            if (groupDetails?.memberships) {
                for (const membership of groupDetails.memberships) {
                    const { player } = membership;
                    if (player?.lastChangedAt) {
                        const lastProgressed = DateTime.fromJSDate(player.lastChangedAt);
                        if (lastProgressed.isValid) {
                            await db.runQuery(
                                `INSERT INTO active_inactive (player_id, last_progressed)
                                 VALUES (?, ?)
                                 ON CONFLICT(player_id) DO UPDATE SET last_progressed = excluded.last_progressed`,
                                [player.id, lastProgressed.toISO()],
                            );
                        } else {
                            logger.warn(`⚠️ Invalid date format for **${player.username}**. Last Progress: \`${player.lastChangedAt}\``);
                        }
                    } else {
                        logger.info(`📛 No progress data available for **${player.username}**.`);
                    }
                }
                logger.info('✅ Successfully fetched and processed player activity data.');
                return;
            }
            throw new Error('❌ Failed to retrieve **group details or memberships data**.');
        } catch (error) {
            retryCount++;
            if (retryCount === maxRetries) {
                logger.error(`🚨 **Data fetch failed** after \`${maxRetries}\` attempts: ${error.message}`);
                throw error;
            }
            const delay = baseDelay * Math.pow(2, retryCount - 1);
            logger.warn(`⚠️ **Retry ${retryCount}/${maxRetries}**: Trying again in \`${delay}ms\`... ⏳`);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
}

async function updateVoiceChannel(client) {
    try {
        const guild = client.guilds.cache.get(process.env.GUILD_ID);
        if (guild) {
            const row = await db.guild.getOne('SELECT channel_id FROM ensured_channels WHERE channel_key = ?', ['activity_voice_channel']);
            if (!row) {
                logger.info('⚠️ No channel_id is configured in ensured_channels for activity_voice_channel.');
                return;
            }
            const channelId = row.channel_id;
            const voiceChannel = guild.channels.cache.get(channelId);
            if (voiceChannel) {
                await updateActivityData(3, 5000);
                const emoji = '🟢';
                const count = await calculateProgressCount();
                const newChannelName = `${emoji} Active Clannies: ${count}`;
                await voiceChannel.setName(newChannelName);
                logger.info(`✅ **Voice channel updated** → \`${newChannelName}\``);
            } else {
                logger.error('🚫 **Voice channel not found.**');
            }
        } else {
            logger.error('🚨 **Guild not found.** Unable to update channel.');
        }
    } catch (error) {
        logger.error(`❌ **Error updating voice channel:** ${error.message}`);
    }
}
module.exports = {
    updateActivityData,
    calculateProgressCount,
    calculateInactivity,
    updateVoiceChannel,
};
