const {
    guild: { getOne },
} = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
const { EmbedBuilder } = require('discord.js');
module.exports = {
    name: 'messageReactionRemoveEmoji',
    once: false,
    async execute(reaction, client) {
        logger.info(`🗑️ [MessageReactionRemoveEmoji] Emoji ${reaction.emoji.name} removed from all messages`);
        if (!reaction.message.guild) return;
        try {
            const logChannelData = await getOne('SELECT channel_id FROM ensured_channels WHERE channel_key = ?', ['reacted_logs']);
            if (!logChannelData) return;
            const logChannel = await reaction.message.guild.channels.cache.get(logChannelData.channel_id);
            if (!logChannel) return;
            let emoji;
            if (reaction.emoji.id) {
                emoji = reaction.emoji.animated ? `<a:${reaction.emoji.name}:${reaction.emoji.id}>` : `<:${reaction.emoji.name}:${reaction.emoji.id}>`;
            } else {
                emoji = reaction.emoji.name;
            }
            const emojiURL = reaction.emoji.id ? `https://cdn.discordapp.com/emojis/${reaction.emoji.id}.${reaction.emoji.animated ? 'gif' : 'png'}` : null;
            const messageLink = `https://discord.com/channels/${reaction.message.guildId}/${reaction.message.channelId}/${reaction.message.id}`;
            const userAvatar = client.user.displayAvatarURL({ dynamic: true, size: 1024 });
            const embed = new EmbedBuilder()
                .setColor(0xff0000)
                .setAuthor({ name: `${reaction.message.guild.name}`, iconURL: reaction.message.guild.iconURL({ dynamic: true }) })
                .setTitle('❌ Reaction Removed')
                .addFields(
                    { name: '📌 Channel', value: `<#${reaction.message.channelId}>`, inline: true },
                    { name: '\u200b', value: `🗑️ **Reaction Removed:**  \`${emoji}\`\n\u200b`, inline: false },
                    { name: '🔗 Message', value: messageLink, inline: false },
                )
                .setTimestamp();
            if (emojiURL) {
                embed.setThumbnail(emojiURL);
            } else {
                embed.setThumbnail(userAvatar);
            }
            await logChannel.send({ embeds: [embed] });
            logger.info(`📋 Logged reaction removal ${emoji}.`);
        } catch (error) {
            logger.error(`❌ Error logging removal reaction: ${error.message}`);
        }
    },
};
