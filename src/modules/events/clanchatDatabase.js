// aiDatabase.js
/* eslint-disable max-len */
// @ts-nocheck

const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
require('dotenv').config();

// Open (and eventually cache) the database connection.
const dbPromise = open({
    filename: 'src/data/messages.db',
    driver: sqlite3.Database,
});

// Tables for system messages (each type gets its own table)
const systemTables = {
    DROP: 'drops',
    RAID_DROP: 'raid_drops',
    QUESTS: 'quest_completed',
    COLLECTION_LOG: 'collection_log',
    PERSONAL_BEST: 'personal_bests',
    PVP: 'pvp_messages',
    PET_DROP: 'pet_drops',
    LEVEL_UP: 'level_ups',
    COMBAT_ACHIEVEMENTS: 'combat_achievements',
    CLUE_DROP: 'clue_rewards',
    ATTENDANCE: 'clan_traffic',
    DIARY: 'diary_completed',
    TASKS: 'combat_tasks_completed',
    KEYS: 'loot_key_rewards',
};

// Define the key substrings (in lowercase) to detect system messages.
const SYSTEM_PATTERNS = {
    DROP: ['received a drop\\:'],
    RAID_DROP: ['received special loot from a raid\\:'],
    QUESTS: ['<:Quest:1147703095711764550>'],
    COLLECTION_LOG: ['<:Collectionlog:1147701373455048814>'],
    PERSONAL_BEST: ['<:Speedrunningshopicon:1147703649917751357>'],
    PVP: ['<:BountyHuntertradericon:1147703810110791802>'],
    PET_DROP: ['<:Petshopicon:1147703359227297872>'],
    LEVEL_UP: ['<:Statsicon:1147702829029543996>'],
    COMBAT_ACHIEVEMENTS: ['<:CombatAchievementsicon:1147704502368075786>'],
    CLUE_DROP: ['<:DistractionDiversionmapicon:1147704823500779521>'],
    ATTENDANCE: ['<:AccountManagementCommunityicon:1147704337599041606>'],
    DIARY: ['<:TaskMastericon:1147705076677345322>'],
    TASKS: ['combat task\\:'],
    KEYS: ['has opened a loot key worth'],
};

/**
 * isChatMessage:
 * Determines if the message is a chat message by checking for a username pattern like **Name**:.
 *
 * @param {string} message - The raw message text.
 * @returns {boolean}
 */
function isChatMessage(message) {
    return /\*\*[^*]+\*\*:\s/.test(message);
}

/**
 * detectSystemMessage:
 * For non‑chat messages, checks if the message qualifies as a system message based on key phrases.
 *
 * @param {string} message - The raw message content.
 * @returns {string|null}
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
 * reformatText:
 * Trims extra whitespace and removes all backslashes.
 *
 * @param {string} text
 * @returns {string}
 */
