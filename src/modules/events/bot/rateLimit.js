const logger = require('../../utils/logger');
const { EmbedBuilder } = require('discord.js');
const { getOne } = require('../../utils/dbUtils');

module.exports = {
    name: 'rateLimit',
    once: false,
    async execute(rateLimitData, client) {
        logger.warn(`🚨 Rate Limit Hit: ${JSON.stringify(rateLimitData)}`);

        const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['bot_logs']);
        if (!logChannelData) return;

        const logChannel = await client.channels.fetch(logChannelData.channel_id).catch(() => null);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor(0xf1c40f) // Yellow for rate limit warnings
            .setTitle('🚨 Rate Limit Reached!')
            .addFields({ name: 'Method', value: rateLimitData.method, inline: true }, { name: 'Path', value: rateLimitData.path, inline: true }, { name: 'Timeout', value: `${rateLimitData.timeout}ms`, inline: true })
            .setTimestamp();

        await logChannel.send({ embeds: [embed] });
    },
};
