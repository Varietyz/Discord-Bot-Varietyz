const db = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
const { EmbedBuilder, ChannelType, AuditLogEvent } = require('discord.js');
const { normalizeKey } = require('../../utils/normalizing/normalizeKey');
module.exports = {
    name: 'channelCreate',
    once: false,
    async execute(channel) {
        if (!channel.guild) {
            logger.warn('⚠️ [ChannelCreate] No guild found for channel creation event.');
            return;
        }
        try {
            logger.info(`📢 [ChannelCreate] Channel "${channel.name}" (ID: ${channel.id}) created in guild: ${channel.guild.name}`);
            const logChannelData = await db.guild.getOne('SELECT channel_id FROM ensured_channels WHERE channel_key = ?', ['channel_logs']);
            if (!logChannelData) {
                logger.warn('⚠️ No log channel found for "channel_logs" in database.');
                return;
            }
            const logChannel = await channel.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) {
                logger.warn(`⚠️ Could not fetch log channel ID: ${logChannelData.channel_id}`);
                return;
            }
            let createdBy = '`Unknown`';
            try {
                const fetchedLogs = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelCreate, limit: 5 });
                const logEntry = fetchedLogs.entries.find((entry) => entry.target.id === channel.id && Date.now() - entry.createdTimestamp < 10000);
                if (logEntry) {
                    createdBy = `<@${logEntry.executor.id}>`;
                    logger.info(`✅ Detected channel creation by: ${createdBy}`);
                }
            } catch (auditError) {
                logger.warn(`⚠️ Could not fetch audit log for channel creation: ${auditError.message}`);
            }
            const existingChannel = await db.guild.getOne('SELECT channel_id, channel_key FROM guild_channels WHERE channel_id = ?', [channel.id]);
            let ensuredChannelKey = null;
            const setupChannel = await db.guild.getOne('SELECT channel_key FROM ensured_channels WHERE channel_id = ?', [channel.id]);
            const logChannelEntry = await db.guild.getOne('SELECT channel_key FROM ensured_channels WHERE channel_id = ?', [channel.id]);
            const compChannel = await db.guild.getOne('SELECT channel_key FROM ensured_channels WHERE channel_id = ?', [channel.id]);
            if (setupChannel) ensuredChannelKey = setupChannel.channel_key;
            else if (logChannelEntry) ensuredChannelKey = logChannelEntry.channel_key;
            else if (compChannel) ensuredChannelKey = compChannel.channel_key;
            let channelKey;
            if (existingChannel) {
                channelKey = existingChannel.channel_key;
                logger.info(`🔄 Existing channel detected, keeping channel_key: ${channelKey}`);
            } else {
                channelKey = await normalizeKey(channel.name, 'channel', db);
                logger.info(`🆕 New channel detected, assigned channel_key: ${channelKey}`);
            }
            await db.guild.runQuery(
                `INSERT INTO guild_channels (channel_id, channel_key, name, type, category, permissions) 
                 VALUES (?, ?, ?, ?, ?, ?) 
                 ON CONFLICT(channel_id) DO UPDATE 
                 SET name = excluded.name, 
                     type = excluded.type, 
                     category = excluded.category, 
                     permissions = excluded.permissions`,
                [channel.id, channelKey, channel.name, channel.type, channel.parent?.name || 'Uncategorized', channel.permissionsFor(channel.guild.roles.everyone)?.bitfield.toString() || '0'],
            );
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
            const embed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('📢 New Channel Created')
                .addFields(
                    { name: '🏷️ Channel', value: `<#${channel.id}> \`${channel.name}\``, inline: true },
                    { name: '\u200b', value: '\u200b', inline: true },
                    { name: '📂 Category', value: `\`${channel.parent?.name || 'Uncategorized'}\``, inline: true },
                    { name: '🔑 Generated Channel Key', value: `\`${channelKey}\``, inline: true },
                    { name: '\u200b', value: '\u200b', inline: true },
                );
            if (ensuredChannelKey) {
                embed.addFields({ name: ':closed_lock_with_key: Static Key', value: `\`${ensuredChannelKey}\``, inline: true });
            } else {
                embed.addFields({ name: '\u200b', value: '\u200b', inline: true });
            }
            embed
                .addFields({ name: '🔍 Type', value: `\`${channelType}\``, inline: true }, { name: '\u200b', value: '\u200b', inline: true }, { name: '🛠 Created By', value: createdBy, inline: false })
                .setFooter({ text: `Channel ID: ${channel.id}` })
                .setTimestamp();
            await logChannel.send({ embeds: [embed] });
            logger.info(`📋 Successfully logged new channel creation: ${channel.name}`);
        } catch (error) {
            logger.error(`❌ Error logging channel creation: ${error.message}`);
        }
    },
};
