const {
    guild: { getOne, runQuery },
} = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
const { EmbedBuilder, AuditLogEvent } = require('discord.js');
module.exports = {
    name: 'emojiUpdate',
    once: false,
    async execute(oldEmoji, newEmoji) {
        if (!newEmoji.guild) {
            logger.warn('⚠️ [EmojiUpdate] No guild found for emoji update.');
            return;
        }
        try {
            logger.info(`✏️ [EmojiUpdate] Emoji updated in guild ${newEmoji.guild.name}: "${oldEmoji.name}" → "${newEmoji.name}"`);
            const existingEmoji = await getOne('SELECT emoji_key FROM guild_emojis WHERE emoji_id = ?', [newEmoji.id]);
            if (!existingEmoji) {
                logger.warn(`⚠️ [EmojiUpdate] No existing key found for emoji "${newEmoji.name}". Skipping update.`);
                return;
            }
            const uniqueKey = existingEmoji.emoji_key;
            if (newEmoji.name === uniqueKey) {
                logger.info(`✅ [EmojiUpdate] Emoji "${newEmoji.name}" already has correct key, skipping rename.`);
                return;
            }
            await runQuery(
                `UPDATE guild_emojis 
                 SET emoji_name = ?, emoji_format = ?
                 WHERE emoji_id = ?`,
                [newEmoji.name, formatEmoji(newEmoji), newEmoji.id],
            );
            logger.info(`📌 [EmojiUpdate] Successfully updated emoji name: "${oldEmoji.name}" → "${newEmoji.name}" (Key: "${uniqueKey}")`);
            const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['server_logs']);
            if (!logChannelData) return;
            const logChannel = await newEmoji.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) return;
            await new Promise((resolve) => setTimeout(resolve, 3000));
            const fetchedLogs = await newEmoji.guild.fetchAuditLogs({ type: AuditLogEvent.EmojiUpdate, limit: 5 });
            const emojiLog = fetchedLogs.entries.find((entry) => entry.target.id === newEmoji.id && Date.now() - entry.createdTimestamp < 10000);
            let updatedBy = '`Unknown`';
            if (emojiLog) {
                updatedBy = `<@${emojiLog.executor.id}>`;
                logger.info(`✅ Detected emoji update by: ${updatedBy}`);
            }
            const embed = new EmbedBuilder()
                .setColor(0xf1c40f)
                .setTitle('✏️ Emoji Updated')
                .setDescription('# ' + newEmoji.toString())
                .addFields(
                    { name: '📌 Old Name', value: `\`${oldEmoji.name}\``, inline: true },
                    { name: '📌 New Name', value: `\`${newEmoji.name}\``, inline: true },
                    { name: '🔑 Assigned Key', value: `\`${uniqueKey}\``, inline: true },
                    { name: '🛠 Updated By', value: updatedBy, inline: false },
                )
                .setTimestamp();
            await logChannel.send({ embeds: [embed] });
            logger.info(`📋 Successfully logged emoji update: ${oldEmoji.name} → ${newEmoji.name}`);
        } catch (error) {
            logger.error(`❌ Error logging emoji update: ${error.message}`);
        }
    },
};
function formatEmoji(emoji) {
    return emoji.animated ? `<a:${emoji.name}:${emoji.id}>` : `<:${emoji.name}:${emoji.id}>`;
}