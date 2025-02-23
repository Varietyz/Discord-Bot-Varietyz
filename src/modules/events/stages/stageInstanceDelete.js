const { EmbedBuilder } = require('discord.js');
const {
    guild: { getOne },
} = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
module.exports = {
    name: 'stageInstanceDelete',
    once: false,
    async execute(stageInstance) {
        if (!stageInstance.guild) return;
        try {
            logger.info(`🗑️ [StageInstanceDelete] Stage instance in channel "${stageInstance.channel?.name || 'Unknown'}" was deleted`);
            const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['stage_logs']);
            if (!logChannelData) return;
            const logChannel = await stageInstance.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) {
                logger.warn(`⚠️ Could not fetch log channel ID: ${logChannelData.channel_id}`);
                return;
            }
            const topic = stageInstance.topic || 'No Topic Set';
            const privacyLevel = stageInstance.privacyLevel === 2 ? '`🔓 Public`' : '`🔒 Guild Only`';
            const embed = new EmbedBuilder()
                .setColor(0xff0000)
                .setTitle('🗑️ Stage Instance Deleted')
                .addFields({ name: '📢 Channel', value: `<#${stageInstance.channelId}>` || '`Unknown Channel`', inline: true }, { name: '📝 Topic', value: `\`${topic}\``, inline: true }, { name: '🔒 Privacy', value: privacyLevel, inline: true })
                .setFooter({ text: `Channel ID: ${stageInstance.channelId || 'Unknown'}` })
                .setTimestamp();
            await logChannel.send({ embeds: [embed] });
            logger.info(`📋 Successfully logged stage instance deletion in "${stageInstance.channel?.name || 'Unknown'}"`);
        } catch (error) {
            logger.error(`❌ Error logging stage instance deletion: ${error.message}`);
        }
    },
};