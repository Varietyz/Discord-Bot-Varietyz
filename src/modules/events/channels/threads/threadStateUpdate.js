const { EmbedBuilder } = require('discord.js');
const {
    guild: { getOne },
} = require('../../../utils/essentials/dbUtils');
const logger = require('../../../utils/essentials/logger');
module.exports = {
    name: 'threadStateUpdate',
    once: false,
    async execute(oldThread, newThread) {
        if (!newThread.guild) return;
        try {
            const logChannelData = await getOne('SELECT channel_id FROM ensured_channels WHERE channel_key = ?', ['thread_logs']);
            if (!logChannelData) return;
            const logChannel = await newThread.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) return;
            const changes = [];
            if (!oldThread.archived && newThread.archived) {
                changes.push('📁 **Thread Archived**');
            } else if (oldThread.archived && !newThread.archived) {
                changes.push('📂 **Thread Unarchived**');
            }
            if (!oldThread.locked && newThread.locked) {
                changes.push('🔒 **Thread Locked**');
            } else if (oldThread.locked && !newThread.locked) {
                changes.push('🔓 **Thread Unlocked**');
            }
            if (changes.length === 0) return;
            const embed = new EmbedBuilder()
                .setColor(0xe67e22)
                .setTitle('🔄 Thread State Updated')
                .addFields({ name: '📌 Thread', value: `<#${newThread.id}> \`${newThread.name}\``, inline: true }, { name: '🔄 Changes', value: changes.join('\n'), inline: false })
                .setFooter({ text: `Thread ID: ${newThread.id}` })
                .setTimestamp();
            await logChannel.send({ embeds: [embed] });
            logger.info(`📋 Logged thread state update for "${newThread.name}"`);
        } catch (error) {
            logger.error(`❌ Error logging thread state update: ${error.message}`);
        }
    },
};
