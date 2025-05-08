const os = require('os');
const db = require('../utils/essentials/dbUtils');
const { WebhookClient, EmbedBuilder } = require('discord.js');

let apiRequestCounter = 0;
let lastAlertTimestamp = 0; 
let systemWasCritical = false;

function incrementApiRequestCounter() {
    apiRequestCounter++;
}

function getPerformanceStats(client) {
    const memory = process.memoryUsage();
    const uptimeMs = process.uptime() * 1000;

    return new Promise((resolve) => {
        const start = process.hrtime();
        setImmediate(() => {
            const delta = process.hrtime(start);
            const lagMs = delta[0] * 1000 + delta[1] / 1e6;

            resolve({
                timestamp: new Date().toISOString(),
                bot_latency: client.ws.ping,
                bot_uptime_ms: Math.round(uptimeMs),
                memory_rss_mb: Math.round(memory.rss / 1024 / 1024),
                heap_used_mb: Math.round(memory.heapUsed / 1024 / 1024),
                cpu_load: os.loadavg()[0],
                system_uptime_sec: os.uptime(),
                free_mem_mb: Math.round(os.freemem() / 1024 / 1024),
                total_mem_mb: Math.round(os.totalmem() / 1024 / 1024),
                event_loop_lag_ms: Math.round(lagMs * 100) / 100,
                api_requests_per_min: apiRequestCounter,
            });

            apiRequestCounter = 0; 
        });
    });
}

async function savePerformanceSnapshot(client) {
    const data = await getPerformanceStats(client);

    await db.runQuery(
        `INSERT INTO performance_stats (
      timestamp, bot_latency, bot_uptime_ms, memory_rss_mb,
      cpu_load, system_uptime_sec, free_mem_mb, total_mem_mb,
      heap_used_mb, event_loop_lag_ms, api_requests_per_min
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            data.timestamp,
            data.bot_latency,
            data.bot_uptime_ms,
            data.memory_rss_mb,
            data.cpu_load,
            data.system_uptime_sec,
            data.free_mem_mb,
            data.total_mem_mb,
            data.heap_used_mb,
            data.event_loop_lag_ms,
            data.api_requests_per_min,
        ]
    );

    const isCritical =
    data.cpu_load > 2.5 ||
    data.event_loop_lag_ms > 75 ||
    data.bot_latency > 300 ||
    data.memory_rss_mb > 350 ||
    data.api_requests_per_min > 400 ||
    data.free_mem_mb < 300 ||
    data.heap_used_mb > 150;

    const now = Date.now();

    const webhookRow = await db.guild.getOne(
        'SELECT webhook_url FROM guild_webhooks WHERE webhook_key = ?',
        ['webhook_crit_logs']
    );
    if (!webhookRow?.webhook_url) return;

    const [, , , , , webhookId, webhookToken] = webhookRow.webhook_url.split('/');
    const webhook = new WebhookClient({ id: webhookId, token: webhookToken });

    if (isCritical && now - lastAlertTimestamp >= 10 * 60 * 1000) {
        lastAlertTimestamp = now;
        systemWasCritical = true;

        const embed = new EmbedBuilder()
            .setTitle('🚨 **Critical System Alert**')
            .setDescription('One or more performance thresholds have been exceeded.')
            .setColor(0xff0000)
            .setTimestamp()
            .addFields(
                {
                    name: '📡 Bot Latency',
                    value: `\`${data.bot_latency}ms\` > \`300ms\``,
                    inline: true,
                },
                {
                    name: '🧠 CPU Load',
                    value: `\`${data.cpu_load.toFixed(2)}\` > \`2.5\``,
                    inline: true,
                },
                {
                    name: '🌀 Event Loop Lag',
                    value: `\`${data.event_loop_lag_ms}ms\` > \`75ms\``,
                    inline: true,
                },
                {
                    name: '📦 Memory (RSS)',
                    value: `\`${data.memory_rss_mb}MB\` > \`350MB\``,
                    inline: true,
                },
                {
                    name: '📉 Free Memory',
                    value: `\`${data.free_mem_mb}MB\``,
                    inline: true,
                },
                {
                    name: '🔁 API Requests (last min)',
                    value: `\`${data.api_requests_per_min}\``,
                    inline: true,
                }
            )
            .setFooter({ text: 'Varietyz Bot • Performance Monitor' });

        await webhook.send({
            username: '🚨 Crit Logs',
            embeds: [embed],
        });
    }

    if (!isCritical && systemWasCritical) {
        systemWasCritical = false;

        const embed = new EmbedBuilder()
            .setTitle('✅ System Recovered')
            .setDescription('Performance metrics have returned to safe levels.')
            .setColor(0x2ecc71)
            .setTimestamp()
            .addFields(
                {
                    name: '📡 Bot Latency',
                    value: `\`${data.bot_latency}ms\``,
                    inline: true,
                },
                {
                    name: '🧠 CPU Load',
                    value: `\`${data.cpu_load.toFixed(2)}\``,
                    inline: true,
                },
                {
                    name: '🌀 Event Loop Lag',
                    value: `\`${data.event_loop_lag_ms}ms\``,
                    inline: true,
                },
                {
                    name: '📦 Memory (RSS)',
                    value: `\`${data.memory_rss_mb}MB\``,
                    inline: true,
                },
                {
                    name: '🔁 API Requests (last min)',
                    value: `\`${data.api_requests_per_min}\``,
                    inline: true,
                }
            )
            .setFooter({ text: 'Varietyz Bot • Performance Monitor' });

        await webhook.send({
            username: '✅ Crit Logs',
            embeds: [embed],
        });
    }
}

module.exports = {
    getPerformanceStats,
    savePerformanceSnapshot,
    incrementApiRequestCounter,
};
