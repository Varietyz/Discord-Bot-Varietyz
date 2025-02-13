const { EmbedBuilder } = require('discord.js');
const {
    guild: { getOne, runQuery },
} = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');

module.exports = {
    name: 'guildScheduledEventCreate',
    once: false,

    /**
     * Triggered when a scheduled event is created.
     * @param event - The created scheduled event.
     */
    async execute(event) {
        if (!event.guild) return;

        try {
            logger.info(`📅 [ScheduledEventCreate] Scheduled event "${event.name}" was created.`);

            // 🏷️ **Event Properties**
            const eventTypeMap = {
                1: '🌐 External Event',
                2: '🔊 Voice Channel Event',
                3: '📹 Stage Channel Event',
            };
            const eventType = eventTypeMap[event.entityType] || '❓ Unknown Type';

            const eventPrivacy = event.privacyLevel === 2 ? '🔒 Private' : '🌍 Public';
            const eventStartTime = `<t:${Math.floor(event.scheduledStartTimestamp / 1000)}:F>`;
            const createdBy = event.creator ? `<@${event.creatorId}>` : '`Unknown`';

            // 🎟️ **Event Image (Banner)**
            const bannerImage = event.image ? `https://cdn.discordapp.com/guild-events/${event.id}/${event.image}.png` : null;

            // 📌 **Store event in the database**
            await runQuery(
                `INSERT INTO guild_events (event_id, guild_id, name, description, creator_id, event_type, privacy, start_time, channel_id, banner_url)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    event.id,
                    event.guild.id,
                    event.name,
                    event.description || 'No description',
                    event.creatorId || 'Unknown',
                    event.entityType,
                    event.privacyLevel,
                    event.scheduledStartTimestamp,
                    event.scheduledEndTimestamp || null,
                    event.channelId || null,
                    bannerImage || null,
                ],
            );

            logger.info(`✅ [Database] Stored event "${event.name}" (ID: ${event.id}) in 'guild_events' table.`);

            // 🔍 **Fetch log channel from database**
            const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['event_logs']);
            if (!logChannelData) return;

            const logChannel = await event.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) return;

            // 📌 **Build Embed**
            const embed = new EmbedBuilder()
                .setColor(0x2ecc71) // Green for event creation
                .setTitle('📅 Scheduled Event Created')
                .addFields(
                    { name: '📌 Event Name', value: `\`${event.name}\``, inline: true },
                    { name: '🕒 Start Time', value: eventStartTime, inline: true },
                    { name: '👤 Created By', value: createdBy, inline: false },
                    { name: '🔍 Event Type', value: eventType, inline: true },
                    { name: '🔒 Privacy Level', value: eventPrivacy, inline: true },
                    { name: '📜 Description', value: `\`\`\`${event.description}\`\`\`` || '```No description provided```', inline: false },
                )
                .setFooter({ text: `Event ID: ${event.id}` })
                .setTimestamp();

            // 🖼️ **Attach Banner Image if available**
            if (bannerImage) embed.setImage(bannerImage);

            // 📤 **Send log message**
            await logChannel.send({ embeds: [embed] });

            logger.info(`📋 Successfully logged scheduled event creation: "${event.name}"`);
        } catch (error) {
            logger.error(`❌ Error logging scheduled event creation: ${error.message}`);
        }
    },
};
