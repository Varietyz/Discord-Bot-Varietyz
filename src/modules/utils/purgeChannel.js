// @ts-nocheck
/**
 * @fileoverview Utility functions for the Varietyz Bot.
 * Provides helper functions for normalizing RSNs, handling ranks, managing rate limits,
 * interacting with Discord channels, and making HTTP requests with retry logic.
 *
 * @module utils/purgeChannel
 */

const logger = require('./logger');
const { sleep } = require('./sleepUtil');

/**
 * Deletes all messages in a specified Discord channel.
 * Fetches and deletes messages in batches to handle large volumes.
 *
 * @param {Discord.TextChannel} channel - The Discord channel to purge.
 * @returns {Promise<void>}
 * @example
 * // Purge messages in the specified channel
 * purgeChannel(channel);
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
