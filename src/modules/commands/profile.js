// @ts-nocheck
/**
 * @fileoverview
 * **Profile Command** 📜
 *
 * Defines the `/profile` slash command for the Varietyz Bot.
 * This command allows users to view a player profile by RSN. If no RSN is provided,
 * the command defaults to the user's own registered RSN.
 * The command gathers live data from the Wise Old Man API along with stored data from the database,
 * then builds and displays an embed with account information, experience data, skill and boss achievements,
 * registration dates, competition stats, and clan details.
 *
 * **External Dependencies:**
 * - **Discord.js**: For building embeds and handling interactions.
 * - **SQLite**: For retrieving registered RSN, clan member, and user data.
 * - **Wise Old Man API**: For fetching live player data.
 * - Utility functions for string normalization, truncation, and formatting.
 *
 * @module src/modules/commands/profile
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/dbUtils');
const logger = require('../utils/logger');
const { normalizeRsn } = require('../utils/normalizeRsn');
const womApi = require('../../api/wise_old_man/apiClient');
const { getRankEmoji } = require('../utils/rankUtils');

/**
 * Safely truncates a string to a specified maximum length.
 *
 * If the input text exceeds the maximum length, it truncates the text and appends an ellipsis ("...").
 *
 * @function safeTruncate
 * @param {string} text - The text to truncate.
 * @param {number} maxLength - The maximum allowed length.
 * @returns {string} The truncated string, or the original string if it is within the limit.
 *
 * @example
 * const truncated = safeTruncate("This is a very long text", 10);
 * // truncated => "This is..."
 */
function safeTruncate(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
}

/**
 * Retrieves competition statistics for a given username from the users table.
 *
 * Fetches total wins, SOTW total experience gain, and BOTW total kills for the specified player.
 * If no statistics are found, returns default placeholder values.
 *
 * @async
 * @function getCompetitionStats
 * @param {string} playerUsername - The player's username.
 * @returns {Promise<Object>} An object containing:
 * - `total_wins`
 * - `total_metric_gain_sotw`
 * - `total_metric_gain_botw`
 *
 * @example
 * const stats = await getCompetitionStats('playerone');
 */
async function getCompetitionStats(playerUsername) {
    try {
        const stats = await db.getOne(
            `SELECT total_wins, total_metric_gain_sotw, total_metric_gain_botw 
             FROM users 
             WHERE LOWER(username) = ?`,
            [playerUsername.toLowerCase()],
        );
        return stats || { total_wins: '\u200b', total_metric_gain_sotw: '\u200b', total_metric_gain_botw: '\u200b' };
    } catch (error) {
        logger.error(`Error fetching competition stats for ${playerUsername}: ${error.message}`);
        return { total_wins: '\u200b', total_metric_gain_sotw: '\u200b', total_metric_gain_botw: '\u200b' };
    }
}

/**
 * Determines the local registration date based on available data.
 *
 * The function prioritizes the registration date from the `registered_rsn` table. If not available,
 * it falls back to the clan member's joined date. If neither is available, "Determining.." is returned.
 * If a live registration timestamp from the WOM API is provided, it is used instead.
 *
 * @function getLocalRegDate
 * @param {Object|null} clanMemberProfile - The clan member record.
 * @param {Array<Object>} regRsns - Array of registered RSN records.
 * @param {string|undefined} liveRegisteredAt - Live registration timestamp from the WOM API.
 * @returns {string} The registration date to display.
 *
 * @example
 * const regDate = getLocalRegDate(clanMemberProfile, regRsns, liveRegisteredAt);
 */
function getLocalRegDate(clanMemberProfile, regRsns, liveRegisteredAt) {
    let localDate = 'Determining..';
    if (regRsns && regRsns.length > 0) {
        localDate = new Date(regRsns[0].registered_at).toLocaleDateString('en-US', { timeZone: 'UTC' });
    } else if (clanMemberProfile && clanMemberProfile.joined_at) {
        localDate = new Date(clanMemberProfile.joined_at).toLocaleDateString('en-US', { timeZone: 'UTC' });
    }
    return liveRegisteredAt ? new Date(liveRegisteredAt).toLocaleString('en-US', { timeZone: 'UTC' }) : localDate;
}

