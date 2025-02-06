/**
 * 📚 **msgDbSave Module**
 *
 * This module provides utility functions for processing and cleaning up message data,
 * as well as retrieving recent chat messages from the database.
 *
 * Functions include:
 * - Determining if a message is a chat message.
 * - Detecting system messages based on key patterns.
 * - Cleaning and reformatting text.
 * - Combining extra name tokens for system messages.
 * - Cleaning up various message formats (chat, tasks, keys, emoji-based system messages).
 * - Retrieving recent chat messages.
 *
 * @module msgDbSave
 */
const { dbPromise, systemTables, emojiCleanupTypes } = require('./msgDbConstants');
const { reformatText, isChatMessage, cleanupEmojiSystemMessage, cleanupKeysRow, cleanupTasksRow, cleanupChatRow, combineExtraName, detectSystemMessage } = require('./msgDbUtils');
const logger = require('../utils/logger');

/**
 * 🎯 **Saves a Message**
 *
 * Immediately cleans up and saves a message to the database.
 * - If it's a chat message, it uses `cleanupChatRow` to extract username and message content.
 * - For system messages, applies specialized cleanup functions (TASKS, KEYS, RAID_DROP, or generic emoji-based cleanup).
 * - Uses `combineExtraName` to ensure the message starts appropriately.
 * - Finally, saves the processed message into the designated system table or chat table.
 *
 * @async
 * @function saveMessage
 * @param {string} rsn - The raw sender name.
 * @param {string} message - The raw message content.
 * @param {string} messageId - The Discord message ID.
 * @param {number} timestamp - The message timestamp.
 *
 * @example
 * saveMessage("Alice", "**Alice**: Hello!", "1234567890", Date.now());
 */
async function saveMessage(rsn, message, messageId, timestamp) {
    try {
        // Check if the message is a chat message
        if (isChatMessage(message)) {
            const { username, cleanedMessage } = cleanupChatRow(message);
            if (username) rsn = username;
            message = cleanedMessage;
            const db = await dbPromise;
            await db.run('INSERT OR IGNORE INTO chat_messages (rsn, message, message_id, timestamp) VALUES (?, ?, ?, ?)', [rsn, message, messageId, new Date(timestamp).toISOString()]);
            logger.info(`✅ 💬 Chat message stored: [${rsn}] ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);
            return;
        }

        // Detect system messages and apply appropriate cleanup
        const systemType = detectSystemMessage(message);
        if (systemType) {
            if (systemType === 'TASKS') {
                const { username, cleanedMessage } = cleanupTasksRow(message);
                if (username) rsn = username;
                message = cleanedMessage;
            } else if (systemType === 'KEYS') {
                const { username, cleanedMessage } = cleanupKeysRow(message);
                if (username) rsn = username;
                message = cleanedMessage;
            } else if (systemType === 'RAID_DROP') {
                rsn = rsn.replace(/^💬OSRS\s*\|\s*Clan\s*Chat\s*<:[^>]+>\s*/i, '');
                const { username, cleanedMessage } = cleanupEmojiSystemMessage(message);
                if (username) rsn = username;
                message = cleanedMessage;
            } else if (emojiCleanupTypes.includes(systemType)) {
                const { username, cleanedMessage } = cleanupEmojiSystemMessage(message);
                if (username) rsn = username;
                message = cleanedMessage;
            } else {
                rsn = reformatText(rsn);
                message = reformatText(message);
            }
            const combined = combineExtraName(rsn, message);
            rsn = combined.user;
            message = combined.message;
            await saveSystemMessage(systemType, rsn, message, messageId, timestamp);
            return;
        }

        // Fallback: treat as a chat message
        rsn = reformatText(rsn);
        message = reformatText(message);
        const db = await dbPromise;
        await db.run('INSERT OR IGNORE INTO chat_messages (rsn, message, message_id, timestamp) VALUES (?, ?, ?, ?)', [rsn, message, messageId, new Date(timestamp).toISOString()]);
        logger.info(`✅ Fallback chat message stored: [${rsn}] ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);
    } catch (error) {
        logger.error('❌ Database Save Error:', error);
    }
}

/**
 * 🎯 **Saves a System Message**
 *
 * Saves a cleaned-up system message into its designated system table based on its type.
 *
 * @async
 * @function saveSystemMessage
 * @param {string} type - The detected system message type.
 * @param {string} rsn - The cleaned sender name.
 * @param {string} message - The cleaned message content.
 * @param {string} messageId - The Discord message ID.
 * @param {number} timestamp - The message timestamp.
 *
 * @example
 * saveSystemMessage("KEYS", "Bob", "has opened a loot key...", "0987654321", Date.now());
 */
async function saveSystemMessage(type, rsn, message, messageId, timestamp) {
    try {
        const db = await dbPromise;
        const tableName = systemTables[type];
        if (!tableName) {
            logger.warn(`⚠️ No table mapping defined for system type: ${type}`);
            return;
        }
        await db.run(`INSERT OR IGNORE INTO ${tableName} (rsn, message, message_id, timestamp) VALUES (?, ?, ?, ?)`, [rsn, message, messageId, new Date(timestamp).toISOString()]);
        logger.info(`✅ 🎉 Saved system message of type [${type}] from [${rsn}]: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);
    } catch (error) {
        logger.error(`❌ Error saving system message (type ${type}):`, error);
    }
}

module.exports = {
    saveMessage,
};
