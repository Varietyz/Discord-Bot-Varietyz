// @ts-nocheck
/**
 * @fileoverview
 * **Auto Roles Service (Enhanced)**
 *
 * This module dynamically processes a member’s hiscores data by reading thresholds and role mappings
 * from your databases. It loads role definitions (from guild_roles) and emojis (from guild_emojis)
 * so that as new metrics come online you only need to update the configuration or the DB.
 *
 * The service then:
 * 1. Merges hiscores data from all RSNs associated with a Discord member.
 * 2. Determines which roles (for skills, bosses, activities) should be assigned based on configurable thresholds.
 * 3. Removes roles that are no longer valid.
 * 4. Sends a summary embed (or multiple embeds if needed) in a designated channel.
 *
 * **Dependencies:**
 * - **Wise Old Man API / Database:** For retrieving player data.
 * - **Discord.js:** For interacting with Discord.
 * - **dbUtils:** For database queries.
 * - **Logger:** For logging errors/info.
 *
 * @module services/autoRolesEnhanced
 */

const { EmbedBuilder } = require('discord.js');
const logger = require('../utils/essentials/logger.js');
const db = require('../utils/essentials/dbUtils.js');
const { normalizeRsn } = require('../utils/normalizing/normalizeRsn.js');
const { cleanupInactiveUsers } = require('../utils/helpers/cleanupInactiveUsers');

/*────────────────────────────────────────────────────────────────────────────
  CONFIGURATION & THRESHOLDS
────────────────────────────────────────────────────────────────────────────*/

