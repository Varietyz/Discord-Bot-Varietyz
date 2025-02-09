const { EmbedBuilder } = require('discord.js');
const { getOne } = require('../../utils/dbUtils');
const logger = require('../../utils/logger');

module.exports = {
    name: 'stageInstanceCreate',
    once: false,

    /**
     * Triggered when a stage instance is created.
     * @param stageInstance - The created stage instance.
     */
    async execute(stageInstance) {
        if (!stageInstance.guild) return;

        try {
            logger.info(`🎙️ [StageInstanceCreate] Stage instance started in channel: ${stageInstance.channel.name}`);

            // 🔍 Fetch the correct log channel for stage instances
            const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['stage_logs']);
            if (!logChannelData) return;

            const logChannel = await stageInstance.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) {
                logger.warn(`⚠️ Could not fetch log channel ID: ${logChannelData.channel_id}`);
                return;
            }

            // 🏷️ Stage Instance Details
            const topic = stageInstance.topic || '`No Topic Set`';
            const privacyLevel = stageInstance.privacyLevel === 2 ? '`🔓 Public`' : '`🔒 Guild Only`';

            // 🎙️ Construct Embed
            const embed = new EmbedBuilder()
                .setColor(0x1f8b4c) // Green for creation events
                .setTitle('🎙️ Stage Instance Created')
                .addFields({ name: '📢 Channel', value: `<#${stageInstance.channelId}>`, inline: true }, { name: '📝 Topic', value: topic, inline: true }, { name: '🔒 Privacy', value: privacyLevel, inline: true })
                .setFooter({ text: `Channel ID: ${stageInstance.channelId}` })
                .setTimestamp();

            // 📤 Send the embed to the log channel
            await logChannel.send({ embeds: [embed] });

            logger.info(`📋 Successfully logged stage instance creation in "${stageInstance.channel.name}"`);
        } catch (error) {
            logger.error(`❌ Error logging stage instance creation: ${error.message}`);
        }
    },
};
