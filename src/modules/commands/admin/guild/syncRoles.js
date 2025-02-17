const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const path = require('path');
const fs = require('fs');
const db = require('../../../utils/essentials/dbUtils');
const logger = require('../../../utils/essentials/logger');
const { Vibrant } = require('node-vibrant/node');

/**
 * Introduces a delay (for rate limit handling).
 * @param {number} ms - Milliseconds to wait.
 * @returns {Promise}
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Converts a string to title case.
 * E.g., "from_this" becomes "From This".
 * @param {string} str - The string to convert.
 * @returns {string} The converted title case string.
 */
function toTitleCase(str) {
    return str
        .replace(/_/g, ' ')
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Formats role data for Skills, Bosses, and Activities.
 * - Skills receive a "99" prefix for the role name (e.g., "99 Attack"),
 * but the key is stored without the "role_" prefix.
 * @param {string} name - The raw database name.
 * @param {string} type - The type of metric (Skill, Boss, Activity).
 * @returns {Object} Contains `roleName` and plain `roleKey`.
 */
function formatRoleData(name, type) {
    const formatted = toTitleCase(name);
    const roleName = type === 'Skill' ? `99 ${formatted}` : formatted;
    // Generate a plain key (without "role_" prefix)
    const roleKey = roleName.toLowerCase().replace(/\s+/g, '_');
    return { roleName, roleKey };
}

/**
 * Formats role data for Clan Ranks and Pets.
 * @param {string} fileName - The raw file name (e.g., "adamant" or "from_this").
 * @returns {Object} Contains `roleName` and plain `roleKey`.
 */
function formatRankData(fileName) {
    const roleName = toTitleCase(fileName);
    const roleKey = fileName.toLowerCase(); // plain key, no "role_" prefix
    return { roleName, roleKey };
}

/**
 * Fetches Skills from the `skills_bosses` table (only type 'Skill').
 * @returns {Promise<Array>} Array of role objects ({ roleKey, roleName, source }).
 */
async function fetchSkills() {
    const roles = [];
    const skillsData = await db.getAll('SELECT name FROM skills_bosses WHERE type = \'Skill\'');
    for (const row of skillsData) {
        if (!row.name) continue;
        const { roleName, roleKey } = formatRoleData(row.name, 'Skill');
        roles.push({ roleKey, roleName, source: 'skills' });
    }
    return roles;
}

/**
 * Fetches Bosses from the `skills_bosses` table (only type 'Boss').
 * @returns {Promise<Array>} Array of role objects ({ roleKey, roleName, source }).
 */
async function fetchBosses() {
    const roles = [];
    const bossesData = await db.getAll('SELECT name FROM skills_bosses WHERE type = \'Boss\'');
    for (const row of bossesData) {
        if (!row.name) continue;
        const { roleName, roleKey } = formatRoleData(row.name, 'Boss');
        roles.push({ roleKey, roleName, source: 'bosses' });
    }
    return roles;
}

/**
 * Fetches Activities from the `hiscores_activities` table.
 * @returns {Promise<Array>} Array of role objects ({ roleKey, roleName, source }).
 */
async function fetchActivities() {
    const roles = [];
    const activitiesData = await db.getAll('SELECT name FROM hiscores_activities');
    for (const row of activitiesData) {
        if (!row.name) continue;
        const { roleName, roleKey } = formatRoleData(row.name, 'Activity');
        roles.push({ roleKey, roleName, source: 'activities' });
    }
    return roles;
}

/**
 * Fetches Clan Rank roles from the `active_ranks` table.
 * @returns {Promise<Array>} Array of role objects ({ roleKey, roleName, source, filePath }).
 */
async function fetchClanRankRoles() {
    const roles = [];
    const ranksData = await db.image.getAll('SELECT file_name, file_path FROM active_ranks');
    for (const row of ranksData) {
        if (!row.file_name || !row.file_path) continue;
        const { roleName, roleKey } = formatRankData(row.file_name);
        roles.push({ roleKey, roleName, source: 'clan_rank', filePath: row.file_path });
    }
    return roles;
}

/**
 * Fetches Pet roles from the `pets` table.
 * @returns {Promise<Array>} Array of role objects ({ roleKey, roleName, source, filePath }).
 */
async function fetchPetRoles() {
    const roles = [];
    const petsData = await db.image.getAll('SELECT file_name, file_path FROM pets');
    for (const row of petsData) {
        if (!row.file_name || !row.file_path) continue;
        const { roleName, roleKey } = formatRankData(row.file_name);
        roles.push({ roleKey, roleName, source: 'pets', filePath: row.file_path });
    }
    return roles;
}

/**
 * Retrieves role icon from stored images.
 * @param {string} roleKey - Plain role key (e.g. "attack" or "dragon").
 * @param {Map} imageCacheMap - Map of file_name → file_path.
 * @returns {string|undefined} Image path if available.
 */
function getRoleIcon(roleKey, imageCacheMap) {
    const baseName = roleKey.toLowerCase();
    if (imageCacheMap.has(baseName)) {
        const filePath = path.join(__dirname, '../../../../../', imageCacheMap.get(baseName));
        if (fs.existsSync(filePath)) {
            logger.debug(`Found image for "${baseName}" at ${filePath}`);
            return filePath;
        } else {
            logger.warn(`⚠️ Image file not found: ${filePath} (expected for ${baseName})`);
        }
    } else {
        logger.warn(`⚠️ No matching image found for role key: ${baseName}`);
    }
    return undefined;
}

/**
 * Processes and creates roles in the guild sequentially.
 * For each role, if an image is available, extract its dominant color using node-vibrant and assign it to the role.
 * @param {Array} roles - Array of role objects.
 * @param {Object} guild - Discord guild object.
 * @param {Set} existingRoleKeys - Set of role keys from the DB (with "role_" prefix).
 * @param {Map} imageCacheMap - Unified map of file_name (plain, lowercase) → file_path.
 * @param {Object} counters - Counter for created and existing roles.
 */
async function processRoles(roles, guild, existingRoleKeys, imageCacheMap, counters) {
    for (const roleData of roles) {
        const { roleKey, roleName } = roleData;
        const lookupKey = `role_${roleKey}`;
        logger.info(`Processing role "${roleName}" with key "${roleKey}" (lookupKey: ${lookupKey})`);

        if (existingRoleKeys.has(lookupKey)) {
            logger.info(`Role "${roleName}" already exists. Skipping creation.`);
            counters.alreadyExistsCount++;
            continue;
        }

        // Use roleData.filePath if available; otherwise, use the image cache lookup.
        const iconPath = roleData.filePath || getRoleIcon(roleKey, imageCacheMap);
        logger.debug(`Icon path for "${roleName}": ${iconPath}`);

        // Default role color if no image or extraction fails.
        let roleColor = 'Random';

        if (iconPath) {
            try {
                logger.info(`Extracting color palette for "${roleName}" from ${iconPath}`);
                const palette = await Vibrant.from(iconPath).getPalette();
                logger.debug(`Palette for "${roleName}": ${JSON.stringify(palette)}`);

                // Extract all valid swatches.
                const swatches = [palette.Vibrant, palette.Muted, palette.DarkVibrant, palette.DarkMuted, palette.LightVibrant, palette.LightMuted].filter((swatch) => swatch && swatch.population && swatch.hex);

                logger.debug(`Valid swatches for "${roleName}": ${JSON.stringify(swatches)}`);

                if (swatches.length > 0) {
                    // Sort swatches by prominence (population).
                    swatches.sort((a, b) => (b?.population || 0) - (a?.population || 0));
                    const isBalancedColor = (swatch) => {
                        if (!swatch || !swatch.rgb) return false;
                        const [r, g, b] = swatch.rgb;
                        const brightness = (r + g + b) / 3;
                        const max = Math.max(r, g, b);
                        const min = Math.min(r, g, b);
                        const saturation = max === 0 ? 0 : ((max - min) / max) * 100;
                        return brightness > 40 && brightness < 220 && saturation > 15;
                    };
                    const bestSwatch = swatches.find(isBalancedColor) || swatches[0];
                    roleColor = bestSwatch?.hex || 'Random';
                }
                logger.info(`🎨 Extracted refined dominant color for "${roleName}": ${roleColor}`);
            } catch (err) {
                logger.warn(`⚠️ Unable to extract dominant color from ${iconPath} for "${roleName}": ${err.message}`);
            }
        } else {
            logger.warn(`No icon path available for "${roleName}". Using default color.`);
        }

        // Log before attempting role creation.
        logger.info(`Attempting to create role "${roleName}" with color "${roleColor}"${iconPath ? ` and icon ${iconPath}` : ''}`);

        // Instead of directly calling guild.roles.create:
        await createRoleWithRetry(roleData, guild, lookupKey, roleColor, iconPath, existingRoleKeys, counters);
    }
}

/**
 *
 * @param roleData
 * @param guild
 * @param lookupKey
 * @param roleColor
 * @param iconPath
 * @param existingRoleKeys
 * @param counters
 */
async function createRoleWithRetry(roleData, guild, lookupKey, roleColor, iconPath, existingRoleKeys, counters) {
    const maxRetries = 3;
    let attempt = 0;
    while (attempt < maxRetries) {
        const startTime = Date.now();
        try {
            logger.debug(`Attempt ${attempt + 1}: Calling guild.roles.create for "${roleData.roleName}"...`);
            const creationPromise = guild.roles.create({
                name: roleData.roleName,
                color: roleColor,
                reason: 'Initializing guild roles',
                icon: iconPath,
            });
            // Adjust timeout if needed (e.g., 15 seconds)
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Role creation timed out after 5 seconds')), 5000));

            const newRole = await Promise.race([creationPromise, timeoutPromise]);
            const elapsed = Date.now() - startTime;
            logger.debug(`guild.roles.create returned for "${roleData.roleName}" after ${elapsed} ms.`);

            existingRoleKeys.add(lookupKey);
            counters.createdCount++;
            await sleep(3500);
            logger.info(`✅ Successfully created role: "${newRole.name}" (Color: ${roleColor}) after ${elapsed} ms`);
            return;
        } catch (error) {
            const elapsed = Date.now() - startTime;
            if (error.retry_after) {
                logger.warn(`⚠️ Rate limited while creating role "${roleData.roleName}". Retry after ${error.retry_after} ms. (Elapsed: ${elapsed} ms)`);
                // Wait for the suggested time before retrying
                await sleep(error.retry_after);
            } else {
                logger.error(`❌ Error creating role "${roleData.roleName}" on attempt ${attempt + 1}: ${error.message} (Elapsed: ${elapsed} ms)`);
            }
            logger.debug(error.stack);
            attempt++;
            // Optional: wait a bit before the next attempt
        }
    }
    logger.error(`❌ Failed to create role "${roleData.roleName}" after ${maxRetries} attempts.`);
}

/**
 * Slash command for initializing guild roles.
 */
module.exports = {
    data: new SlashCommandBuilder().setName('generate_roles').setDescription('ADMIN: Initialize guild roles for skills, bosses, activities, and clan ranks.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            await interaction.deferReply({ flags: 64 });
            const guild = interaction.guild;
            // Fetch existing role keys (from DB, with "role_" prefix)
            const existingDBRecords = await db.guild.getAll('SELECT role_key FROM guild_roles');
            const existingRoleKeys = new Set(existingDBRecords.map((record) => record.role_key));
            logger.info(`Fetched ${existingRoleKeys.size} existing role keys from the database.`);

            // Load image cache from emojis, pets, and active_ranks.
            const emojiData = await db.image.getAll('SELECT file_name, file_path FROM emojis');
            const petData = await db.image.getAll('SELECT file_name, file_path FROM pets');
            const rankData = await db.image.getAll('SELECT file_name, file_path FROM active_ranks');
            const unifiedImageData = [...emojiData, ...petData, ...rankData];
            const imageCacheMap = new Map(unifiedImageData.map(({ file_name, file_path }) => [file_name.toLowerCase(), file_path]));
            logger.info(`Unified image cache created with ${imageCacheMap.size} entries.`);

            // Fetch roles sequentially.
            const counters = { createdCount: 0, alreadyExistsCount: 0 };
            await processRoles(await fetchClanRankRoles(), guild, existingRoleKeys, imageCacheMap, counters);
            await processRoles(await fetchSkills(), guild, existingRoleKeys, imageCacheMap, counters);
            await processRoles(await fetchBosses(), guild, existingRoleKeys, imageCacheMap, counters);
            await processRoles(await fetchActivities(), guild, existingRoleKeys, imageCacheMap, counters);
            await processRoles(await fetchPetRoles(), guild, existingRoleKeys, imageCacheMap, counters);

            // Summary message.
            const summary = `🎉 **Initialization Complete**
📌 **Total Roles Processed:** ${counters.createdCount + counters.alreadyExistsCount}
✅ Created: ${counters.createdCount}
⚠️ Already existed: ${counters.alreadyExistsCount}`;
            logger.info(summary);
            await interaction.editReply(summary);
        } catch (error) {
            logger.error(`❌ Error executing /init_guild_roles: ${error.message}`);
            await interaction.editReply('❌ **Error:** An issue occurred while initializing guild roles.');
        }
    },
};
