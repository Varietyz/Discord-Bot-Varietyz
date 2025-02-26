// /modules/services/bingo/bingoEmbedManager.js
const db = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');

/**
 * Create a new embed record in the database
 * @param {number} eventId - The event ID
 * @param {number|null} playerId - The player ID (or null for global/event-level embeds)
 * @param {number|null} teamId - The team ID (or null for player-only embeds)
 * @param {number|null} taskId - The task ID (optional, for task-specific embeds)
 * @param {string} messageId - The Discord message ID
 * @param {string} channelId - The Discord channel ID
 * @param {string} embedType - The type of embed (e.g., 'progress', 'final_results')
 */
async function createEmbedRecord(eventId, playerId, teamId, taskId, messageId, channelId, embedType) {
    try {
        await db.runQuery(
            `
            INSERT INTO bingo_embeds (event_id, player_id, team_id, task_id, message_id, channel_id, embed_type)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [eventId, playerId, teamId, taskId, messageId, channelId, embedType],
        );
        logger.info(`[EmbedManager] Created embed record for event #${eventId}, message ${messageId}`);
    } catch (err) {
        logger.error(`[EmbedManager] Failed to create embed record: ${err.message}`);
    }
}

/**
 * Get all active embeds by event and type
 * @param {number} eventId - The event ID
 * @param {string} embedType - The type of embed (e.g., 'progress')
 * @returns {Promise<Array>} - Array of embed records
 */
async function getActiveEmbeds(eventId, embedType) {
    try {
        return await db.getAll(
            `
            SELECT *
            FROM bingo_embeds
            WHERE event_id = ?
              AND embed_type = ?
              AND status = 'active'
            `,
            [eventId, embedType],
        );
    } catch (err) {
        logger.error(`[EmbedManager] Failed to fetch active embeds: ${err.message}`);
        return [];
    }
}

/**
 * Edit an existing Discord embed and update the database record
 * @param {Client} client - The Discord client
 * @param {string} channelId - The channel ID
 * @param {string} messageId - The message ID to edit
 * @param {Object} newEmbed - The new embed object to set
 */
async function editEmbed(client, channelId, messageId, newEmbed) {
    try {
        const channel = client.channels.cache.get(channelId);
        if (!channel) {
            logger.warn(`[EmbedManager] Channel #${channelId} not found.`);
            return;
        }
        const message = await fetchMessage(channel, messageId);
        if (message) {
            await message.edit({ embeds: [newEmbed] });
            logger.info(`[EmbedManager] Edited message #${messageId}`);
        }
    } catch (err) {
        logger.error(`[EmbedManager] Failed to edit embed #${messageId}: ${err.message}`);
    }
}

/**
 * Update embed status (e.g., 'active', 'archived', 'deleted')
 * @param {number} embedId - The embed ID to update
 * @param {string} newStatus - The new status (e.g., 'deleted')
 */
async function updateEmbedStatus(embedId, newStatus) {
    try {
        await db.runQuery(
            `
            UPDATE bingo_embeds
            SET status = ?, last_updated = CURRENT_TIMESTAMP
            WHERE embed_id = ?
            `,
            [newStatus, embedId],
        );
        logger.info(`[EmbedManager] Updated embed #${embedId} status to ${newStatus}`);
    } catch (err) {
        logger.error(`[EmbedManager] Failed to update embed status: ${err.message}`);
    }
}

/**
 * Bulk update embed status by event and type
 * @param {number} eventId - The event ID
 * @param {string} embedType - The type of embed (e.g., 'progress')
 * @param {string} newStatus - The new status (e.g., 'archived')
 */
async function bulkUpdateEmbedStatus(eventId, embedType, newStatus) {
    try {
        await db.runQuery(
            `
            UPDATE bingo_embeds
            SET status = ?, last_updated = CURRENT_TIMESTAMP
            WHERE event_id = ?
              AND embed_type = ?
              AND status = 'active'
            `,
            [newStatus, eventId, embedType],
        );
        logger.info(`[EmbedManager] Bulk updated embeds for event #${eventId} to ${newStatus}`);
    } catch (err) {
        logger.error(`[EmbedManager] Failed to bulk update embed status: ${err.message}`);
    }
}

/**
 * Delete a Discord message and mark the embed as deleted in the database
 * @param {Client} client - The Discord client
 * @param {string} channelId - The channel ID
 * @param {string} messageId - The message ID to delete
 * @param {number} embedId - The embed ID in the database
 */
async function deleteEmbed(client, channelId, messageId, embedId) {
    try {
        const channel = client.channels.cache.get(channelId);
        if (!channel) {
            logger.warn(`[EmbedManager] Channel #${channelId} not found.`);
            return;
        }
        const message = await fetchMessage(channel, messageId);
        if (message) {
            await message.delete();
            logger.info(`[EmbedManager] Deleted message #${messageId}`);
        }
        await updateEmbedStatus(embedId, 'deleted');
    } catch (err) {
        logger.error(`[EmbedManager] Failed to delete embed #${embedId}: ${err.message}`);
    }
}

/**
 * Utility to safely fetch a message from a channel
 * @param {TextChannel} channel - The channel to fetch the message from
 * @param {string} messageId - The message ID to fetch
 * @returns {Promise<Message|null>} - The fetched message or null if not found
 */
async function fetchMessage(channel, messageId) {
    try {
        return await channel.messages.fetch(messageId);
    } catch (err) {
        logger.warn(`[EmbedManager] Failed to fetch message #${messageId}: ${err.message}`);
        return null;
    }
}

/**
 *
 * @param client
 */
async function purgeStaleEmbeds(client) {
    try {
        // Retrieve all active progress embed records.
        const embeds = await db.getAll(`
            SELECT embed_id, message_id, channel_id
            FROM bingo_embeds
            WHERE embed_type = 'progress'
              AND status = 'active'
        `);

        for (const embed of embeds) {
            const channel = client.channels.cache.get(embed.channel_id);
            if (!channel) {
                logger.warn(`[PurgeStaleEmbeds] Channel #${embed.channel_id} not found.`);
                continue;
            }
            try {
                await channel.messages.fetch(embed.message_id);
            } catch (err) {
                logger.info(`[PurgeStaleEmbeds] Message #${embed.message_id} not found. Deleting record ${embed.embed_id}.`);
                await db.runQuery('DELETE FROM bingo_embeds WHERE embed_id = ?', [embed.embed_id]);
            }
        }
    } catch (err) {
        logger.error(`[PurgeStaleEmbeds] Error purging stale embeds: ${err.message}`);
    }
}

module.exports = {
    createEmbedRecord,
    getActiveEmbeds,
    editEmbed,
    updateEmbedStatus,
    bulkUpdateEmbedStatus,
    deleteEmbed,
    fetchMessage,
    purgeStaleEmbeds,
};
