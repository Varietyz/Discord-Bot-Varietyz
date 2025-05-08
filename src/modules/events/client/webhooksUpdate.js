const { AuditLogEvent, EmbedBuilder, PermissionsBitField, TextChannel, NewsChannel, ThreadChannel } = require('discord.js');
const {
    guild: { runQuery, getOne, getAll },
} = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
const { normalizeKey } = require('../../utils/normalizing/normalizeKey');
module.exports = {
    name: 'webhooksUpdate',
    once: false,
    async execute(channel) {
        if (!channel.guild) return;
        try {
            logger.info(`📡 [WebhooksUpdate] Detected in #${channel.name} (ID: ${channel.id})`);
            const botMember = await channel.guild.members.fetchMe().catch(() => null);
            if (!botMember || !botMember.permissions.has(PermissionsBitField.Flags.ViewAuditLog)) {
                logger.warn(`🚫 Missing permission: The bot does not have "View Audit Log" in ${channel.guild.name}`);
                return;
            }
            const webhookLog = await fetchRecentWebhookAuditLog(channel.guild, channel.id);
            if (!webhookLog) {
                logger.warn('⚠️ No relevant webhook audit log entry found. Attempting to compare stored webhooks.');
                return await compareStoredWebhooks(channel);
            }
            const { action, executor, target, changes } = webhookLog;
            const webhookId = target?.id || '`Unknown`';
            const channelMention = `<#${channel.id}> \`${channel.name}\``;
            const performedBy = executor ? `<@${executor.id}>` : '`Unknown`';
            const changesList = changes?.map((change) => `🔄 **${change.key}**: \`${change.old ?? 'None'}\` → \`${change.new ?? 'None'}\``) || ['`No details available.`'];
            const webhooks = await channel.guild.fetchWebhooks();
            const webhook = webhooks.find((w) => w.id === target?.id);
            let actionType;
            let embedColor;
            let webhookUrl = '`Not Available`';
            let webhookName = '`Unknown`';
            const webhookKeyEntry = await getOne('SELECT webhook_key FROM guild_webhooks WHERE webhook_id = ?', [webhook?.id]);
            let webhookKey = webhookKeyEntry ? webhookKeyEntry.webhook_key : null;
            if (webhook) {
                webhookUrl = webhook.url;
                webhookName = webhook.name || channel.name;
                if (!webhookKey) {
                    webhookKey = await normalizeKey(webhookName, 'webhook', { guild: { getAll } });
                    logger.info(`🆕 Assigned new static webhook key: ${webhookKey}`);
                }
            }
            switch (action) {
            case AuditLogEvent.WebhookCreate:
                actionType = '📡 **Webhook Created**';
                embedColor = 0x2ecc71;
                if (webhook) {
                    await runQuery('INSERT INTO guild_webhooks (webhook_key, webhook_id, webhook_name, webhook_url, channel_id) VALUES (?, ?, ?, ?, ?) ON CONFLICT(webhook_key) DO NOTHING', [
                        webhookKey,
                        webhook.id,
                        webhook.name,
                        webhook.url,
                        channel.id,
                    ]);
                }
                break;
            case AuditLogEvent.WebhookUpdate:
                actionType = '🔄 **Webhook Updated**';
                embedColor = 0xf1c40f;
                if (webhook) {
                    await runQuery('UPDATE guild_webhooks SET webhook_name = ?, webhook_url = ?, channel_id = ? WHERE webhook_key = ?', [webhook.name, webhook.url, channel.id, webhookKey]);
                }
                break;
            case AuditLogEvent.WebhookDelete:
                actionType = '🗑️ **Webhook Deleted**';
                embedColor = 0xff0000;
                await runQuery('DELETE FROM guild_webhooks WHERE webhook_key = ?', [webhookKey]);
                break;
            default:
                logger.warn(`⚠️ Unhandled webhook action type: ${action}`);
                return;
            }
            const logChannel = await getWebhookLogChannel(channel.guild);
            if (!logChannel) return;
            const embed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle(actionType)
                .addFields(
                    { name: '📁 Channel', value: channelMention, inline: true },
                    { name: '👤 Performed By', value: performedBy, inline: true },
                    { name: '🆔 Webhook ID', value: `\`${webhookId}\``, inline: true },
                    { name: '🔑 Webhook Key', value: `\`${webhookKey}\``, inline: true },
                    { name: '🏷️ Webhook Name', value: `\`${webhookName}\``, inline: true },
                    { name: '🔗 Webhook URL', value: `\`\`\`${webhookUrl}\`\`\``, inline: false },
                    { name: '🔄 Changes', value: changesList.join('\n'), inline: false },
                )
                .setTimestamp();
            await logChannel.send({ embeds: [embed] });
            logger.info(`✅ Successfully logged webhook action: ${actionType}`);
        } catch (error) {
            logger.error(`❌ Error processing webhook update: ${error.message}`);
        }
    },
};

