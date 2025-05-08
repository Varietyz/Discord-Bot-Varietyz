const { EmbedBuilder } = require('discord.js');
const logger = require('../utils/essentials/logger.js');
const db = require('../utils/essentials/dbUtils.js');
const { normalizeRsn } = require('../utils/normalizing/normalizeRsn.js');
const { cleanupInactiveUsers } = require('../utils/helpers/cleanupInactiveUsers');
const THRESHOLDS = {
    skills: {
        default: 99,
        custom: {
            overall: { threshold: 2277, roleKeys: ['role_99_overall', 'role_2277_total', 'role_max_cape'] },
        },
    },
    bosses: {
        default: 300,
        custom: {
            chambers_of_xeric_challenge_mode: { threshold: 75, roleKey: 'role_cox_challenge_mode' },
            kalphite_queen: { threshold: 300, roleKey: 'role_kalphite_queen' },
            abyssal_sire: { threshold: 300, roleKey: 'role_abyssal_sire' },
            alchemical_hydra: { threshold: 300, roleKey: 'role_alchemical_hydra' },
            amoxliatl: { threshold: 500, roleKey: 'role_amoxliatl' },
            araxxor: { threshold: 300, roleKey: 'role_araxxor' },
            artio: { threshold: 300, roleKey: 'role_artio' },
            barrows_chests: { threshold: 300, roleKey: 'role_barrows_chests' },
            bryophyta: { threshold: 500, roleKey: 'role_bryophyta' },
            callisto: { threshold: 300, roleKey: 'role_callisto' },
            calvarion: { threshold: 300, roleKey: 'role_calvarion' },
            cerberus: { threshold: 300, roleKey: 'role_cerberus' },
            chambers_of_xeric: { threshold: 150, roleKey: 'role_chambers_of_xeric' },
            chaos_elemental: { threshold: 300, roleKey: 'role_chaos_elemental' },
            chaos_fanatic: { threshold: 300, roleKey: 'role_chaos_fanatic' },
            commander_zilyana: { threshold: 300, roleKey: 'role_commander_zilyana' },
            corporeal_beast: { threshold: 200, roleKey: 'role_corporeal_beast' },
            crazy_archaeologist: { threshold: 500, roleKey: 'role_crazy_archaeologist' },
            dagannoth_prime: { threshold: 250, roleKey: 'role_dagannoth_prime' },
            dagannoth_rex: { threshold: 250, roleKey: 'role_dagannoth_rex' },
            dagannoth_supreme: { threshold: 250, roleKey: 'role_dagannoth_supreme' },
            deranged_archaeologist: { threshold: 500, roleKey: 'role_deranged_archaeologist' },
            duke_sucellus: { threshold: 500, roleKey: 'role_duke_sucellus' },
            general_graardor: { threshold: 300, roleKey: 'role_general_graardor' },
            giant_mole: { threshold: 500, roleKey: 'role_giant_mole' },
            grotesque_guardians: { threshold: 200, roleKey: 'role_grotesque_guardians' },
            hespori: { threshold: 200, roleKey: 'role_hespori' },
            king_black_dragon: { threshold: 300, roleKey: 'role_king_black_dragon' },
            kraken: { threshold: 500, roleKey: 'role_kraken' },
            kreearra: { threshold: 300, roleKey: 'role_kreearra' },
            kril_tsutsaroth: { threshold: 300, roleKey: 'role_kril_tsutsaroth' },
            lunar_chests: { threshold: 100, roleKey: 'role_lunar_chests' },
            mimic: { threshold: 10, roleKey: 'role_mimic' },
            nex: { threshold: 200, roleKey: 'role_nex' },
            nightmare: { threshold: 200, roleKey: 'role_nightmare' },
            phosanis_nightmare: { threshold: 150, roleKey: 'role_phosanis_nightmare' },
            obor: { threshold: 500, roleKey: 'role_obor' },
            phantom_muspah: { threshold: 300, roleKey: 'role_phantom_muspah' },
            sarachnis: { threshold: 300, roleKey: 'role_sarachnis' },
            scorpia: { threshold: 300, roleKey: 'role_scorpia' },
            scurrius: { threshold: 500, roleKey: 'role_scurrius' },
            skotizo: { threshold: 300, roleKey: 'role_skotizo' },
            sol_heredit: { threshold: 1, roleKey: 'role_sol_heredit' },
            spindel: { threshold: 300, roleKey: 'role_spindel' },
            tempoross: { threshold: 500, roleKey: 'role_tempoross' },
            the_gauntlet: { threshold: 150, roleKey: 'role_the_gauntlet' },
            the_corrupted_gauntlet: { threshold: 100, roleKey: 'role_the_corrupted_gauntlet' },
            the_hueycoatl: { threshold: 300, roleKey: 'role_the_hueycoatl' },
            the_leviathan: { threshold: 300, roleKey: 'role_the_leviathan' },
            the_royal_titans: { threshold: 500, roleKey: 'role_the_royal_titans' },
            the_whisperer: { threshold: 250, roleKey: 'role_the_whisperer' },
            theatre_of_blood: { threshold: 150, roleKey: 'role_theatre_of_blood' },
            theatre_of_blood_hard_mode: { threshold: 75, roleKey: 'role_theatre_of_blood_hard_mode' },
            thermonuclear_smoke_devil: { threshold: 300, roleKey: 'role_thermonuclear_smoke_devil' },
            tombs_of_amascut: { threshold: 150, roleKey: 'role_tombs_of_amascut' },
            tombs_of_amascut_expert: { threshold: 75, roleKey: 'role_tombs_of_amascut_expert' },
            tzkal_zuk: { threshold: 1, roleKey: 'role_tzkal_zuk' },
            tztok_jad: { threshold: 10, roleKey: 'role_tztok_jad' },
            vardorvis: { threshold: 200, roleKey: 'role_vardorvis' },
            venenatis: { threshold: 300, roleKey: 'role_venenatis' },
            vetion: { threshold: 300, roleKey: 'role_vetion' },
            vorkath: { threshold: 300, roleKey: 'role_vorkath' },
            wintertodt: { threshold: 500, roleKey: 'role_wintertodt' },
            zalcano: { threshold: 500, roleKey: 'role_zalcano' },
            zulrah: { threshold: 300, roleKey: 'role_zulrah' },
        },
    },
    activities: {
        default: 50,
        custom: {
            league_points: { threshold: 45000, roleKey: 'role_league_points' },
            bounty_hunter_hunter: { threshold: 700, roleKey: 'role_bounty_hunter_hunter' },
            bounty_hunter_rogue: { threshold: 100, roleKey: 'role_bounty_hunter_rogue' },
            clue_scrolls_all: { threshold: 1550, roleKey: 'role_clue_scrolls_all' },
            clue_scrolls_beginner: { threshold: 500, roleKey: 'role_clue_scrolls_beginner' },
            clue_scrolls_easy: { threshold: 400, roleKey: 'role_clue_scrolls_easy' },
            clue_scrolls_medium: { threshold: 300, roleKey: 'role_clue_scrolls_medium' },
            clue_scrolls_hard: { threshold: 200, roleKey: 'role_clue_scrolls_hard' },
            clue_scrolls_elite: { threshold: 100, roleKey: 'role_clue_scrolls_elite' },
            clue_scrolls_master: { threshold: 50, roleKey: 'role_clue_scrolls_master' },
            last_man_standing: { threshold: 15000, roleKey: 'role_last_man_standing' },
            pvp_arena: { threshold: 5000, roleKey: 'role_pvp_arena' },
            soul_wars_zeal: { threshold: 100000, roleKey: 'role_soul_wars_zeal' },
            guardians_of_the_rift: { threshold: 350, roleKey: 'role_guardians_of_the_rift' },
            colosseum_glory: { threshold: 20000, roleKey: 'role_colosseum_glory' },
            collections_logged: { threshold: 750, roleKey: 'role_collections_logged' },
        },
    },
};

