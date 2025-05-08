const db = require('../../modules/utils/essentials/dbUtils');
const {
    normalizeRsn,
} = require('../../modules/utils/normalizing/normalizeRsn');

const SYSTEM_TABLES = {
    CHAT_MESSAGES: 'chat_messages',
    DROP: 'drops',
    RAID_DROP: 'raid_drops',
    PET_DROP: 'pet_drops',
    COLLECTION_LOG: 'collection_log',
    PERSONAL_BEST: 'personal_bests',
    QUESTS: 'quest_completed',
    CLUE_DROP: 'clue_rewards',
    LEVEL_UP: 'level_ups',
    PVP: 'pvp_messages',
    COMBAT_ACHIEVEMENTS: 'combat_achievements',
    DIARY: 'diary_completed',
    TASKS: 'combat_tasks_completed',
    KEYS: 'loot_key_rewards',
    ATTENDANCE: 'clan_traffic',
};

async function fetchAnalyticsData(rsn) {
    const normalized = normalizeRsn(rsn);
    const analytics = {};
    let totalDropValue = 0;
    let pvpKills = 0;
    let pvpDeaths = 0;
    let netProfit = 0;

    for (const [key, table] of Object.entries(SYSTEM_TABLES)) {
        if (table === 'clan_traffic') {
            const result = await db.messages.getOne(
                `SELECT COUNT(*) AS count FROM ${table} WHERE message LIKE ?`,
                [`%by ${normalized}.%`]
            );
            analytics[key] = result?.count || 0;
            continue;
        }

        if (table === 'pvp_messages') {
            const kills = await db.messages.getAll(
                `SELECT message FROM ${table} WHERE LOWER(rsn) = LOWER(?) AND message LIKE 'has defeated%'`,
                [normalized]
            );
            const deaths = await db.messages.getAll(
                `SELECT message FROM ${table} WHERE LOWER(rsn) = LOWER(?) AND message LIKE 'has been defeated by%'`,
                [normalized]
            );

            kills.forEach(({ message }) => {
                const match = message.match(/\(([\d,]+) coins\)/);
                if (match) netProfit += parseInt(match[1].replace(/,/g, ''), 10);
            });

            deaths.forEach(({ message }) => {
                const match = message.match(/\(([\d,]+) coins\)/);
                if (match) netProfit -= parseInt(match[1].replace(/,/g, ''), 10);
            });

            pvpKills = kills.length;
            pvpDeaths = deaths.length;
            analytics[key] = pvpKills + pvpDeaths;
            continue;
        }

        if (table === 'drops') {
            const dropRows = await db.messages.getAll(
                `SELECT message FROM ${table} WHERE LOWER(REPLACE(REPLACE(rsn, '-', ' '), '_', ' ')) = ?`,
                [normalized]
            );
            analytics[key] = dropRows.length;
            dropRows.forEach(({ message }) => {
                const match = message.match(/\(([\d,]+) coins\)/);
                if (match) totalDropValue += parseInt(match[1].replace(/,/g, ''), 10);
            });
            continue;
        }

        const countRow = await db.messages.getOne(
            `SELECT COUNT(*) AS count FROM ${table} WHERE LOWER(REPLACE(REPLACE(rsn, '-', ' '), '_', ' ')) = ?`,
            [normalized]
        );
        analytics[key] = countRow?.count || 0;
    }

    const userRow = await db.getOne(
        'SELECT total_wins, total_metric_gain_sotw, total_metric_gain_botw FROM users WHERE LOWER(rsn) = ?',
        [normalized]
    );

    return {
        rsn,
        normalizedRsn: normalized,
        stats: analytics,
        totals: {
            totalDropValue,
            pvpKills,
            pvpDeaths,
            netProfit,
        },
        competition: userRow || {},
    };
}

module.exports = { fetchAnalyticsData };