async function getWebhookLogChannel(guild) {
    const logChannelData = await getOne('SELECT channel_id FROM ensured_channels WHERE channel_key = ?', ['webhook_logs']);
    if (!logChannelData) return null;
    const channel = await guild.channels.fetch(logChannelData.channel_id).catch(() => null);
    if (channel instanceof TextChannel || channel instanceof NewsChannel || channel instanceof ThreadChannel) {
        return channel;
    }
    return null;
}

async function fetchRecentWebhookAuditLog(guild, channelId, maxAttempts = 6, delay = 5000) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        const fetchedLogs = await guild.fetchAuditLogs({ limit: 10 }).catch((error) => {
            logger.error(`❌ Error fetching audit logs: ${error.message}`);
            return null;
        });
        if (!fetchedLogs) continue;
        for (const [id, entry] of fetchedLogs.entries) {
            logger.debug(`🐞 Audit Log Entry Found: ID: ${id}, Action: ${entry.action}, Target Type: ${entry.targetType}, Extra: ${JSON.stringify(entry.extra)}`);
        }
        const webhookLog = fetchedLogs.entries.find(
            (entry) => [AuditLogEvent.WebhookCreate, AuditLogEvent.WebhookUpdate, AuditLogEvent.WebhookDelete].includes(entry.action) && entry.targetType === 'Webhook' && (entry.extra?.channelId === channelId || entry.target?.id),
        );
        if (webhookLog) {
            logger.debug(`✅ Matched Webhook Log: Action: ${webhookLog.action}, Webhook ID: ${webhookLog.target?.id}`);
            return webhookLog;
        }
    }
    return null;
}

async function compareStoredWebhooks(channel) {
    try {
        const storedWebhooks = (await getAll('SELECT webhook_key FROM guild_webhooks WHERE channel_id = ?', [channel.id])) || [];
        const fetchedWebhooks = await channel.guild.fetchWebhooks();
        const fetchedWebhookIds = fetchedWebhooks.map((w) => w.id);
        const storedWebhookIds = storedWebhooks.map((row) => row.webhook_key);
        for (const storedId of storedWebhookIds) {
            if (!fetchedWebhookIds.includes(storedId)) {
                logger.warn(`🛑 Missing Webhook Detected: Webhook ID ${storedId} no longer exists in Discord.`);
                await runQuery('DELETE FROM guild_webhooks WHERE webhook_key = ?', [storedId]);
                logger.info(`🗑️ Webhook ID ${storedId} has been removed from the database.`);
            }
        }
        for (const fetchedId of fetchedWebhookIds) {
            if (!storedWebhookIds.includes(fetchedId)) {
                logger.warn(`🆕 New Webhook Found: Webhook ID ${fetchedId} exists in Discord but is missing from the database.`);
                const webhook = fetchedWebhooks.find((w) => w.id === fetchedId);
                if (webhook) {
                    await runQuery('INSERT INTO guild_webhooks (webhook_key, webhook_url, channel_id) VALUES (?, ?, ?) ON CONFLICT(webhook_key) DO NOTHING', [webhook.id, webhook.url, channel.id]);
                    logger.info(`✅ Webhook ID ${fetchedId} has been added to the database.`);
                }
            }
        }
    } catch (error) {
        logger.error(`❌ Error in compareStoredWebhooks: ${error.message}`);
    }
}
