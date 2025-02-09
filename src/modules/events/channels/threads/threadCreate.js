const { EmbedBuilder, ChannelType } = require('discord.js');
const {
    guild: { getOne, runQuery },
} = require('../../../utils/dbUtils');
const logger = require('../../../utils/logger');

const THREAD_TYPES = {
    [ChannelType.PublicThread]: '💬 Public Thread',
    [ChannelType.PrivateThread]: '🔒 Private Thread',
    [ChannelType.AnnouncementThread]: '📢 Announcement Thread',
};

module.exports = {
    name: 'threadCreate',
    once: false,

    /**
     * Triggered when a thread is created.
     * @param thread - The newly created thread.
     */
    async execute(thread) {
        if (!thread.guild) return;

        try {
            logger.info(`🧵 [ThreadCreate] Thread "${thread.name}" (ID: ${thread.id}) created in channel: ${thread.parent?.name || 'Unknown'}`);

            // 🔍 Fetch thread log channel from database (`thread_logs`)
            const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['thread_logs']);
            if (!logChannelData) return;

            const logChannel = await thread.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) return;

            // 🛠 **Thread Details**
            const threadType = THREAD_TYPES[thread.type] || '❓ Unknown Type';
            const creator = thread.ownerId ? `<@${thread.ownerId}>` : '`Unknown`';
            const parentChannel = thread.parent ? `<#${thread.parent.id}>` : '`No Parent`';
            const archiveDuration = `\`${thread.autoArchiveDuration} minutes\``;
            const memberCount = `\`${thread.memberCount || 0}\` members`;

            // 🔄 **Insert into Database (`guild_channels` for consistency)**
            await runQuery(
                `INSERT INTO guild_channels (channel_id, channel_key, name, type, category, permissions) 
                 VALUES (?, ?, ?, ?, ?, ?) 
                 ON CONFLICT(channel_id) DO UPDATE SET 
                 name = excluded.name, type = excluded.type, category = excluded.category, permissions = excluded.permissions`,
                [
                    thread.id,
                    `thread_${thread.name.replace(/\s+/g, '_').toLowerCase()}`, // Normalized key
                    thread.name,
                    thread.type,
                    thread.parent?.name || 'general',
                    0, // Threads don't have permissions like standard channels
                ],
            );

            // 📌 **Build Embed**
            const embed = new EmbedBuilder()
                .setColor(0x3498db) // Blue for threads
                .setTitle('🧵 New Thread Created')
                .addFields(
                    { name: '📌 Thread', value: `<#${thread.id}> (\`${thread.name}\`)`, inline: true },
                    { name: '🔍 Type', value: `\`${threadType}\``, inline: true },
                    { name: '📁 Parent Channel', value: parentChannel, inline: true },
                    { name: '👤 Created By', value: creator, inline: true },
                    { name: '🕒 Auto-Archive', value: archiveDuration, inline: true },
                    { name: '👥 Members', value: memberCount, inline: true },
                )
                .setFooter({ text: `Thread ID: ${thread.id}` })
                .setTimestamp();

            // 📤 **Send Embed to Log Channel**
            await logChannel.send({ embeds: [embed] });

            logger.info(`📋 Successfully logged thread creation: "${thread.name}"`);
        } catch (error) {
            logger.error(`❌ Error logging thread creation: ${error.message}`);
        }
    },
};