function deriveRoleKeys(metricType, metricName) {
    switch (metricType) {
    case 'skills': {
        const key = metricName.toLowerCase();
        if (THRESHOLDS.skills.custom[key]) {
            const custom = THRESHOLDS.skills.custom[key];
            let roles = Array.isArray(custom.roleKeys) ? custom.roleKeys : [custom.roleKey];
            if (roles.includes('role_99_overall')) {
                roles = [...new Set([...roles, 'role_2277_total', 'role_max_cape'])];
            }
            return roles;
        }
        return [`role_99_${key}`];
    }
    case 'bosses':
    case 'activities': {
        const key = metricName.toLowerCase().replace(/\s+/g, '_');
        if (THRESHOLDS[metricType].custom[key]) {
            const custom = THRESHOLDS[metricType].custom[key];
            return Array.isArray(custom.roleKeys) ? custom.roleKeys : [custom.roleKey];
        }
        return [`role_${key}`];
    }
    default:
        return [];
    }
}

function getThresholdForMetric(metricType, metricName) {
    switch (metricType) {
    case 'skills': {
        const key = metricName.toLowerCase();
        if (THRESHOLDS.skills.custom[key]) return THRESHOLDS.skills.custom[key].threshold;
        return THRESHOLDS.skills.default;
    }
    case 'bosses': {
        const key = metricName.toLowerCase().replace(/\s+/g, '_');
        if (THRESHOLDS.bosses.custom[key]) return THRESHOLDS.bosses.custom[key].threshold;
        return THRESHOLDS.bosses.default;
    }
    case 'activities': {
        const key = metricName.toLowerCase().replace(/\s+/g, '_');
        if (THRESHOLDS.activities.custom[key]) return THRESHOLDS.activities.custom[key].threshold;
        return THRESHOLDS.activities.default;
    }
    default:
        return null;
    }
}

