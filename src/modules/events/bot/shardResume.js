const logger = require('../../utils/logger');
const { EmbedBuilder } = require('discord.js');
const { getOne } = require('../../utils/dbUtils');

module.exports = {
    name: 'shardResume',
    once: false,
    async execute(id, replayedEvents, client) {
        logger.info(`🎯 Shard ${id} Resumed (${replayedEvents} Events Replayed).`);

        const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['bot_logs']);
        if (!logChannelData) return;

        const logChannel = await client.channels.fetch(logChannelData.channel_id).catch(() => null);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor(0x2ecc71) // Green for successful resumption
            .setTitle('🎯 Shard Resumed')
            .setDescription(`Shard **${id}** has resumed successfully, replaying **${replayedEvents}** events.`)
            .setTimestamp();

        await logChannel.send({ embeds: [embed] });
    },
};
