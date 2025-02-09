const { EmbedBuilder, AuditLogEvent, ChannelType } = require('discord.js');
const { getOne, runQuery } = require('../../utils/dbUtils');
const logger = require('../../utils/logger');

const CHANNEL_TYPES = {
    [ChannelType.GuildText]: '📃 Text Channel',
    [ChannelType.GuildVoice]: '🔊 Voice Channel',
    [ChannelType.GuildCategory]: '📂 Category',
    [ChannelType.GuildAnnouncement]: '📢 Announcement Channel',
    [ChannelType.GuildStageVoice]: '🎙 Stage Channel',
    [ChannelType.GuildForum]: '📝 Forum Channel',
    [ChannelType.GuildMedia]: '📷 Media Channel',
    [ChannelType.GuildDirectory]: '📜 Server Directory',
    [ChannelType.AnnouncementThread]: '📢 Announcement Thread',
    [ChannelType.PublicThread]: '💬 Public Thread',
    [ChannelType.PrivateThread]: '🔒 Private Thread',
};

module.exports = {
    name: 'channelUpdate',
    once: false,

    /**
     * Triggered when a channel is updated.
     * @param oldChannel - The channel before the update.
     * @param newChannel - The channel after the update.
     */
    async execute(oldChannel, newChannel) {
        if (!newChannel.guild) return;

        try {
            // 🏷️ Detect Channel Changes
            const changes = [];
            if (oldChannel.name !== newChannel.name) {
                changes.push(`📛 **Name:** \`${oldChannel.name}\` → <#${newChannel.id}>`);
            }
            if (oldChannel.topic !== newChannel.topic) {
                const oldTopic = oldChannel.topic || '`None`';
                const newTopic = newChannel.topic || '`None`';
                changes.push(`📝 **Topic:** ${oldTopic} → **${newTopic}**`);
            }
            if (oldChannel.nsfw !== newChannel.nsfw) {
                changes.push(`🔞 **NSFW Enabled:** ${oldChannel.nsfw ? '`✅ Yes` → **`❌ No`**' : '`❌ No` → **`✅ Yes`**'}`);
            }
            if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
                changes.push(`⏳ **Slow Mode:** \`${oldChannel.rateLimitPerUser || '0'}s\` → **\`${newChannel.rateLimitPerUser || '0'}s\`**`);
            }
            if (oldChannel.parentId !== newChannel.parentId) {
                const oldCategory = oldChannel.parent?.name || '`None`';
                const newCategory = newChannel.parent?.name || '`None`';
                changes.push(`📂 **Category:** ${oldCategory} → **${newCategory}**`);
            }

            // 🚫 **Exit early if no actual changes** (avoids spam)
            if (changes.length === 0) return;

            logger.info(`🔄 [ChannelUpdate] Channel updated: "${oldChannel.name}" → "${newChannel.name}" in guild: ${newChannel.guild.name}`);

            // 🔍 Fetch log channel from database
            const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['channel_logs']);
            if (!logChannelData) return;

            const logChannel = await newChannel.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) return;

            // 🕵️ **Fetch audit logs for initiator**
            logger.info('🔎 Checking audit logs for channel updates...');
            await new Promise((resolve) => setTimeout(resolve, 3000)); // ⏳ Wait 3 seconds for logs to update

            let updatedBy = '`Unknown`';
            try {
                const fetchedLogs = await newChannel.guild.fetchAuditLogs({
                    type: AuditLogEvent.ChannelUpdate,
                    limit: 5,
                });

                const updateLog = fetchedLogs.entries.find(
                    (entry) => entry.target.id === newChannel.id && Date.now() - entry.createdTimestamp < 10000, // ⏳ Checking within 10 seconds
                );

                if (updateLog) {
                    updatedBy = `<@${updateLog.executor.id}>`; // Mention the user who updated
                    logger.info(`🔄 Channel updated by: ${updatedBy}`);
                } else {
                    logger.warn(`⚠️ No audit log entry found for channel update: "${newChannel.name}"`);
                }
            } catch (auditError) {
                logger.warn(`⚠️ Could not fetch audit log for channel update: ${auditError.message}`);
            }

            // 🏷️ Get the readable channel type
            const channelTypeName = CHANNEL_TYPES[newChannel.type] || '❓ Unknown Type';

            // 🔄 **Update the channel in the database (only if name, type, or category changed)**
            if (oldChannel.name !== newChannel.name || oldChannel.type !== newChannel.type || oldChannel.parentId !== newChannel.parentId) {
                await runQuery('UPDATE guild_channels SET name = ?, type = ?, category = ?, permissions = ? WHERE channel_id = ?', [
                    newChannel.name,
                    newChannel.type,
                    newChannel.parent?.name || 'general',
                    newChannel.permissionsFor(newChannel.guild.roles.everyone)?.bitfield.toString() || '0',
                    newChannel.id,
                ]);
            }

            // 📌 Build the embed for logging
            const embed = new EmbedBuilder()
                .setColor(0xe67e22) // Orange for updates
                .setTitle('🔄 Channel Updated')
                .addFields(
                    { name: '📌 Channel', value: `<#${newChannel.id}>`, inline: true },
                    { name: '🔍 Channel Type', value: `\`${channelTypeName}\``, inline: true },
                    { name: '📁 Category', value: `\`${newChannel.parent?.name}\`` || '`Uncategorized`', inline: true },
                    { name: '🛠 Updated By', value: updatedBy, inline: false },
                    { name: '🔄 Changes', value: changes.join('\n'), inline: false },
                )
                .setFooter({ text: `Channel ID: ${newChannel.id}` })
                .setTimestamp();

            // 📤 Send the embed to the log channel
            await logChannel.send({ embeds: [embed] });

            logger.info(`📋 Successfully logged channel update: "${newChannel.name}"`);
        } catch (error) {
            logger.error(`❌ Error logging channel update: ${error.message}`);
        }
    },
};