async function fetchGuildRoles() {
    const query = 'SELECT role_id, role_key FROM guild_roles';
    const rows = await db.guild.getAll(query);
    const rolesMap = {};
    for (const row of rows) {
        rolesMap[row.role_key] = { roleId: row.role_id, roleKey: row.role_key };
    }
    return rolesMap;
}

async function fetchGuildEmojis() {
    const query = 'SELECT emoji_key, emoji_format FROM guild_emojis';
    const rows = await db.guild.getAll(query);
    const emojisMap = {};
    for (const row of rows) {
        emojisMap[row.emoji_key] = row.emoji_format;
    }
    return emojisMap;
}

function getEmojiForRoleKey(roleKey, emojisMap) {
    let keyPart = roleKey;
    if (roleKey === 'role_2277_total') {
        keyPart = 'overall';
    } else if (roleKey.startsWith('role_99_')) {
        keyPart = roleKey.substring('role_99_'.length);
    } else if (roleKey.startsWith('role_')) {
        keyPart = roleKey.substring('role_'.length);
    }
    const emojiKey = `emoji_${keyPart}`;
    return emojisMap[emojiKey] || '';
}

async function processMemberRoles(guild, member, hiscoresData, guildRolesMap, emojisMap) {
    const roleUpdates = [];
    const expectedRoleKeys = new Set();
    const managedRoleKeys = new Set();
    for (const key in hiscoresData) {
        const rawValue = hiscoresData[key];
        const value = parseInt(rawValue, 10);
        if (isNaN(value)) continue;
        let metricName,
            roleKeys = [],
            threshold;
        if (key.startsWith('Skills ') && key.endsWith(' Level')) {
            metricName = key.slice('Skills '.length, key.length - ' Level'.length).trim();
            roleKeys = deriveRoleKeys('skills', metricName);
            threshold = getThresholdForMetric('skills', metricName);
        } else if (key.startsWith('Bosses ') && key.endsWith(' Kills')) {
            metricName = key.slice('Bosses '.length, key.length - ' Kills'.length).trim();
            roleKeys = deriveRoleKeys('bosses', metricName);
            threshold = getThresholdForMetric('bosses', metricName);
        } else if (key.startsWith('Activities ') && key.endsWith(' Score')) {
            metricName = key.slice('Activities '.length, key.length - ' Score'.length).trim();
            roleKeys = deriveRoleKeys('activities', metricName);
            threshold = getThresholdForMetric('activities', metricName);
        }
        if (roleKeys && roleKeys.length > 0) {
            roleKeys.forEach((rk) => {
                managedRoleKeys.add(rk);
                if (value >= threshold) {
                    expectedRoleKeys.add(rk);
                }
            });
        }
    }
    for (const roleKey of managedRoleKeys) {
        const roleData = guildRolesMap[roleKey];
        if (!roleData) continue;
        if (!expectedRoleKeys.has(roleKey) && member.roles.cache.has(roleData.roleId)) {
            try {
                await member.roles.remove(roleData.roleId);
                const emoji = getEmojiForRoleKey(roleKey, emojisMap);
                const roleName = guild.roles.cache.get(roleData.roleId)?.name || roleKey;
                roleUpdates.push({
                    action: 'removed',
                    roleKey,
                    roleId: roleData.roleId,
                    roleName,
                    emoji,
                    currentScore: hiscoresData[roleKey] || 0,
                    threshold: getThresholdForMetric('skills', roleKey),
                });
            } catch (err) {
                logger.error(`Error removing role ${roleKey} from member ${member.id}: ${err.message}`);
            }
        }
    }
    for (const roleKey of expectedRoleKeys) {
        const roleData = guildRolesMap[roleKey];
        if (!roleData) {
            if (roleKey !== 'role_99_overall') {
                logger.warn(`No guild role found for roleKey ${roleKey}`);
            }
            continue;
        }
        if (!member.roles.cache.has(roleData.roleId)) {
            try {
                await member.roles.add(roleData.roleId);
                const emoji = getEmojiForRoleKey(roleKey, emojisMap);
                const roleName = guild.roles.cache.get(roleData.roleId)?.name || roleKey;
                roleUpdates.push({
                    action: 'assigned',
                    roleKey,
                    roleId: roleData.roleId,
                    roleName,
                    emoji,
                    currentScore: hiscoresData[roleKey] || 0,
                    threshold: getThresholdForMetric('skills', roleKey),
                });
            } catch (err) {
                logger.error(`Error assigning role ${roleKey} to member ${member.id}: ${err.message}`);
            }
        }
    }
    const overallRoles = new Set(['role_99_overall', 'role_2277_total', 'role_max_cape']);
    const hasOverallRole = [...expectedRoleKeys].some((role) => overallRoles.has(role));
    if (hasOverallRole) {
        overallRoles.forEach((role) => expectedRoleKeys.add(role));
    } else {
        overallRoles.forEach((role) => managedRoleKeys.add(role));
    }
    const roleChanges = roleUpdates.map((update) => {
        const actionIcon = update.action === 'assigned' ? '✅' : '❌';
        return `${actionIcon} ${update.emoji} <@&${update.roleId}>`;
    });
    if (roleUpdates.length > 0) {
        const embed = new EmbedBuilder().setTitle('Role Changes').setDescription(roleChanges.join('\n')).setColor(0x48de6f).setTimestamp();

        return [embed];
    }
    return null;
}

