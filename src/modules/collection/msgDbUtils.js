/* eslint-disable max-len */
// @ts-nocheck

/**
 * 📚 **msgDbUtils Module**
 *
 * This module provides utility functions for processing and cleaning up message data,
 * as well as retrieving recent chat messages from the database.
 *
 * Functions include:
 * - Checking if a message is a chat message.
 * - Detecting system messages based on predefined patterns.
 * - Cleaning up message text (trimming, removing backslashes).
 * - Combining extra name tokens for system messages.
 * - Cleaning up various message formats (chat, tasks, keys, emoji system messages).
 * - Retrieving recent chat messages.
 *
 * @module msgDbUtils
 */

const { dbPromise, SYSTEM_PATTERNS } = require('./msgDbConstants');

/**
 * 🎯 **Determines if a Message is a Chat Message**
 *
 * Checks whether the provided message follows a chat message format (e.g., **Name**: message).
 *
 * @param {string} message - The raw message text.
 * @returns {boolean} `true` if the message is a chat message; otherwise, `false`.
 *
 * @example
 * // Example:
 * const result = isChatMessage("**John**: Hello there!");
 * // result => true
 */
function isChatMessage(message) {
    return /\*\*[^*]+\*\*:\s/.test(message);
}

/**
 * 🎯 **Detects a System Message**
 *
 * For non‑chat messages, checks if the message qualifies as a system message based on key phrases
 * defined in SYSTEM_PATTERNS.
 *
 * @param {string} message - The raw message content.
 * @returns {string|null} The detected system message type (e.g., "DIARY") or `null` if not a system message.
 *
 * @example
 * // Example:
 * const type = detectSystemMessage("Server rebooted at midnight.");
 * // type might be "SERVER" if SYSTEM_PATTERNS includes a matching pattern.
 */
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

/**
 * 🎯 **Reformats Text**
 *
 * Trims extra whitespace and removes all backslashes from the provided text.
 *
 * @param {string} text - The text to reformat.
 * @returns {string} The cleaned text.
 *
 * @example
 * // Example:
 * const clean = reformatText("  Hello\\ World!  ");
 * // clean => "Hello World!"
 */
function reformatText(text) {
    if (!text) return text;
    return text.replace(/\\/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * 🎯 **Combines Extra Name Tokens**
 *
 * For system messages, if the message does not start with "has" or "received", assumes that tokens before that keyword
 * belong to the username. These tokens are appended to the existing user field, and removed from the message.
 *
 * @param {string} user - The stored user.
 * @param {string} message - The system message.
 * @returns {Object} An object containing:
 * - `user`: The combined username.
 * - `message`: The cleaned message text.
 *
 * @example
 * // Example:
 * const result = combineExtraName("John", "Doe has logged in.");
 * // result => { user: "John Doe", message: "has logged in." }
 */
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

/**
 * 🎯 **Cleans Up a Chat Message Row**
 *
 * Processes chat messages that follow the **Name**: format.
 * Extracts the username and the actual message content.
 *
 * @param {string} message - The raw chat message.
 * @returns {Object} An object containing:
 * - `username`: The extracted username (or `null` if not found).
 * - `cleanedMessage`: The cleaned message content.
 *
 * @example
 * // Example:
 * const result = cleanupChatRow("**John**: Hello there!");
 * // result => { username: "John", cleanedMessage: "Hello there!" }
 */
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

/**
 * 🎯 **Cleans Up Combat Tasks Message Row**
 *
 * Cleans up combat tasks messages by removing the "CA_ID" prefix and extracting the proper username.
 * Expected examples include:
 * - "CA_ID:537|roofs4life has completed a hard combat task: Fat of the Land."
 * - "CA_ID.73.Collector 30 has completed a medium combat task: I'd Rather Not Learn."
 *
 * @param {string} message - The raw combat tasks message.
 * @returns {Object} An object containing:
 * - `username`: The extracted username.
 * - `cleanedMessage`: The cleaned message content.
 *
 * @example
 * // Example:
 * const result = cleanupTasksRow("CA_ID:537|roofs4life has completed a hard combat task: Fat of the Land.");
 * // result => { username: "roofs4life", cleanedMessage: "has completed a hard combat task: Fat of the Land." }
 */
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

/**
 * 🎯 **Cleans Up Keys Message Row**
 *
 * Processes messages related to keys (loot key rewards) by extracting the username and the key message.
 *
 * @param {string} message - The raw keys message.
 * @returns {Object} An object containing:
 * - `username`: The extracted username (or `null` if not found).
 * - `cleanedMessage`: The cleaned message content.
 *
 * @example
 * // Example:
 * const result = cleanupKeysRow("PlayerOne has opened a loot key and received a rare item!");
 * // result => { username: "PlayerOne", cleanedMessage: "has opened a loot key and received a rare item!" }
 */
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

/**
 * 🎯 **Cleans Up Emoji-based System Messages**
 *
 * Processes system messages that start with one or more emoji definitions.
 * Removes any leading channel indicator (e.g., "💬OSRS | Clan Chat") and extracts the username and message content.
 *
 * @param {string} message - The raw system message.
 * @returns {Object} An object containing:
 * - `username`: The extracted username (or `null` if not found).
 * - `cleanedMessage`: The cleaned message content.
 *
 * @example
 * // Example:
 * const result = cleanupEmojiSystemMessage("💬OSRS | Clan Chat <:Guideprices:1147702301298016349> DankGoldList received a drop: …");
 * // result => { username: "DankGoldList", cleanedMessage: "received a drop: …" }
 */
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

/**
 * 🎯 **Retrieves Recent Chat Messages**
 *
 * Fetches a specified number of recent chat messages from the database.
 *
 * @async
 * @function getRecentMessages
 * @param {number} [limit=50] - The number of messages to retrieve.
 * @returns {Promise<Array>} An array of recent message records.
 *
 * @example
 * // Example:
 * const recent = await getRecentMessages(20);
 */
async function getRecentMessages(limit = 50) {
    const db = await dbPromise;
    return db.all('SELECT message FROM chat_messages ORDER BY timestamp DESC LIMIT ?', [limit]);
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
