const reactionRoleMap = require('../../../config/reactionRoleMap');
const db = require('../../utils/essentials/dbUtils').guild;
const fs = require('fs');
const path = require('path');

const boundChannels = JSON.parse(
    fs.readFileSync(
        path.join(__dirname, '../../../config/reactionBoundChannels.json'),
        'utf8'
    )
);

module.exports = {
    name: 'messageReactionAdd',
    once: false,
    async execute(reaction, user) {
        if (user.bot) return;

        const emoji = reaction.emoji.name ?? reaction.emoji.id;
        const guild = reaction.message.guild;

        if (!guild) return;

        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (err) {
                console.warn('⚠️ Failed to fetch partial reaction:', err);
                return;
            }
        }

        const channelId = reaction.message.channelId ?? reaction.message.channel.id;

        const row = await db.getOne(
            'SELECT channel_key FROM ensured_channels WHERE channel_id = ?',
            [channelId]
        );
        const key = row?.channel_key;
        if (!key || !boundChannels[key]?.includes(emoji)) return;

        const roleName = reactionRoleMap[emoji];
        if (!roleName) return;

        try {
            const member = await guild.members.fetch(user.id);
            const role = guild.roles.cache.find((r) => r.name === roleName);
            if (!role) {
                console.warn(`⚠️ Role "${roleName}" not found in guild.`);
                return;
            }

            await member.roles.add(role);
            console.log(`✅ Added "${roleName}" to ${member.user.tag}`);
        } catch (err) {
            console.error(`❌ Failed to add role "${roleName}":`, err);
        }
    },
};
