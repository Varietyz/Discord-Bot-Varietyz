const { ChannelType, PermissionsBitField } = require('discord.js');
const {
    guild: { runQuery, getOne },
} = require('./dbUtils');
const logger = require('./logger');
/**
 *
 * @param guild
 */
async function ensureBingoCategory(guild) {
    try {
        const compCategoryName = '🎲∙Bingoooo';

        const compChannels = [
            {
                key: 'bingo_updates_channel',
                name: '📢∙-bingo-updates',
                topic: '📢 Real-time updates and notifications for Bingo events, task completions, and important announcements.',
            },
            {
                key: 'bingo_card_channel',
                name: '🃏∙-bingo-cards',
                topic: '🃏 View your Bingo Cards, track task progression, and see your achievements in real-time.',
            },
            {
                key: 'bingo_leaderboard_channel',
                name: '🏆∙-bingo-leaderboard',
                topic: '🏆 Check out the current Bingo leaderboard and see who is leading the event!',
            },
            {
                key: 'bingo_progression_channel',
                name: '📊∙-bingo-progression',
                topic: '📊 Track team and individual progress throughout the Bingo event with real-time updates.',
            },
        ];
        let competitionCategory = guild.channels.cache.find((ch) => ch.type === ChannelType.GuildCategory && ch.name === compCategoryName);
        if (!competitionCategory) {
            competitionCategory = await guild.channels.create({
                name: compCategoryName,
                type: ChannelType.GuildCategory,
            });
            logger.info(`✅ Created category: ${competitionCategory.name}`);
        }
        for (const { key, name, topic } of compChannels) {
            const storedChannel = await getOne('SELECT channel_id FROM ensured_channels WHERE channel_key = ?', [key]);
            let channel = storedChannel ? guild.channels.cache.get(storedChannel.channel_id) : null;
            if (!channel) {
                channel = await guild.channels.create({
                    name,
                    type: ChannelType.GuildAnnouncement,
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
                await runQuery('INSERT INTO ensured_channels (channel_key, channel_id) VALUES (?, ?)', [key, channel.id]);
            } else {
                await runQuery('UPDATE ensured_channels SET channel_id = ? WHERE channel_key = ?', [channel.id, key]);
            }
        }
        logger.info('🎉 Competitions setup complete.');
    } catch (error) {
        logger.error(`❌ Error setting up competitions system: ${error.message}`);
    }
}
module.exports = { ensureBingoCategory };
