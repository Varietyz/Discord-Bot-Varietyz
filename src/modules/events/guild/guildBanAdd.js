// src/modules/events/guildBanAdd.js

// src/modules/events/guildBanAdd.js

const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const {
    guild: { getOne },
} = require('../../utils/dbUtils');
const logger = require('../../utils/logger');

const recentBans = new Set(); // 🔄 Store recently banned users

module.exports = {
    name: 'guildBanAdd',
    once: false,

    /**
     * Triggered when a user is banned from a guild.
     * @param ban - The guild ban object containing guild and user details.
     */
    async execute(ban) {
        const { guild, user } = ban;
        if (!guild) {
            logger.warn('⚠️ [GuildBanAdd] No guild found for ban event.');
            return;
        }

        try {
            logger.info(`🚨 [GuildBanAdd] ${user.tag} (ID: ${user.id}) was banned from guild: ${guild.name}`);

            // 🔄 Add user ID to the recent bans set (expires after 10 seconds)
            recentBans.add(user.id);
            setTimeout(() => recentBans.delete(user.id), 10000);

            // 🔍 Fetch the correct log channel for bans
            const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['moderation_logs']);
            if (!logChannelData) {
                logger.warn('⚠️ No log channel found for "moderation_logs" in database.');
                return;
            }

            const logChannel = await guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) {
                logger.warn(`⚠️ Could not fetch log channel ID: ${logChannelData.channel_id}`);
                return;
            }

            // 🕵️ Fetch audit logs to determine who issued the ban
            logger.info('🔎 Checking audit logs for ban initiator...');
            await new Promise((resolve) => setTimeout(resolve, 3000)); // ⏳ Wait 3 seconds for logs to update

            const fetchedLogs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 5 });

            const banLog = fetchedLogs.entries.find((entry) => entry.action === AuditLogEvent.MemberBanAdd && entry.target.id === user.id && Date.now() - entry.createdTimestamp < 10000);

            let bannedBy = '`Unknown`';
            let reason = '`No reason provided`';

            if (banLog) {
                bannedBy = `<@${banLog.executor.id}>`;
                reason = banLog.reason ? `\`${banLog.reason}\`` : '`No reason provided`';
                logger.info(`🔨 Detected BAN by ${bannedBy} for reason: ${reason}`);
            } else {
                logger.info(`🚨 ${user.tag} was banned, but no audit log entry was found.`);
            }

            // 🛠️ Build the embed
            const embed = new EmbedBuilder()
                .setColor(0xff0000) // Red for bans
                .setTitle('🔨 Member Banned')
                .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 1024 }))
                .addFields({ name: '👤 User', value: `<@${user.id}> (${user.tag})`, inline: false }, { name: '🛠 Banned By', value: bannedBy, inline: true }, { name: '📝 Reason', value: reason, inline: false })
                .setFooter({ text: `User ID: ${user.id}` })
                .setTimestamp();

            // 📌 Send the embed to the correct log channel
            await logChannel.send({ embeds: [embed] });

            logger.info(`📋 Successfully logged ban: ${user.tag} (by ${bannedBy}).`);
        } catch (error) {
            logger.error(`❌ Error logging ban: ${error.message}`);
        }
    },
};

module.exports.recentBans = recentBans; // Exporting to use in guildMemberRemove.js
