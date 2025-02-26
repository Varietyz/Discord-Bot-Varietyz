const {
    guild: { getOne },
} = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
const { EmbedBuilder, AuditLogEvent } = require('discord.js');
module.exports = {
    name: 'memberUnboost',
    once: false,
    async execute(member) {
        if (!member.guild) {
            logger.warn('⚠️ [MemberUnboost] No guild found for unboost event.');
            return;
        }
        try {
            logger.info(`⏬ [MemberUnboost] ${member.user.tag} removed their boost from ${member.guild.name}.`);
            const logChannelData = await getOne('SELECT channel_id FROM ensured_channels WHERE channel_key = ?', ['boost_logs']);
            if (!logChannelData) {
                logger.warn('⚠️ No log channel found for "boost_logs" in database.');
                return;
            }
            const logChannel = await member.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) {
                logger.warn(`⚠️ Could not fetch log channel ID: ${logChannelData.channel_id}`);
                return;
            }
            let unboostedBy = '`Unknown`';
            try {
                const fetchedLogs = await member.guild.fetchAuditLogs({
                    type: AuditLogEvent.MemberUpdate,
                    limit: 5,
                });
                const unboostLog = fetchedLogs.entries.find((entry) => entry.target.id === member.id && entry.changes.some((change) => change.key === 'premium_since' && change.old !== null && change.new === null));
                if (unboostLog) {
                    unboostedBy = `<@${unboostLog.executor.id}>`;
                    logger.info(`✅ Detected unboost by: ${unboostedBy}`);
                }
            } catch (auditError) {
                logger.warn(`⚠️ Could not fetch audit log for unboost event: ${auditError.message}`);
            }
            const boostSince = member.premiumSince ? `<t:${Math.floor(member.premiumSinceTimestamp / 1000)}:R>` : '`Unknown`';
            const boostStreak = member.premiumSince ? `<t:${Math.floor(member.premiumSinceTimestamp / 1000)}:D>` : '`No Streak`';
            const embed = new EmbedBuilder()
                .setColor(0xffa500)
                .setTitle('⏬ Member Unboosted the Server')
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 1024 }))
                .addFields(
                    { name: '👤 Member', value: `<@${member.id}> (${member.user.tag})`, inline: false },
                    { name: '🎖️ Previous Boost Streak', value: boostStreak, inline: true },
                    { name: '📅 Boosted Since', value: boostSince, inline: true },
                    { name: '🎁 Unboosted By', value: unboostedBy, inline: false },
                )
                .setFooter({ text: `User ID: ${member.id}` })
                .setTimestamp();
            await logChannel.send({ embeds: [embed] });
            logger.info(`📋 Successfully logged server unboost by ${member.user.tag}`);
        } catch (error) {
            logger.error(`❌ Error logging member unboost: ${error.message}`);
        }
    },
};
