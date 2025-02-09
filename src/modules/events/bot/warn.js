const logger = require('../../utils/logger');
const { EmbedBuilder } = require('discord.js');
const { getOne } = require('../../utils/dbUtils');

module.exports = {
    name: 'warn',
    once: false,
    async execute(info, client) {
        logger.warn(`⚠️ Warning: ${info}`);

        const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['bot_logs']);
        if (!logChannelData) return;

        const logChannel = await client.channels.fetch(logChannelData.channel_id).catch(() => null);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor(0xf1c40f) // Yellow for warnings
            .setTitle('⚠️ Warning')
            .setDescription(`\`\`\`${info}\`\`\``)
            .setTimestamp();

        await logChannel.send({ embeds: [embed] });
    },
};
