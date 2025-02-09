// src/modules/events/messageReactionAdd.js

const {
    guild: { getOne },
} = require('../../utils/dbUtils');
const logger = require('../../utils/logger');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'messageReactionAdd',
    async execute(reaction, user) {
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
            const userAvatar = user.displayAvatarURL({ dynamic: true, size: 1024 });

            // 🛠️ Construct Embed
            const embed = new EmbedBuilder()
                .setAuthor({ name: `${reaction.message.guild.name}`, iconURL: reaction.message.guild.iconURL({ dynamic: true }) })
                .addFields(
                    { name: '👤 User', value: `<@${user.id}>`, inline: true },
                    { name: '📌 Channel', value: `<#${reaction.message.channelId}>`, inline: true },
                    { name: '\u200b', value: `:diamond_shape_with_a_dot_inside: **Reacted:**  \`${emoji}\`\n\u200b`, inline: false },
                    { name: '🔗 Message', value: messageLink, inline: false },
                )
                .setTimestamp();

            // 🖼️ If it's a custom emoji, display it in `.setImage()`
            if (emojiURL) {
                embed.setThumbnail(emojiURL);
                embed.setTitle(`✅ Custom Reaction Added by ${user.globalName || user.username}`);
                embed.setColor(0xffa500); // Orange for custom reactions
            } else {
                embed.setThumbnail(userAvatar);
                embed.setTitle(`✅ Reaction Added by ${user.globalName || user.username}`);
                embed.setColor(0x00ff00); // Green for reactions
            }

            // 🔍 Send the log message
            await logChannel.send({ embeds: [embed] });
            logger.info(`📋 Logged reaction ${emoji} from ${user.tag}.`);
        } catch (error) {
            logger.error(`❌ Error logging reaction addition: ${error.message}`);
        }
    },
};
