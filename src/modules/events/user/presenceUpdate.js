const { EmbedBuilder } = require('discord.js');
const { getOne } = require('../../utils/dbUtils');
const logger = require('../../utils/logger');

const deviceStates = new Map(); // Tracks last known device state to reduce spam

module.exports = {
    name: 'presenceUpdate',
    once: false,

    /**
     * Triggered when a user's presence is updated.
     * @param oldPresence - The previous presence.
     * @param newPresence - The updated presence.
     */
    async execute(oldPresence, newPresence) {
        if (!newPresence.guild) return;

        try {
            const member = newPresence.member || oldPresence?.member;
            if (!member) return;

            // 🔍 Fetch log channel from database
            const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['member_logs']);
            if (!logChannelData) return;

            const logChannel = await newPresence.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) return;

            // 🔍 Fetch OSRS & RuneLite Emojis
            const emojiRL = (await getOne('SELECT emoji_format FROM guild_emojis WHERE emoji_name = ?', ['emoji_runeliteclient']))?.emoji_format || '🎮';
            const emojiOSRS = (await getOne('SELECT emoji_format FROM guild_emojis WHERE emoji_name = ?', ['emoji_osrsofficialclient']))?.emoji_format || '🏆';

            // 🚀 **Determine Changes**
            const changes = [];

            // 🟢 **Status Updates**
            if (oldPresence?.status !== newPresence?.status) {
                const statusMap = {
                    online: '🟢 **Online**',
                    idle: '🌙 **Idle**',
                    dnd: '⛔ **Do Not Disturb**',
                    offline: '⚫ **Offline**',
                    invisible: '⚫ **Invisible**',
                };
                changes.push(`🟢 **Status Changed:** ${statusMap[oldPresence?.status] || '`Unknown`'} → ${statusMap[newPresence?.status] || '`Unknown`'}`);
            }

            // 🎮 **OSRS & RuneLite Activity Changes**
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

            // 💻 **Device Changes (More Robust Handling)**
            const newDevices = newPresence?.clientStatus || {};

            const formatDevices = (devices) =>
                Object.keys(devices)
                    .map((device) => `\`${device.charAt(0).toUpperCase() + device.slice(1)}\``)
                    .join(', ') || '`None`';

            const previousState = deviceStates.get(member.id) || '`None`';
            const currentState = formatDevices(newDevices);

            if (previousState !== currentState) {
                deviceStates.set(member.id, currentState); // Update last known state
                changes.push(`💻 **Device(s):** ${previousState} → ${currentState}`);
            }

            // 🚀 **Boosting Server**
            if (!oldPresence?.premiumSince && newPresence?.premiumSince) {
                changes.push('🚀 **Started Boosting Server**');
            } else if (oldPresence?.premiumSince && !newPresence?.premiumSince) {
                changes.push('🚀 **Stopped Boosting Server**');
            }

            // 🚀 **Debugging: Log All Detected Activities**
            logger.debug(`User: ${member.user.tag}`);
            logger.debug(`New Activities: ${JSON.stringify(newActivities.map((a) => a.name))}`);
            logger.debug(`Old Activities: ${JSON.stringify(oldActivities.map((a) => a.name))}`);
            logger.debug(`Detected OSRS Activities: ${JSON.stringify(addedOsrsActivities.concat(removedOsrsActivities))}`);

            // 🚫 **Exit early if no actual changes (or non-OSRS activity changes)**
            if (changes.length === 0 || (!addedOsrsActivities.length && !removedOsrsActivities.length)) return;

            logger.info(`🔄 [PresenceUpdate] Changes detected for ${member.user.tag}: ${changes.join(', ')}`);

            // 📌 Build the embed for logging
            const embed = new EmbedBuilder()
                .setColor(0x1abc9c) // Green for presence updates
                .setTitle('🏆 OSRS Presence Updated')
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 1024 }))
                .addFields({ name: '👤 User', value: `<@${member.id}> (${member.user.tag})`, inline: false }, { name: '\u200b', value: changes.join('\n'), inline: false })
                .setFooter({ text: `User ID: ${member.id}` })
                .setTimestamp();

            // 📤 Send the embed to the log channel
            await logChannel.send({ embeds: [embed] });

            logger.info(`📋 Successfully logged OSRS presence update for ${member.user.tag}.`);
        } catch (error) {
            logger.error(`❌ Error logging presence update: ${error.message}`);
        }
    },
};