/**
 * Fetches a guild emoji by name, with a fallback if the emoji is not found or unavailable.
 *
 * @function getGuildEmoji
 * @param {string} name - The name of the emoji to search for.
 * @param {Guild} guild - The guild to search in.
 * @param {string} [fallbackEmoji='⚔️'] - The fallback emoji to use if not found.
 * @returns {string} The emoji string if found; otherwise, the fallback emoji.
 *
 * @example
 * const emoji = getGuildEmoji('slayer', guild);
 */
function getGuildEmoji(name, guild, fallbackEmoji = '⚔️') {
    if (guild) {
        const normalizedName = name.toLowerCase().replace(/\s+/g, '_'); // Normalize the name
        const foundEmoji = guild.emojis.cache.find((e) => e.name.toLowerCase() === normalizedName);
        if (foundEmoji && foundEmoji.available) {
            return foundEmoji.toString();
        } else {
            logger.warn(`⚠️ Custom emoji "${normalizedName}" not found or unavailable. Using fallback ${fallbackEmoji}`);
            return fallbackEmoji;
        }
    } else {
        logger.warn(`⚠️ Guild is undefined; cannot fetch emoji for metric: ${name}`);
        return fallbackEmoji;
    }
}

/**
 * Builds the main account embed using live data and formatted strings.
 *
 * Constructs an embed with the player's profile information, including account details,
 * experience, skills, bosses, competition stats, and date information. Conditionally adds fields
 * based on available data.
 *
 * @function buildAccountEmbed
 * @param {Object} liveData - Live player data from the WOM API.
 * @param {string} accountInfo - Formatted account information.
 * @param {string} experienceInfo - Formatted experience data.
 * @param {string} leftSkillsStr - Formatted string for left column skills.
 * @param {string} rightSkillsStr - Formatted string for right column skills.
 * @param {string} leftBossesStr - Formatted string for left column bosses.
 * @param {string} rightBossesStr - Formatted string for right column bosses.
 * @param {string} dateInfo - Formatted date information.
 * @param {string} compInfo - Formatted competition statistics.
 * @param {string} clanInfo - Formatted clan information.
 * @returns {EmbedBuilder} The constructed account embed.
 *
 * @example
 * const embed = buildAccountEmbed(liveData, accountInfo, expInfo, leftSkills, rightSkills, leftBosses, rightBosses, dateInfo, compInfo, clanInfo);
 */
function buildAccountEmbed(liveData, accountInfo, experienceInfo, leftSkillsStr, rightSkillsStr, leftBossesStr, rightBossesStr, dateInfo, compInfo, clanInfo) {
    const playerName = liveData.displayName;
    // Build profile link for the player.
    const playerNameForLink = encodeURIComponent(playerName.replace(/ /g, '%20'));
    const profileLink = `https://wiseoldman.net/players/${playerNameForLink}`;

    // Initialize the embed builder.
    const embed = new EmbedBuilder().setTitle(`ℹ️ ${playerName}`).setURL(profileLink).setColor(0x3498db).setDescription(' ').setFooter({ text: 'Profile updated live via WOM API' }).setTimestamp();

    if (clanInfo && clanInfo.trim().length > 0) {
        embed.addFields({ name: '\u200b', value: clanInfo, inline: false });
    }

    embed.addFields({ name: '\u200b', value: accountInfo, inline: false });

    if (leftSkillsStr || rightSkillsStr) {
        embed.addFields({ name: '\u200b', value: leftSkillsStr || '\u200b', inline: true }, { name: '\u200b', value: rightSkillsStr || '\u200b', inline: true });
    }

    embed.addFields({ name: '\u200b', value: experienceInfo, inline: false });

    if (leftBossesStr || rightBossesStr) {
        embed.addFields({ name: '\u200b', value: leftBossesStr || '\u200b', inline: true }, { name: '\u200b', value: rightBossesStr || '\u200b', inline: true });
    }

    if (compInfo && compInfo.trim().length > 0) {
        embed.addFields({ name: '\u200b', value: compInfo, inline: false });
    }

    embed.addFields({ name: '\u200b', value: dateInfo, inline: false });
    return embed;
}

