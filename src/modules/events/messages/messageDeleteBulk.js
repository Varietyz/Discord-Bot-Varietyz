const { deletedThreads } = require('../channels/threads/threadDelete'); // 🔄 Import deletedThreads Set
const { EmbedBuilder } = require('discord.js');
const {
    guild: { getOne },
} = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');

module.exports = {
    name: 'messageDeleteBulk',
    once: false,

    /**
     * Triggered when multiple messages are deleted at once.
     * @param messages - Collection of deleted messages.
     */
    async execute(messages) {
        if (!messages.first()?.guild) return;

        try {
            const channel = messages.first().channel;
            const guild = messages.first().guild;

            // 🚫 **Skip if messages belong to a deleted thread**
            if (deletedThreads.has(channel.id)) {
                logger.info(`🛑 [MessageDeleteBulk] Ignoring messages from deleted thread: ${channel.name}`);
                return;
            }

            // 🔍 Fetch log channel
            const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['message_logs']);
            if (!logChannelData) return;

            const logChannel = await guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) return;

            // 📌 Build Embed
            const embed = new EmbedBuilder()
                .setColor(0xe74c3c) // Red for deletions
                .setTitle('🗑️ Bulk Messages Deleted')
                .setDescription(`**${messages.size}** messages were deleted in <#${channel.id}>.`)
                .setTimestamp();

            // 📤 Send log
            await logChannel.send({ embeds: [embed] });

            logger.info(`📋 Successfully logged bulk message deletion in ${channel.name}`);
        } catch (error) {
            logger.error(`❌ Error logging bulk message deletion: ${error.message}`);
        }
    },
};
