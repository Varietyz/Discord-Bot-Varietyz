// src/modules/events/messageCreate.js

const { saveMessage } = require('../../collection/msgDbSave');
const logger = require('../../utils/essentials/logger');
const db = require('../../utils/essentials/dbUtils');

module.exports = {
    name: 'messageCreate', // Event name
    once: false,
    /**
     * Execute when a new message is created.
     * @param message - The Discord message object.
     */
    async execute(message) {
        const row = await db.guild.getOne('SELECT channel_id FROM setup_channels WHERE setup_key = ?', ['clanchat_channel']);

        if (!row) {
            // No channel configured => do nothing or log
            return;
        }

        // 2) Extract the actual string ID
        const ccChannelId = row.channel_id;

        // 3) Compare it properly
        if (message.channel.id !== ccChannelId) return;

        try {
            await saveMessage(message.author.username, message.content, message.id, message.createdTimestamp);
            logger.info(`✅ Message ${message.id} saved successfully.`);
        } catch (error) {
            logger.error(`🚨 Message save error for ${message.id}: ${error}`);
        }
    },
};
