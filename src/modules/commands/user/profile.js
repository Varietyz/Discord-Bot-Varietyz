const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
const { normalizeRsn } = require('../../utils/normalizing/normalizeRsn');
const womApi = require('../../../api/wise_old_man/apiClient');
const { getRankEmoji } = require('../../utils/helpers/rankUtils');
function safeTruncate(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
}
async function getCompetitionStats(playerUsername) {
    try {
        const stats = await db.getOne(
            `SELECT total_wins, total_metric_gain_sotw, total_metric_gain_botw 
             FROM users 
             WHERE LOWER(rsn) = ?`,
            [playerUsername.toLowerCase()],
        );
        return stats || { total_wins: '\u200b', total_metric_gain_sotw: '\u200b', total_metric_gain_botw: '\u200b' };
    } catch (error) {
        logger.error(`❌ Error fetching competition stats for ${playerUsername}: ${error.message}`);
        return { total_wins: '\u200b', total_metric_gain_sotw: '\u200b', total_metric_gain_botw: '\u200b' };
    }
}
function getLocalRegDate(clanMemberProfile, regRsns, liveRegisteredAt) {
    let localDate = 'Determining..';
    if (regRsns && regRsns.length > 0) {
        localDate = new Date(regRsns[0].registered_at).toLocaleDateString('en-US', { timeZone: 'UTC' });
    } else if (clanMemberProfile && clanMemberProfile.joined_at) {
        localDate = new Date(clanMemberProfile.joined_at).toLocaleDateString('en-US', { timeZone: 'UTC' });
    }
    return liveRegisteredAt ? new Date(liveRegisteredAt).toLocaleString('en-US', { timeZone: 'UTC' }) : localDate;
}
function getGuildEmoji(name, guild, fallbackEmoji = '⚔️') {
    if (guild) {
        const normalizedName = name.toLowerCase().replace(/\s+/g, '_');
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
function buildAccountEmbed(liveData, accountInfo, experienceInfo, leftSkillsStr, rightSkillsStr, leftBossesStr, rightBossesStr, dateInfo, compInfo, clanInfo) {
    const playerName = liveData.displayName;
    const playerNameForLink = encodeURIComponent(playerName.replace(/ /g, '%20'));
    const profileLink = `https://wiseoldman.net/players/${playerNameForLink}`;
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
function getCountryDisplay(countryCode) {
    if (!countryCode) return '';
    const twoLetter = countryCode.substring(0, 2).toLowerCase();
    return `:flag_${twoLetter}: ${countryCode}`;
}
function capitalizeWords(str) {
    if (!str) return '';
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
}
module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View a player profile by RSN. If none is provided, your own registered RSN is used.')
        .addStringOption((option) => option.setName('rsn').setDescription('The RSN to view (autocomplete searches users, registered RSNs, and clan members).').setAutocomplete(true).setRequired(false)),
    async execute(interaction) {
        try {
            await interaction.deferReply({ flags: 64 });
            let rsnInput = interaction.options.getString('rsn');
            if (!rsnInput) {
                const userRsns = await db.getAll('SELECT rsn, registered_at FROM registered_rsn WHERE discord_id = ? ORDER BY registered_at ASC', [interaction.user.id]);
                if (!userRsns || userRsns.length === 0) {
                    return await interaction.editReply({
                        content: '🚫 **Notice:** You haven\'t registered any RSNs yet. Use `/rsn` to register one.',
                        flags: 64,
                    });
                }
                rsnInput = userRsns[0].rsn;
            }
            const normalizedInput = normalizeRsn(rsnInput);
            logger.info(`🔍 Searching profile for RSN: "${rsnInput}" (normalized: "${normalizedInput}")`);
            const clanMemberProfile = await db.getOne('SELECT * FROM clan_members WHERE LOWER(rsn) = ?', [normalizedInput]);
            const userProfile = await db.getOne('SELECT * FROM users WHERE LOWER(rsn) = ?', [normalizedInput]);
            let profileSource = null;
            if (!clanMemberProfile && !userProfile) {
                const regRsnFallback = await db.getOne('SELECT rsn, registered_at FROM registered_rsn WHERE LOWER(REPLACE(REPLACE(rsn, \'-\', \' \'), \'_\', \' \')) = ?', [normalizedInput]);
                if (regRsnFallback) {
                    profileSource = 'registered';
                    logger.info(`✅ Found registered RSN record for RSN: "${rsnInput}" (fallback only)`);
                } else {
                    return await interaction.editReply({
                        content: `❌ **Error:** No profile found for RSN **\`${rsnInput}\`**.`,
                        flags: 64,
                    });
                }
            } else if (clanMemberProfile && userProfile) {
                profileSource = 'both';
                logger.info(`✅ Found both clan member and user profile for RSN: "${rsnInput}"`);
            } else if (clanMemberProfile) {
                profileSource = 'clan';
                logger.info(`✅ Found clan member profile for RSN: "${rsnInput}"`);
            } else if (userProfile) {
                profileSource = 'users';
                logger.info(`✅ Found user profile for RSN: "${rsnInput}"`);
            }
            const compStats = userProfile ? await getCompetitionStats(userProfile.rsn) : { total_wins: '\u200b', total_metric_gain_sotw: '\u200b', total_metric_gain_botw: '\u200b' };
            const liveData = await womApi.request('players', 'getPlayerDetails', normalizedInput);
            if (!liveData) {
                const profileLink = `https://wiseoldman.net/players/${encodeURIComponent(normalizedInput)}`;
                return await interaction.editReply({
                    content: `❌ **Error:** Unable to fetch live data for RSN **\`${rsnInput}\`**. Please verify the RSN.\n\n🔗 [View Profile](${profileLink})`,
                    flags: 64,
                });
            }
            const regRsnRow = await db.getOne('SELECT discord_id FROM registered_rsn WHERE LOWER(REPLACE(REPLACE(rsn, \'-\', \' \'), \'_\', \' \')) = ?', [normalizedInput]);
            let regRsns = [];
            let hasRegistered = false;
            if (regRsnRow && regRsnRow.discord_id) {
                regRsns = await db.getAll('SELECT rsn, registered_at FROM registered_rsn WHERE discord_id = ? ORDER BY registered_at ASC', [regRsnRow.discord_id]);
                hasRegistered = regRsns && regRsns.length > 0;
            }
            const { type: accountType, build, status, exp, registeredAt: liveRegisteredAt, updatedAt, combatLevel, country, lastChangedAt } = liveData;
            const regDateToUse = getLocalRegDate(clanMemberProfile, regRsns, liveRegisteredAt);
            const statusEmoji = status.toLowerCase() === 'active' ? ':battery:' : ':low_battery:';
            const accountInfo = safeTruncate(
                `:crossed_swords: Combat Level: **\`${combatLevel || 'Unranked'}\`**\n` +
                    `:gear: Account Type: **\`${capitalizeWords(accountType)} | ${capitalizeWords(build)}\`**\n` +
                    `${statusEmoji} Status: **\`${capitalizeWords(status)}\`**\n` +
                    `:globe_with_meridians: Country: ${getCountryDisplay(country) || '<#802680940835897384>'}`,
                1024,
            );
            const overallEmojis = await db.guild.getAll('SELECT emoji_format FROM guild_emojis WHERE emoji_key = ?', ['emoji_overall']);
            const emoji = overallEmojis.length > 0 ? overallEmojis[0].emoji_format : '';
            let experienceInfo = `${emoji} Total Exp: **\`${exp.toLocaleString()}\`**\n`;
            if (exp >= 500_000_000) {
                experienceInfo += ':trophy: Over **`500M EXP`** achieved!\n';
            }
            const snapshot = liveData.latestSnapshot && liveData.latestSnapshot.data;
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
                    const overallEmojis = await db.guild.getAll('SELECT emoji_format FROM guild_emojis WHERE emoji_key = ?', ['emoji_max_cape']);
                    const emoji = overallEmojis.length > 0 ? overallEmojis[0].emoji_format : '';
                    experienceInfo += `${emoji} Achieved **\`Level 99\`** in all Skills!\n`;
                }
            }
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
                const overallEmojis = await db.guild.getAll('SELECT emoji_format FROM guild_emojis WHERE emoji_key = ?', ['emoji_infernal_cape']);
                const emoji = overallEmojis.length > 0 ? overallEmojis[0].emoji_format : '';
                experienceInfo += `${emoji} **\`Infernal Cape\`** achieved!\n`;
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
                const overallEmoji = await db.guild.getAll('SELECT emoji_format FROM guild_emojis WHERE emoji_key = ?', ['emoji_overall']);
                const emojiSotw = overallEmoji.length > 0 ? overallEmoji[0].emoji_format : '';
                const slayerEmoji = await db.guild.getAll('SELECT emoji_format FROM guild_emojis WHERE emoji_key = ?', ['emoji_slayer']);
                const emojiBotw = slayerEmoji.length > 0 ? slayerEmoji[0].emoji_format : '';
                compInfo += safeTruncate(
                    `:trophy: Competition Wins: **\`${compStats.total_wins}\`**\n` +
                        `${emojiSotw} SOTW - Total Exp: **\`${compStats.total_metric_gain_sotw.toLocaleString()}\`**\n` +
                        `${emojiBotw} BOTW - Total Kills: **\`${compStats.total_metric_gain_botw.toLocaleString()}\`**\n`,
                    1024,
                );
            }
            let clanInfo = '';
            if (profileSource === 'clan' || profileSource === 'both') {
                const rawRank = clanMemberProfile.rank;
                const normalizedRank = rawRank.trim();
                logger.debug(`Profile command: raw rank is "${rawRank}", normalized rank is "${normalizedRank}", lowercased: "${normalizedRank.toLowerCase()}"`);
                const clanRankEmoji = await getRankEmoji(normalizedRank);
                logger.debug(`Profile command: Retrieved rank emoji "${clanRankEmoji}" for rank "${normalizedRank}"`);
                const clanEmoji = await db.guild.getAll('SELECT emoji_format FROM guild_emojis WHERE emoji_key = ?', ['emoji_clan_logo']);
                const clansEmoji = clanEmoji.length > 0 ? clanEmoji[0].emoji_format : '';
                clanInfo +=
                    '\n' +
                    safeTruncate(
                        `${clansEmoji} Ranked: ${clanRankEmoji} **\`${clanMemberProfile.rank}\`**\n` + `:ballot_box_with_check: Joined: **\`${new Date(clanMemberProfile.joined_at).toLocaleDateString('en-US', { timeZone: 'UTC' })}\`**`,
                        1024,
                    );
            }
            const accountEmbed = buildAccountEmbed(liveData, accountInfo, finalExperienceInfo, leftSkillsStr, rightSkillsStr, leftBossesStr, rightBossesStr, dateInfo, compInfo, clanInfo);
            const embedArray = [accountEmbed];
            if (hasRegistered) {
                embedArray.push(buildRSNEmbed(regRsns));
            }
            await interaction.editReply({ embeds: embedArray, flags: 64 });
        } catch (error) {
            logger.error(`❌ Error executing /profile command: ${error.message}`);
            await interaction.editReply({
                content: '❌ **Error:** An error occurred while fetching the profile. Please try again later.',
                flags: 64,
            });
        }
    },
    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        try {
            if (focusedOption.name === 'rsn') {
                const input = focusedOption.value.toLowerCase();
                const userResults = await db.getAll('SELECT rsn FROM users WHERE LOWER(rsn) LIKE ?', [`%${input}%`]);
                const regResults = await db.getAll('SELECT DISTINCT rsn FROM registered_rsn WHERE LOWER(rsn) LIKE ?', [`%${input}%`]);
                const clanResults = await db.getAll('SELECT rsn FROM clan_members WHERE LOWER(rsn) LIKE ?', [`%${input}%`]);
                const combinedSet = new Set();
                const choices = [];
                userResults.forEach((row) => {
                    const uname = row.rsn.toLowerCase();
                    if (!combinedSet.has(uname)) {
                        combinedSet.add(uname);
                        choices.push({ name: row.username || row.rsn, value: row.rsn });
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
                    const nameLower = row.rsn.toLowerCase();
                    if (!combinedSet.has(nameLower)) {
                        combinedSet.add(nameLower);
                        choices.push({ name: row.name || row.rsn, value: row.rsn });
                    }
                });
                await interaction.respond(choices.slice(0, 25));
            }
        } catch (error) {
            logger.error(`❌ Error in autocomplete for /profile: ${error.message}`);
            await interaction.respond([]);
        }
    },
};