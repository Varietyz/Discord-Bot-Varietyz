const { EmbedBuilder } = require('discord.js');
const { getOne, runQuery } = require('../../../utils/dbUtils');
const logger = require('../../../utils/logger');

module.exports = {
    name: 'threadUpdate',
    once: false,

    /**
     * Triggered when a thread is updated.
     * @param oldThread - The thread before the update.
     * @param newThread - The thread after the update.
     */
    async execute(oldThread, newThread) {
        if (!newThread.guild) return;

        try {
            // 🏷️ Detect Changes
            const changes = [];

            // 📛 **Thread Name Changes**
            if (oldThread.name !== newThread.name) {
                changes.push(`📛 **Thread Name:** \`${oldThread.name}\` → **\`${newThread.name}\`**`);
            }

            // 📂 **Parent Channel Changes**
            if (oldThread.parentId !== newThread.parentId) {
                const oldParent = oldThread.parent ? `<#${oldThread.parent.id}>` : '`None`';
                const newParent = newThread.parent ? `<#${newThread.parent.id}>` : '`None`';
                changes.push(`📂 **Parent Channel:** ${oldParent} → **${newParent}**`);
            }

            // 🚫 **Exit early if no actual changes** (prevents spam)
            if (changes.length === 0) return;

            logger.info(`✏️ [ThreadUpdate] Thread "${newThread.name}" (ID: ${newThread.id}) was updated.`);

            // 🔍 Fetch log channel from database (`thread_logs`)
            const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['thread_logs']);
            if (!logChannelData) return;

            const logChannel = await newThread.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) return;

            // 🔄 **Update Database (`guild_channels`)**
            await runQuery(
                `UPDATE guild_channels 
                 SET name = ?, category = ? 
                 WHERE channel_id = ?`,
                [newThread.name, newThread.parent?.name || 'general', newThread.id],
            );

            // 📌 **Build Embed**
            const embed = new EmbedBuilder()
                .setColor(0xe67e22) // Orange for updates
                .setTitle('✏️ Thread Updated')
                .addFields({ name: '📌 Thread', value: `<#${newThread.id}> (\`${newThread.name}\`)`, inline: true }, { name: '🔄 Changes', value: changes.join('\n'), inline: false })
                .setFooter({ text: `Thread ID: ${newThread.id}` })
                .setTimestamp();

            // 📤 **Send Embed to Log Channel**
            await logChannel.send({ embeds: [embed] });

            logger.info(`📋 Successfully logged thread update: "${newThread.name}"`);
        } catch (error) {
            logger.error(`❌ Error logging thread update: ${error.message}`);
        }
    },
};
