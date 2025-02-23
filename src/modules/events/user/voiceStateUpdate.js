const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const {
    guild: { getOne },
} = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
module.exports = {
    name: 'voiceStateUpdate',
    once: false,
    async execute(oldState, newState) {
        if (!newState.guild) return;
        try {
            const member = newState.member || oldState.member;
            if (!member) return;
            const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['voice_logs']);
            if (!logChannelData) return;
            const logChannel = await newState.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) return;
            const changes = [];
            if (!oldState.channel && newState.channel) {
                changes.push(`✅ **Joined Channel:** <#${newState.channel.id}> \`${newState.channel.name}\``);
            } else if (oldState.channel && !newState.channel) {
                changes.push(`🚪 **Left Channel:** <#${oldState.channel.id}> \`${oldState.channel.name}\``);
            } else if (oldState.channelId !== newState.channelId) {
                changes.push(`🔄 **Switched Channel:** <#${oldState.channel.id}> \`${oldState.channel.name}\` → <#${newState.channel.id}> \`${newState.channel.name}\``);
            }
            if (oldState.channel && newState.channel && oldState.channelId !== newState.channelId) {
                changes.push('🛠 **Moved to Another Channel**');
            }
            if (oldState.channel && !newState.channel && newState.kicked) {
                changes.push('🚫 **Disconnected by an Admin**');
            }
            if (!oldState.streaming && newState.streaming) {
                changes.push('📡 **Started Streaming**');
            } else if (oldState.streaming && !newState.streaming) {
                changes.push('📡 **Stopped Streaming**');
            }
            if (!oldState.selfVideo && newState.selfVideo) {
                changes.push('📷 **Turned Video On**');
            } else if (oldState.selfVideo && !newState.selfVideo) {
                changes.push('📷 **Turned Video Off**');
            }
            let deafened = false;
            if (!oldState.selfDeaf && newState.selfDeaf) {
                changes.push('🔕 **Deafened Themselves**');
                deafened = true;
            } else if (oldState.selfDeaf && !newState.selfDeaf) {
                changes.push('🔔 **Undeafened Themselves**');
                deafened = true;
            }
            if (!deafened) {
                if (!oldState.selfMute && newState.selfMute) {
                    changes.push('🔇 **Muted Themselves**');
                } else if (oldState.selfMute && !newState.selfMute) {
                    changes.push('🔊 **Unmuted Themselves**');
                }
            }
            if (!oldState.serverMute && newState.serverMute) {
                changes.push('🔇 **Server Muted**');
            } else if (oldState.serverMute && !newState.serverMute) {
                changes.push('🔊 **Server Unmuted**');
            }
            if (!oldState.serverDeaf && newState.serverDeaf) {
                changes.push('🔕 **Server Deafened**');
            } else if (oldState.serverDeaf && !newState.serverDeaf) {
                changes.push('🔔 **Server Undeafened**');
            }
            if (changes.length === 0) return;
            logger.info(`🔊 [VoiceStateUpdate] Changes detected for ${member.user.tag}: ${changes.join(', ')}`);
            let changedBy = `<@${member.id}>`;
            try {
                const fetchedLogs = await newState.guild.fetchAuditLogs({
                    type: AuditLogEvent.MemberUpdate || AuditLogEvent.MemberDisconnect || AuditLogEvent.MemberMove,
                    limit: 5,
                });
                const actionLog = fetchedLogs.entries.find((entry) => entry.target.id === member.id && Date.now() - entry.createdTimestamp < 10000);
                if (actionLog) {
                    changedBy = `<@${actionLog.executor.id}>`;
                    logger.info(`🔊 Voice action taken by: ${changedBy}`);
                }
            } catch (auditError) {
                logger.warn(`⚠️ Could not fetch audit log for voice update: ${auditError.message}`);
            }
            const embed = new EmbedBuilder()
                .setColor(0x7289da)
                .setTitle('🔊 Voice State Updated')
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 1024 }))
                .addFields({ name: '👤 Member', value: `<@${member.id}> \`${member.user.tag}\``, inline: true });
            if (changedBy !== `<@${member.id}>`) embed.addFields({ name: '🛠 Updated By', value: changedBy, inline: true });
            embed.addFields({ name: '\u200b', value: changes.join('\n'), inline: false });
            embed.setFooter({ text: `User ID: ${member.id}` }).setTimestamp();
            await logChannel.send({ embeds: [embed] });
            logger.info(`📋 Successfully logged voice state update for ${member.user.tag}.`);
        } catch (error) {
            logger.error(`❌ Error logging voice state update: ${error.message}`);
        }
    },
};