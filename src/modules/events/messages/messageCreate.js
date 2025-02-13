// src/modules/events/messageCreate.js

const { CLAN_CHAT_CHANNEL_ID } = require('../../../config/constants');
const { saveMessage } = require('../../collection/msgDbSave');
const logger = require('../../utils/essentials/logger');

module.exports = {
    name: 'messageCreate', // Event name
    once: false,
    /**
     * Execute when a new message is created.
     * @param message - The Discord message object.
     */
    async execute(message) {
        // Only process messages from the designated channel.
        if (message.channel.id !== CLAN_CHAT_CHANNEL_ID) return;

        try {
            await saveMessage(message.author.username, message.content, message.id, message.createdTimestamp);
            logger.info(`✅ Message ${message.id} saved successfully.`);
        } catch (error) {
            logger.error(`🚨 Message save error for ${message.id}: ${error}`);
        }
    },
};
