const { ChannelType, PermissionsBitField } = require('discord.js');
const {
    guild: { runQuery, getOne },
} = require('./dbUtils');
const logger = require('./logger');
async function ensureLiveGainsCategory(guild) {
    try {
        const loggingCategoryName = '🌐 ‣ Live Gains';

        const logChannels = [
            {
                key: 'clanchat_channel',
                name: '💬‣‣-clan-chat',
                topic: 'Logs clanchat webhook.\nCheck out \'/clanchat_tutorial\' to learn how you can help keep this channel up-to-date.',
            },
            {
                key: 'clue_scrolls_channel',
                name: '📜‣‣-clue-scrolls',
                topic: 'Sends ingame actions via webhook.\nCheck out \'/live_gains_tutorial\' to learn how to add yourself to the tracking channels.',
            },
            {
                key: 'collection_log_channel',
                name: '📖‣‣-collection-log',
                topic: 'Sends ingame actions via webhook.\nCheck out \'/live_gains_tutorial\' to learn how to add yourself to the tracking channels.',
            },
            {
                key: 'deaths_channel',
                name: '💀‣‣-deaths',
                topic: 'Sends ingame actions via webhook.\nCheck out \'/live_gains_tutorial\' to learn how to add yourself to the tracking channels.',
            },
            {
                key: 'levels_channel',
                name: '📊‣‣-levels',
                topic: 'Sends ingame actions via webhook.\nCheck out \'/live_gains_tutorial\' to learn how to add yourself to the tracking channels.',
            },
            {
                key: 'drops_channel',
                name: '💰‣‣-drops',
                topic: 'Sends ingame actions via webhook.\nCheck out \'/live_gains_tutorial\' to learn how to add yourself to the tracking channels.',
            },
            {
                key: 'pets_channel',
                name: '🐶‣‣-pets',
                topic: 'Sends ingame actions via webhook.\nCheck out \'/live_gains_tutorial\' to learn how to add yourself to the tracking channels.',
            },
            {
                key: 'quests_channel',
                name: '🧭‣‣-quests',
                topic: 'Sends ingame actions via webhook.\nCheck out \'/live_gains_tutorial\' to learn how to add yourself to the tracking channels.',
            },
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
            const storedChannel = await getOne('SELECT channel_id FROM setup_channels WHERE setup_key = ?', [key]);
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
                        {
                            id: guild.roles.everyone.id,
                            allow: [
                                PermissionsBitField.Flags.ViewChannel,
                                PermissionsBitField.Flags.ReadMessageHistory,
                                PermissionsBitField.Flags.AddReactions,
                            ],
                            deny: [
                                PermissionsBitField.Flags.SendMessages,
                                PermissionsBitField.Flags.CreatePublicThreads,
                                PermissionsBitField.Flags.CreatePrivateThreads,
                                PermissionsBitField.Flags.SendMessagesInThreads,
                            ],
                        },
                        {
                            id: guild.roles.cache.find((role) => role.permissions.has(PermissionsBitField.Flags.Administrator))?.id,
                            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageMessages],
                        },
                    ],
                });
                logger.info(`✅ Created channel: ${name}`);
            }
            if (!storedChannel) {
                await runQuery('INSERT INTO setup_channels (setup_key, channel_id) VALUES (?, ?)', [key, channel.id]);
            } else {
                await runQuery('UPDATE setup_channels SET channel_id = ? WHERE setup_key = ?', [channel.id, key]);
            }
        }
        logger.info('🎉 Logging system setup complete.');
    } catch (error) {
        logger.error(`❌ Error setting up logging system: ${error.message}`);
    }
}
module.exports = { ensureLiveGainsCategory };