// src/modules/events/emojiUpdate.js

const {
    guild: { getOne, runQuery },
} = require('../../utils/dbUtils');
const logger = require('../../utils/logger');
const { EmbedBuilder, AuditLogEvent } = require('discord.js');

module.exports = {
    name: 'emojiUpdate',
    once: false,

    /**
     * Triggered when an emoji is updated.
     * @param oldEmoji - The emoji before the update.
     * @param newEmoji - The emoji after the update.
     */
    async execute(oldEmoji, newEmoji) {
        if (!newEmoji.guild) {
            logger.warn('⚠️ [EmojiUpdate] No guild found for emoji update.');
            return;
        }

        try {
            logger.info(`✏️ [EmojiUpdate] Emoji updated in guild ${newEmoji.guild.name}: "${oldEmoji.name}" → "${newEmoji.name}"`);

            // ✅ Update the emoji name in the database
            await runQuery('UPDATE guild_emojis SET emoji_name = ?, emoji_format = ? WHERE emoji_id = ?', [newEmoji.name, formatEmoji(newEmoji), newEmoji.id]);

            // 🔍 Fetch the logging channel
            const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['server_logs']);
            if (!logChannelData) return;

            const logChannel = await newEmoji.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) return;

            // 🕵️ Fetch audit logs to determine who updated the emoji
            await new Promise((resolve) => setTimeout(resolve, 3000)); // ⏳ Wait for audit log update
            const fetchedLogs = await newEmoji.guild.fetchAuditLogs({ type: AuditLogEvent.EmojiUpdate, limit: 5 });

            const emojiLog = fetchedLogs.entries.find((entry) => entry.target.id === newEmoji.id && Date.now() - entry.createdTimestamp < 10000);

            let updatedBy = '`Unknown`';
            if (emojiLog) {
                updatedBy = `<@${emojiLog.executor.id}>`;
                logger.info(`✅ Detected emoji update by: ${updatedBy}`);
            }

            // 🛠️ Construct Embed
            const embed = new EmbedBuilder()
                .setColor(0xf1c40f) // Yellow for updated emojis
                .setTitle('✏️ Emoji Updated')
                .addFields(
                    { name: '\u200b', value: newEmoji.toString(), inline: false },
                    { name: '📌 Old Name', value: `\`${oldEmoji.name}\``, inline: true },
                    { name: '📌 New Name', value: `\`${newEmoji.name}\``, inline: true },
                    { name: '🛠 Updated By', value: updatedBy, inline: false },
                )
                .setTimestamp();

            // 📌 Send the embed
            await logChannel.send({ embeds: [embed] });

            logger.info(`📋 Successfully logged emoji update: ${oldEmoji.name} → ${newEmoji.name}`);
        } catch (error) {
            logger.error(`❌ Error logging emoji update: ${error.message}`);
        }
    },
};

/**
 * Formats an emoji for easy usage (`<:name:id>` or `<a:name:id>` for animated).
 * @param emoji - The emoji object.
 * @returns {string} - The formatted emoji string.
 */
function formatEmoji(emoji) {
    return emoji.animated ? `<a:${emoji.name}:${emoji.id}>` : `<:${emoji.name}:${emoji.id}>`;
}
