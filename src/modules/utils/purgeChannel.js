// @ts-nocheck
/**
 * @fileoverview
 * **Discord Channel Purger** 🧹
 *
 * This module provides a utility function to purge messages from a specified Discord text channel while respecting rate limits.
 * It is optimized to handle large volumes of messages by processing them in batches, ensuring efficient deletion without
 * triggering Discord's rate limits.
 *
 * **Key Features:**
 * - **Efficient Message Deletion**: Deletes messages in batches of up to 100.
 * - **Rate Limit Management**: Introduces delays between deletions to prevent hitting Discord's rate limits.
 * - **Error Handling**: Logs and handles errors that occur during the deletion process.
 *
 * **External Dependencies:**
 * - `sleep` from `./sleepUtil`: Introduces delays between deletion batches.
 * - `logger`: Logs information, warnings, and errors.
 *
 * @module utils/purgeChannel
 */

const logger = require('./logger');
const { sleep } = require('./sleepUtil');

/**
 * 🎯 **Purges All Messages from a Discord Text Channel**
 *
 * Fetches and deletes messages in batches of up to 100 until the channel is empty.
 * A delay is added between each batch to avoid Discord's rate limits.
 *
 * @function purgeChannel
 * @param {Discord.TextChannel} channel - The Discord text channel from which messages will be purged.
 * @returns {Promise<void>} Resolves when all messages in the channel are deleted.
 *
 * @example
 * // Purge all messages in a specified channel:
 * const channel = client.channels.cache.get('CHANNEL_ID');
 * if (channel) {
 *     await purgeChannel(channel);
 * }
 */
async function purgeChannel(channel) {
    let messagesToDelete = [];
    try {
        // Continuously fetch and delete messages in batches of up to 100.
        do {
            const fetchedMessages = await channel.messages.fetch({ limit: 100 });
            if (fetchedMessages.size === 0) {
                break;
            }
            messagesToDelete = fetchedMessages;
            // Bulk delete fetched messages. The "true" flag ignores messages older than 14 days.
            await channel.bulkDelete(messagesToDelete, true);
            logger.info(`[Util] Deleted ${messagesToDelete.size} messages.`);

            // Delay 1 second between batches to avoid hitting rate limits.
            await sleep(1000);
        } while (messagesToDelete.size > 0);
    } catch (error) {
        logger.error(`[Util] Error deleting messages: ${error}`);
        // On error, delay slightly before exiting or retrying.
        await sleep(2000);
    }
}

module.exports = {
    purgeChannel,
};
