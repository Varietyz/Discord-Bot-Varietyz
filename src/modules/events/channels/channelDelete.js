// src/modules/events/channelDelete.js

const { EmbedBuilder, AuditLogEvent, ChannelType } = require('discord.js');
const {
    guild: { getOne, runQuery },
} = require('../../utils/dbUtils');
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
    name: 'channelDelete',
    once: false,

    /**
     * Called when a channel is deleted.
     * @param channel - The channel that was deleted.
     */
    async execute(channel) {
        if (!channel.guild) return;

        try {
            logger.info(`🗑️ [ChannelDelete] Channel "${channel.name}" (ID: ${channel.id}) was deleted in guild: ${channel.guild.name}`);

            // 🔍 Fetch the correct log channel for channel deletions.
            const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['channel_logs']);
            if (!logChannelData) {
                logger.warn('⚠️ No log channel found for "channel_logs" in database.');
                return;
            }

            const logChannel = await channel.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) {
                logger.warn(`⚠️ Could not fetch log channel ID: ${logChannelData.channel_id}`);
                return;
            }

            // 🕵️ Fetch audit logs to determine who deleted the channel.
            logger.info('🔎 Checking audit logs for channel deletion...');
            await new Promise((resolve) => setTimeout(resolve, 3000)); // ⏳ Wait 3 seconds for logs to update

            const fetchedLogs = await channel.guild.fetchAuditLogs({
                type: AuditLogEvent.ChannelDelete,
                limit: 5,
            });

            const deleteLog = fetchedLogs.entries.find(
                (entry) => entry.target.id === channel.id && Date.now() - entry.createdTimestamp < 10000, // Check within 10 seconds
            );

            let deletedBy = '`Unknown`';
            if (deleteLog) {
                deletedBy = `<@${deleteLog.executor.id}>`; // Mention the user who deleted the channel.
                logger.info(`❌ Channel deleted by: ${deletedBy}`);
            } else {
                logger.warn(`⚠️ No audit log entry found for channel deletion: "${channel.name}"`);
            }

            // 🏷️ Get the readable channel type.
            const channelTypeName = CHANNEL_TYPES[channel.type] || '❓ Unknown Type';

            // 🔍 **Fetch the channel record from the database before deletion to get the log key.**
            const channelRecord = await getOne('SELECT channel_key FROM guild_channels WHERE channel_id = ?', [channel.id]);
            const logKey = channelRecord ? channelRecord.channel_key : '`Not Found`';

            // 🔄 **Remove the deleted channel from the database.**
            await runQuery('DELETE FROM guild_channels WHERE channel_id = ?', [channel.id]);

            // 📌 Build the embed for logging, including the log key.
            const embed = new EmbedBuilder()
                .setColor(0xff0000) // Red for deletions.
                .setTitle('🗑️ Channel Deleted')
                .addFields(
                    { name: '📌 Channel Name', value: `\`${channel.name}\``, inline: true },
                    { name: '🔑 Log Key', value: `\`${logKey}\``, inline: true },
                    { name: '🔍 Channel Type', value: `\`${channelTypeName}\``, inline: true },
                    { name: '📁 Category', value: `\`${channel.parent?.name || 'Uncategorized'}\``, inline: true },
                    { name: '🛠 Deleted By', value: deletedBy, inline: false },
                )
                .setFooter({ text: `Channel ID: ${channel.id}` })
                .setTimestamp();

            // 📤 Send the embed to the log channel.
            await logChannel.send({ embeds: [embed] });
            logger.info(`📋 Successfully logged channel deletion: "${channel.name}"`);
        } catch (error) {
            logger.error(`❌ Error logging channel deletion: ${error.message}`);
        }
    },
};
