const {
    guild: { getOne },
} = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
const { EmbedBuilder, AuditLogEvent } = require('discord.js');

// Store queued updates for members
const roleUpdateQueue = new Map();

module.exports = {
    name: 'guildMemberUpdate',
    once: false,

    /**
     * Triggered when a guild member's roles or timeout status is updated.
     * @param oldMember - The guild member before the update.
     * @param newMember - The guild member after the update.
     */
    async execute(oldMember, newMember) {
        if (!newMember.guild) return;

        try {
            const guildId = newMember.guild.id;
            const memberId = newMember.id;
            const queueKey = `${guildId}-${memberId}`; // Unique key for each member's updates

            // 🏷️ Detect Role Changes
            const oldRoles = new Set(oldMember.roles.cache.keys());
            const newRoles = new Set(newMember.roles.cache.keys());

            const addedRoles = [...newRoles].filter((role) => !oldRoles.has(role));
            const removedRoles = [...oldRoles].filter((role) => !newRoles.has(role));

            const wasTimedOut = oldMember.communicationDisabledUntilTimestamp;
            const isTimedOut = newMember.communicationDisabledUntilTimestamp;

            const timeoutChanged = wasTimedOut !== isTimedOut;

            if (!timeoutChanged && addedRoles.length === 0 && removedRoles.length === 0) return; // No relevant update detected

            logger.info(`🔍 Update detected for ${newMember.user.tag}, queuing update...`);

            // 📝 Check if there's already a queued update for this user
            if (roleUpdateQueue.has(queueKey)) {
                const existingUpdate = roleUpdateQueue.get(queueKey);
                existingUpdate.addedRoles = [...new Set([...existingUpdate.addedRoles, ...addedRoles])]; // Merge added roles
                existingUpdate.removedRoles = [...new Set([...existingUpdate.removedRoles, ...removedRoles])]; // Merge removed roles
                existingUpdate.timeoutChanged = timeoutChanged;
                existingUpdate.isTimedOut = isTimedOut;
                clearTimeout(existingUpdate.timeout);
            } else {
                // If no existing queue, create a new one
                roleUpdateQueue.set(queueKey, {
                    addedRoles,
                    removedRoles,
                    timeoutChanged,
                    isTimedOut,
                    timeout: null,
                });
            }

            // 🕒 Set a new timeout for 5 seconds
            roleUpdateQueue.get(queueKey).timeout = setTimeout(async () => {
                const updateData = roleUpdateQueue.get(queueKey);
                roleUpdateQueue.delete(queueKey); // Remove from queue when executed

                const { addedRoles, removedRoles, timeoutChanged, isTimedOut } = updateData;

                // 🔍 Fetch log channel
                const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['moderation_logs']);
                if (!logChannelData) return;

                const logChannel = await newMember.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
                if (!logChannel) return;

                logger.info(`✅ Processing queued update for ${newMember.user.tag}...`);

                // 🕵️ Fetch audit logs to check who performed the update
                await new Promise((resolve) => setTimeout(resolve, 5000)); // ⏳ Wait for logs
                const fetchedLogs = await newMember.guild.fetchAuditLogs({
                    type: AuditLogEvent.MemberUpdate,
                    limit: 5,
                });

                const auditLog = fetchedLogs.entries.find((entry) => entry.target.id === newMember.id && (entry.changes.some((change) => change.key === 'communication_disabled_until') || entry.action === AuditLogEvent.MemberRoleUpdate));

                let changedBy = `<@${newMember.id}>`;
                if (auditLog) {
                    changedBy = `<@${auditLog.executor.id}>`;
                    logger.info(`✅ Detected change by: ${changedBy}`);
                } else {
                    logger.warn(`⚠️ No audit log entry found for update on ${newMember.user.tag}`);
                }

                const addedRolesMention = addedRoles.map((roleId) => `<@&${roleId}>`).join(', ') || '**None**';
                const removedRolesMention = removedRoles.map((roleId) => `<@&${roleId}>`).join(', ') || '**None**';

                const userAvatar = newMember.user.displayAvatarURL({ dynamic: true, size: 1024 });

                // 🛠️ Construct Embed
                const embed = new EmbedBuilder()
                    .setThumbnail(userAvatar)
                    .setAuthor({ name: `${newMember.guild.name}`, iconURL: newMember.guild.iconURL({ dynamic: true }) })
                    .setTitle(`🔄 Member Updated: ${newMember.displayName}`)
                    .addFields({ name: '👤 User', value: `<@${newMember.id}>`, inline: true }, { name: '\u200b', value: '\u200b', inline: true });

                if (changedBy !== `<@${newMember.id}>`) embed.addFields({ name: '👮 Changed By', value: changedBy, inline: true });

                if (addedRoles.length) embed.addFields({ name: '➕ Added Roles', value: addedRolesMention, inline: false });
                if (removedRoles.length) embed.addFields({ name: '➖ Removed Roles', value: removedRolesMention, inline: false });

                // Handle timeout updates
                if (timeoutChanged) {
                    embed.addFields({
                        name: isTimedOut ? '🔇 Timed Out' : '🔊 Timeout Removed',
                        value: isTimedOut ? `User muted, will be lifted <t:${Math.floor(isTimedOut / 1000)}:R>` : 'Timeout lifted!',
                        inline: false,
                    });
                }

                const embedColor = timeoutChanged
                    ? isTimedOut
                        ? 0xff0000 // Red for timeout
                        : 0x2ecc71 // Green for untimeout
                    : addedRoles.length && removedRoles.length
                        ? 0x3498db // Blue for mixed changes
                        : addedRoles.length
                            ? 0x00ff00 // Green for role additions
                            : 0xff0000; // Red for role removals

                embed.setColor(embedColor).setTimestamp();

                await logChannel.send({ embeds: [embed] });

                logger.info(`📋 Successfully logged update for ${newMember.user.tag}.`);
            }, 5000);
        } catch (error) {
            logger.error(`❌ Error logging member update: ${error.message}`);
        }
    },
};
