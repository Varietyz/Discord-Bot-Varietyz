const { ChannelType, PermissionsBitField } = require('discord.js');
const {
    guild: { runQuery, getOne },
} = require('./dbUtils');
const logger = require('./logger');

/**
 * 🎯 **Ensures the Competitions Exists and Stores Channels in DB**
 *
 * - Creates the `🏆COMPETITIONS OF THE WEEK` category if missing.
 * - Ensures all logging channels exist with proper formatting and emojis.
 * - Stores channel IDs in `database.sqlite` for retrieval in event handlers.
 * - Configures permissions (admins can access logs, @everyone is denied).
 *
 * @async
 * @function ensureBasicChannels
 * @param guild - The Discord guild (server) instance.
 * @returns {Promise<void>} Resolves when the setup is complete.
 */
async function ensureBasicChannels(guild) {
    try {
        const basicChannels = [
            {
                key: 'clan_members_channel',
                name: '📖ingame-clannies',
                topic: 'Displays the clan members.',
            },
            {
                key: 'name_change_channel',
                name: '🔃name-changes',
                topic: 'Logs and announces the name changes.',
            },
            {
                key: 'auto_roles_channel',
                name: '🔃auto-roles',
                topic: 'Logs and announces the automatic role changes.',
            },
        ];
        const basicVoiceChannels = [
            {
                key: 'activity_voice_channel',
                name: '⌛loading..',
            },
        ];

        // 🔍 **Ensure All Log Channels Exist and Store in DB**
        for (const { key, name, topic } of basicChannels) {
            const storedChannel = await getOne('SELECT channel_id FROM setup_channels WHERE setup_key = ?', [key]);

            // Fetch channel by ID instead of name
            let channel = storedChannel ? guild.channels.cache.get(storedChannel.channel_id) : null;

            if (!channel) {
                channel = await guild.channels.create({
                    name,
                    type: ChannelType.GuildText,
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
                await runQuery('INSERT INTO setup_channels (setup_key, channel_id) VALUES (?, ?)', [key, channel.id]);
            } else if (storedChannel.channel_id !== channel.id) {
                // 🔄 Update channel ID if it changed
                await runQuery('UPDATE setup_channels SET channel_id = ? WHERE setup_key = ?', [channel.id, key]);
            }
        }

        // 🔍 **Ensure All Log Channels Exist and Store in DB**
        for (const { key, name } of basicVoiceChannels) {
            const storedChannel = await getOne('SELECT channel_id FROM setup_channels WHERE setup_key = ?', [key]);
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
                await runQuery('INSERT INTO setup_channels (setup_key, channel_id) VALUES (?, ?)', [key, channel.id]);
            } else {
                // Update existing log channel entry with the new channel ID
                await runQuery('UPDATE setup_channels SET channel_id = ? WHERE setup_key = ?', [channel.id, key]);
            }
        }

        logger.info('🎉 Basic channels setup complete.');
    } catch (error) {
        logger.error(`❌ Error setting up competitions system: ${error.message}`);
    }
}

module.exports = { ensureBasicChannels };
