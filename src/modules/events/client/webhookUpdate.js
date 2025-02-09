const logger = require('../../utils/logger');
const { EmbedBuilder } = require('discord.js');
const { getOne } = require('../../utils/dbUtils');

module.exports = {
    name: 'webhookUpdate',
    once: false,
    async execute(channel, client) {
        logger.info(`📡 Webhook Updated in Channel: ${channel.name}`);

        const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['channel_logs']);
        if (!logChannelData) return;

        const logChannel = await client.channels.fetch(logChannelData.channel_id).catch(() => null);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor(0x1abc9c) // Teal for webhooks
            .setTitle('📡 Webhook Updated')
            .setDescription(`A webhook in <#${channel.id}> has been updated.`)
            .setTimestamp();

        await logChannel.send({ embeds: [embed] });
    },
};