/**
 * Builds an embed displaying registered RSNs.
 *
 * Constructs an embed that lists registered RSNs along with their registration dates.
 *
 * @function buildRSNEmbed
 * @param {Array<Object>} regRsns - Array of registered RSN records.
 * @returns {EmbedBuilder} The RSN embed.
 *
 * @example
 * const rsnEmbed = buildRSNEmbed(regRsns);
 */
function buildRSNEmbed(regRsns) {
    const rsnListStr = regRsns
        .map((row, index) => {
            const regDate = new Date(row.registered_at).toLocaleDateString('en-US', { timeZone: 'UTC' });
            return `**${index + 1}.** **\`${row.rsn}\`** — Registered on: **\`${regDate}\`**`;
        })
        .join('\n');
    const finalRsnList = rsnListStr.length > 6000 ? safeTruncate(rsnListStr, 6000) : rsnListStr;
    return new EmbedBuilder().setTitle('Registered RSNs').setDescription(finalRsnList).setColor(0x2ecc71).setFooter({ text: 'RSN registrations' }).setTimestamp();
}

/**
 * Returns a string that combines a Discord flag emoji shortcode with the full country code.
 *
 * For example, for the input "AUS", it returns ":flag_au: AUS".
 *
 * @function getCountryDisplay
 * @param {string} countryCode - A country code (can be more than 2 letters).
 * @returns {string} The formatted country display string.
 *
 * @example
 * const display = getCountryDisplay('AUS');
 * // display => ":flag_au: AUS"
 */
function getCountryDisplay(countryCode) {
    if (!countryCode) return '';
    const twoLetter = countryCode.substring(0, 2).toLowerCase();
    return `:flag_${twoLetter}:`;
}

/**
 * Capitalizes the first letter of each word in the provided string.
 *
 * @function capitalizeWords
 * @param {string} str - The string to capitalize.
 * @returns {string} The string with each word capitalized.
 *
 * @example
 * const result = capitalizeWords('hello world');
 * // result => "Hello World"
 */
