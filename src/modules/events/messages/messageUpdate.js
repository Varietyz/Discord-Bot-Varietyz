const {
    guild: { getOne },
} = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
const { EmbedBuilder } = require('discord.js');
module.exports = {
    name: 'messageUpdate',
    async execute(oldMessage, newMessage) {
        if (!newMessage || !newMessage.guild || newMessage.author.bot) return;
        try {
            if (newMessage.partial) {
                try {
                    await newMessage.fetch(newMessage.id);
                } catch (error) {
                    logger.error('❌ Error fetching newMessage data:', error);
                    return;
                }
            }
            if (oldMessage && oldMessage.partial) {
                try {
                    await oldMessage.fetch(oldMessage.id);
                } catch (error) {
                    logger.error('❌ Error fetching oldMessage data:', error);
                    return;
                }
            }
            const logChannelData = await getOne('SELECT channel_id FROM ensured_channels WHERE channel_key = ?', ['message_logs']);
            if (!logChannelData) return;
            const logChannel = await newMessage.guild.channels.cache.get(logChannelData.channel_id);
            if (!logChannel) return;
            const oldContent = oldMessage?.content ? `\`\`\`${oldMessage.content}\`\`\`` : '```[No Text Content]```';
            const newContent = newMessage.content ? `\`\`\`${newMessage.content}\`\`\`` : '```[No Text Content]```';
            const hasAttachments = newMessage.attachments.size > 0;
            const attachmentLinks = hasAttachments ? newMessage.attachments.map((att) => `[Attachment](${att.url})`).join('\n') : '**`None`**';
            const firstImage = hasAttachments ? newMessage.attachments.find((att) => att.contentType?.startsWith('image/'))?.url : null;
            const userAvatar = newMessage.author.displayAvatarURL({ dynamic: true, size: 1024 });
            const messageLink = `https://discord.com/channels/${newMessage.guild.id}/${newMessage.channel.id}/${newMessage.id}`;
            const embed = new EmbedBuilder()
                .setColor(0xffa500)
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
            if (firstImage) {
                embed.setImage(firstImage);
            }
            await logChannel.send({ embeds: [embed] });
            logger.info(`📋 Logged message edit from ${newMessage.author.tag}.`);
        } catch (error) {
            logger.error(`❌ Error logging message edit: ${error.message}`);
        }
    },
};
