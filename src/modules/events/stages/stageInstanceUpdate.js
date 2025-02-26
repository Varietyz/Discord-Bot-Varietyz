const { EmbedBuilder } = require('discord.js');
const {
    guild: { getOne },
} = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
module.exports = {
    name: 'stageInstanceUpdate',
    once: false,
    async execute(oldStageInstance, newStageInstance) {
        if (!newStageInstance.guild) return;
        try {
            const changes = [];
            if (oldStageInstance.topic !== newStageInstance.topic) {
                const oldTopic = oldStageInstance.topic || 'No Topic Set';
                const newTopic = newStageInstance.topic || 'No Topic Set';
                changes.push(`📝 **Topic:** \`${oldTopic}\` → **\`${newTopic}\`**`);
            }
            if (oldStageInstance.privacyLevel !== newStageInstance.privacyLevel) {
                const oldPrivacy = oldStageInstance.privacyLevel === 2 ? '`🔓 Public`' : '`🔒 Guild Only`';
                const newPrivacy = newStageInstance.privacyLevel === 2 ? '`🔓 Public`' : '`🔒 Guild Only`';
                changes.push(`🔒 **Privacy Level:** ${oldPrivacy} → **${newPrivacy}**`);
            }
            if (changes.length === 0) return;
            logger.info(`✏️ [StageInstanceUpdate] Stage instance updated in channel: "${newStageInstance.channel?.name || 'Unknown'}"`);
            const logChannelData = await getOne('SELECT channel_id FROM ensured_channels WHERE channel_key = ?', ['stage_logs']);
            if (!logChannelData) return;
            const logChannel = await newStageInstance.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) return;
            const embed = new EmbedBuilder()
                .setColor(0xe67e22)
                .setTitle('✏️ Stage Instance Updated')
                .addFields({ name: '📢 Channel', value: `<#${newStageInstance.channelId}>` || '`Unknown Channel`', inline: true }, { name: '🔄 Changes', value: changes.join('\n'), inline: false })
                .setFooter({ text: `Channel ID: ${newStageInstance.channelId || 'Unknown'}` })
                .setTimestamp();
            await logChannel.send({ embeds: [embed] });
            logger.info(`📋 Successfully logged stage instance update in "${newStageInstance.channel?.name || 'Unknown'}"`);
        } catch (error) {
            logger.error(`❌ Error logging stage instance update: ${error.message}`);
        }
    },
};
