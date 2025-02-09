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
 * @function ensureCompetitionCategory
 * @param guild - The Discord guild (server) instance.
 * @returns {Promise<void>} Resolves when the setup is complete.
 */
async function ensureCompetitionCategory(guild) {
    try {
        const compCategoryName = '🏆COMPETITIONS OF THE WEEK';

        const compChannels = [
            {
                key: 'top_10_channel',
                name: '🏅top-10',
                topic: 'Displays the top 10 rankings for weekly competitions.',
            },
            {
                key: 'results_channel',
                name: '🏅results',
                topic: 'Logs and announces the overall results for weekly competitions.',
            },
            {
                key: 'botw_channel',
                name: '🏆bosses🦖',
                topic: 'Holds data and results for the Boss of the Week competition.',
            },
            {
                key: 'sotw_channel',
                name: '🏆skills📊',
                topic: 'Holds data and results for the Skill of the Week competition.',
            },
            {
                key: 'notif_channel',
                name: '🏆notifications',
                topic: 'Broadcasts notifications and updates for weekly competitions.',
            },
        ];

        // 🔍 **Find or Create the Logging Category**
        let competitionCategory = guild.channels.cache.find((ch) => ch.type === ChannelType.GuildCategory && ch.name === compCategoryName);

        if (!competitionCategory) {
            competitionCategory = await guild.channels.create({
                name: compCategoryName,
                type: ChannelType.GuildCategory,
            });
            logger.info(`✅ Created category: ${competitionCategory.name}`);
        }

        // 🔍 **Ensure All Log Channels Exist and Store in DB**
        for (const { key, name, topic } of compChannels) {
            const storedChannel = await getOne('SELECT channel_id FROM setup_channels WHERE setup_key = ?', [key]);

            // ✅ Fetch channel by ID instead of name & parent category
            let channel = storedChannel ? guild.channels.cache.get(storedChannel.channel_id) : null;

            if (!channel) {
                channel = await guild.channels.create({
                    name,
                    type: ChannelType.GuildText,
                    parent: competitionCategory.id,
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
                await runQuery('INSERT INTO comp_channels (comp_key, channel_id) VALUES (?, ?)', [key, channel.id]);
            } else {
                // Update existing log channel entry with the new channel ID
                await runQuery('UPDATE comp_channels SET channel_id = ? WHERE comp_key = ?', [channel.id, key]);
            }
        }

        logger.info('🎉 Competitions setup complete.');
    } catch (error) {
        logger.error(`❌ Error setting up competitions system: ${error.message}`);
    }
}

module.exports = { ensureCompetitionCategory };
