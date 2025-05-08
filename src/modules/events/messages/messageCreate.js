const { saveMessage } = require('../../collection/msgDbSave');
const logger = require('../../utils/essentials/logger');
const db = require('../../utils/essentials/dbUtils');

module.exports = {
    name: 'messageCreate',
    once: false,
    async execute(message) {
        const row = await db.guild.getOne(
            'SELECT channel_id FROM ensured_channels WHERE channel_key = ?',
            ['clanchat_channel']
        );
        const ccChannelId = row.channel_id;
        if (!ccChannelId) return;
        if (message.channel.id === ccChannelId) {
            try {
                await saveMessage(
                    message.author.username,
                    message.content,
                    message.id,
                    message.createdTimestamp
                );
                logger.info(`✅ Message ${message.id} saved successfully.`);
            } catch (error) {
                logger.error(`🚨 Message save error for ${message.id}: ${error}`);
            }
        }

        if (!message.author.bot) {
            console.log(
                `📨 Discord message received from ${message.author.username}: ${message.content || '[Non-text content]'}`
            );

        }
    },
};
