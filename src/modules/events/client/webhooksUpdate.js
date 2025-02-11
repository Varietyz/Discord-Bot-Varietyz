const { AuditLogEvent, EmbedBuilder, PermissionsBitField } = require('discord.js');
const {
    guild: { runQuery, getOne, getAll },
} = require('../../utils/dbUtils');

const logger = require('../../utils/logger');
const { normalizeKey } = require('../../utils/normalizeKey');

module.exports = {
    name: 'webhooksUpdate',
    once: false,

    /**
     * Handles webhook updates by fetching audit logs and updating the database accordingly.
     * @param {import('discord.js').GuildTextBasedChannel} channel - The channel where the webhook update occurred.
     * @returns
     */
    async execute(channel) {
        if (!channel.guild) return;

        try {
            logger.info(`📡 [WebhooksUpdate] Detected in #${channel.name} (ID: ${channel.id})`);

            // Ensure the bot has permission to view audit logs
            const botMember = await channel.guild.members.fetchMe().catch(() => null);
            if (!botMember || !botMember.permissions.has(PermissionsBitField.Flags.ViewAuditLog)) {
                logger.warn(`🚫 Missing permission: The bot does not have "View Audit Log" in ${channel.guild.name}`);
                return;
            }

            // Introduce a small delay before fetching audit logs to allow Discord to update them
            const webhookLog = await fetchRecentWebhookAuditLog(channel.guild, channel.id);
            if (!webhookLog) {
                logger.warn('⚠️ No relevant webhook audit log entry found. Attempting to compare stored webhooks.');
                return await compareStoredWebhooks(channel);
            }

            const { action, executor, target, changes } = webhookLog;
            let webhookId = '`Unknown`';
            const channelMention = `<#${channel.id}> \`${channel.name}\``;
            const performedBy = executor ? `<@${executor.id}>` : '`Unknown`';
            const changesList = changes?.map((change) => `🔄 **${change.key}**: \`${change.old ?? 'None'}\` → \`${change.new ?? 'None'}\``) || ['`No details available.`'];

            // Fetch all webhooks from the guild
            const webhooks = await channel.guild.fetchWebhooks();
            const webhook = webhooks.find((w) => w.id === target?.id);
            webhookId = webhook ? webhook.id : target?.id || '`Unknown`';

            let actionType;
            let embedColor;

            let webhookUrl = '`Not Available`'; // Default value if URL is missing
            let webhookName = '`Unknown`'; // Default name if not set

            // Fetch existing webhook names to ensure uniqueness
            const existingWebhookNames = new Set((await getAll('SELECT webhook_name FROM guild_webhooks WHERE channel_id = ?', [channel.id]))?.map((row) => row.webhook_name) || []);

            if (webhook?.url) {
                webhookUrl = webhook.url;
                webhookName = webhook.name ? normalizeKey(webhook.name, 'webhook', existingWebhookNames) : normalizeKey(channel.name, 'webhook', existingWebhookNames);
            }

            switch (action) {
            case AuditLogEvent.WebhookCreate:
                actionType = '📡 **Webhook Created**';
                embedColor = 0x2ecc71;
                if (webhook) {
                    try {
                        await runQuery('INSERT INTO guild_webhooks (webhook_key, webhook_name, webhook_url, channel_id) VALUES (?, ?, ?, ?) ON CONFLICT(webhook_key) DO NOTHING', [webhook.id, webhookName, webhook.url, channel.id]);
                    } catch (err) {
                        logger.error(`❌ Failed to insert webhook (ID: ${webhookId}) into DB: ${err.message}`);
                    }
                }
                break;

            case AuditLogEvent.WebhookUpdate:
                actionType = '🔄 **Webhook Updated**';
                embedColor = 0xf1c40f;
                if (webhook) {
                    try {
                        await runQuery('UPDATE guild_webhooks SET webhook_name = ?, webhook_url = ?, channel_id = ? WHERE webhook_key = ?', [webhookName, webhook.url, channel.id, webhook.id]);
                    } catch (err) {
                        logger.error(`❌ Failed to update webhook (ID: ${webhookId}) in DB: ${err.message}`);
                    }
                }
                break;

            case AuditLogEvent.WebhookDelete:
                actionType = '🗑️ **Webhook Deleted**';
                embedColor = 0xff0000;
                try {
                    await runQuery('DELETE FROM guild_webhooks WHERE webhook_key = ?', [webhookId]);
                } catch (err) {
                    logger.error(`❌ Failed to delete webhook (ID: ${webhookId}) from DB: ${err.message}`);
                }
                break;

            default:
                logger.warn(`⚠️ Unhandled webhook action type: ${action}`);
                return;
            }

            const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['server_logs']);
            if (!logChannelData) return;

            const logChannel = await channel.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (logChannel && 'send' in logChannel) {
                const embed = new EmbedBuilder()
                    .setColor(embedColor)
                    .setTitle(actionType)
                    .addFields(
                        { name: '📁 Channel', value: channelMention, inline: true },
                        { name: '👤 Performed By', value: performedBy, inline: true },
                        { name: '🆔 Webhook ID', value: `\`${webhookId}\``, inline: true },
                        { name: '🏷️ Webhook Name', value: `\`${webhookName}\``, inline: false }, // Shows readable name
                        { name: '🔗 Webhook URL', value: `\`\`\`${webhookUrl}\`\`\``, inline: false }, // Shows URL in all cases
                        { name: '🔄 Changes', value: changesList.join('\n'), inline: false },
                    )
                    .setTimestamp();

                await logChannel.send({ embeds: [embed] });
            } else {
                logger.warn(`⚠️ Attempted to log webhook event in an invalid channel (ID: ${logChannelData.channel_id})`);
            }

            logger.info(`✅ Successfully logged webhook action: ${actionType}`);
        } catch (error) {
            logger.error(`❌ Error processing webhook update: ${error.message}`);
        }
    },
};

