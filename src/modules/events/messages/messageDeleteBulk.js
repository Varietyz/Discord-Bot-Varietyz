const { deletedThreads } = require('../channels/threads/threadDelete');
const { EmbedBuilder } = require('discord.js');
const {
    guild: { getOne },
} = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
module.exports = {
    name: 'messageDeleteBulk',
    once: false,
    async execute(messages) {
        if (!messages.first()?.guild) return;
        try {
            const channel = messages.first().channel;
            const guild = messages.first().guild;
            if (deletedThreads.has(channel.id)) {
                logger.info(`🛑 [MessageDeleteBulk] Ignoring messages from deleted thread: ${channel.name}`);
                return;
            }
            const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['message_logs']);
            if (!logChannelData) return;
            const logChannel = await guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) return;
            const embed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('🗑️ Bulk Messages Deleted')
                .setDescription(`**${messages.size}** messages were deleted in <#${channel.id}>.`)
                .setTimestamp();
            await logChannel.send({ embeds: [embed] });
            logger.info(`📋 Successfully logged bulk message deletion in ${channel.name}`);
        } catch (error) {
            logger.error(`❌ Error logging bulk message deletion: ${error.message}`);
        }
    },
};