const { ChannelType, PermissionsBitField } = require('discord.js');
const {
    guild: { runQuery, getOne },
} = require('./dbUtils');
const logger = require('./logger');
async function ensureLoggingCategory(guild) {
    try {
        const loggingCategoryName = '📁 ‣‣ Logging';
        const logChannels = [
            { key: 'transcripts', name: '📋‣-‣transcripts', topic: 'Stores chat transcripts.' },
            { key: 'moderation_logs', name: '📋‣-‣moderation-logs', topic: 'Logs bans, kicks, mutes, and warnings.' },
            { key: 'message_logs', name: '📋‣-‣message-logs', topic: 'Tracks message edits and deletions.' },
            { key: 'member_logs', name: '📋‣-‣member-logs', topic: 'Logs member joins, leaves, and role changes.' },
            { key: 'role_logs', name: '📋‣-‣role-logs', topic: 'Tracks role creations, deletions, and updates.' },
            { key: 'server_logs', name: '📋‣-‣server-logs', topic: 'Records important server changes.' },
            { key: 'channel_logs', name: '📋‣-‣channel-logs', topic: 'Logs channel creations, deletions, and updates.' },
            { key: 'voice_logs', name: '📋‣-‣voice-logs', topic: 'Tracks voice channel joins, leaves, and mutes.' },
            { key: 'invite_logs', name: '📋‣-‣invite-logs', topic: 'Logs invite link creations and uses.' },
            { key: 'thread_logs', name: '📋‣-‣thread-logs', topic: 'Tracks thread creations, deletions, and updates.' },
            { key: 'reacted_logs', name: '📋‣-‣reacted-logs', topic: 'Tracks message reactions.' },
            { key: 'event_logs', name: '📋‣-‣event-logs', topic: 'Logs member profile events in the server.' },
            { key: 'stage_logs', name: '📋‣-‣stage-logs', topic: 'Logs stage channel updates.' },
            { key: 'boost_logs', name: '📋‣-‣boost-logs', topic: 'Tracks when members boost the server.' },
            { key: 'bot_logs', name: '📋‣-‣bot-logs', topic: 'Logs bot actions and errors.' },
            { key: 'database_logs', name: '📋‣-‣database-logs', topic: 'Logs database actions.' },
            { key: 'critical_alerts', name: '🚨‣-‣critical-alerts🚨', topic: 'Logs critical alerts from database and unresolved actions.' },
        ];
        let loggingCategory = guild.channels.cache.find((ch) => ch.type === ChannelType.GuildCategory && ch.name === loggingCategoryName);
        if (!loggingCategory) {
            loggingCategory = await guild.channels.create({
                name: loggingCategoryName,
                type: ChannelType.GuildCategory,
                permissionOverwrites: [{ id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] }],
            });
            logger.info(`✅ Created category: ${loggingCategory.name}`);
        }
        for (const { key, name, topic } of logChannels) {
            const storedChannel = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', [key]);
            let channel = storedChannel ? guild.channels.cache.get(storedChannel.channel_id) : null;
            if (channel && channel.parentId !== loggingCategory.id) {
                logger.warn(`⚠️ Channel ${channel.id} is in the wrong category. Moving it...`);
                await channel.setParent(loggingCategory.id);
            }
            if (!channel) {
                channel = await guild.channels.create({
                    name,
                    type: ChannelType.GuildAnnouncement,
                    parent: loggingCategory.id,
                    topic,
                    permissionOverwrites: [
                        { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                        {
                            id: guild.roles.cache.find((role) => role.permissions.has(PermissionsBitField.Flags.Administrator))?.id,
                            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
                        },
                    ],
                });
                logger.info(`✅ Created channel: ${name}`);
            }
            if (!storedChannel) {
                await runQuery('INSERT INTO log_channels (log_key, channel_id) VALUES (?, ?)', [key, channel.id]);
            } else {
                await runQuery('UPDATE log_channels SET channel_id = ? WHERE log_key = ?', [channel.id, key]);
            }
        }
        logger.info('🎉 Logging system setup complete.');
    } catch (error) {
        logger.error(`❌ Error setting up logging system: ${error.message}`);
    }
}
module.exports = { ensureLoggingCategory };