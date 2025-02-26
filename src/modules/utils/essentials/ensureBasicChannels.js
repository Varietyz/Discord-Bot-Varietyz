const { ChannelType, PermissionsBitField } = require('discord.js');
const {
    guild: { runQuery, getOne },
} = require('./dbUtils');
const logger = require('./logger');
/**
 *
 * @param guild
 */
async function ensureBasicChannels(guild) {
    try {
        const basicChannels = [
            {
                key: 'clan_members_channel',
                name: '📖∙-ingame-clannies',
                topic: 'Displays the clan members.',
            },
            {
                key: 'name_change_channel',
                name: '🔃∙-name-changes',
                topic: 'Logs and announces the name changes.',
            },
            {
                key: 'auto_roles_channel',
                name: '🔃∙-auto-roles',
                topic: 'Logs and announces the automatic role changes.',
            },
        ];
        const basicVoiceChannels = [
            {
                key: 'activity_voice_channel',
                name: '⌛loading..',
            },
        ];
        for (const { key, name, topic } of basicChannels) {
            const storedChannel = await getOne('SELECT channel_id FROM ensured_channels WHERE channel_key = ?', [key]);
            let channel = storedChannel ? guild.channels.cache.get(storedChannel.channel_id) : null;
            if (!channel) {
                channel = await guild.channels.create({
                    name,
                    type: ChannelType.GuildAnnouncement,
                    topic,
                    permissionOverwrites: [
                        {
                            id: guild.roles.everyone.id,
                            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory],
                            deny: [PermissionsBitField.Flags.SendMessages],
                        },
                    ],
                });
                logger.info(`✅ Created channel: ${name}`);
            }
            if (!storedChannel) {
                await runQuery('INSERT INTO ensured_channels (channel_key, channel_id) VALUES (?, ?)', [key, channel.id]);
            } else if (storedChannel.channel_id !== channel.id) {
                await runQuery('UPDATE ensured_channels SET channel_id = ? WHERE channel_key = ?', [channel.id, key]);
            }
        }
        for (const { key, name } of basicVoiceChannels) {
            const storedChannel = await getOne('SELECT channel_id FROM ensured_channels WHERE channel_key = ?', [key]);
            let channel = storedChannel ? guild.channels.cache.get(storedChannel.channel_id) : null;
            if (!channel) {
                channel = await guild.channels.create({
                    name,
                    type: ChannelType.GuildVoice,
                    permissionOverwrites: [{ id: guild.roles.everyone.id, allow: [PermissionsBitField.Flags.ViewChannel], deny: [PermissionsBitField.Flags.Connect] }],
                });
                logger.info(`✅ Created voice channel: ${name}`);
            }
            if (!storedChannel) {
                await runQuery('INSERT INTO ensured_channels (channel_key, channel_id) VALUES (?, ?)', [key, channel.id]);
            } else {
                await runQuery('UPDATE ensured_channels SET channel_id = ? WHERE channel_key = ?', [channel.id, key]);
            }
        }
        logger.info('🎉 Basic channels setup complete.');
    } catch (error) {
        logger.error(`❌ Error setting up competitions system: ${error.message}`);
    }
}
module.exports = { ensureBasicChannels };
