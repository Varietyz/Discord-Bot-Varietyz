const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { normalizeRsn } = require('../../../utils/normalizing/normalizeRsn');
const { permissionsMap } = require('../../../utils/essentials/permissionsMap');
const typeMapReverse = {
    0: 'GuildText',
    2: 'GuildVoice',
    4: 'GuildCategory',
    5: 'GuildAnnouncement',
    15: 'GuildForum',
    13: 'GuildStageVoice',
    14: 'GuildDirectory',
};

function inferPermissionKey(channel, guild) {
    const overwrites = channel.permissionOverwrites.cache.map((o) => ({
        id: o.id,
        allow: o.allow.bitfield,
        deny: o.deny.bitfield,
    }));

    for (const [key, fn] of Object.entries(permissionsMap)) {
        const test = fn(guild);
        if (JSON.stringify(test) === JSON.stringify(overwrites)) {
            return key;
        }
    }

    return 'customRoleOnly'; 
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('save_server')
        .setDescription('ADMIN: Save the current server layout as a JSON preset.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });
        const guild = interaction.guild;
        const preset = { noCategory: [], categories: [] };

        const categories = guild.channels.cache.filter((c) => c.type === 4);
        const channels = guild.channels.cache.filter((c) => c.type !== 4);

        const categoryMap = {};
        for (const cat of categories.values()) {
            const block = {
                name: cat.name,
                permissionKey: inferPermissionKey(cat, guild),
                channels: [],
            };
            categoryMap[cat.id] = block;
            preset.categories.push(block);
        }

        for (const channel of channels.values()) {
            const entry = {
                key: channel.name.replace(/[^a-z0-9]+/gi, '_').toLowerCase(),
                name: channel.name,
                type: typeMapReverse[channel.type] || 'GuildText',
                topic: channel.topic || '',
                permissionKey: inferPermissionKey(channel, guild),
            };

            if (channel.type === 15) {
                entry.forumOptions = {
                    tags:
            channel.availableTags?.map((t) => ({
                name: t.name,
                emoji: t.emoji?.name || undefined,
                moderated: t.moderated || false,
            })) || [],
                    defaultReactionEmoji: channel.defaultReactionEmoji?.name || null,
                    slowmode: channel.rateLimitPerUser || 0,
                    nsfw: channel.nsfw || false,
                    guidelines: channel.topic || '',
                };
            }

            const hooks = await channel.fetchWebhooks().catch(() => []);
            if (hooks?.size) {
                const firstHook = hooks.first();
                entry.webhook = {
                    enabled: true,
                    key: `webhook_${entry.key}`,
                    name: firstHook.name,
                };
            }

            if (channel.messages && channel.messages.cache.size > 0) {
                entry.messageKey = `autogen_${entry.key}`; 
            }

            if (channel.parentId && categoryMap[channel.parentId]) {
                categoryMap[channel.parentId].channels.push(entry);
            } else {
                preset.noCategory.push(entry);
            }
        }

        const allRoles = guild.roles.cache.filter((r) => r.name !== '@everyone');
        preset.roles = allRoles.map((role) => ({
            name: role.name,
            color: role.hexColor,
            mentionable: role.mentionable,
        }));

        const fileName = `${normalizeRsn(guild.name)}.json`;
        const outPath = path.join(
            __dirname,
            `../../../config/channels/${fileName}`
        );
        fs.writeFileSync(outPath, JSON.stringify(preset, null, 2));

        return interaction.editReply(`✅ Server preset saved to \`${fileName}\`.`);
    },
};
