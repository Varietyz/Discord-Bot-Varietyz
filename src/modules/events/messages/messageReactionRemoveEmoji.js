// src/modules/events/messageReactionRemoveEmoji.js

const {
    guild: { getOne },
} = require('../../utils/dbUtils');
const logger = require('../../utils/logger');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'messageReactionRemoveEmoji',
    once: false,
    /**
     * Triggered when a specific emoji is removed from all messages.
     * @param reaction
     * @param client - The Discord client.
     */
    async execute(reaction, client) {
        logger.info(`🗑️ [MessageReactionRemoveEmoji] Emoji ${reaction.emoji.name} removed from all messages`);
        if (!reaction.message.guild) return;

        try {
            // 🔍 Retrieve the logging channel from DB
            const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['reacted_logs']);
            if (!logChannelData) return;

            const logChannel = await reaction.message.guild.channels.cache.get(logChannelData.channel_id);
            if (!logChannel) return;

            // 🏷️ Reaction Details
            let emoji;
            if (reaction.emoji.id) {
                // ✅ Custom emoji
                emoji = reaction.emoji.animated
                    ? `<a:${reaction.emoji.name}:${reaction.emoji.id}>` // Animated custom emoji
                    : `<:${reaction.emoji.name}:${reaction.emoji.id}>`; // Static custom emoji
            } else {
                // ✅ Unicode emoji
                emoji = reaction.emoji.name;
            }

            const emojiURL = reaction.emoji.id ? `https://cdn.discordapp.com/emojis/${reaction.emoji.id}.${reaction.emoji.animated ? 'gif' : 'png'}` : null;

            const messageLink = `https://discord.com/channels/${reaction.message.guildId}/${reaction.message.channelId}/${reaction.message.id}`;
            const userAvatar = client.user.displayAvatarURL({ dynamic: true, size: 1024 });

            // 🛠️ Construct Embed
            const embed = new EmbedBuilder()
                .setColor(0xff0000) // red for removes
                .setAuthor({ name: `${reaction.message.guild.name}`, iconURL: reaction.message.guild.iconURL({ dynamic: true }) })
                .setTitle('❌ Reaction Removed')
                .addFields(
                    { name: '📌 Channel', value: `<#${reaction.message.channelId}>`, inline: true },
                    { name: '\u200b', value: `🗑️ **Reaction Removed:**  \`${emoji}\`\n\u200b`, inline: false },
                    { name: '🔗 Message', value: messageLink, inline: false },
                )
                .setTimestamp();

            // 🖼️ If it's a custom emoji, display it in `.setImage()`
            if (emojiURL) {
                embed.setThumbnail(emojiURL);
            } else {
                embed.setThumbnail(userAvatar);
            }

            // 🔍 Send the log message
            await logChannel.send({ embeds: [embed] });
            logger.info(`📋 Logged reaction removal ${emoji}.`);
        } catch (error) {
            logger.error(`❌ Error logging removal reaction: ${error.message}`);
        }
    },
};
