// src/modules/events/channelCreate.js

const { getOne, runQuery } = require('../../utils/dbUtils');
const logger = require('../../utils/logger');
const { EmbedBuilder, ChannelType, AuditLogEvent } = require('discord.js');
const { normalizeKey } = require('../../utils/normalizeKey');

module.exports = {
    name: 'channelCreate',
    once: false,

    /**
     * Triggered when a new channel is created.
     * @param channel - The channel that was created.
     */
    async execute(channel) {
        if (!channel.guild) {
            logger.warn('⚠️ [ChannelCreate] No guild found for channel creation event.');
            return;
        }

        try {
            logger.info(`📢 [ChannelCreate] Channel "${channel.name}" (ID: ${channel.id}) created in guild: ${channel.guild.name}`);

            // 🔍 Fetch the correct log channel for channel creations
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

            // 🔍 **Retrieve the action performer from the audit logs**
            let createdBy = '`Unknown`';
            try {
                const fetchedLogs = await channel.guild.fetchAuditLogs({
                    type: AuditLogEvent.ChannelCreate,
                    limit: 5,
                });

                const logEntry = fetchedLogs.entries.find(
                    (entry) => entry.target.id === channel.id && Date.now() - entry.createdTimestamp < 10000, // ⏳ Check within 10 seconds
                );

                if (logEntry) {
                    createdBy = `<@${logEntry.executor.id}>`; // Mention the user
                    logger.info(`✅ Detected channel creation by: ${createdBy}`);
                }
            } catch (auditError) {
                logger.warn(`⚠️ Could not fetch audit log for channel creation: ${auditError.message}`);
            }

            // 🛠 **Store channel in database**
            const existingKeys = new Set();
            const channelKey = normalizeKey(channel.name, 'channel', existingKeys);

            await runQuery(
                `INSERT INTO guild_channels (channel_id, channel_key, name, type, category, permissions) VALUES (?, ?, ?, ?, ?, ?)
                 ON CONFLICT(channel_id) DO UPDATE SET channel_key = excluded.channel_key, name = excluded.name, type = excluded.type, category = excluded.category, permissions = excluded.permissions`,
                [channel.id, channelKey, channel.name, channel.type, channel.parent?.name || 'Uncategorized', channel.permissionsFor(channel.guild.roles.everyone)?.bitfield.toString() || '0'],
            );

            // 🔠 **Channel Type Mapping**
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

            const channelType = CHANNEL_TYPES[channel.type] || '❓ Unknown Type';

            // 🛠️ Construct Embed
            const embed = new EmbedBuilder()
                .setColor(0x2ecc71) // Green for channel creations
                .setTitle('📢 New Channel Created')
                .addFields(
                    { name: '🏷️ Channel Name', value: `<#${channel.id}>`, inline: false },
                    { name: '🔑 Channel Key', value: `\`${channelKey}\``, inline: true },
                    { name: '📂 Category', value: `\`${channel.parent?.name}\`` || '`Uncategorized`', inline: true },
                    { name: '📢 Type', value: `\`${channelType}\``, inline: true },
                    { name: '🛠 Created By', value: createdBy, inline: false },
                )
                .setFooter({ text: `Channel ID: ${channel.id}` })
                .setTimestamp();

            // 📌 **Send the embed to the correct log channel**
            await logChannel.send({ embeds: [embed] });

            logger.info(`📋 Successfully logged new channel creation: ${channel.name}`);
        } catch (error) {
            logger.error(`❌ Error logging channel creation: ${error.message}`);
        }
    },
};
