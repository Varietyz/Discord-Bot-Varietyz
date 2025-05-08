const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
const { normalizeRsn } = require('../../utils/normalizing/normalizeRsn');
const SYSTEM_TABLES = {
    CHAT_MESSAGES: { table: 'chat_messages', display: 'CC Messages 💬' },
    DROP: { table: 'drops', display: 'Valuable Drops 📦' },
    RAID_DROP: { table: 'raid_drops', display: 'Raid Drops 🏆' },
    QUESTS: { table: 'quest_completed', display: 'Quests Completed 📜' },
    COLLECTION_LOG: { table: 'collection_log', display: 'Collections Logged 📖' },
    PERSONAL_BEST: { table: 'personal_bests', display: 'New Personal Bests ⏱️' },
    PVP: { table: 'pvp_messages', display: 'PvP Logs ⚔️' },
    PET_DROP: { table: 'pet_drops', display: 'Pets Dropped 🐾' },
    LEVEL_UP: { table: 'level_ups', display: 'Level Up Messages 📈' },
    COMBAT_ACHIEVEMENTS: { table: 'combat_achievements', display: 'Combat Achievements 🎖️' },
    CLUE_DROP: { table: 'clue_rewards', display: 'Clue Scroll Rewards 🔎' },
    ATTENDANCE: { table: 'clan_traffic', display: 'Invited Clannies 🏰' },
    DIARY: { table: 'diary_completed', display: 'Achievement Diaries 📔' },
    TASKS: { table: 'combat_tasks_completed', display: 'Combat Tasks 🛡️' },
    KEYS: { table: 'loot_key_rewards', display: 'Keys Looted 🔑' },
};
module.exports = {
    data: new SlashCommandBuilder()
        .setName('analytics')
        .setDescription('Retrieve detailed clan-chat analytics for an RSN.')
        .addStringOption((option) => option.setName('rsn').setDescription('The RSN to analyze.').setAutocomplete(true).setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });
        const rsn = interaction.options.getString('rsn');
        const normalizedRsn = normalizeRsn(rsn);
        logger.info(`📊 Fetching analytics for RSN: ${rsn} (normalized: ${normalizedRsn})`);
        const analyticsData = {};
        let totalEntries = 0;
        let totalDrops = 0;
        let totalDropValue = 0;
        let totalRaidDrops = 0;
        let pvpKills = 0;
        let pvpDeaths = 0;
        let totalCoinsGained = 0;
        let totalCoinsLost = 0;
        let clanInvites = 0;
        try {
            const rsnCheck = await db.getOne('SELECT rsn FROM clan_members WHERE LOWER(REPLACE(REPLACE(rsn, \'-\', \' \'), \'_\', \' \')) = ?', [normalizedRsn]);
            if (!rsnCheck) {
                return await interaction.editReply({
                    content: `❌ **Error:** \`${rsn}\` is not a clan member. Please select a clan member to view analytics from.`,
                    flags: 64,
                });
            }
            for (const [key, { table }] of Object.entries(SYSTEM_TABLES)) {
                if (table === 'clan_traffic') {
                    const result = await db.messages.getOne(`SELECT COUNT(*) AS count FROM ${table} WHERE message LIKE ?`, [`%by ${normalizedRsn}.%`]);
                    clanInvites = result?.count || 0;
                    analyticsData[key] = clanInvites;
                } else if (table === 'pvp_messages') {
                    const deathResults = await db.messages.getAll(`SELECT message FROM ${table} WHERE LOWER(rsn) = LOWER(?) AND message LIKE 'has been defeated by%' COLLATE NOCASE`, [normalizedRsn]);
                    const killResults = await db.messages.getAll(`SELECT message FROM ${table} WHERE LOWER(rsn) = LOWER(?) AND message LIKE 'has defeated%' COLLATE NOCASE`, [normalizedRsn]);
                    pvpKills = killResults.length;
                    pvpDeaths = deathResults.length;
                    for (const row of killResults) {
                        if (row?.message) {
                            const match = row.message.match(/\(([\d,]+) coins\)/);
                            if (match) totalCoinsGained += parseInt(match[1].replace(/,/g, ''), 10);
                        }
                    }
                    for (const row of deathResults) {
                        if (row?.message) {
                            const match = row.message.match(/\(([\d,]+) coins\)/);
                            if (match) totalCoinsLost += parseInt(match[1].replace(/,/g, ''), 10);
                        }
                    }
                    analyticsData[key] = pvpKills + pvpDeaths;
                } else if (table === 'drops') {
                    const dropResults = await db.messages.getAll(`SELECT message FROM ${table} WHERE LOWER(REPLACE(REPLACE(rsn, '-', ' '), '_', ' ')) = ?`, [normalizedRsn]);
                    totalDrops = dropResults.length;
                    for (const { message } of dropResults) {
                        const match = message.match(/\(([\d,]+) coins\)/);
                        if (match) totalDropValue += parseInt(match[1].replace(/,/g, ''), 10);
                    }
                    analyticsData[key] = totalDrops;
                } else if (table === 'raid_drops') {
                    const raidDropResults = await db.messages.getOne(`SELECT COUNT(*) AS count FROM ${table} WHERE LOWER(REPLACE(REPLACE(rsn, '-', ' '), '_', ' ')) = ?`, [normalizedRsn]);
                    totalRaidDrops = raidDropResults?.count || 0;
                    analyticsData[key] = totalRaidDrops;
                } else {
                    const result = await db.messages.getOne(`SELECT COUNT(*) AS count FROM ${table} WHERE LOWER(REPLACE(REPLACE(rsn, '-', ' '), '_', ' ')) = ?`, [normalizedRsn]);
                    analyticsData[key] = result?.count || 0;
                    totalEntries += analyticsData[key];
                }
            }
            const netProfit = totalCoinsGained - totalCoinsLost;
            const embed = new EmbedBuilder()
                .setTitle(`📊 Clan-Chat Analytics for ${rsn}`)
                .setColor(0x3498db)
                .setDescription(`<#1223648768126222450> Total: **\`${totalEntries}\`**`)
                .addFields(
                    ...Object.entries(SYSTEM_TABLES)
                        .filter(([_, { table }]) => table !== 'clan_traffic')
                        .map(([key, { display }]) => ({
                            name: `${display}`,
                            value: `- **\`${analyticsData[key] || 0}\`**`,
                            inline: true,
                        })),
                    {
                        name: '\u200b',
                        value: '\u200b',
                        inline: true,
                    },
                    {
                        name: '💰 Drops Worth',
                        value: `- **\`${totalDropValue.toLocaleString()} gp\`**`,
                        inline: false,
                    },
                    {
                        name: '💀 PvP Stats',
                        value: `- Kills: **\`${pvpKills}\`**\n- Deaths: **\`${pvpDeaths}\`**\n- Net Profit: **\`${netProfit.toLocaleString()} gp\`**`,
                        inline: true,
                    },
                    { name: '🏰 Invited Clannies', value: `**\`${clanInvites}\`**`, inline: true },
                );
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            logger.error(`❌ Error fetching analytics for ${rsn}: ${error.message}`);
            await interaction.editReply({ content: '❌ **Error:** Unable to retrieve analytics.', flags: 64 });
        }
    },
    async autocomplete(interaction) {
        const input = interaction.options.getFocused(true).value.toLowerCase();
        const results = await db.getAll('SELECT DISTINCT rsn FROM clan_members WHERE LOWER(rsn) LIKE ?', [`%${input}%`]);
        const choices = results.map((row) => ({ name: row.rsn, value: row.rsn })).slice(0, 25);
        await interaction.respond(choices);
    },
};
