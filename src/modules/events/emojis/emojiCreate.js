const {
    guild: { getOne, runQuery, getAll },
} = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { normalizeKey } = require('../../utils/normalizing/normalizeKey');
module.exports = {
    name: 'emojiCreate',
    once: false,
    async execute(emoji) {
        if (!emoji.guild) {
            logger.warn('⚠️ [EmojiCreate] No guild found for emoji creation.');
            return;
        }
        try {
            logger.info(`😀 [EmojiCreate] Emoji "${emoji.name}" (ID: ${emoji.id}) created in guild: ${emoji.guild.name}`);
            const baseKey = await normalizeKey(emoji.name, 'emoji', { guild: { getAll } });
            await runQuery(
                `INSERT INTO guild_emojis (emoji_id, emoji_name, emoji_key, emoji_format, animated) 
                 VALUES (?, ?, ?, ?, ?) 
                 ON CONFLICT(emoji_id) DO NOTHING`,
                [emoji.id, emoji.name, baseKey, emoji.toString(), emoji.animated ? 1 : 0],
            );
            logger.info(`📌 [EmojiCreate] Successfully stored emoji "${emoji.name}" with key "${baseKey}"`);
            if ('emoji_' + emoji.name !== baseKey) {
                await emoji.edit({ name: baseKey }).catch((err) => logger.warn(`⚠️ Failed to rename emoji in Discord: ${err.message}`));
                logger.info(`🔄 [EmojiCreate] Renamed emoji in guild: "${emoji.name}" → "${baseKey}"`);
            } else {
                logger.info(`✅ [EmojiCreate] Emoji "${emoji.name}" already has correct name, no rename needed.`);
            }
            const logChannelData = await getOne('SELECT channel_id FROM ensured_channels WHERE channel_key = ?', ['server_logs']);
            if (!logChannelData) return;
            const logChannel = await emoji.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) return;
            await new Promise((resolve) => setTimeout(resolve, 3000));
            const fetchedLogs = await emoji.guild.fetchAuditLogs({ type: AuditLogEvent.EmojiCreate, limit: 5 });
            const emojiLog = fetchedLogs.entries.find((entry) => entry.target.id === emoji.id && Date.now() - entry.createdTimestamp < 10000);
            let createdBy = '`Unknown`';
            if (emojiLog) {
                createdBy = `<@${emojiLog.executor.id}>`;
                logger.info(`✅ Detected emoji creation by: ${createdBy}`);
            }
            const embed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('😀 New Emoji Created')
                .setDescription('# ' + emoji.toString())
                .addFields(
                    { name: '📝 Name', value: `\`${emoji.name}\``, inline: true },
                    { name: '🔑 Assigned Key', value: `\`${baseKey}\``, inline: true },
                    { name: '🎥 Animated', value: emoji.animated ? '`✅ Yes`' : '`❌ No`', inline: true },
                    { name: '🛠 Created By', value: createdBy, inline: false },
                )
                .setTimestamp();
            await logChannel.send({ embeds: [embed] });
            logger.info(`📋 Successfully logged new emoji creation: ${emoji.name}`);
        } catch (error) {
            logger.error(`❌ Error logging emoji creation: ${error.message}`);
        }
    },
};
