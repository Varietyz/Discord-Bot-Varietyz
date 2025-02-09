// src/modules/events/emojiCreate.js

const {
    guild: { getOne, runQuery },
} = require('../../utils/dbUtils');
const logger = require('../../utils/logger');
const { EmbedBuilder, AuditLogEvent } = require('discord.js');

module.exports = {
    name: 'emojiCreate',
    once: false,

    /**
     * Triggered when a new emoji is created.
     * @param emoji - The emoji that was created.
     */
    async execute(emoji) {
        if (!emoji.guild) {
            logger.warn('⚠️ [EmojiCreate] No guild found for emoji creation.');
            return;
        }

        try {
            logger.info(`😀 [EmojiCreate] Emoji "${emoji.name}" (ID: ${emoji.id}) was created in guild: ${emoji.guild.name}`);

            // ✅ Insert the new emoji into the database
            await runQuery(
                `INSERT INTO guild_emojis (emoji_id, emoji_name, emoji_format, animated) 
                 VALUES (?, ?, ?, ?) 
                 ON CONFLICT(emoji_id) DO UPDATE 
                 SET emoji_name = excluded.emoji_name, emoji_format = excluded.emoji_format, animated = excluded.animated`,
                [emoji.id, emoji.name, emoji.toString(), emoji.animated ? 1 : 0],
            );

            // 🔍 Fetch the logging channel
            const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['server_logs']);
            if (!logChannelData) return;

            const logChannel = await emoji.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) return;

            // 🕵️ Fetch audit logs to determine who created the emoji
            await new Promise((resolve) => setTimeout(resolve, 3000)); // ⏳ Wait for audit log update
            const fetchedLogs = await emoji.guild.fetchAuditLogs({ type: AuditLogEvent.EmojiCreate, limit: 5 });

            const emojiLog = fetchedLogs.entries.find((entry) => entry.target.id === emoji.id && Date.now() - entry.createdTimestamp < 10000);

            let createdBy = '`Unknown`';
            if (emojiLog) {
                createdBy = `<@${emojiLog.executor.id}>`;
                logger.info(`✅ Detected emoji creation by: ${createdBy}`);
            }

            // 🛠️ Construct Embed
            const embed = new EmbedBuilder()
                .setColor(0x2ecc71) // Green for new emojis
                .setTitle('😀 New Emoji Created')
                .addFields(
                    { name: '\u200b', value: emoji.toString(), inline: false },
                    { name: '📝 Name', value: `\`${emoji.name}\``, inline: true },
                    { name: '🎥 Animated', value: emoji.animated ? '`✅ Yes`' : '`❌ No`', inline: true },
                    { name: '🛠 Created By', value: createdBy, inline: false },
                )
                .setTimestamp();

            // 📌 Send the embed
            await logChannel.send({ embeds: [embed] });

            logger.info(`📋 Successfully logged new emoji creation: ${emoji.name}`);
        } catch (error) {
            logger.error(`❌ Error logging emoji creation: ${error.message}`);
        }
    },
};