/**
 * Fetches the most recent webhook-related audit log entry, with retries.
 * @param guild
 * @param channelId
 * @param maxAttempts
 * @param delay
 * @returns
 */
async function fetchRecentWebhookAuditLog(guild, channelId, maxAttempts = 6, delay = 5000) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, delay));

        const fetchedLogs = await guild.fetchAuditLogs({ limit: 10 }).catch((error) => {
            logger.error(`❌ Error fetching audit logs: ${error.message}`);
            return null;
        });

        if (!fetchedLogs) continue;

        // 🔍 Debugging: Log all recent audit log entries
        for (const [id, entry] of fetchedLogs.entries) {
            logger.debug(`🐞 Audit Log Entry Found: ID: ${id}, Action: ${entry.action}, Target Type: ${entry.targetType}, Extra: ${JSON.stringify(entry.extra)}`);
        }

        // ✅ Look for the most recent webhook-related log for the correct channel
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

/**
 * Compares stored webhooks with the currently fetched webhooks.
 * If discrepancies are found, updates the database accordingly.
 * @param channel
 */
async function compareStoredWebhooks(channel) {
    try {
        // Retrieve all stored webhooks for this channel
        const storedWebhooks = (await getAll('SELECT webhook_key FROM guild_webhooks WHERE channel_id = ?', [channel.id])) || [];

        // Fetch current webhooks from the server
        const fetchedWebhooks = await channel.guild.fetchWebhooks();
        const fetchedWebhookIds = fetchedWebhooks.map((w) => w.id);

        // Convert storedWebhooks array into a simple array of IDs
        const storedWebhookIds = storedWebhooks.map((row) => row.webhook_key);

        // ✅ Check for missing webhooks (stored in DB but no longer exist in Discord)
        for (const storedId of storedWebhookIds) {
            if (!fetchedWebhookIds.includes(storedId)) {
                logger.warn(`🛑 Missing Webhook Detected: Webhook ID ${storedId} no longer exists in Discord.`);

                // ✅ FIX: Remove missing webhooks from the database
                await runQuery('DELETE FROM guild_webhooks WHERE webhook_key = ?', [storedId]);
                logger.info(`🗑️ Webhook ID ${storedId} has been removed from the database.`);
            }
        }

        // ✅ Check for new webhooks that are not in the database
        for (const fetchedId of fetchedWebhookIds) {
            if (!storedWebhookIds.includes(fetchedId)) {
                logger.warn(`🆕 New Webhook Found: Webhook ID ${fetchedId} exists in Discord but is missing from the database.`);

                // ✅ FIX: Insert missing webhooks into the database
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
