const { EmbedBuilder } = require('discord.js');
const {
    guild: { getOne },
} = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
module.exports = {
    name: 'stageInstanceCreate',
    once: false,
    async execute(stageInstance) {
        if (!stageInstance.guild) return;
        try {
            logger.info(`🎙️ [StageInstanceCreate] Stage instance started in channel: ${stageInstance.channel.name}`);
            const logChannelData = await getOne('SELECT channel_id FROM ensured_channels WHERE channel_key = ?', ['stage_logs']);
            if (!logChannelData) return;
            const logChannel = await stageInstance.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) {
                logger.warn(`⚠️ Could not fetch log channel ID: ${logChannelData.channel_id}`);
                return;
            }
            const topic = stageInstance.topic || 'No Topic Set';
            const privacyLevel = stageInstance.privacyLevel === 2 ? '`🔓 Public`' : '`🔒 Guild Only`';
            const embed = new EmbedBuilder()
                .setColor(0x1f8b4c)
                .setTitle('🎙️ Stage Instance Created')
                .addFields({ name: '📢 Channel', value: `<#${stageInstance.channelId}>`, inline: true }, { name: '📝 Topic', value: `\`${topic}\``, inline: true }, { name: '🔒 Privacy', value: privacyLevel, inline: true })
                .setFooter({ text: `Channel ID: ${stageInstance.channelId}` })
                .setTimestamp();
            await logChannel.send({ embeds: [embed] });
            logger.info(`📋 Successfully logged stage instance creation in "${stageInstance.channel.name}"`);
        } catch (error) {
            logger.error(`❌ Error logging stage instance creation: ${error.message}`);
        }
    },
};
