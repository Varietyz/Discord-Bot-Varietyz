// src/modules/events/emojiDelete.js

const { runQuery, getOne } = require('../../utils/dbUtils');
const logger = require('../../utils/logger');
const { EmbedBuilder, AuditLogEvent } = require('discord.js');

module.exports = {
    name: 'emojiDelete',
    once: false,

    /**
     * Triggered when an emoji is deleted.
     * @param emoji - The emoji that was deleted.
     */
    async execute(emoji) {
        if (!emoji.guild) {
            logger.warn('⚠️ [EmojiDelete] No guild found for emoji deletion.');
            return;
        }

        try {
            logger.info(`🗑️ [EmojiDelete] Emoji "${emoji.name}" (ID: ${emoji.id}) was deleted from guild: ${emoji.guild.name}`);

            // ✅ Remove the deleted emoji from the database
            await runQuery('DELETE FROM guild_emojis WHERE emoji_id = ?', [emoji.id]);

            // 🔍 Fetch the logging channel
            const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['server_logs']);
            if (!logChannelData) return;

            const logChannel = await emoji.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) return;

            // 🕵️ Fetch audit logs to determine who deleted the emoji
            await new Promise((resolve) => setTimeout(resolve, 3000)); // ⏳ Wait for audit log update
            const fetchedLogs = await emoji.guild.fetchAuditLogs({ type: AuditLogEvent.EmojiDelete, limit: 5 });

            const emojiLog = fetchedLogs.entries.find((entry) => entry.target.id === emoji.id && Date.now() - entry.createdTimestamp < 10000);

            let deletedBy = '`Unknown`';
            if (emojiLog) {
                deletedBy = `<@${emojiLog.executor.id}>`;
                logger.info(`✅ Detected emoji deletion by: ${deletedBy}`);
            }

            // 🛠️ Construct Embed
            const embed = new EmbedBuilder()
                .setColor(0xe74c3c) // Red for deleted emojis
                .setTitle('🗑️ Emoji Deleted')
                .addFields({ name: '📌 Emoji Name', value: `\`${emoji.name}\``, inline: true }, { name: '🛠 Deleted By', value: deletedBy, inline: false })
                .setTimestamp();

            // 📌 Send the embed
            await logChannel.send({ embeds: [embed] });

            logger.info(`📋 Successfully logged emoji deletion: ${emoji.name}`);
        } catch (error) {
            logger.error(`❌ Error logging emoji deletion: ${error.message}`);
        }
    },
};
