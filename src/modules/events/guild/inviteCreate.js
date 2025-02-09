// src/modules/events/inviteCreate.js

const logger = require('../../utils/logger');
const { EmbedBuilder } = require('discord.js');
const { getOne } = require('../../utils/dbUtils');

module.exports = {
    name: 'inviteCreate',
    once: false,
    /**
     * Triggered when an invite is created.
     * @param invite - The created invite.
     * @param client - The Discord client.
     */
    async execute(invite, client) {
        logger.info(`🔗 [InviteCreate] New invite created in guild: ${invite.guild.name} (Code: ${invite.code})`);

        const INVITE_URL = `https://discord.gg/${invite.code}`;
        const inviteCreator = invite.inviter ? `<@${invite.inviter.id}>` : '`Unknown`';
        const expiryDate = invite.expiresAt ? `🕛 **Expires:** \`${new Date(invite.expiresAt).toLocaleString()}\`` : '🔓 **No Expiry**';
        const usesLimit = invite.maxUses > 0 ? `**Max Uses:** \`${invite.maxUses}\`` : '♾️ **Unlimited Uses**';

        // 🛠️ Create Embed for invite details
        const embed = new EmbedBuilder()
            .setColor(0x3498db) // Blue for invite creation
            .setTitle('🎉 New Invite Created!')
            .addFields(
                { name: '🔗 Invite Code', value: `${INVITE_URL}`, inline: true },
                { name: '\u200b', value: usesLimit, inline: true },
                { name: expiryDate, value: '\u200b', inline: false },
                { name: '📌 Channel', value: `<#${invite.channel.id}>`, inline: true },
                { name: '\u200b', value: '\u200b', inline: true },
                { name: '👤 Created by', value: inviteCreator, inline: true },
            )
            .setTimestamp();

        const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['invite_logs']);
        if (logChannelData) {
            const logChannel = await client.channels.fetch(logChannelData.channel_id);
            if (logChannel) {
                await logChannel.send({ embeds: [embed] });
                logger.info(`📋 Logged invite creation (Code: ${invite.code}, Max Uses: ${invite.maxUses > 0 ? invite.maxUses : 'Unlimited'})`);
            }
        }
    },
};
