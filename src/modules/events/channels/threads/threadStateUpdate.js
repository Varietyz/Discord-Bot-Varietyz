const { EmbedBuilder } = require('discord.js');
const {
    guild: { getOne },
} = require('../../../utils/dbUtils');
const logger = require('../../../utils/logger');

module.exports = {
    name: 'threadStateUpdate',
    once: false,

    /**
     * Triggered when a thread's state changes (archived, locked, etc.).
     * @param oldThread - The thread before the update.
     * @param newThread - The thread after the update.
     */
    async execute(oldThread, newThread) {
        if (!newThread.guild) return;

        try {
            // Fetch log channel for thread logs
            const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['thread_logs']);
            if (!logChannelData) return;

            const logChannel = await newThread.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) return;

            const changes = [];

            // 🏛 **Thread Archive/Unarchive**
            if (!oldThread.archived && newThread.archived) {
                changes.push('📁 **Thread Archived**');
            } else if (oldThread.archived && !newThread.archived) {
                changes.push('📂 **Thread Unarchived**');
            }

            // 🔒 **Thread Locked/Unlocked**
            if (!oldThread.locked && newThread.locked) {
                changes.push('🔒 **Thread Locked**');
            } else if (oldThread.locked && !newThread.locked) {
                changes.push('🔓 **Thread Unlocked**');
            }

            if (changes.length === 0) return; // Exit if no changes

            // Build Embed
            const embed = new EmbedBuilder()
                .setColor(0xe67e22) // Orange for updates
                .setTitle('🔄 Thread State Updated')
                .addFields({ name: '📌 Thread', value: `<#${newThread.id}> (\`${newThread.name}\`)`, inline: true }, { name: '🔄 Changes', value: changes.join('\n'), inline: false })
                .setFooter({ text: `Thread ID: ${newThread.id}` })
                .setTimestamp();

            await logChannel.send({ embeds: [embed] });
            logger.info(`📋 Logged thread state update for "${newThread.name}"`);
        } catch (error) {
            logger.error(`❌ Error logging thread state update: ${error.message}`);
        }
    },
};
