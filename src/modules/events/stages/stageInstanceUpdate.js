const { EmbedBuilder } = require('discord.js');
const {
    guild: { getOne },
} = require('../../utils/essentials/dbUtils');

const logger = require('../../utils/essentials/logger');

module.exports = {
    name: 'stageInstanceUpdate',
    once: false,

    /**
     * Triggered when a stage instance is updated.
     * @param oldStageInstance - The stage instance before the update.
     * @param newStageInstance - The stage instance after the update.
     */
    async execute(oldStageInstance, newStageInstance) {
        if (!newStageInstance.guild) return;

        try {
            // 🏷️ Detect Stage Instance Changes
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

            // 🚫 **Exit early if no actual changes** (avoids spam)
            if (changes.length === 0) return;

            logger.info(`✏️ [StageInstanceUpdate] Stage instance updated in channel: "${newStageInstance.channel?.name || 'Unknown'}"`);

            // 🔍 Fetch log channel from database
            const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['stage_logs']);
            if (!logChannelData) return;

            const logChannel = await newStageInstance.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) return;

            // 📌 Build the embed for logging
            const embed = new EmbedBuilder()
                .setColor(0xe67e22) // Orange for updates
                .setTitle('✏️ Stage Instance Updated')
                .addFields({ name: '📢 Channel', value: `<#${newStageInstance.channelId}>` || '`Unknown Channel`', inline: true }, { name: '🔄 Changes', value: changes.join('\n'), inline: false })
                .setFooter({ text: `Channel ID: ${newStageInstance.channelId || 'Unknown'}` })
                .setTimestamp();

            // 📤 Send the embed to the log channel
            await logChannel.send({ embeds: [embed] });

            logger.info(`📋 Successfully logged stage instance update in "${newStageInstance.channel?.name || 'Unknown'}"`);
        } catch (error) {
            logger.error(`❌ Error logging stage instance update: ${error.message}`);
        }
    },
};
