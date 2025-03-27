const db = require('../utils/essentials/dbUtils');
const { SYSTEM_PATTERNS } = require('./msgDbConstants');
function isChatMessage(message) {
    return /\*\*[^*]+\*\*:\s/.test(message);
}
function detectSystemMessage(message) {
    if (isChatMessage(message)) return null;
    for (const [type, patterns] of Object.entries(SYSTEM_PATTERNS)) {
        if (type === 'DIARY') continue;
        if (patterns.some((pattern) => message.includes(pattern))) {
            return type;
        }
    }
    const diaryPatterns = SYSTEM_PATTERNS.DIARY;
    if (diaryPatterns.every((pattern) => message.includes(pattern))) {
        return 'DIARY';
    }
    return null;
}
function reformatText(text) {
    if (!text) return text;
    return text.replace(/\\/g, '').replace(/\s+/g, ' ').trim();
}
function combineExtraName(user, message) {
    user = reformatText(user);
    message = reformatText(message);
    const tokens = message.split(/\s+/);
    if (/^(has|received)$/i.test(tokens[0])) {
        return { user, message };
    }
    const index = tokens.findIndex((token) => /^(has|received|feels)$/i.test(token));
    if (index === -1) return { user, message };
    const extraName = tokens.slice(0, index).join(' ');
    const combinedUser = reformatText(user + ' ' + extraName);
    const newMessage = tokens.slice(index).join(' ');
    return { user: combinedUser, message: newMessage };
}
function cleanupChatRow(message) {
    if (!message) return { username: null, cleanedMessage: message };
    const regex = /^(?:<:[^>]+>\s*)+\*\*(.+?)\*\*:\s*(.*)$/;
    const match = message.match(regex);
    if (match) {
        const username = reformatText(match[1]);
        const cleanedMessage = reformatText(match[2]);
        return { username, cleanedMessage };
    }
    return { username: null, cleanedMessage: reformatText(message) };
}
function cleanupTasksRow(message) {
    if (!message) return { username: null, cleanedMessage: message };
    const regex = /^CA_ID.*?\|(.+)$/i;
    const match = message.match(regex);
    if (match) {
        const remainder = reformatText(match[1]);
        const firstSpace = remainder.indexOf(' ');
        if (firstSpace !== -1) {
            const username = remainder.substring(0, firstSpace);
            const cleanedMessage = remainder.substring(firstSpace + 1);
            return { username, cleanedMessage };
        }
        return { username: remainder, cleanedMessage: '' };
    }
    const fallbackRegex = /^(.+?)\s+(has completed.*)$/i;
    const fallback = message.match(fallbackRegex);
    if (fallback) {
        const username = reformatText(fallback[1]);
        const cleanedMessage = reformatText(fallback[2]);
        return { username, cleanedMessage };
    }
    return { username: null, cleanedMessage: reformatText(message) };
}
function cleanupKeysRow(message) {
    if (!message) return { username: null, cleanedMessage: message };
    const regex = /^(.*?)\s+(has opened a loot key.*)$/i;
    const match = message.match(regex);
    if (match) {
        const username = reformatText(match[1]);
        const cleanedMessage = reformatText(match[2]);
        return { username, cleanedMessage };
    }
    return { username: null, cleanedMessage: reformatText(message) };
}
function cleanupEmojiSystemMessage(message) {
    if (!message) return { username: null, cleanedMessage: reformatText(message) };
    message = message.replace(/^💬OSRS\s*\|\s*Clan\s*Chat\s*/i, '');
    if (message.includes('received a drop:')) {
        const dropRegex = /^(?:<:[^>]+>\s*)+(.*?)\s+(received a drop:.*)$/i;
        const dropMatch = message.match(dropRegex);
        if (dropMatch) {
            const username = reformatText(dropMatch[1]);
            const cleanedMessage = reformatText(dropMatch[2]);
            return { username, cleanedMessage };
        }
    }
    const genericRegex = /^(?:<:[^>]+>\s*)+(\S+)\s*(.*)$/;
    const genericMatch = message.match(genericRegex);
    if (genericMatch) {
        const username = reformatText(genericMatch[1]);
        const cleanedMessage = reformatText(genericMatch[2]);
        return { username, cleanedMessage };
    }
    return { username: null, cleanedMessage: reformatText(message) };
}
async function getRecentMessages(limit = 50) {
    return db.messages.getAll('SELECT message FROM chat_messages ORDER BY timestamp DESC LIMIT ?', [limit]);
}
module.exports = {
    getRecentMessages,
    cleanupEmojiSystemMessage,
    cleanupKeysRow,
    cleanupTasksRow,
    cleanupChatRow,
    combineExtraName,
    detectSystemMessage,
    isChatMessage,
    reformatText,
};