const { EmbedBuilder, ChannelType } = require('discord.js');
const db = require('../../../utils/essentials/dbUtils');
const logger = require('../../../utils/essentials/logger');
const { normalizeKey } = require('../../../utils/normalizing/normalizeKey');
const THREAD_TYPES = {
    [ChannelType.PublicThread]: '💬 Public Thread',
    [ChannelType.PrivateThread]: '🔒 Private Thread',
    [ChannelType.AnnouncementThread]: '📢 Announcement Thread',
};
module.exports = {
    name: 'threadCreate',
    once: false,
    async execute(thread) {
        if (!thread.guild) return;
        try {
            logger.info(`🧵 [ThreadCreate] Thread "${thread.name}" (ID: ${thread.id}) created in channel: ${thread.parent?.name || 'Unknown'}`);
            const logChannelData = await db.guild.getOne('SELECT channel_id FROM ensured_channels WHERE channel_key = ?', ['thread_logs']);
            if (!logChannelData) return;
            const logChannel = await thread.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) return;
            const threadType = THREAD_TYPES[thread.type] || '❓ Unknown Type';
            const creator = thread.ownerId ? `<@${thread.ownerId}>` : '`Unknown`';
            const parentChannel = thread.parent ? `<#${thread.parent.id}>` : '`No Parent`';
            const archiveDuration = `\`${thread.autoArchiveDuration} minutes\``;
            const memberCount = `\`${thread.memberCount || 0}\` members`;
            const existingThread = await db.guild.getOne('SELECT channel_id, channel_key FROM guild_channels WHERE channel_id = ?', [thread.id]);
            let threadKey;
            if (existingThread) {
                threadKey = existingThread.channel_key;
                logger.info(`🔄 Existing thread detected, keeping channel_key: ${threadKey}`);
            } else {
                threadKey = normalizeKey(thread.name, 'thread', db);
                logger.info(`🆕 New thread detected, assigned channel_key: ${threadKey}`);
            }
            await db.guild.runQuery(
                `INSERT INTO guild_channels (channel_id, channel_key, name, type, category, permissions) 
                 VALUES (?, ?, ?, ?, ?, ?) 
                 ON CONFLICT(channel_id) DO UPDATE 
                 SET name = excluded.name, 
                     type = excluded.type, 
                     category = excluded.category, 
                     permissions = excluded.permissions`,
                [thread.id, threadKey, thread.name, thread.type, thread.parent?.name || 'general', 0],
            );
            const embed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle('🧵 New Thread Created')
                .addFields(
                    { name: '📌 Thread', value: `<#${thread.id}> \`${thread.name}\``, inline: true },
                    { name: '🔍 Type', value: `\`${threadType}\``, inline: true },
                    { name: '📁 Parent Channel', value: parentChannel, inline: true },
                    { name: '👤 Created By', value: creator, inline: true },
                    { name: '🕒 Auto-Archive', value: archiveDuration, inline: true },
                    { name: '👥 Members', value: memberCount, inline: true },
                )
                .setFooter({ text: `Thread ID: ${thread.id}` })
                .setTimestamp();
            await logChannel.send({ embeds: [embed] });
            logger.info(`📋 Successfully logged thread creation: "${thread.name}"`);
        } catch (error) {
            logger.error(`❌ Error logging thread creation: ${error.message}`);
        }
    },
};
