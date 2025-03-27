const { systemTables, emojiCleanupTypes } = require('./msgDbConstants');
const { reformatText, isChatMessage, cleanupEmojiSystemMessage, cleanupKeysRow, cleanupTasksRow, cleanupChatRow, combineExtraName, detectSystemMessage } = require('./msgDbUtils');
const logger = require('../utils/essentials/logger');
const db = require('../utils/essentials/dbUtils');
/**
 *
 * @param rsn
 * @param message
 * @param messageId
 * @param timestamp
 */
async function saveMessage(rsn, message, messageId, timestamp) {
    try {
        if (isChatMessage(message)) {
            const { username, cleanedMessage } = cleanupChatRow(message);
            if (username) rsn = username;
            message = cleanedMessage;
            await db.messages.runQuery('INSERT OR IGNORE INTO chat_messages (rsn, message, message_id, timestamp) VALUES (?, ?, ?, ?)', [rsn, message, messageId, new Date(timestamp).toISOString()]);
            logger.info(`✅ 💬 Chat message stored: [${rsn}] ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);
            return;
        }
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
        rsn = reformatText(rsn);
        message = reformatText(message);
        await db.messages.runQuery('INSERT OR IGNORE INTO chat_messages (rsn, message, message_id, timestamp) VALUES (?, ?, ?, ?)', [rsn, message, messageId, new Date(timestamp).toISOString()]);
        logger.info(`✅ Fallback chat message stored: [${rsn}] ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);
    } catch (error) {
        logger.error('❌ Database Save Error:', error);
    }
}
/**
 *
 * @param type
 * @param rsn
 * @param message
 * @param messageId
 * @param timestamp
 */
async function saveSystemMessage(type, rsn, message, messageId, timestamp) {
    try {
        const tableName = systemTables[type];
        if (!tableName) {
            logger.warn(`⚠️ No table mapping defined for system type: ${type}`);
            return;
        }
        await db.messages.runQuery(`INSERT OR IGNORE INTO ${tableName} (rsn, message, message_id, timestamp) VALUES (?, ?, ?, ?)`, [rsn, message, messageId, new Date(timestamp).toISOString()]);
        logger.info(`✅ 🎉 Saved system message of type [${type}] from [${rsn}]: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);
    } catch (error) {
        logger.error(`❌ Error saving system message (type ${type}):`, error);
    }
}

module.exports = {
    saveMessage,
};
