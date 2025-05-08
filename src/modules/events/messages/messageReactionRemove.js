const reactionRoleMap = require('../../../config/reactionRoleMap');
const boundChannels = require('../../../config/reactionBoundChannels');
const db = require('../../utils/essentials/dbUtils').guild;

module.exports = {
    name: 'messageReactionRemove',
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

            await member.roles.remove(role);
            console.log(`❌ Removed "${roleName}" from ${member.user.tag}`);
        } catch (err) {
            console.error(`❌ Failed to remove role "${roleName}":`, err);
        }
    },
};
