const {
    guild: { getOne },
} = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
const { EmbedBuilder } = require('discord.js');
module.exports = {
    name: 'messageReactionAdd',
    async execute(reaction, user) {
        if (!reaction.message.guild) return;
        try {
            const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['reacted_logs']);
            if (!logChannelData) return;
            const logChannel = await reaction.message.guild.channels.cache.get(logChannelData.channel_id);
            if (!logChannel) return;
            let emoji;
            if (reaction.emoji.id) {
                emoji = reaction.emoji.animated
                    ? `<a:${reaction.emoji.name}:${reaction.emoji.id}>`
                    : `<:${reaction.emoji.name}:${reaction.emoji.id}>`;
            } else {
                emoji = reaction.emoji.name;
            }
            const emojiURL = reaction.emoji.id ? `https://cdn.discordapp.com/emojis/${reaction.emoji.id}.${reaction.emoji.animated ? 'gif' : 'png'}` : null;
            const messageLink = `https://discord.com/channels/${reaction.message.guildId}/${reaction.message.channelId}/${reaction.message.id}`;
            const userAvatar = user.displayAvatarURL({ dynamic: true, size: 1024 });
            const embed = new EmbedBuilder()
                .setAuthor({ name: `${reaction.message.guild.name}`, iconURL: reaction.message.guild.iconURL({ dynamic: true }) })
                .addFields(
                    { name: '👤 User', value: `<@${user.id}>`, inline: true },
                    { name: '📌 Channel', value: `<#${reaction.message.channelId}>`, inline: true },
                    { name: '\u200b', value: `:diamond_shape_with_a_dot_inside: **Reacted:**  \`${emoji}\`\n\u200b`, inline: false },
                    { name: '🔗 Message', value: messageLink, inline: false },
                )
                .setTimestamp();
            if (emojiURL) {
                embed.setThumbnail(emojiURL);
                embed.setTitle(`✅ Custom Reaction Added by ${user.globalName || user.username}`);
                embed.setColor(0xffa500);
            } else {
                embed.setThumbnail(userAvatar);
                embed.setTitle(`✅ Reaction Added by ${user.globalName || user.username}`);
                embed.setColor(0x00ff00);
            }
            await logChannel.send({ embeds: [embed] });
            logger.info(`📋 Logged reaction ${emoji} from ${user.tag}.`);
        } catch (error) {
            logger.error(`❌ Error logging reaction addition: ${error.message}`);
        }
    },
};