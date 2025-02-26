const logger = require('../../utils/essentials/logger');
const { EmbedBuilder } = require('discord.js');
const {
    guild: { getOne },
} = require('../../utils/essentials/dbUtils');
module.exports = {
    name: 'guildIntegrationsUpdate',
    once: false,
    async execute(guild, client) {
        logger.info(`🔗 Guild Integrations Updated: ${guild.name}`);
        const logChannelData = await getOne('SELECT channel_id FROM ensured_channels WHERE channel_key = ?', ['server_logs']);
        if (!logChannelData) return;
        const logChannel = await client.channels.fetch(logChannelData.channel_id).catch(() => null);
        if (!logChannel) return;
        const embed = new EmbedBuilder().setColor(0x9b59b6).setTitle('🔗 Integrations Updated').setDescription(`Integrations for **${guild.name}** have been updated.`).setTimestamp();
        await logChannel.send({ embeds: [embed] });
    },
};
