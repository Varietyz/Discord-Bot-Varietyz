// src/modules/events/messageUpdate.js

const {
    guild: { getOne },
} = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'messageUpdate',
    async execute(oldMessage, newMessage) {
        // Check if newMessage exists and if it's not from a bot
        if (!newMessage || !newMessage.guild || newMessage.author.bot) return;

        try {
            // Ensure the new message is fully fetched if it's partial (uncached)
            if (newMessage.partial) {
                try {
                    await newMessage.fetch(newMessage.id);
                } catch (error) {
                    logger.error('❌ Error fetching newMessage data:', error);
                    return;
                }
            }

            // Similarly ensure the old message is fetched properly if it's partial
            if (oldMessage && oldMessage.partial) {
                try {
                    await oldMessage.fetch(oldMessage.id);
                } catch (error) {
                    logger.error('❌ Error fetching oldMessage data:', error);
                    return;
                }
            }

            // Retrieve the logging channel from DB
            const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['message_logs']);
            if (!logChannelData) return;

            const logChannel = await newMessage.guild.channels.cache.get(logChannelData.channel_id);
            if (!logChannel) return;

            // 🏷️ Message Details
            const oldContent = oldMessage?.content ? `\`\`\`${oldMessage.content}\`\`\`` : '```[No Text Content]```';
            const newContent = newMessage.content ? `\`\`\`${newMessage.content}\`\`\`` : '```[No Text Content]```';
            const hasAttachments = newMessage.attachments.size > 0;
            const attachmentLinks = hasAttachments ? newMessage.attachments.map((att) => `[Attachment](${att.url})`).join('\n') : '**`None`**';
            const firstImage = hasAttachments ? newMessage.attachments.find((att) => att.contentType?.startsWith('image/'))?.url : null;

            // 🖼️ User's Profile Image
            const userAvatar = newMessage.author.displayAvatarURL({ dynamic: true, size: 1024 });
            const messageLink = `https://discord.com/channels/${newMessage.guild.id}/${newMessage.channel.id}/${newMessage.id}`;

            // 🛠️ Construct Embed
            const embed = new EmbedBuilder()
                .setColor(0xffa500) // Orange for edits
                .setThumbnail(userAvatar)
                .setAuthor({ name: `${newMessage.guild.name}`, iconURL: newMessage.guild.iconURL({ dynamic: true }) })
                .setTitle(`✏️ Message Edited by ${newMessage.author.displayName}`)
                .addFields(
                    { name: '👤 User', value: `<@${newMessage.author.id}>`, inline: true },
                    { name: '📌 Channel', value: `<#${newMessage.channel.id}>`, inline: true },
                    { name: '🔗 Message', value: messageLink, inline: false },
                    { name: '📝 Before', value: oldContent, inline: false },
                    { name: '📝 After', value: newContent, inline: false },
                    { name: '📎 Attachments', value: attachmentLinks, inline: false },
                )
                .setTimestamp();

            // 🖼️ If an image exists, display it
            if (firstImage) {
                embed.setImage(firstImage);
            }

            // 🔍 Send the log message
            await logChannel.send({ embeds: [embed] });
            logger.info(`📋 Logged message edit from ${newMessage.author.tag}.`);
        } catch (error) {
            logger.error(`❌ Error logging message edit: ${error.message}`);
        }
    },
};