function capitalizeWords(str) {
    if (!str) return '';
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View a player profile by RSN. If no RSN is provided, your own registered RSN is used.')
        .addStringOption((option) => option.setName('rsn').setDescription('The RSN to view (autocomplete searches users, registered RSNs, and clan members).').setAutocomplete(true).setRequired(false)),

    /**
     * 🎯 **Executes the /profile Command**
     *
     * Fetches a player's profile based on a provided RSN or the user's own registered RSN if none is provided.
     * The command:
     * 1. Retrieves the RSN from the interaction options or defaults to the user's first registered RSN.
     * 2. Normalizes the RSN for consistency.
     * 3. Queries the database for clan member and user profiles.
     * 4. Fetches live data from the Wise Old Man API.
     * 5. Gathers additional data such as competition statistics and registration dates.
     * 6. Builds an account embed and, if applicable, an RSN embed.
     *
     * @async
     * @function execute
     * @param {Discord.CommandInteraction} interaction - The command interaction object.
     * @returns {Promise<void>} Resolves when the command execution is complete.
     *
     * @example
     * // Invoked when a user runs /profile.
     * await execute(interaction);
     */
    async execute(interaction) {
        try {
            await interaction.deferReply({ flags: 64 });

            // If no RSN is provided, default to the command user's registered RSN.
            let rsnInput = interaction.options.getString('rsn');
            if (!rsnInput) {
                const userRsns = await db.getAll('SELECT rsn, registered_at FROM registered_rsn WHERE user_id = ? ORDER BY registered_at ASC', [interaction.user.id]);
                if (!userRsns || userRsns.length === 0) {
                    return await interaction.editReply({
                        content: '🚫 You haven\'t registered any RSNs yet. Use `/rsn` to register one.',
                        flags: 64,
                    });
                }
                rsnInput = userRsns[0].rsn;
            }
            const normalizedInput = normalizeRsn(rsnInput);
            logger.info(`Searching profile for RSN: ${rsnInput} (normalized: ${normalizedInput})`);

            // 1. Look up clan member record.
            const clanMemberProfile = await db.getOne('SELECT * FROM clan_members WHERE LOWER(name) = ?', [normalizedInput]);
            // 2. Look up users record.
            const userProfile = await db.getOne('SELECT * FROM users WHERE LOWER(username) = ?', [normalizedInput]);

            // Determine profile source.
            let profileSource = null;
            if (!clanMemberProfile && !userProfile) {
                // Fallback: try to get a registered RSN record.
                const regRsnFallback = await db.getOne('SELECT rsn, registered_at FROM registered_rsn WHERE LOWER(REPLACE(REPLACE(rsn, \'-\', \' \'), \'_\', \' \')) = ?', [normalizedInput]);
                if (regRsnFallback) {
                    profileSource = 'registered';
                    logger.info(`Found registered RSN record for RSN: ${rsnInput} (fallback only)`);
                } else {
                    return await interaction.editReply({
                        content: `❌ No profile found for RSN **\`${rsnInput}\`**.`,
                        flags: 64,
                    });
                }
            } else if (clanMemberProfile && userProfile) {
                profileSource = 'both';
                logger.info(`Found both clan member and users profile for RSN: ${rsnInput}`);
            } else if (clanMemberProfile) {
                profileSource = 'clan';
                logger.info(`Found clan member profile for RSN: ${rsnInput}`);
            } else if (userProfile) {
                profileSource = 'users';
                logger.info(`Found users profile for RSN: ${rsnInput}`);
            }

            // 3. Retrieve competition stats if a users record exists.
            const compStats = userProfile ? await getCompetitionStats(userProfile.username) : { total_wins: '\u200b', total_metric_gain_sotw: '\u200b', total_metric_gain_botw: '\u200b' };

            // 4. Fetch live data from WOM API.
            const liveData = await womApi.request('players', 'getPlayerDetails', normalizedInput);
            if (!liveData) {
                const profileLink = `https://wiseoldman.net/players/${encodeURIComponent(normalizedInput)}`;
                return await interaction.editReply({
                    content: `❌ Unable to fetch live data for RSN **\`${rsnInput}\`**. Please verify the RSN.\n🔗 [View Profile](${profileLink})`,
                    flags: 64,
                });
            }

            // 5. Query registered_rsn for this RSN.
            const regRsnRow = await db.getOne('SELECT user_id FROM registered_rsn WHERE LOWER(REPLACE(REPLACE(rsn, \'-\', \' \'), \'_\', \' \')) = ?', [normalizedInput]);
            let regRsns = [];
            let hasRegistered = false;
            if (regRsnRow && regRsnRow.user_id) {
                regRsns = await db.getAll('SELECT rsn, registered_at FROM registered_rsn WHERE user_id = ? ORDER BY registered_at ASC', [regRsnRow.user_id]);
                hasRegistered = regRsns && regRsns.length > 0;
            }

            // 6. Build embed fields.
            const { type: accountType, build, status, exp, registeredAt: liveRegisteredAt, updatedAt, combatLevel, country, lastChangedAt } = liveData;
            const regDateToUse = getLocalRegDate(clanMemberProfile, regRsns, liveRegisteredAt);
            const statusEmoji = status.toLowerCase() === 'active' ? ':battery:' : ':low_battery:';

            // Build account information string.
            const accountInfo = safeTruncate(
                `:crossed_swords: Combat Level: **\`${combatLevel || 'Unranked'}\`**\n` +
                    `:gear: Account Type: **\`${capitalizeWords(accountType)} | ${capitalizeWords(build)}\`**\n` +
                    `${statusEmoji} Status: **\`${capitalizeWords(status)}\`**\n` +
                    `:globe_with_meridians: Country: ${getCountryDisplay(country) || '\u200b'} ${country || 'https://discord.com/channels/679454777708380161/802680940835897384'}`,
                1024,
            );

            // Build experience information string.
            let experienceInfo = `<:Total_Level:1127669463613976636> Total Exp: **\`${exp.toLocaleString()}\`**\n`;
            if (exp >= 500_000_000) {
                experienceInfo += ':trophy: Over **`500M EXP`** achieved!\n';
            }

            // Process snapshot data for skills and bosses.
            const snapshot = liveData.latestSnapshot && liveData.latestSnapshot.data;

            // --- Process skills ---
            const skillsLines = [];
            if (snapshot && snapshot.skills) {
                const skillKeys = Object.keys(snapshot.skills).filter((key) => key !== 'overall');
                const maxedSkills = skillKeys.filter((key) => snapshot.skills[key].level >= 99);
                if (maxedSkills.length > 0) {
                    maxedSkills.forEach((skillName) => {
                        const emoji = getGuildEmoji(skillName, interaction.guild, '🔰');
                        skillsLines.push(`${emoji} **\`99 ${capitalizeWords(skillName)}\`**`);
                    });
                }
                if (maxedSkills.length === skillKeys.length) {
                    experienceInfo += '<:Max_cape:1127651723264147507> Achieved **`Level 99`** in all Skills!\n';
                }
            }

            // Split skills into two columns.
            const leftSkills = [];
            const rightSkills = [];
            skillsLines.forEach((line, index) => {
                if (index % 2 === 0) {
                    leftSkills.push(line);
                } else {
                    rightSkills.push(line);
                }
            });
            const leftSkillsStr = safeTruncate(leftSkills.join('\n'), 1024);
            const rightSkillsStr = safeTruncate(rightSkills.join('\n'), 1024);

            // --- Process bosses ---
            const bossesLines = [];
            if (snapshot && snapshot.bosses) {
                const KILLCOUNT_THRESHOLD = 300;
                const bossesArray = Object.keys(snapshot.bosses)
                    .map((bossKey) => {
                        const boss = snapshot.bosses[bossKey];
                        return { name: bossKey, kills: boss.kills };
                    })
                    .filter((bossData) => bossData.kills > KILLCOUNT_THRESHOLD);
                bossesArray.sort((a, b) => b.kills - a.kills);
                bossesArray.forEach((bossData) => {
                    const emoji = getGuildEmoji(bossData.name, interaction.guild, '🐲');
                    const bossNameFormatted = capitalizeWords(bossData.name.replace(/_/g, ' '));
                    bossesLines.push(`${emoji} **\`${bossNameFormatted} (${bossData.kills.toLocaleString()})\`**`);
                });
            }
            if (snapshot && snapshot.bosses && snapshot.bosses.tzkal_zuk && snapshot.bosses.tzkal_zuk.kills >= 1) {
                experienceInfo += '<a:InfernalCape:1272671557399089233> **`Infernal Cape`** achieved!\n';
            }
            const leftBosses = [];
            const rightBosses = [];
            bossesLines.forEach((line, index) => {
                if (index % 2 === 0) {
                    leftBosses.push(line);
                } else {
                    rightBosses.push(line);
                }
            });
            const leftBossesStr = safeTruncate(leftBosses.join('\n'), 1024);
            const rightBossesStr = safeTruncate(rightBosses.join('\n'), 1024);
            const finalExperienceInfo = safeTruncate(experienceInfo, 1024);
            const dateInfo = safeTruncate(
                `:writing_hand::skin-tone-1: Registered Since: **\`${regDateToUse}\`**\n` +
                    `:hourglass_flowing_sand: Last Updated: **\`${updatedAt ? new Date(updatedAt).toLocaleString('en-US', { timeZone: 'UTC' }) : 'Determining..'}\`**\n` +
                    `:satellite: Last Progress: **\`${lastChangedAt ? new Date(lastChangedAt).toLocaleString('en-US', { timeZone: 'UTC' }) : 'Determining..'}\`**`,
                1024,
            );

            let compInfo = '';
            if (profileSource === 'users' || profileSource === 'both') {
                compInfo += safeTruncate(
                    `:trophy: Competition Wins: **\`${compStats.total_wins}\`**\n` +
                        `<:Total_Level:1127669463613976636> SOTW - Total Exp: **\`${compStats.total_metric_gain_sotw.toLocaleString()}\`**\n` +
                        `<:Slayer:1127658069984288919> BOTW - Total Kills: **\`${compStats.total_metric_gain_botw.toLocaleString()}\`**\n`,
                    1024,
                );
            }

            let clanInfo = '';
            if (profileSource === 'clan' || profileSource === 'both') {
                const clanRankEmoji = getRankEmoji(clanMemberProfile.rank) || '';
                clanInfo +=
                    '\n' +
                    safeTruncate(
                        `<:VarietyzLogo:1271778132566872064> Ranked: ${clanRankEmoji} **\`${clanMemberProfile.rank}\`**\n` +
                            `:ballot_box_with_check: Joined: **\`${new Date(clanMemberProfile.joined_at).toLocaleDateString('en-US', { timeZone: 'UTC' })}\`**`,
                        1024,
                    );
            }

            const accountEmbed = buildAccountEmbed(liveData, accountInfo, finalExperienceInfo, leftSkillsStr, rightSkillsStr, leftBossesStr, rightBossesStr, dateInfo, compInfo, clanInfo);

            const embedArray = [accountEmbed];
            if (hasRegistered) {
                embedArray.push(buildRSNEmbed(regRsns));
            }

            logger.debug(`Account Info Length: ${accountInfo.length}`);
            logger.debug(`Total Exp Info Length: ${finalExperienceInfo.length}`);
            logger.debug(`Total Levels Info Length: ${leftSkillsStr.length}`);
            logger.debug(`Total Levels Info 2 Length: ${rightSkillsStr.length}`);
            logger.debug(`Total Bosses Info Length: ${leftBossesStr.length}`);
            logger.debug(`Total Bosses Info 2 Length: ${rightBossesStr.length}`);
            logger.debug(`Date Info Length: ${dateInfo.length}`);
            logger.debug(`Comp Info Length: ${compInfo.length}`);
            logger.debug(`Clan Info Length: ${clanInfo.length}`);

            await interaction.editReply({ embeds: embedArray, flags: 64 });
        } catch (error) {
            logger.error(`Error executing /profile command: ${error.message}`);
            await interaction.editReply({
                content: '❌ An error occurred while fetching the profile. Please try again later.',
                flags: 64,
            });
        }
    },

    /**
     * 🎯 **Handles Autocomplete for the /profile Command**
     *
     * Provides autocomplete suggestions for RSN input by combining data from users,
     * registered RSNs, and clan members. It ensures up to 25 unique suggestions are sent.
     *
     * @async
     * @function autocomplete
     * @param {Discord.AutocompleteInteraction} interaction - The autocomplete interaction object.
     * @returns {Promise<void>} Resolves when autocomplete suggestions are sent.
     *
     * @example
     * // Invoked when a user types in the RSN option field.
     * await autocomplete(interaction);
     */
    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        try {
            if (focusedOption.name === 'rsn') {
                const input = focusedOption.value.toLowerCase();
                const userResults = await db.getAll('SELECT username FROM users WHERE LOWER(username) LIKE ?', [`%${input}%`]);
                const regResults = await db.getAll('SELECT DISTINCT rsn FROM registered_rsn WHERE LOWER(rsn) LIKE ?', [`%${input}%`]);
                const clanResults = await db.getAll('SELECT name FROM clan_members WHERE LOWER(name) LIKE ?', [`%${input}%`]);
                const combinedSet = new Set();
                const choices = [];
                userResults.forEach((row) => {
                    const uname = row.username.toLowerCase();
                    if (!combinedSet.has(uname)) {
                        combinedSet.add(uname);
                        choices.push({ name: row.username, value: row.username });
                    }
                });
                regResults.forEach((row) => {
                    const rsnLower = row.rsn.toLowerCase();
                    if (!combinedSet.has(rsnLower)) {
                        combinedSet.add(rsnLower);
                        choices.push({ name: row.rsn, value: row.rsn });
                    }
                });
                clanResults.forEach((row) => {
                    const nameLower = row.name.toLowerCase();
                    if (!combinedSet.has(nameLower)) {
                        combinedSet.add(nameLower);
                        choices.push({ name: row.name, value: row.name });
                    }
                });
                await interaction.respond(choices.slice(0, 25));
            }
        } catch (error) {
            logger.error(`Error in autocomplete for /profile: ${error.message}`);
            await interaction.respond([]);
        }
    },
};
