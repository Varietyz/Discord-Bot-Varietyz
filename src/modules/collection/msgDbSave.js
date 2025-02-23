const { dbPromise, systemTables, emojiCleanupTypes } = require('./msgDbConstants');
const maindb = require('../utils/essentials/dbUtils');
const { reformatText, isChatMessage, cleanupEmojiSystemMessage, cleanupKeysRow, cleanupTasksRow, cleanupChatRow, combineExtraName, detectSystemMessage } = require('./msgDbUtils');
const logger = require('../utils/essentials/logger');
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
            const db = await dbPromise;
            await db.run('INSERT OR IGNORE INTO chat_messages (rsn, message, message_id, timestamp) VALUES (?, ?, ?, ?)', [rsn, message, messageId, new Date(timestamp).toISOString()]);
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
        const db = await dbPromise;
        await db.run('INSERT OR IGNORE INTO chat_messages (rsn, message, message_id, timestamp) VALUES (?, ?, ?, ?)', [rsn, message, messageId, new Date(timestamp).toISOString()]);
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
        const db = await dbPromise;
        const tableName = systemTables[type];
        if (!tableName) {
            logger.warn(`⚠️ No table mapping defined for system type: ${type}`);
            return;
        }
        await db.run(`INSERT OR IGNORE INTO ${tableName} (rsn, message, message_id, timestamp) VALUES (?, ?, ?, ?)`, [rsn, message, messageId, new Date(timestamp).toISOString()]);
        logger.info(`✅ 🎉 Saved system message of type [${type}] from [${rsn}]: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);
        await trackDropForBingo(rsn, message, messageId, timestamp);
    } catch (error) {
        logger.error(`❌ Error saving system message (type ${type}):`, error);
    }
}

/**
 * Tracks drops and raid drops for Bingo tasks.
 * - Checks saved messages in `drops` and `raid_drops` tables.
 * - Matches them to dynamic tasks in `bingo_tasks`.
 * - Registers progress in `bingo_task_progress`.
 * @param {string} rsn - The RSN of the player.
 * @param {string} message - The message content.
 * @param {string} messageId - The ID of the Discord message.
 * @param {number} timestamp - The timestamp of the message.
 */
async function trackDropForBingo(rsn, message, messageId, timestamp) {
    try {
        // Fetch ongoing events
        const ongoingEvents = await maindb.getAll(`
            SELECT event_id, start_time, end_time
            FROM bingo_state
            WHERE state='ongoing'
        `);

        if (ongoingEvents.length === 0) return;

        // Fetch all Drop-type dynamic tasks
        const tasks = await maindb.getAll(`
            SELECT task_id, parameter, description
            FROM bingo_tasks
            WHERE is_dynamic = 1
              AND type = 'Drop'
        `);

        if (tasks.length === 0) return;

        for (const task of tasks) {
            const { task_id, parameter } = task;

            // Check if message matches the task parameter
            if (message.includes(parameter)) {
                for (const event of ongoingEvents) {
                    const { event_id, start_time, end_time } = event;

                    // Check if message is within the event timeframe
                    if (new Date(timestamp) >= new Date(start_time) && new Date(timestamp) <= new Date(end_time)) {
                        const player = await maindb.getOne(
                            `
                            SELECT player_id
                            FROM registered_rsn
                            WHERE LOWER(rsn) = LOWER(?)
                        `,
                            [rsn.toLowerCase()],
                        );

                        if (!player) {
                            logger.warn(`[trackDropForBingo] No player_id found for RSN: ${rsn}. Skipping.`);
                            continue;
                        }

                        const player_id = player.player_id;
                        const progressVal = 1;
                        const status = 'completed';

                        // Register task progress
                        await maindb.runQuery(
                            `
                            INSERT INTO bingo_task_progress (event_id, player_id, task_id, progress_value, status, points_awarded)
                            VALUES (?, ?, ?, ?, ?, 0)
                        `,
                            [event_id, player_id, task_id, progressVal, status],
                        );

                        logger.info(`[trackDropForBingo] Task #${task_id} completed by ${rsn} for event #${event_id}`);
                    }
                }
            }
        }
    } catch (error) {
        logger.error(`[trackDropForBingo] Error: ${error.message}`);
    }
}

module.exports = {
    saveMessage,
    trackDropForBingo,
};
