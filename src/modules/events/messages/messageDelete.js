// src/modules/events/messageDelete.js

const {
    guild: { getOne },
} = require('../../utils/dbUtils');
const logger = require('../../utils/logger');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'messageDelete',
    async execute(message) {
        if (!message.guild) return;

        try {
            // 🔍 Retrieve the logging channel from DB
            const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['message_logs']);
            if (!logChannelData) return;

            const logChannel = message.guild.channels.cache.get(logChannelData.channel_id);
            if (!logChannel) return;

            // 🏷️ Message Details
            const messageContent = message.content ? `\`\`\`${message.content}\`\`\`` : '**```[No Text Content]```**';
            const hasAttachments = message.attachments.size > 0;
            const attachmentLinks = hasAttachments ? message.attachments.map((att) => `[Attachment](${att.url})`).join('\n') : '**`None`**';
            const firstImage = hasAttachments ? message.attachments.find((att) => att.contentType?.startsWith('image/'))?.url : null;

            const embed = new EmbedBuilder();
            embed.setColor(0xff0000); // Red for deletions
            embed.setAuthor({ name: `${message.guild.name}`, iconURL: message.guild.iconURL({ dynamic: true }) });
            embed.addFields({ name: '📌 Channel', value: `<#${message.channel.id}>`, inline: true });
            if (!message.author) {
                // 🛠️ Construct Embed
                embed.setTitle('🗑️ Older/Uncached Message Deleted');
                logger.info('📋 Logged older/uncached deleted message.');
            } else {
                // 🖼️ User's Profile Image
                const userAvatar = message.author.displayAvatarURL({ dynamic: true, size: 1024 });

                embed.setThumbnail(`${userAvatar}`);
                embed.setTitle(`🗑️ Message Deleted From ${message.author.displayName}`);
                embed.addFields({ name: '👤 User', value: `<@${message.author.id}>`, inline: true }, { name: '📝 Content', value: messageContent, inline: false }, { name: '📎 Attachments', value: attachmentLinks, inline: false });
                logger.info(`📋 Logged deleted message from ${message.author.tag}.`);
            }
            embed.setTimestamp();

            // 🖼️ If an image exists, display it
            if (firstImage) {
                embed.setImage(firstImage);
            }

            // 🔍 Send the log message
            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            logger.error(`❌ Error logging message deletion: ${error.message}`);
        }
    },
};
