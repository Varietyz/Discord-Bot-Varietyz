// @ts-nocheck
/**
 * @fileoverview Utility function for managing Discord channels in the Varietyz Bot.
 * Provides a function to purge messages from a specified Discord channel while respecting rate limits.
 * This function is optimized to handle large volumes of messages by processing them in batches.
 *
 * Key Features:
 * - **Efficient Message Deletion**: Deletes messages in batches of up to 100 to handle large volumes.
 * - **Rate Limit Management**: Introduces delays between deletions to avoid hitting Discord's rate limits.
 * - **Error Handling**: Logs and handles any errors that occur during the message deletion process.
 *
 * External Dependencies:
 * - `sleep` function from `./sleepUtil` to introduce delays between deletions.
 * - `logger` module for logging operations and errors.
 *
 * @module utils/purgeChannel
 */

const logger = require('./logger');
const { sleep } = require('./sleepUtil');

/**
 * Deletes all messages in a specified Discord text channel.
 *
 * This function fetches and deletes messages in batches of up to 100 to efficiently
 * handle large volumes of messages. It also introduces delays between deletions to
 * prevent hitting Discord's rate limits.
 *
 * @function purgeChannel
 * @param {Discord.TextChannel} channel - The Discord channel to purge.
 * @returns {Promise<void>} A promise that resolves when all messages in the channel are deleted.
 * @throws {Error} Logs and handles any errors that occur during the purge process.
 * @example
 * // Purge all messages in a specified channel
 * const channel = client.channels.cache.get('CHANNEL_ID');
 * if (channel) {
 *     await purgeChannel(channel);
 * }
 */
async function purgeChannel(channel) {
    let messagesToDelete = [];
    try {
        // Fetch up to 100 messages at a time
        do {
            const fetchedMessages = await channel.messages.fetch({
                limit: 100,
            });
            if (fetchedMessages.size === 0) {
                break;
            }
            messagesToDelete = fetchedMessages;
            await channel.bulkDelete(messagesToDelete, true); // Bulk delete the fetched messages
            logger.info(`[Util] Deleted ${messagesToDelete.size} messages.`);

            // Adding a delay between deletions to avoid hitting rate limits
            await sleep(1000);
        } while (messagesToDelete.size > 0); // Repeat until no more messages left
    } catch (error) {
        logger.error(`[Util] Error deleting messages: ${error}`);
        await sleep(2000); // Delay on error to avoid hitting rate limits
    }
}

module.exports = {
    purgeChannel,
};
