const { EmbedBuilder } = require('discord.js');
const {
    guild: { getOne, runQuery },
} = require('../../../utils/essentials/dbUtils');
const logger = require('../../../utils/essentials/logger');
module.exports = {
    name: 'threadUpdate',
    once: false,
    async execute(oldThread, newThread) {
        if (!newThread.guild) return;
        try {
            const changes = [];
            if (oldThread.name !== newThread.name) {
                changes.push(`📛 **Thread Name:** \`${oldThread.name}\` → **\`${newThread.name}\`**`);
            }
            if (oldThread.parentId !== newThread.parentId) {
                const oldParent = oldThread.parent ? `<#${oldThread.parent.id}>` : '`None`';
                const newParent = newThread.parent ? `<#${newThread.parent.id}>` : '`None`';
                changes.push(`📂 **Parent Channel:** ${oldParent} → **${newParent}**`);
            }
            if (changes.length === 0) return;
            logger.info(`✏️ [ThreadUpdate] Thread "${newThread.name}" (ID: ${newThread.id}) was updated.`);
            const logChannelData = await getOne('SELECT channel_id FROM ensured_channels WHERE channel_key = ?', ['thread_logs']);
            if (!logChannelData) return;
            const logChannel = await newThread.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) return;
            await runQuery(
                `UPDATE guild_channels 
                 SET name = ?, category = ? 
                 WHERE channel_id = ?`,
                [newThread.name, newThread.parent?.name || 'general', newThread.id],
            );
            const embed = new EmbedBuilder()
                .setColor(0xe67e22)
                .setTitle('✏️ Thread Updated')
                .addFields({ name: '📌 Thread', value: `<#${newThread.id}> \`${newThread.name}\``, inline: true }, { name: '🔄 Changes', value: changes.join('\n'), inline: false })
                .setFooter({ text: `Thread ID: ${newThread.id}` })
                .setTimestamp();
            await logChannel.send({ embeds: [embed] });
            logger.info(`📋 Successfully logged thread update: "${newThread.name}"`);
        } catch (error) {
            logger.error(`❌ Error logging thread update: ${error.message}`);
        }
    },
};