function reformatText(text) {
    if (!text) return text;
    return text.replace(/\\/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * combineExtraName:
 * For system messages, if the message does not start with "has" or "received",
 * assume that tokens before that keyword belong to the username.
 * Append those tokens to the user field and remove them from the message.
 *
 * @param {string} user - The stored user.
 * @param {string} message - The system message.
 * @returns {{user: string, message: string}}
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
 * cleanupChatRow:
 * Cleans up chat messages (which follow the **Name**: format).
 *
 * @param {string} message
 * @returns {{username: string|null, cleanedMessage: string}}
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
 * cleanupTasksRow:
 * Cleans up combat tasks messages by removing the CA_ID prefix and extracting the proper username.
 * It accepts any text starting with "CA_ID" (with any separator) and then uses the first "|" as delimiter.
 *
 * Expected examples:
 * "CA_ID:537|roofs4life has completed a hard combat task: Fat of the Land."
 * "CA_ID.73.Collector 30 has completed a medium combat task: I'd Rather Not Learn."
 *
 * @param {string} message
 * @returns {{username: string|null, cleanedMessage: string}}
 */
function cleanupTasksRow(message) {
    if (!message) return { username: null, cleanedMessage: message };
    // Use a regex that finds "CA_ID" at the start and then any characters until the first "|"
    const regex = /^CA_ID.*?\|(.+)$/i;
    const match = message.match(regex);
    if (match) {
        // The remainder is assumed to be "username + space + message text"
        const remainder = reformatText(match[1]);
        const firstSpace = remainder.indexOf(' ');
        if (firstSpace !== -1) {
            const username = remainder.substring(0, firstSpace);
            const cleanedMessage = remainder.substring(firstSpace + 1);
            return { username, cleanedMessage };
        }
        return { username: remainder, cleanedMessage: '' };
    }
    // Fallback: assume username is the first token before "has completed"
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
 * cleanupKeysRow:
 * Cleans up keys messages.
 *
 * @param {string} message
 * @returns {{username: string|null, cleanedMessage: string}}
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
 * cleanupEmojiSystemMessage:
 * Cleans up system messages that start with one or more emoji definitions.
 * It removes any leading channel indicator (like "💬OSRS | Clan Chat")
 * and then extracts the username by searching for a known keyword.
 *
 * Example:
 * Input: "💬OSRS | Clan Chat <:Guideprices:1147702301298016349> DankGoldList received a drop: …"
 * Output: { username: "DankGoldList", cleanedMessage: "received a drop: …" }
 *
 * @param {string} message
 * @returns {{username: string|null, cleanedMessage: string}}
 */
function cleanupEmojiSystemMessage(message) {
    if (!message) return { username: null, cleanedMessage: reformatText(message) };
    // Remove any leading channel indicator
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

// Define which system types should use emoji cleanup.
const emojiCleanupTypes = ['DROP', 'QUESTS', 'COLLECTION_LOG', 'PERSONAL_BEST', 'PVP', 'PET_DROP', 'LEVEL_UP', 'COMBAT_ACHIEVEMENTS', 'CLUE_DROP', 'ATTENDANCE', 'DIARY'];

/**
 * saveSystemMessage:
 * Saves a system message into its designated system table.
 *
 * @param {string} type - The detected system message type.
 * @param {string} user - The cleaned sender.
 * @param {string} message - The cleaned message.
 * @param {string} messageId - The Discord message ID.
 * @param {number} timestamp - The message timestamp.
 */
async function saveSystemMessage(type, user, message, messageId, timestamp) {
    try {
        const db = await dbPromise;
        const tableName = systemTables[type];
        if (!tableName) {
            console.warn(`No table mapping defined for system type: ${type}`);
            return;
        }
        await db.run(`INSERT OR IGNORE INTO ${tableName} (user, message, message_id, timestamp) VALUES (?, ?, ?, ?)`, [user, message, messageId, new Date(timestamp).toISOString()]);
        console.log(`✅ 🎉 Saved system message of type [${type}] from [${user}]: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);
    } catch (error) {
        console.error(`❌ Error saving system message (type ${type}):`, error);
    }
}

/**
 * saveMessage:
 * Immediately cleans up and saves a message.
 * - Chat messages are handled by cleanupChatRow.
 * - For system messages, specialized functions are applied (for TASKS, KEYS, emoji-based types).
 * Then, combineExtraName centralizes formatting so that the message begins with "has" or "received".
 * If no system type is detected, falls back to chat message storage.
 *
 * @param {string} user - The raw sender.
 * @param {string} message - The raw message.
 * @param {string} messageId - The Discord message ID.
 * @param {number} timestamp - The message timestamp.
 */
async function saveMessage(user, message, messageId, timestamp) {
    try {
        if (isChatMessage(message)) {
            const { username, cleanedMessage } = cleanupChatRow(message);
            if (username) user = username;
            message = cleanedMessage;
            const db = await dbPromise;
            await db.run('INSERT OR IGNORE INTO chat_messages (user, message, message_id, timestamp) VALUES (?, ?, ?, ?)', [user, message, messageId, new Date(timestamp).toISOString()]);
            console.log(`✅ 💬Chat message stored in DB: [${user}] ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);
            return;
        }

        // For system messages, detect the type.
        // For system messages, detect the type.
        const systemType = detectSystemMessage(message);
        if (systemType) {
            if (systemType === 'TASKS') {
                const { username, cleanedMessage } = cleanupTasksRow(message);
                if (username) user = username;
                message = cleanedMessage;
            } else if (systemType === 'KEYS') {
                const { username, cleanedMessage } = cleanupKeysRow(message);
                if (username) user = username;
                message = cleanedMessage;
            } else if (systemType === 'RAID_DROP') {
                user = user.replace(/^💬OSRS\s*\|\s*Clan\s*Chat\s*<:[^>]+>\s*/i, '');
                const { username, cleanedMessage } = cleanupEmojiSystemMessage(message);
                if (username) user = username;
                message = cleanedMessage;
            } else if (emojiCleanupTypes.includes(systemType)) {
                const { username, cleanedMessage } = cleanupEmojiSystemMessage(message);
                if (username) user = username;
                message = cleanedMessage;
            } else {
                user = reformatText(user);
                message = reformatText(message);
            }
            // Centralized formatting: ensure system messages start with "has" or "received"
            const combined = combineExtraName(user, message);
            user = combined.user;
            message = combined.message;
            await saveSystemMessage(systemType, user, message, messageId, timestamp);
            return;
        }

        // Fallback: treat as chat message.
        user = reformatText(user);
        message = reformatText(message);
        const db = await dbPromise;
        await db.run('INSERT OR IGNORE INTO chat_messages (user, message, message_id, timestamp) VALUES (?, ?, ?, ?)', [user, message, messageId, new Date(timestamp).toISOString()]);
        console.log(`✅ Fallback chat message stored in DB: [${user}] ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);
    } catch (error) {
        console.error('❌ Database Save Error:', error);
    }
}

/**
 * getRecentMessages:
 * Retrieves recent chat messages.
 *
 * @param {number} limit - Number of messages to retrieve.
 * @returns {Promise<Array>}
 */
async function getRecentMessages(limit = 50) {
    const db = await dbPromise;
    return db.all('SELECT message FROM chat_messages ORDER BY timestamp DESC LIMIT ?', [limit]);
}

/**
 * fetchAndStoreChannelHistory:
 * Fetches the full message history from a Discord channel, cleans each message, and saves it.
 *
 * @param {Client} client - The Discord.js Client instance.
 * @param {string} channelId - The ID of the Discord channel.
 */
async function fetchAndStoreChannelHistory(client, channelId) {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) {
        console.log(`⚠️ Invalid text channel: ${channelId}`);
        return;
    }
    console.log(`📥 Fetching full message history from #${channel.name}...`);
    let lastMessageId = null;
    let totalFetched = 0;
    let hasMoreMessages = true;
    while (hasMoreMessages) {
        try {
            const messages = await channel.messages.fetch({ limit: 100, before: lastMessageId });
            if (!messages.size) break;
            for (const message of messages.values()) {
                await saveMessage(message.author.username, message.content, message.id, message.createdTimestamp);
            }
            lastMessageId = messages.last()?.id;
            totalFetched += messages.size;
            console.log(`✅ Fetched and logged ${totalFetched} messages so far...`);
            if (messages.size < 100) {
                hasMoreMessages = false;
            }
        } catch (error) {
            console.error('❌ Error fetching message history:', error);
            break;
        }
    }
    console.log(`🎉 Finished fetching ${totalFetched} messages from #${channel.name}`);
}

/**
 * initDatabase:
 * Initializes the database and creates necessary tables.
 */
async function initDatabase() {
    const db = await dbPromise;
    await db.exec('PRAGMA journal_mode=WAL;');
    await db.exec(`
  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user TEXT,
    message TEXT,
    message_id TEXT UNIQUE,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

    for (const tableName of Object.values(systemTables)) {
        await db.exec(`
    CREATE TABLE IF NOT EXISTS ${tableName} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user TEXT,
      message TEXT,
      message_id TEXT UNIQUE,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
    }
    console.log('✅ Database initialized (chat and system tables created) with WAL mode.');
}

module.exports = {
    initDatabase,
    saveMessage,
    getRecentMessages,
    dbPromise,
    fetchAndStoreChannelHistory,
    systemTables,
    SYSTEM_PATTERNS,
    detectSystemMessage,
    saveSystemMessage,
};