const THRESHOLDS = {
    skills: {
        default: 99,
        custom: {
            overall: { threshold: 2277, roleKey: 'role_99_overall' },
            // You may add a mapping that grants multiple roles:
            // maxed: { threshold: 2277, roleKeys: ['role_99_overall', 'role_max_cape'] },
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

/*────────────────────────────────────────────────────────────────────────────
  HELPER FUNCTIONS: METRIC -> ROLE MAPPING & THRESHOLDS
────────────────────────────────────────────────────────────────────────────*/

/**
 * Derives role keys based on the metric type and name.
 * For skills, a default role key is built as "role_99_<skill>".
 * For bosses/activities, we either use a custom mapping (if defined) or derive one.
 *
 * @param {string} metricType - One of "skills", "bosses", or "activities".
 * @param {string} metricName - The name of the metric (e.g. "Attack", "Abyssal Sire").
 * @returns {string[]} Array of derived role keys.
 */
function deriveRoleKeys(metricType, metricName) {
    switch (metricType) {
    case 'skills': {
        const key = metricName.toLowerCase();
        if (THRESHOLDS.skills.custom[key]) {
            const custom = THRESHOLDS.skills.custom[key];
            return Array.isArray(custom.roleKeys) ? custom.roleKeys : [custom.roleKey];
        }
        // Derive default role key for skills.
        return [`role_99_${key}`];
    }
    case 'bosses': {
        const key = metricName.toLowerCase().replace(/\s+/g, '_');
        if (THRESHOLDS.bosses.custom[key]) {
            const custom = THRESHOLDS.bosses.custom[key];
            return Array.isArray(custom.roleKeys) ? custom.roleKeys : [custom.roleKey];
        }
        return [`role_${key}`];
    }
    case 'activities': {
        const key = metricName.toLowerCase().replace(/\s+/g, '_');
        if (THRESHOLDS.activities.custom[key]) {
            const custom = THRESHOLDS.activities.custom[key];
            return Array.isArray(custom.roleKeys) ? custom.roleKeys : [custom.roleKey];
        }
        return [`role_${key}`];
    }
    default:
        return [];
    }
}

/**
 * Returns the threshold value for a given metric.
 *
 * @param {string} metricType - "skills", "bosses", or "activities".
 * @param {string} metricName - The name of the metric.
 * @returns {number} The threshold value.
 */
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

/*────────────────────────────────────────────────────────────────────────────
  DATABASE LOADING FUNCTIONS: GUILD ROLES & EMOJIS
────────────────────────────────────────────────────────────────────────────*/

/**
 * Loads all role definitions from the guild_roles table.
 * Returns an object mapping role_key to an object with role_id.
 *
 * @async
 * @returns {Promise<Object>} Map of role_key -> { roleId, roleKey }.
 */
async function fetchGuildRoles() {
    const query = 'SELECT role_id, role_key FROM guild_roles';
    const rows = await db.guild.getAll(query);
    const rolesMap = {};
    for (const row of rows) {
        rolesMap[row.role_key] = { roleId: row.role_id, roleKey: row.role_key };
    }
    return rolesMap;
}

/**
 * Loads all emoji definitions from the guild_emojis table.
 * Returns an object mapping emoji_key to its emoji_format.
 *
 * @async
 * @returns {Promise<Object>} Map of emoji_key -> emoji_format.
 */
async function fetchGuildEmojis() {
    const query = 'SELECT emoji_key, emoji_format FROM guild_emojis';
    const rows = await db.guild.getAll(query);
    const emojisMap = {};
    for (const row of rows) {
        emojisMap[row.emoji_key] = row.emoji_format;
    }
    return emojisMap;
}

/**
 * Given a role key, returns the corresponding emoji format.
 * It strips known prefixes (e.g. "role_99_" or "role_") and then
 * looks up "emoji_<keyPart>" in the emojis map.
 *
 * @param {string} roleKey - The role key (e.g. "role_99_fishing").
 * @param {Object} emojisMap - Mapping of emoji_key -> emoji_format.
 * @returns {string} The emoji string if found, or an empty string.
 */
function getEmojiForRoleKey(roleKey, emojisMap) {
    let keyPart = roleKey;
    if (roleKey.startsWith('role_99_')) {
        keyPart = roleKey.substring('role_99_'.length);
    } else if (roleKey.startsWith('role_')) {
        keyPart = roleKey.substring('role_'.length);
    }
    const emojiKey = `emoji_${keyPart}`;
    return emojisMap[emojiKey] || '';
}

/*────────────────────────────────────────────────────────────────────────────
  ROLE PROCESSING FUNCTION
────────────────────────────────────────────────────────────────────────────*/

/**
 * Processes a member’s hiscores data to assign or remove roles dynamically.
 * Only roles auto‑managed by this system (i.e. derivable from our hiscores data via THRESHOLDS)
 * are processed. Roles not defined in our thresholds remain untouched.
 *
 * @async
 * @param {Discord.Guild} guild - The Discord guild.
 * @param {Discord.GuildMember} member - The guild member.
 * @param {Object} hiscoresData - Object mapping metric keys to values.
 * @param {Object} guildRolesMap - Mapping of role_key -> { roleId, roleKey }.
 * @param {Object} emojisMap - Mapping of emoji_key -> emoji_format.
 * @returns {Promise<EmbedBuilder[]|null>} Array of embed objects summarizing updates, or null if none.
 */
async function processMemberRoles(guild, member, hiscoresData, guildRolesMap, emojisMap) {
    const roleUpdates = []; // Record each assignment or removal.
    const expectedRoleKeys = new Set(); // Roles that should be assigned (threshold met).
    const managedRoleKeys = new Set(); // Roles that our system manages based on hiscores data.

    // Process each hiscores metric.
    for (const key in hiscoresData) {
        const rawValue = hiscoresData[key];
        const value = parseInt(rawValue, 10);
        if (isNaN(value)) continue;

        let metricName,
            roleKeys = [],
            threshold;
        if (key.startsWith('Skills ') && key.endsWith(' Level')) {
            // Extract metric name from "Skills Attack Level"
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

        // Only process roles explicitly defined via our THRESHOLDS mappings.
        if (roleKeys && roleKeys.length > 0) {
            roleKeys.forEach((rk) => {
                managedRoleKeys.add(rk);
                if (value >= threshold) {
                    expectedRoleKeys.add(rk);
                }
            });
        }
    }

    // Removal: Remove auto-managed roles that are no longer expected.
    for (const roleKey of managedRoleKeys) {
        const roleData = guildRolesMap[roleKey];
        if (!roleData) continue; // Role not defined in DB—skip.
        if (!expectedRoleKeys.has(roleKey) && member.roles.cache.has(roleData.roleId)) {
            try {
                await member.roles.remove(roleData.roleId);
                const emoji = getEmojiForRoleKey(roleKey, emojisMap);
                const roleName = guild.roles.cache.get(roleData.roleId)?.name || roleKey;
                roleUpdates.push({ action: 'removed', roleKey, roleId: roleData.roleId, roleName, emoji });
            } catch (err) {
                logger.error(`Error removing role ${roleKey} from member ${member.id}: ${err.message}`);
            }
        }
    }

    // Addition: Add roles for which the metric threshold is met.
    for (const roleKey of expectedRoleKeys) {
        const roleData = guildRolesMap[roleKey];
        if (!roleData) {
            logger.warn(`No guild role found for roleKey ${roleKey}`);
            continue;
        }
        if (!member.roles.cache.has(roleData.roleId)) {
            try {
                await member.roles.add(roleData.roleId);
                const emoji = getEmojiForRoleKey(roleKey, emojisMap);
                const roleName = guild.roles.cache.get(roleData.roleId)?.name || roleKey;
                roleUpdates.push({ action: 'assigned', roleKey, roleId: roleData.roleId, roleName, emoji });
            } catch (err) {
                logger.error(`Error assigning role ${roleKey} to member ${member.id}: ${err.message}`);
            }
        }
    }

    // Build and return embed(s) summarizing the role updates.
    if (roleUpdates.length > 0) {
        const embedLines = roleUpdates.map((update) => {
            const actionIcon = update.action === 'assigned' ? '✅' : '❌';

            return `${actionIcon} ${update.emoji} <@&${update.roleId}> ${update.action}`;
        });

        const MAX_DESCRIPTION_LENGTH = 2048;
        const embeds = [];
        let currentDesc = '';
        let isFirstEmbed = true;

        for (const line of embedLines) {
            // Check if adding the next line exceeds the embed description limit.
            if (currentDesc.length + line.length + 1 > MAX_DESCRIPTION_LENGTH) {
                const description = isFirstEmbed ? `${currentDesc}` : currentDesc;
                embeds.push(new EmbedBuilder().setTitle('Role Updates').setDescription(description).setColor(0x48de6f).setTimestamp());
                currentDesc = line;
                isFirstEmbed = false;
            } else {
                currentDesc += (currentDesc ? '\n' : '') + line;
            }
        }
        if (currentDesc) {
            const description = isFirstEmbed ? `${currentDesc}` : currentDesc;
            embeds.push(new EmbedBuilder().setTitle('Role Updates').setDescription(description).setColor(0x48de6f).setTimestamp());
        }
        return embeds;
    }

    return null;
}

/*────────────────────────────────────────────────────────────────────────────
  MAIN FUNCTION: FETCH & PROCESS MEMBER DATA
────────────────────────────────────────────────────────────────────────────*/

/**
 * Fetches RSNs for a user, merges hiscores data, loads guild role and emoji definitions,
 * processes role assignments/removals, and sends a summary embed to the update channel.
 *
 * @async
 * @param {Discord.Guild} guild - The Discord guild.
 * @param {string} userId - The Discord user ID.
 * @returns {Promise<void>}
 */
async function fetchAndProcessMember(guild, userId) {
    try {
        // Fetch all RSNs linked to this user.
        const rsns = await getUserRSNs(userId);
        if (!rsns.length) {
            logger.info(`🚨 No RSNs linked to user ID: ${userId}`);
            return;
        }

        // Fetch the member from the guild.
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) {
            logger.error(`⚠️ Member with ID ${userId} not found in the guild; cleaning up.`);
            await cleanupInactiveUsers(guild);
            return;
        }

        // Merge hiscores data from all RSNs.
        const mergedData = await mergeRsnData(rsns);

        // Load guild roles and emojis from the DB.
        const [guildRolesMap, emojisMap] = await Promise.all([fetchGuildRoles(), fetchGuildEmojis()]);

        // Process hiscores data to determine role updates.
        const updateEmbeds = await processMemberRoles(guild, member, mergedData, guildRolesMap, emojisMap);

        // Retrieve the designated update channel from your setup.
        const row = await db.guild.getOne('SELECT channel_id FROM setup_channels WHERE setup_key = ?', ['auto_roles_channel']);
        if (!row) {
            logger.info('⚠️ No channel_id configured for auto_roles_channel.');
            return;
        }
        const channelUpdate = guild.channels.cache.get(row.channel_id);
        if (!channelUpdate) {
            logger.error(`🚨 Update channel with ID ${row.channel_id} not found.`);
            return;
        }

        // If any role updates occurred, send the embed(s).
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

/*────────────────────────────────────────────────────────────────────────────
  AUXILIARY FUNCTIONS (EXISTING): DATABASE QUERIES & DATA MERGING
────────────────────────────────────────────────────────────────────────────*/

/**
 * Retrieves all RSNs associated with a Discord user.
 *
 * @async
 * @param {string} userId - Discord user ID.
 * @returns {Promise<string[]>} Array of RSNs.
 */
async function getUserRSNs(userId) {
    const query = 'SELECT rsn FROM registered_rsn WHERE CAST(discord_id AS TEXT) = ?';
    const rows = await db.getAll(query, [String(userId)]);
    if (!rows.length) {
        logger.info(`⚠️ No RSNs linked to Discord ID: ${userId}`);
        return [];
    }
    return rows.map((row) => row.rsn);
}

/**
 * Retrieves player data for a given RSN from the player_data table.
 *
 * @async
 * @param {string} rsn - The RuneScape Name.
 * @returns {Promise<Object>} Object with data_key -> data_value.
 */
async function getPlayerDataForRSN(rsn) {
    const normalizedRsn = normalizeRsn(rsn);
    const query = `
    SELECT data_key, data_value 
    FROM player_data
    WHERE LOWER(rsn) = LOWER(?)
  `;
    const rows = await db.getAll(query, [normalizedRsn]);
    const result = {};
    for (const { data_key, data_value } of rows) {
        result[data_key] = data_value;
    }
    return result;
}

/**
 * Merges hiscores data from multiple RSNs. For each metric (skill, boss, activity),
 * the highest value is retained.
 *
 * @async
 * @param {string[]} rsns - Array of RSNs.
 * @returns {Promise<Object>} Merged hiscores data.
 */
async function mergeRsnData(rsns) {
    const merged = {};
    for (const rsn of rsns) {
        const data = await getPlayerDataForRSN(rsn);
        for (const [key, value] of Object.entries(data)) {
            // Only merge numerical metrics.
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
