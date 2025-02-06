/* eslint-disable max-len */
// @ts-nocheck

require('dotenv').config();
const { dbPromise } = require('./msgDbConstants');
const { getRecentMessages, detectSystemMessage } = require('./msgDbUtils');
const { saveMessage } = require('./msgDbSave');
const { reorderAllTables } = require('./msgReorder');
const logger = require('../utils/logger');

/**
 * 🎯 **Determines if a Snowflake ID is Newer**
 *
 * Compares two Discord snowflake IDs (as strings) and returns true if `idA` is newer (greater) than `idB`.
 *
 * @function isNewerSnowflake
 * @param {string} idA - The first snowflake ID.
 * @param {string} idB - The second snowflake ID.
 * @returns {boolean} `true` if `idA` is newer than `idB`, otherwise `false`.
 *
 * @example
 * const result = isNewerSnowflake('1337045391975252082', '1337045391975252000');
 */
function isNewerSnowflake(idA, idB) {
    if (idA.length !== idB.length) {
        return idA.length > idB.length;
    }
    return idA > idB;
}

/**
 * 🎯 **Fetches and Stores Channel History**
 *
 * Fetches messages from the specified Discord channel and stores them in the database.
 * - If no last fetched message ID exists, performs a full historical fetch (newest → oldest),
 * stores messages, and then reorders the tables.
 * - If a last fetched ID exists, only fetches messages posted after that ID.
 *
 * Updates the meta_info table with the new last fetched message ID.
 *
 * @async
 * @function fetchAndStoreChannelHistory
 * @param {Client} client - The Discord.js Client instance.
 * @param {string} channelId - The ID of the Discord channel.
 *
 * @example
 * // Fetch and store history for a channel:
 * await fetchAndStoreChannelHistory(client, '123456789012345678');
 */
async function fetchAndStoreChannelHistory(client, channelId) {
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
        }
        logger.info(`🎉 Incremental fetch complete. Total new messages stored: ${totalSaved}.`);
    }
}

/**
 * 🎯 **Checks for Existing Message IDs**
 *
 * Checks multiple tables in the database for message IDs that are already stored.
 *
 * @async
 * @function getExistingMessageIds
 * @param {string[]} messageIds - Array of message IDs to check.
 * @returns {Promise<Set<string>>} A set of message IDs that already exist in the database.
 *
 * @example
 * const existingIds = await getExistingMessageIds(['12345', '67890']);
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
 * 🎯 **Retrieves the Last Fetched Message ID**
 *
 * Fetches the last fetched message ID from the `meta_info` table.
 *
 * @async
 * @function getLastFetchedMessageId
 * @returns {Promise<string|null>} The last fetched message ID or null if not found.
 *
 * @example
 * const lastId = await getLastFetchedMessageId();
 */
async function getLastFetchedMessageId() {
    const db = await dbPromise;
    const row = await db.get('SELECT value FROM meta_info WHERE key = "last_fetched_message_id"');
    return row ? row.value : null;
}

/**
 * 🎯 **Sets the Last Fetched Message ID**
 *
 * Updates or inserts the last fetched message ID into the `meta_info` table.
 *
 * @async
 * @function setLastFetchedMessageId
 * @param {string} messageId - The new last fetched message ID.
 *
 * @example
 * await setLastFetchedMessageId('1337045391975252082');
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
