require('dotenv').config();
const { dbPromise } = require('./msgDbConstants');
const { getRecentMessages, detectSystemMessage } = require('./msgDbUtils');
const { saveMessage } = require('./msgDbSave');
const { reorderAllTables } = require('./msgReorder');
const logger = require('../utils/essentials/logger');
const db = require('../utils/essentials/dbUtils');
/**
 *
 * @param idA
 * @param idB
 */
function isNewerSnowflake(idA, idB) {
    if (idA.length !== idB.length) {
        return idA.length > idB.length;
    }
    return idA > idB;
}
/**
 *
 * @param client
 */
async function fetchAndStoreChannelHistory(client) {
    const row = await db.guild.getOne('SELECT channel_id FROM ensured_channels WHERE channel_key = ?', ['clanchat_channel']);
    if (!row) {
        logger.info('⚠️ No channel_id is configured in ensured_channels for clanchat_channel.');
        return;
    }
    const channelId = row.channel_id;
    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) {
        logger.info(`⚠️ Invalid text channel: ${channelId}`);
        return;
    }
    const lastFetchedId = await getLastFetchedMessageId();
    let totalFetched = 0;
    let totalSaved = 0;
    if (!lastFetchedId) {
        logger.info('ℹ️ No last fetched ID found. Performing a full historical fetch (newest → oldest)...');
        let lastMessageId = null;
        let hasMoreMessages = true;
        let maxFetchedId = null;
        while (hasMoreMessages) {
            try {
                const messages = await channel.messages.fetch({ limit: 100, before: lastMessageId });
                if (!messages.size) break;
                const messageIds = messages.map((m) => m.id);
                const existingIds = await getExistingMessageIds(messageIds);
                for (const msg of messages.values()) {
                    if (!existingIds.has(msg.id)) {
                        await saveMessage(msg.author.username, msg.content, msg.id, msg.createdTimestamp);
                        totalSaved++;
                    }
                    if (!maxFetchedId || isNewerSnowflake(msg.id, maxFetchedId)) {
                        maxFetchedId = msg.id;
                    }
                }
                lastMessageId = messages.last()?.id;
                totalFetched += messages.size;
                logger.info(`✅ Fetched ${messages.size} messages. Accumulated total: ${totalFetched}, stored: ${totalSaved}`);
                if (messages.size < 100) {
                    hasMoreMessages = false;
                }
            } catch (error) {
                logger.error('❌ Error fetching message history:', error);
                break;
            }
        }
        logger.info(`🎉 Full fetch complete. Total messages fetched: ${totalFetched}, new messages stored: ${totalSaved}. Initiating table reordering...`);
        await reorderAllTables();
        logger.info(`🎉 Auto-sorting completed for ${totalSaved} new messages!`);
        if (maxFetchedId) {
            await setLastFetchedMessageId(maxFetchedId);
            logger.info(`✅ Last fetched ID updated to: ${maxFetchedId}`);
        }
        if (lastMessageId) {
            await setLastFetchedMessageId(lastMessageId);
            logger.info(`✅ Last fetched ID updated to: ${lastMessageId}`);
        }
    } else {
        logger.info(`ℹ️ Last fetched ID found: ${lastFetchedId}. Fetching only messages AFTER that ID...`);
        let hasMore = true;
        let afterId = lastFetchedId;
        while (hasMore) {
            try {
                const messages = await channel.messages.fetch({ limit: 100, after: afterId });
                if (!messages.size) break;
                const messageIds = messages.map((m) => m.id);
                const existingIds = await getExistingMessageIds(messageIds);
                let oldestMessageId;
                let newestMessageId;
                for (const msg of messages.values()) {
                    if (!oldestMessageId || msg.id < oldestMessageId) oldestMessageId = msg.id;
                    if (!newestMessageId || msg.id > newestMessageId) newestMessageId = msg.id;
                    if (!existingIds.has(msg.id)) {
                        await saveMessage(msg.author.username, msg.content, msg.id, msg.createdTimestamp);
                        totalSaved++;
                    }
                }
                if (newestMessageId && newestMessageId !== afterId) {
                    afterId = newestMessageId;
                } else {
                    hasMore = false;
                }
                totalFetched += messages.size;
                logger.info(`✅ Fetched ${messages.size} new messages. Total new messages: ${totalFetched}, stored: ${totalSaved}`);
                if (messages.size < 100) {
                    hasMore = false;
                }
            } catch (err) {
                logger.error('❌ Error fetching new messages:', err);
                break;
            }
        }
        if (totalFetched > 0) {
            await setLastFetchedMessageId(afterId);
            logger.info(`✅ Last fetched ID updated to: ${afterId}`);
            await reorderAllTables();
            logger.info(`🎉 Auto-sorting completed for ${totalSaved} new messages!`);
        }
        logger.info(`🎉 Incremental fetch complete. Total new messages stored: ${totalSaved}.`);
    }
}
/**
 *
 * @param messageIds
 */
async function getExistingMessageIds(messageIds) {
    if (messageIds.length === 0) return new Set();
    const placeholders = messageIds.map(() => '?').join(',');
    const sql = `
    SELECT message_id FROM chat_messages WHERE message_id IN (${placeholders})
    UNION
    SELECT message_id FROM drops WHERE message_id IN (${placeholders})
    UNION
    SELECT message_id FROM raid_drops WHERE message_id IN (${placeholders})
    UNION
    SELECT message_id FROM pvp_messages WHERE message_id IN (${placeholders})
    UNION
    SELECT message_id FROM quest_completed WHERE message_id IN (${placeholders})
    UNION
    SELECT message_id FROM collection_log WHERE message_id IN (${placeholders})
    UNION
    SELECT message_id FROM personal_bests WHERE message_id IN (${placeholders})
    UNION
    SELECT message_id FROM pet_drops WHERE message_id IN (${placeholders})
    UNION
    SELECT message_id FROM level_ups WHERE message_id IN (${placeholders})
    UNION
    SELECT message_id FROM combat_achievements WHERE message_id IN (${placeholders})
    UNION
    SELECT message_id FROM clue_rewards WHERE message_id IN (${placeholders})
    UNION
    SELECT message_id FROM clan_traffic WHERE message_id IN (${placeholders})
    UNION
    SELECT message_id FROM diary_completed WHERE message_id IN (${placeholders})
    UNION
    SELECT message_id FROM combat_tasks_completed WHERE message_id IN (${placeholders})
    UNION
    SELECT message_id FROM loot_key_rewards WHERE message_id IN (${placeholders});
  `;
    const db = await dbPromise;
    const allParams = Array(15).fill(messageIds).flat();
    try {
        const rows = await db.all(sql, allParams);
        return new Set(rows.map((row) => row.message_id));
    } catch (err) {
        logger.error('❌ Error in getExistingMessageIds (all tables):', err);
        return new Set();
    }
}
/**
 *
 */
async function getLastFetchedMessageId() {
    const db = await dbPromise;
    const row = await db.get('SELECT value FROM meta_info WHERE key = "last_fetched_message_id"');
    return row ? row.value : null;
}
/**
 *
 * @param messageId
 */
async function setLastFetchedMessageId(messageId) {
    const db = await dbPromise;
    await db.run(
        `
    INSERT INTO meta_info (key, value)
    VALUES ("last_fetched_message_id", ?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value
  `,
        [messageId],
    );
}
module.exports = {
    getRecentMessages,
    fetchAndStoreChannelHistory,
    detectSystemMessage,
};
