const { EmbedBuilder } = require('discord.js');
const {
    guild: { getOne },
} = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
const deviceStates = new Map();
module.exports = {
    name: 'presenceUpdate',
    once: false,
    async execute(oldPresence, newPresence) {
        if (!newPresence.guild) return;
        try {
            const member = newPresence.member || oldPresence?.member;
            if (!member) return;
            const logChannelData = await getOne('SELECT channel_id FROM ensured_channels WHERE channel_key = ?', ['member_logs']);
            if (!logChannelData) return;
            const logChannel = await newPresence.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) return;
            const emojiRL = (await getOne('SELECT emoji_format FROM guild_emojis WHERE emoji_key = ?', ['emoji_runeliteclient']))?.emoji_format || '🎮';
            const emojiOSRS = (await getOne('SELECT emoji_format FROM guild_emojis WHERE emoji_key = ?', ['emoji_osrsofficialclient']))?.emoji_format || '🏆';
            const changes = [];
            if (oldPresence?.status !== newPresence?.status) {
                const statusMap = {
                    online: '🟢 Online',
                    idle: '🌙 Idle',
                    dnd: '⛔ Do Not Disturb',
                    offline: '⚪ Offline',
                    invisible: '🚫 Invisible',
                };
                changes.push(`🟢 **Status Changed:** ${statusMap[oldPresence?.status] || '`Unknown`'} → ${statusMap[newPresence?.status] || '`Unknown`'}`);
            }
            const oldActivities = oldPresence?.activities || [];
            const newActivities = newPresence?.activities || [];
            const isOsrsActivity = (activity) => activity?.name?.toLowerCase().includes('runelite') || activity?.name?.toLowerCase().includes('old school runescape');
            const getActivityString = (activity) => {
                const emoji = activity.name.toLowerCase().includes('runelite') ? emojiRL : emojiOSRS;
                return `\`${activity.name}\`${emoji}`;
            };
            const addedOsrsActivities = newActivities.filter((a) => isOsrsActivity(a) && !oldActivities.some((b) => b.name === a.name)).map(getActivityString);
            const removedOsrsActivities = oldActivities.filter((a) => isOsrsActivity(a) && !newActivities.some((b) => b.name === a.name)).map(getActivityString);
            if (addedOsrsActivities.length) changes.push(`**Launched:** ${addedOsrsActivities.join('\n')}`);
            if (removedOsrsActivities.length) changes.push(`**Stopped:** ${removedOsrsActivities.join('\n')}`);
            const newDevices = newPresence?.clientStatus || {};
            const formatDevices = (devices) =>
                Object.keys(devices)
                    .map((device) => `\`${device.charAt(0).toUpperCase() + device.slice(1)}\``)
                    .join(', ') || '`None`';
            const previousState = deviceStates.get(member.id) || '`None`';
            const currentState = formatDevices(newDevices);
            if (previousState !== currentState) {
                deviceStates.set(member.id, currentState);
                changes.push(`💻 **Device(s):** ${previousState} → ${currentState}`);
            }
            if (!oldPresence?.premiumSince && newPresence?.premiumSince) {
                changes.push('🚀 **Started Boosting Server**');
            } else if (oldPresence?.premiumSince && !newPresence?.premiumSince) {
                changes.push('🚀 **Stopped Boosting Server**');
            }
            if (changes.length === 0 || (!addedOsrsActivities.length && !removedOsrsActivities.length)) return;
            logger.info(`🔄 [PresenceUpdate] Changes detected for ${member.user.tag}: ${changes.join(', ')}`);
            const embed = new EmbedBuilder()
                .setColor(0x1abc9c)
                .setTitle('🏆 OSRS Presence Updated')
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 1024 }))
                .addFields({ name: '👤 User', value: `<@${member.id}> \`${member.user.tag}\``, inline: false }, { name: '\u200b', value: changes.join('\n'), inline: false })
                .setFooter({ text: `User ID: ${member.id}` })
                .setTimestamp();
            await logChannel.send({ embeds: [embed] });
            logger.info(`📋 Successfully logged OSRS presence update for ${member.user.tag}.`);
        } catch (error) {
            logger.error(`❌ Error logging presence update: ${error.message}`);
        }
    },
};