async function fetchAndProcessMember(guild, userId) {
    try {
        const rsns = await getUserRSNs(userId);
        if (!rsns.length) {
            logger.info(`🚨 No RSNs linked to user ID: ${userId}`);
            return;
        }
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) {
            logger.error(`⚠️ Member with ID ${userId} not found in the guild; cleaning up.`);
            await cleanupInactiveUsers(guild);
            return;
        }
        const mergedData = await mergeRsnData(rsns);
        const [guildRolesMap, emojisMap] = await Promise.all([fetchGuildRoles(), fetchGuildEmojis()]);
        const updateEmbeds = await processMemberRoles(guild, member, mergedData, guildRolesMap, emojisMap);
        const row = await db.guild.getOne('SELECT channel_id FROM ensured_channels WHERE channel_key = ?', ['auto_roles_channel']);
        if (!row) {
            logger.info('⚠️ No channel_id configured for auto_roles_channel.');
            return;
        }
        const channelUpdate = guild.channels.cache.get(row.channel_id);
        if (!channelUpdate) {
            logger.error(`🚨 Update channel with ID ${row.channel_id} not found.`);
            return;
        }
        if (updateEmbeds && updateEmbeds.length > 0) {
            for (const embed of updateEmbeds) {
                await channelUpdate.send({ content: `<@${member.id}>`, embeds: [embed] });
            }
        }
        logger.info(`✅ Processed role updates for RSNs: ${rsns.join(', ')} (User ID: ${userId})`);
    } catch (error) {
        logger.error(`🚨 Error processing member ID ${userId}: ${error.message}`);
    }
}

async function getUserRSNs(userId) {
    const query = 'SELECT rsn FROM registered_rsn WHERE CAST(discord_id AS TEXT) = ?';
    const rows = await db.getAll(query, [String(userId)]);
    if (!rows.length) {
        logger.info(`⚠️ No RSNs linked to Discord ID: ${userId}`);
        return [];
    }
    return rows.map((row) => row.rsn);
}

async function getPlayerDataForRSN(rsn) {
    const normalizedRsn = normalizeRsn(rsn);
    const query = `
      SELECT type, metric, level, kills, score, exp
      FROM player_data
      WHERE LOWER(rsn) = LOWER(?)
    `;
    const rows = await db.getAll(query, [normalizedRsn]);
    const result = {};
    for (const row of rows) {
        let key = '';
        if (row.type === 'skills') {
            key = `Skills ${capitalize(row.metric)} Level`;
            result[key] = row.level;
        } else if (row.type === 'bosses') {
            key = `Bosses ${capitalize(row.metric).replace(/_/g, ' ')} Kills`;
            result[key] = row.kills;
        } else if (row.type === 'activities') {
            key = `Activities ${capitalize(row.metric).replace(/_/g, ' ')} Score`;
            result[key] = row.score;
        } else if (row.type === 'account') {
            if (row.metric === 'combat_level') {
                key = 'Account Combat Level';
                result[key] = row.level;
            } else {
                key = `Account ${capitalize(row.metric)}`;
                result[key] = row.metric;
            }
        }
    }
    return result;
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

async function mergeRsnData(rsns) {
    const merged = {};
    for (const rsn of rsns) {
        const data = await getPlayerDataForRSN(rsn);
        for (const [key, value] of Object.entries(data)) {
            if ((key.startsWith('Skills ') && key.endsWith(' Level')) || (key.startsWith('Bosses ') && key.endsWith(' Kills')) || (key.startsWith('Activities ') && key.endsWith(' Score'))) {
                const oldVal = merged[key] ? parseInt(merged[key], 10) : 0;
                const newVal = parseInt(value, 10);
                merged[key] = Math.max(oldVal, newVal).toString();
            } else {
                merged[key] = value;
            }
        }
    }
    return merged;
}
module.exports = { fetchAndProcessMember };
