const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const { getOne } = require('../../utils/dbUtils');
const logger = require('../../utils/logger');

module.exports = {
    name: 'voiceStateUpdate',
    once: false,

    /**
     * Triggered when a user's voice state changes.
     * @param oldState - The previous voice state.
     * @param newState - The updated voice state.
     */
    async execute(oldState, newState) {
        if (!newState.guild) return;

        try {
            const member = newState.member || oldState.member;
            if (!member) return;

            // 🔍 Fetch log channel from database
            const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['voice_logs']);
            if (!logChannelData) return;

            const logChannel = await newState.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) return;

            // 🚀 **Determine Changes**
            const changes = [];

            // 🎙️ **Voice Channel Joins/Leaves**
            if (!oldState.channel && newState.channel) {
                changes.push(`✅ **Joined Channel:** <#${newState.channel.id}>`);
            } else if (oldState.channel && !newState.channel) {
                changes.push(`🚪 **Left Channel:** <#${oldState.channel.id}>`);
            } else if (oldState.channelId !== newState.channelId) {
                changes.push(`🔄 **Switched Channel:** <#${oldState.channel.id}> → <#${newState.channel.id}>`);
            }

            // 🔄 **Forced Move Detection (Admin Drag)**
            if (oldState.channel && newState.channel && oldState.channelId !== newState.channelId) {
                changes.push('🛠 **Moved to Another Channel**');
            }

            // 🛑 **Disconnected by an Admin**
            if (oldState.channel && !newState.channel && newState.kicked) {
                changes.push('🚫 **Disconnected by an Admin**');
            }

            // 🎥 **Streaming Detection**
            if (!oldState.streaming && newState.streaming) {
                changes.push('📡 **Started Streaming**');
            } else if (oldState.streaming && !newState.streaming) {
                changes.push('📡 **Stopped Streaming**');
            }

            // 📹 **Video On/Off**
            if (!oldState.selfVideo && newState.selfVideo) {
                changes.push('📷 **Turned Video On**');
            } else if (oldState.selfVideo && !newState.selfVideo) {
                changes.push('📷 **Turned Video Off**');
            }

            // 🎧 **Deafen/Undeafen (Ignore mute/unmute if deafened)**
            let deafened = false;
            if (!oldState.selfDeaf && newState.selfDeaf) {
                changes.push('🔕 **Deafened Themselves**');
                deafened = true; // Skip mute log
            } else if (oldState.selfDeaf && !newState.selfDeaf) {
                changes.push('🔔 **Undeafened Themselves**');
                deafened = true; // Skip mute log
            }

            // 🎤 **Mute/Unmute (Only log if NOT deafened)**
            if (!deafened) {
                if (!oldState.selfMute && newState.selfMute) {
                    changes.push('🔇 **Muted Themselves**');
                } else if (oldState.selfMute && !newState.selfMute) {
                    changes.push('🔊 **Unmuted Themselves**');
                }
            }

            // 🎤 **Server Mute**
            if (!oldState.serverMute && newState.serverMute) {
                changes.push('🔇 **Server Muted**');
            } else if (oldState.serverMute && !newState.serverMute) {
                changes.push('🔊 **Server Unmuted**');
            }

            // 🎧 **Server Deafen**
            if (!oldState.serverDeaf && newState.serverDeaf) {
                changes.push('🔕 **Server Deafened**');
            } else if (oldState.serverDeaf && !newState.serverDeaf) {
                changes.push('🔔 **Server Undeafened**');
            }

            // 🚫 **Exit early if no actual changes** (prevents spam)
            if (changes.length === 0) return;

            logger.info(`🔊 [VoiceStateUpdate] Changes detected for ${member.user.tag}: ${changes.join(', ')}`);

            // 🕵️ **Fetch audit logs to check for admin actions**
            let changedBy = `<@${member.id}>`;
            try {
                const fetchedLogs = await newState.guild.fetchAuditLogs({
                    type: AuditLogEvent.MemberUpdate || AuditLogEvent.MemberDisconnect || AuditLogEvent.MemberMove,
                    limit: 5,
                });

                const actionLog = fetchedLogs.entries.find((entry) => entry.target.id === member.id && Date.now() - entry.createdTimestamp < 10000);

                if (actionLog) {
                    changedBy = `<@${actionLog.executor.id}>`; // Mention the user responsible
                    logger.info(`🔊 Voice action taken by: ${changedBy}`);
                }
            } catch (auditError) {
                logger.warn(`⚠️ Could not fetch audit log for voice update: ${auditError.message}`);
            }

            // 📌 Build the embed for logging
            const embed = new EmbedBuilder()
                .setColor(0x7289da) // Discord blue
                .setTitle('🔊 Voice State Updated')
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 1024 }))
                .addFields({ name: '👤 Member', value: `<@${member.id}> (${member.user.tag})`, inline: true });
            if (changedBy !== `<@${member.id}>`) embed.addFields({ name: '🛠 Updated By', value: changedBy, inline: true });
            embed.addFields({ name: '\u200b', value: changes.join('\n'), inline: false });
            embed.setFooter({ text: `User ID: ${member.id}` }).setTimestamp();

            // 📤 Send the embed to the log channel
            await logChannel.send({ embeds: [embed] });

            logger.info(`📋 Successfully logged voice state update for ${member.user.tag}.`);
        } catch (error) {
            logger.error(`❌ Error logging voice state update: ${error.message}`);
        }
    },
};
