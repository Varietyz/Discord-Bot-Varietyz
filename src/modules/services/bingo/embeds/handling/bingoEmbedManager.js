// /modules/services/bingo/bingoEmbedManager.js
const db = require('../../../../utils/essentials/dbUtils');
const logger = require('../../../../utils/essentials/logger');

/**
 *
 * @param eventId
 * @param playerId
 * @param teamId
 * @param taskId
 * @param messageId
 * @param channelId
 * @param embedType
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
 *
 * @param eventId
 * @param embedType
 */
async function getActiveEmbeds(eventId, embedType) {
    try {
        return await db.getAll(
            `
            SELECT *
            FROM bingo_embeds
            WHERE (event_id = ? OR event_id = -1)
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
 *
 * @param client
 * @param channelId
 * @param messageId
 * @param newEmbed
 * @param eventId
 * @param embedType
 */
async function editEmbed(client, channelId, messageId, newEmbed, eventId, embedType) {
    try {
        const channel = client.channels.cache.get(channelId);
        if (!channel) {
            logger.warn(`[EmbedManager] Channel #${channelId} not found. Deleting embed record.`);
            await db.runQuery('DELETE FROM bingo_embeds WHERE channel_id = ?', [channelId]);
            return;
        }

        const message = await fetchMessage(channel, messageId);

        if (message) {
            logger.info(`[EmbedManager] Editing message #${messageId} for ${embedType}`);

            // ✅ If this is a universal pattern embed, remove previous attachments
            const hasAttachments = message.attachments.size > 0;
            const isImageEmbed = embedType === 'bingo_info';

            if (hasAttachments && !isImageEmbed) {
                logger.info(`[EmbedManager] Re-sending message WITHOUT an image for ${embedType}`);

                // Delete old message
                await message.delete();
                await db.runQuery('DELETE FROM bingo_embeds WHERE message_id = ?', [messageId]);

                // Send new message without an image
                const newMessage = await channel.send({ embeds: [newEmbed] });

                // Save new message ID
                await createEmbedRecord(eventId, null, null, null, newMessage.id, channel.id, embedType);

                logger.info(`[EmbedManager] Successfully replaced message for ${embedType} without an image.`);
                return;
            }

            // ✅ If no attachment issues, proceed with a normal edit
            await message.edit({ embeds: [newEmbed] });
            logger.info(`[EmbedManager] Updated embed successfully for message #${messageId}`);
        } else {
            logger.warn(`[EmbedManager] Message #${messageId} not found. Deleting embed record.`);
            await db.runQuery('DELETE FROM bingo_embeds WHERE message_id = ?', [messageId]);

            // ✅ Send a new message
            const newMessage = await channel.send({ embeds: [newEmbed] });

            // Save new message ID
            await createEmbedRecord(eventId, null, null, null, newMessage.id, channel.id, embedType);

            logger.info(`[EmbedManager] Created new ${embedType} embed for event #${eventId} after missing message.`);
        }
    } catch (err) {
        logger.error(`[EmbedManager] Failed to edit embed #${messageId}: ${err.message}`);
    }
}

/**
 * Edits an embed message and ensures that an image attachment is properly included.
 * If Discord does not allow modifying an attachment, this function re-sends the embed.
 *
 * @param {Object} client - The Discord client.
 * @param {string} channelId - The channel ID where the embed is located.
 * @param {string} messageId - The message ID of the embed.
 * @param {EmbedBuilder} newEmbed - The updated embed.
 * @param {number} eventId - The event ID.
 * @param {string} embedType - The type of embed (e.g., 'bingo_info').
 * @param {Array} attachments - Image files to be attached.
 */
async function editEmbedAttachment(client, channelId, messageId, newEmbed, eventId, embedType, attachments = []) {
    try {
        const channel = client.channels.cache.get(channelId);
        if (!channel) {
            logger.warn(`[EmbedManager] Channel #${channelId} not found. Deleting embed record.`);
            await db.runQuery('DELETE FROM bingo_embeds WHERE channel_id = ?', [channelId]);
            return;
        }

        const message = await fetchMessage(channel, messageId);

        if (message) {
            logger.info(`[EmbedManager] Editing message #${messageId} for ${embedType}`);

            // ✅ Discord does NOT allow editing an attachment, so we must re-send if an image exists
            if (attachments.length > 0) {
                logger.info(`[EmbedManager] Re-sending message with new attachment for ${embedType}`);

                // ✅ Delete the old message
                await message.delete();
                await db.runQuery('DELETE FROM bingo_embeds WHERE message_id = ?', [messageId]);

                // ✅ Send a new message with the embed and image
                const newMessage = await channel.send({ embeds: [newEmbed], files: attachments });

                // ✅ Save the new message ID to the database
                await createEmbedRecord(eventId, null, null, null, newMessage.id, channel.id, embedType);

                logger.info(`[EmbedManager] Successfully replaced message for ${embedType} with image inside the embed.`);
            } else {
                // ✅ If no image update is needed, simply edit the existing embed
                await message.edit({ embeds: [newEmbed] });
                logger.info(`[EmbedManager] Updated embed successfully for message #${messageId}`);
            }
        } else {
            logger.warn(`[EmbedManager] Message #${messageId} not found. Deleting embed record.`);
            await db.runQuery('DELETE FROM bingo_embeds WHERE message_id = ?', [messageId]);

            // ✅ Send a new message with the embed and image
            const newMessage = await channel.send({ embeds: [newEmbed], files: attachments });

            // ✅ Save the new message ID to the database
            await createEmbedRecord(eventId, null, null, null, newMessage.id, channel.id, embedType);

            logger.info(`[EmbedManager] Created new ${embedType} embed for event #${eventId} after missing message.`);
        }
    } catch (err) {
        logger.error(`[EmbedManager] Failed to edit embed #${messageId}: ${err.message}`);
    }
}

/**
 *
 * @param embedId
 * @param newStatus
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
 *
 * @param eventId
 * @param embedType
 * @param newStatus
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
 *
 * @param client
 * @param channelId
 * @param messageId
 * @param embedId
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
 *
 * @param channel
 * @param messageId
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
        const embeds = await db.getAll(`
            SELECT embed_id, message_id, channel_id
            FROM bingo_embeds
            WHERE embed_type = 'progress'
              AND status = 'active'
        `);

        for (const embed of embeds) {
            let channel;
            try {
                channel = await client.channels.fetch(embed.channel_id);
            } catch (err) {
                logger.warn(`[PurgeStaleEmbeds] Channel #${embed.channel_id} not found. Deleting record #${embed.embed_id}.`);
                await db.runQuery('DELETE FROM bingo_embeds WHERE embed_id = ?', [embed.embed_id]);
                continue;
            }

            try {
                await channel.messages.fetch(embed.message_id);
            } catch (err) {
                logger.info(`[PurgeStaleEmbeds] Message #${embed.message_id} not found. Deleting record #${embed.embed_id}.`);
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
    editEmbedAttachment,
};
