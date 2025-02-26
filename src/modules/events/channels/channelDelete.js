// src/modules/events/channelDelete.js

const { EmbedBuilder, AuditLogEvent, ChannelType } = require('discord.js');
const {
    guild: { getOne, runQuery },
} = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');

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
    async execute(channel) {
        if (!channel.guild) return;
        try {
            logger.info(`🗑️ [ChannelDelete] Channel "${channel.name}" (ID: ${channel.id}) was deleted in guild: ${channel.guild.name}`);
            const logChannelData = await getOne('SELECT channel_id FROM ensured_channels WHERE channel_key = ?', ['channel_logs']);
            if (!logChannelData) {
                logger.warn('⚠️ No log channel found for "channel_logs" in database.');
                return;
            }
            const logChannel = await channel.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) {
                logger.warn(`⚠️ Could not fetch log channel ID: ${logChannelData.channel_id}`);
                return;
            }
            logger.info('🔎 Checking audit logs for channel deletion...');
            await new Promise((resolve) => setTimeout(resolve, 3000));
            const fetchedLogs = await channel.guild.fetchAuditLogs({
                type: AuditLogEvent.ChannelDelete,
                limit: 5,
            });
            const deleteLog = fetchedLogs.entries.find((entry) => entry.target.id === channel.id && Date.now() - entry.createdTimestamp < 10000);
            let deletedBy = '`Unknown`';
            if (deleteLog) {
                deletedBy = `<@${deleteLog.executor.id}>`;
                logger.info(`❌ Channel deleted by: ${deletedBy}`);
            } else {
                logger.warn(`⚠️ No audit log entry found for channel deletion: "${channel.name}"`);
            }
            const channelTypeName = CHANNEL_TYPES[channel.type] || '❓ Unknown Type';
            const channelRecord = await getOne('SELECT channel_key FROM guild_channels WHERE channel_id = ?', [channel.id]);
            const logKey = channelRecord ? channelRecord.channel_key : '`Not Found`';
            let ensuredChannelKey = null;
            const setupChannel = await getOne('SELECT channel_key FROM ensured_channels WHERE channel_id = ?', [channel.id]);
            const logChannelEntry = await getOne('SELECT channel_key FROM ensured_channels WHERE channel_id = ?', [channel.id]);
            const compChannel = await getOne('SELECT channel_key FROM ensured_channels WHERE channel_id = ?', [channel.id]);
            if (setupChannel) {
                ensuredChannelKey = setupChannel.channel_key;
            } else if (logChannelEntry) {
                ensuredChannelKey = logChannelEntry.channel_key;
            } else if (compChannel) {
                ensuredChannelKey = compChannel.channel_key;
            }
            await runQuery('DELETE FROM guild_channels WHERE channel_id = ?', [channel.id]);
            const embed = new EmbedBuilder()
                .setColor(0xff0000)
                .setTitle('🗑️ Channel Deleted')
                .addFields(
                    { name: '🏷️ Channel', value: `\`${channel.name}\``, inline: true },
                    { name: '\u200b', value: '\u200b', inline: true },
                    { name: '📁 Category', value: `\`${channel.parent?.name || 'Uncategorized'}\``, inline: true },
                    { name: '🔑 Generated Channel Key', value: `\`${logKey}\``, inline: true },
                    { name: '\u200b', value: '\u200b', inline: true },
                );
            if (ensuredChannelKey) {
                embed.addFields({ name: ':closed_lock_with_key: Static Key', value: `\`${ensuredChannelKey}\``, inline: true });
            } else {
                embed.addFields({ name: '\u200b', value: '\u200b', inline: true });
            }
            embed
                .addFields({ name: '🔍 Channel Type', value: `\`${channelTypeName}\``, inline: true }, { name: '\u200b', value: '\u200b', inline: true }, { name: '🛠 Deleted By', value: deletedBy, inline: true })
                .setFooter({ text: `Channel ID: ${channel.id}` })
                .setTimestamp();
            await logChannel.send({ embeds: [embed] });
            logger.info(`📋 Successfully logged channel deletion: "${channel.name}"`);
        } catch (error) {
            logger.error(`❌ Error logging channel deletion: ${error.message}`);
        }
    },
};
