/**
 * channelSetup.js
 *
 * Main logic for ensuring categories and channels from a config file.
 */

const { ChannelType } = require('discord.js');
const { getOne, runQuery } = require('./dbUtils').guild; // Adjust import as needed
const logger = require('./logger');

const { permissionsMap, categoryConfigs, noCategoryChannels } = require('./ensureChannelsConfig');

/**
 * Helper function to resolve permission overwrites from a "permissionsKey" string.
 * If no permissionsKey is provided, return an empty array (meaning no explicit overwrites).
 * @param guild
 * @param permissionsKey
 */
function getOverwrites(guild, permissionsKey) {
    if (!permissionsKey) return [];
    const overwriteFn = permissionsMap[permissionsKey];
    return overwriteFn ? overwriteFn(guild) : [];
}

/**
 * Ensures a single Discord category exists, returning the category channel object.
 * @param {Guild} guild - The Discord.js Guild
 * @param {string} categoryName - The name of the category to ensure
 * @param {string} permissionsKey - The key in permissionsMap for overwrites (optional)
 * @returns {Promise<CategoryChannel>} - The created or fetched CategoryChannel
 */
async function ensureCategory(guild, categoryName, permissionsKey) {
    let categoryChannel = guild.channels.cache.find((ch) => ch.type === ChannelType.GuildCategory && ch.name === categoryName);

    if (!categoryChannel) {
        categoryChannel = await guild.channels.create({
            name: categoryName,
            type: ChannelType.GuildCategory,
        });
        logger.info(`✅ Created category: ${categoryName}`);
    }

    // If you want to apply permission overwrites at the category level, do so here
    const categoryOverwrites = getOverwrites(guild, permissionsKey);
    if (categoryOverwrites && categoryOverwrites.length > 0) {
        await categoryChannel.permissionOverwrites.set(categoryOverwrites);
    }

    return categoryChannel;
}

/**
 * Ensures a single channel (within a category or top-level) exists, returning the Channel object.
 * @param {Guild} guild - The Discord.js Guild
 * @param {Object} channelCfg - The channel config object
 * @param {CategoryChannel} [parentCategory] - Optional parent category object
 * @returns {Promise<GuildChannel>} - The created or fetched Guild channel
 */
async function ensureChannel(guild, channelCfg, parentCategory = null) {
    const { key, name, topic, type, permissionsKey } = channelCfg;

    // 1) Check our DB for the stored channel ID
    const storedChannel = await getOne('SELECT channel_id FROM ensured_channels WHERE channel_key = ?', [key]);

    // 2) Attempt to fetch that channel from the guild cache
    let channel = storedChannel ? guild.channels.cache.get(storedChannel.channel_id) : null;

    // 3) If the DB's channel record is invalid, try a fallback check by name
    if (!channel) {
        // NOTE: If multiple channels share the same name, .find() will return the first it encounters
        channel = guild.channels.cache.find((ch) => ch.name === name);

        // Optional: If you want to ensure type or parent is the same
        //channel = guild.channels.cache.find((ch) => ch.name === name && ch.type === (type ?? ChannelType.GuildAnnouncement) && (parentCategory ? ch.parentId === parentCategory.id : true));
    }

    // 4) If still no channel, create it
    if (!channel) {
        channel = await guild.channels.create({
            name,
            type: type ?? ChannelType.GuildAnnouncement, // fallback to announcement
            parent: parentCategory?.id ?? null,
            topic,
        });
        logger.info(`✅ Created channel: ${name}`);
    } else {
        // If a channel exists, see if it's in the correct category
        if (parentCategory && channel.parentId !== parentCategory.id) {
            logger.warn(`⚠️ Channel ${channel.name} is in the wrong category. Moving it...`);
            await channel.setParent(parentCategory.id);
        }
    }

    // 5) Apply permission overwrites, if defined
    const overwrites = getOverwrites(guild, permissionsKey);
    if (overwrites && overwrites.length > 0) {
        await channel.permissionOverwrites.set(overwrites);
    }

    // 6) Update the DB record
    //    If there's no DB record for this channel, insert one;
    //    Otherwise, update the existing record with the correct channel ID
    if (!storedChannel) {
        await runQuery('INSERT INTO ensured_channels (channel_key, channel_id) VALUES (?, ?)', [key, channel.id]);
    } else if (storedChannel.channel_id !== channel.id) {
        await runQuery('UPDATE ensured_channels SET channel_id = ? WHERE channel_key = ?', [channel.id, key]);
    }

    return channel;
}

/**
 * Main entry point: ensures all categories & channels from the config exist.
 * Then ensures any no-category channels exist too.
 * @param {Guild} guild - The Guild object from Discord.js
 */
async function ensureAllChannels(guild) {
    try {
        // 1. Ensure categories & their channels
        for (const catConfig of categoryConfigs) {
            // Create or fetch the category
            const categoryChannel = await ensureCategory(guild, catConfig.categoryName, catConfig.categoryPermissionsKey);

            // For each channel in this category, ensure it
            for (const channelCfg of catConfig.channels) {
                await ensureChannel(guild, channelCfg, categoryChannel);
            }
        }

        // 2. Ensure channels without categories
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
