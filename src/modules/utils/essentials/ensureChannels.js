const { ChannelType } = require('discord.js');
const { getOne, runQuery } = require('./dbUtils').guild; 
const logger = require('./logger');

const { permissionsMap, categoryConfigs, noCategoryChannels } = require('./ensureChannelsConfig');

function getOverwrites(guild, permissionsKey) {
    if (!permissionsKey) return [];
    const overwriteFn = permissionsMap[permissionsKey];
    return overwriteFn ? overwriteFn(guild) : [];
}

async function ensureCategory(guild, categoryName, permissionsKey) {
    let categoryChannel = guild.channels.cache.find((ch) => ch.type === ChannelType.GuildCategory && ch.name === categoryName);

    if (!categoryChannel) {
        categoryChannel = await guild.channels.create({
            name: categoryName,
            type: ChannelType.GuildCategory,
        });
        logger.info(`✅ Created category: ${categoryName}`);
    }

    const categoryOverwrites = getOverwrites(guild, permissionsKey);
    if (categoryOverwrites && categoryOverwrites.length > 0) {
        await categoryChannel.permissionOverwrites.set(categoryOverwrites);
    }

    return categoryChannel;
}

async function ensureChannel(guild, channelCfg, parentCategory = null) {
    const { key, name, topic, type, permissionsKey } = channelCfg;

    const storedChannel = await getOne('SELECT channel_id FROM ensured_channels WHERE channel_key = ?', [key]);

    let channel = storedChannel ? guild.channels.cache.get(storedChannel.channel_id) : null;

    if (!channel) {

        channel = guild.channels.cache.find((ch) => ch.name === name);

    }

    if (!channel) {
        channel = await guild.channels.create({
            name,
            type: type ?? ChannelType.GuildAnnouncement, 
            parent: parentCategory?.id ?? null,
            topic,
        });
        logger.info(`✅ Created channel: ${name}`);
    } else {

        if (parentCategory && channel.parentId !== parentCategory.id) {
            logger.warn(`⚠️ Channel ${channel.name} is in the wrong category. Moving it...`);
            await channel.setParent(parentCategory.id);
        }
    }

    const overwrites = getOverwrites(guild, permissionsKey);
    if (overwrites && overwrites.length > 0) {
        await channel.permissionOverwrites.set(overwrites);
    }

    if (!storedChannel) {
        await runQuery('INSERT INTO ensured_channels (channel_key, channel_id) VALUES (?, ?)', [key, channel.id]);
    } else if (storedChannel.channel_id !== channel.id) {
        await runQuery('UPDATE ensured_channels SET channel_id = ? WHERE channel_key = ?', [channel.id, key]);
    }

    return channel;
}

async function ensureAllChannels(guild) {
    try {

        for (const catConfig of categoryConfigs) {

            const categoryChannel = await ensureCategory(guild, catConfig.categoryName, catConfig.categoryPermissionsKey);

            for (const channelCfg of catConfig.channels) {
                await ensureChannel(guild, channelCfg, categoryChannel);
            }
        }

        for (const channelCfg of noCategoryChannels) {
            await ensureChannel(guild, channelCfg, null);
        }

        logger.info('🎉 All channels setup complete.');
    } catch (error) {
        logger.error(`❌ Error setting up channels: ${error.message}`);
    }
}

module.exports = {
    ensureAllChannels,
};
