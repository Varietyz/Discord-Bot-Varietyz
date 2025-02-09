// src/modules/events/inviteDelete.js

const logger = require('../../../utils/logger');
const { EmbedBuilder } = require('discord.js');
const {
    guild: { getOne },
} = require('../../../utils/dbUtils');

module.exports = {
    name: 'inviteDelete',
    once: false,
    /**
     * Triggered when an invite is deleted.
     * @param invite - The deleted invite.
     * @param client - The Discord client.
     */
    async execute(invite, client) {
        logger.info(`❌ [InviteDelete] Invite deleted in guild: ${invite.guild.name} (Code: ${invite.code})`);

        const inviteCreator = invite.inviter ? `<@${invite.inviter.id}>` : '`Unknown`';
        const usesLimit = invite.maxUses > 0 ? `**Max Uses:** \`${invite.maxUses}\`` : '♾️ **Unlimited Uses**';
        const expiryDate = invite.expiresAt ? `🕛 **Expires:** \`${new Date(invite.expiresAt).toLocaleString()}\`` : '🔓 **No Expiry**';

        // 🛠️ Create Embed for deleted invite details
        const embed = new EmbedBuilder()
            .setColor(0xe74c3c) // Red for invite deletion
            .setTitle('❌ Invite Deleted')
            .addFields(
                { name: '🔗 Invite Code', value: `\`${invite.code}\``, inline: true },
                { name: '📌 Channel', value: `<#${invite.channel.id}>`, inline: true },
                { name: '\u200b', value: '\u200b', inline: false }, // Spacer
                { name: '👤 Created by', value: inviteCreator, inline: true },
                { name: '\u200b', value: usesLimit, inline: true },
                { name: expiryDate, value: '\u200b', inline: false },
            )
            .setTimestamp();

        // Optionally, send the embed to a specific log channel
        const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['invite_logs']);
        if (logChannelData) {
            const logChannel = await client.channels.fetch(logChannelData.channel_id);
            if (logChannel) {
                await logChannel.send({ embeds: [embed] });
                logger.info(`📋 Logged invite deletion (Code: ${invite.code}, Max Uses: ${invite.maxUses > 0 ? invite.maxUses : 'Unlimited'})`);
            }
        }
    },
};
