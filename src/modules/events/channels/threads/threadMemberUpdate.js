const { EmbedBuilder } = require('discord.js');
const {
    guild: { getOne },
} = require('../../../utils/essentials/dbUtils');
const logger = require('../../../utils/essentials/logger');
module.exports = {
    name: 'threadMemberUpdate',
    once: false,
    async execute(oldMember, newMember) {
        if (!newMember.guild) return;
        try {
            const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['thread_logs']);
            if (!logChannelData) return;
            const logChannel = await newMember.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) return;
            const changes = [];
            if (!oldMember.thread && newMember.thread) {
                changes.push(`➕ **Joined Thread:** <#${newMember.thread.id}>`);
            } else if (oldMember.thread && !newMember.thread) {
                changes.push(`➖ **Left Thread:** <#${oldMember.thread.id}>`);
            }
            if (changes.length === 0) return;
            const embed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle('👥 Thread Membership Updated')
                .addFields({ name: '👤 Member', value: `<@${newMember.id}>`, inline: true }, { name: '🔄 Changes', value: changes.join('\n'), inline: false })
                .setFooter({ text: `User ID: ${newMember.id}` })
                .setTimestamp();
            await logChannel.send({ embeds: [embed] });
            logger.info(`📋 Logged thread membership update for ${newMember.user.tag}`);
        } catch (error) {
            logger.error(`❌ Error logging thread membership update: ${error.message}`);
        }
    },
};