const { ChannelType, PermissionsBitField } = require('discord.js');
const { getOne, runQuery } = require('./dbUtils').guild;
const logger = require('./logger');
const { permissionsMap } = require('./permissionsMap');
const { postChannelMessage, loadChannelMessages } = require('./messagePoster');
const fs = require('fs');
const path = require('path');

const rbcPath = path.join(
    __dirname,
    '../../../config/reactionBoundChannels.json'
);

const typeMap = {
    GuildText: ChannelType.GuildText,
    GuildVoice: ChannelType.GuildVoice,
    GuildAnnouncement: ChannelType.GuildAnnouncement,
    GuildForum: ChannelType.GuildForum,
    GuildStageVoice: ChannelType.GuildStageVoice,
    GuildDirectory: ChannelType.GuildDirectory,
};

function getOverwrites(guild, key, role = null) {
    if (!key) return [];
    const fn = permissionsMap[key];
    return typeof fn === 'function' ? fn(guild, role) : [];
}

async function ensureWebhookAssignment(guild, webhookConfig, channel) {
    if (!webhookConfig?.enabled) return;

    if (
        !channel
            .permissionsFor(guild.members.me)
            ?.has(PermissionsBitField.Flags.ManageWebhooks)
    ) {
        logger.warn(`⚠️ Missing Manage Webhooks in ${channel.name}`);
        return;
    }

    const existing = await getOne(
        'SELECT webhook_id, webhook_url, channel_id FROM guild_webhooks WHERE webhook_key = ?',
        [webhookConfig.key]
    );

    const hooks = await channel.fetchWebhooks();
    let webhook = existing
        ? hooks.find((w) => w.url === existing.webhook_url)
        : null;

    if (!webhook) {
        const serverAvatar = guild.iconURL() ?? undefined;

        webhook = await channel.createWebhook({
            name: webhookConfig.name,
            avatar: serverAvatar,
        });

        logger.info(`✅ Created webhook: ${webhookConfig.key}`);
    }

    if (!webhook?.id || !webhook?.url) {
        logger.warn(`❌ Failed to create valid webhook for ${webhookConfig.key}`);
        return;
    }

    await runQuery(
        `INSERT INTO guild_webhooks (webhook_key, webhook_id, webhook_url, channel_id)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(webhook_key) DO UPDATE SET
       webhook_id = excluded.webhook_id,
       webhook_url = excluded.webhook_url,
       channel_id = excluded.channel_id`,
        [webhookConfig.key, webhook.id, webhook.url, channel.id]
    );
}

async function ensureCategory(guild, name, permissionKey) {
    const existing = guild.channels.cache.find(
        (c) => c.name === name && c.type === ChannelType.GuildCategory
    );
    if (existing) return existing;

    const category = await guild.channels.create({
        name,
        type: ChannelType.GuildCategory,
    });

    const perms = getOverwrites(guild, permissionKey);
    if (perms.length > 0) await category.permissionOverwrites.set(perms);

    logger.info(`📁 Created category: ${name}`);
    return category;
}

async function ensureRole(guild, roleConfig) {

    if (!roleConfig) return null;

    if (Array.isArray(roleConfig)) {
        const results = [];
        for (const singleRoleConfig of roleConfig) {
            const foundOrCreated = await ensureSingleRole(guild, singleRoleConfig);
            if (foundOrCreated) results.push(foundOrCreated);
        }
        return results; 
    }

    return await ensureSingleRole(guild, roleConfig);
}

async function ensureSingleRole(guild, config) {
    if (!config.name) return null;

    const existing = guild.roles.cache.find((r) => r.name === config.name);
    if (existing) {
        return existing; 
    }

    const role = await guild.roles.create({
        name: config.name,
        color: config.color || undefined,
        mentionable: config.mentionable || false,
        reason: 'Auto-created for channel permissions',
    });
    logger.info(`🎭 Created role: ${role.name}`);
    return role;
}

async function ensureChannel(guild, channelCfg, parentCategory = null) {
    const {
        key,
        name,
        type,
        topic,
        permissionKey,
        webhook,
        role: roleConfig,
        forumOptions,
        messageKey,
    } = channelCfg;

    const stored = await getOne(
        'SELECT channel_id FROM ensured_channels WHERE channel_key = ?',
        [key]
    );
    let channel = stored ? guild.channels.cache.get(stored.channel_id) : null;

    if (!channel) {
        channel = guild.channels.cache.find(
            (c) => c.name === name && typeMap[type] && c.type === typeMap[type]
        );
    }

    const role = await ensureRole(guild, roleConfig);

    if (!channel) {
        channel = await guild.channels.create({
            name,
            type: typeMap[type] || ChannelType.GuildText,
            topic,
            parent: parentCategory?.id || null,
        });
        logger.info(`📨 Created channel: ${name}`);
    }

    const overwrites = getOverwrites(guild, permissionKey, role);
    if (overwrites.length > 0) await channel.permissionOverwrites.set(overwrites);

    if (!stored) {
        await runQuery(
            'INSERT INTO ensured_channels (channel_key, channel_id) VALUES (?, ?)',
            [key, channel.id]
        );
    } else if (stored.channel_id !== channel.id) {
        await runQuery(
            'UPDATE ensured_channels SET channel_id = ? WHERE channel_key = ?',
            [channel.id, key]
        );
    }

    if (channel.type === ChannelType.GuildForum && forumOptions) {
        await configureForumChannel(channel, forumOptions);
    }

    if (webhook?.enabled) await ensureWebhookAssignment(guild, webhook, channel);

    if (messageKey) {
        await postChannelMessage(channel, messageKey);
    }
    if (messageKey) {
        const msgData = loadChannelMessages()[messageKey];
        if (msgData?.reactions?.length > 0) {
            let boundMap = {};
            if (fs.existsSync(rbcPath)) {
                boundMap = JSON.parse(fs.readFileSync(rbcPath, 'utf8'));
            }
            boundMap[key] = msgData.reactions;

            fs.writeFileSync(rbcPath, JSON.stringify(boundMap, null, 2));
            logger.info(`📌 Updated reactionBoundChannels.json for ${key}`);
        }
    }
    return channel;
}

async function ensureAllChannels(guild, config) {
    const { categories, noCategory } = config;

    for (const cat of categories) {
        const parent = await ensureCategory(guild, cat.name, cat.permissionKey);
        for (const ch of cat.channels) {
            await ensureChannel(guild, ch, parent);
        }
    }

    for (const ch of noCategory) {
        await ensureChannel(guild, ch);
    }

    logger.info('✅ All channels ensured from config');
}

async function configureForumChannel(channel, forumOptions) {
    const { tags, defaultReactionEmoji, slowmode, nsfw, guidelines } =
    forumOptions;

    try {

        if (typeof slowmode === 'number') {
            await channel.setRateLimitPerUser(slowmode);
        }

        if (guidelines) {
            await channel.setTopic(guidelines);
        }

        if (defaultReactionEmoji) {

            await channel.setDefaultReactionEmoji({ emoji: defaultReactionEmoji });
        }

        if (typeof nsfw === 'boolean') {
            await channel.setNSFW(nsfw);
        }

        if (Array.isArray(tags) && tags.length > 0) {

            const mappedTags = tags.map((t) => ({
                name: t.name,
                emoji: t.emoji || null,
                moderated: !!t.moderated,
            }));
            await channel.setAvailableTags(mappedTags);
        }
    } catch (err) {
        logger.warn(`Failed to configure forum channel (#${channel.name}): ${err}`);
    }
}

module.exports = {
    ensureAllChannels,
    ensureCategory,
    ensureChannel,
    ensureRole,
};
