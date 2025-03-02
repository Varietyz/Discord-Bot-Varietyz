const { EmbedBuilder } = require('discord.js');
const WOMApiClient = require('../../api/wise_old_man/apiClient');
const logger = require('../utils/essentials/logger');
const { rankHierarchy } = require('../../config/constants');
const { getRankEmoji, formatExp, formatRank, getRankColor } = require('../utils/helpers/rankUtils');
const { getRanks } = require('../utils/fetchers/fetchRankEmojis');
const { purgeChannel } = require('../utils/helpers/purgeChannel');
const db = require('../utils/essentials/dbUtils');
const { syncClanRankEmojis } = require('../utils/essentials/syncClanRanks');
const { cleanupOrphanedPlayers } = require('../utils/essentials/orphanCleaner');
require('dotenv').config();
/**
 *
 * @param member
 * @param roleName - The role name to assign (e.g. from RANKS mapping)
 * @param guild
 * @param player - The RSN (for logging)
 * @param rank - The rank from the API for this particular RSN
 */
async function handleMemberRoles(member, roleName, guild, player, rank) {
    if (!player || rank.toLowerCase() === 'private') return;

    const targetRole = guild.roles.cache.find((r) => r.name.toLowerCase() === roleName.toLowerCase());
    if (!targetRole) {
        logger.warn(`🚫 [handleMemberRoles] Role '${roleName}' not found in the guild. ⚠️`);
        return;
    }

    // Query the database to get all the clan_member ranks registered for this Discord user.
    // This joins registered_rsn with clan_members so that we know which ranks the user's RSNs have.
    const registeredRanksData = await db.getAll(
        `
        SELECT cm.rank
        FROM clan_members cm
        JOIN registered_rsn rr ON rr.player_id = cm.player_id
        WHERE rr.discord_id = ?
        `,
        [member.id],
    );

    // Build a set of the allowed rank names (in lowercase).
    const allowedRanks = new Set(registeredRanksData.map((row) => row.rank.toLowerCase()));
    logger.info(`[handleMemberRoles] Allowed ranks for ${player}: ${[...allowedRanks].join(', ')}`);

    // Determine target role position using rankHierarchy.
    const targetRolePosition = rankHierarchy[roleName.toLowerCase()];

    // Filter member roles for removal:
    // Remove roles if they are lower than the target role,
    // unless the role name is among the allowedRanks (i.e. one of the registered RSN ranks).
    const rolesToRemove = member.roles.cache.filter((r) => {
        const roleKey = r.name.toLowerCase();
        const position = rankHierarchy[roleKey];
        // If the role is among the registered ranks, do not remove it.
        if (allowedRanks.has(roleKey)) return false;
        // Otherwise, if the role's hierarchy position is defined and is lower than the target, mark it for removal.
        return position !== undefined && position < targetRolePosition;
    });

    if (rolesToRemove.size > 0) {
        const removedRoles = await Promise.all(rolesToRemove.map(async (r) => `${await getRankEmoji(r.name)} <@&${r.id}>`));
        await member.roles.remove(rolesToRemove);
        const row = await db.guild.getOne('SELECT channel_id FROM ensured_channels WHERE channel_key = ?', ['auto_roles_channel']);
        if (!row) {
            logger.info('⚠️ No channel_id is configured in ensured_channels for auto_roles_channel.');
            return;
        }
        const channelId = row.channel_id;
        const roleChannel = await guild.channels.fetch(channelId);
        const color = await getRankColor(rank);
        const targetEmoji = await getRankEmoji(rank);
        const embed = new EmbedBuilder()
            .setTitle('🔄 Rank Updated!')
            .setDescription(`🎉 **Good news!**\nYour rank has been updated to ${targetEmoji} ${targetRole}\n\nThe following roles were removed to reflect the change:\n- ${removedRoles.join('\n- ')}`)
            .setColor(color);
        await roleChannel.send({ content: `<@${member.id}>`, embeds: [embed] });
        logger.info(`✅ [handleMemberRoles] Removed roles for ${player}: ${removedRoles}`);
    } else {
        logger.info(`[handleMemberRoles] No roles to remove for ${player}.`);
    }

    // Add the target role if not already assigned.
    if (!member.roles.cache.has(targetRole.id)) {
        await member.roles.add(targetRole);
        logger.info(`✅ [handleMemberRoles] Assigned role '${roleName}' to ${player} 🎉`);
    }
}

/**
 *
 * @param client
 * @param root0
 * @param root0.forceChannelUpdate
 */
async function updateData(client, { forceChannelUpdate = false } = {}) {
    try {
        logger.info('📡 Fetching clan members from Wise Old Man API...');
        const groupData = await WOMApiClient.request('groups', 'getGroupDetails', process.env.WOM_GROUP_ID);
        if (!groupData || !groupData.memberships) {
            throw new Error('❌ No memberships data found in the group response.');
        }
        const guild = await client.guilds.fetch(process.env.GUILD_ID);
        const activeRanks = new Set(groupData.memberships.map((m) => m.role.toLowerCase()));
        logger.info(`Active roles from API: ${[...activeRanks].join(', ')}`);
        const { addedEmojis, deletedEmojis } = await syncClanRankEmojis(guild, activeRanks);
        logger.info(`Synced ${addedEmojis} clan rank emojis, and deleted ${deletedEmojis} outdated emojis.`);
        const newData = [];
        const cachedData = [];
        const discordIdCache = {};
        for (const membership of groupData.memberships) {
            const player = membership.player;
            if (!player) continue;
            const playerId = player.id;
            const rsn = player.displayName;
            const rank = membership.role || 'Unknown';
            const experience = player.exp || 'N/a';
            const lastProgressed = player.lastChangedAt ? new Date(player.lastChangedAt) : null;
            const joinedAt = membership.createdAt ? new Date(membership.createdAt).toISOString() : null;
            const formattedRank = formatRank(rank);
            newData.push({ playerId, rsn, rank: formattedRank, joinedAt });
            cachedData.push({
                player: rsn,
                rank: formattedRank,
                experience: experience,
                lastProgressed: lastProgressed,
                joinedAt: joinedAt,
            });
            const RANKS = await getRanks();
            const roleName = RANKS[formattedRank.toLowerCase()]?.role;
            if (!roleName) {
                logger.warn(`⚠️ Rank '${formattedRank}' not found in RANKS. Available keys: ${Object.keys(RANKS).join(', ')}`);
                continue;
            }
            if (!discordIdCache[rsn.toLowerCase()]) {
                const result = await db.getAll('SELECT discord_id FROM registered_rsn WHERE LOWER(rsn) = LOWER(?)', [rsn]);
                if (result.length > 0) discordIdCache[rsn.toLowerCase()] = result[0].discord_id;
            }
            const discordId = discordIdCache[rsn.toLowerCase()];
            if (discordId) {
                const member = await guild.members.fetch(discordId).catch(() => null);
                if (member) await handleMemberRoles(member, roleName, guild, rsn, rank);
            }
        }
        const changesDetected = await updateDatabase(newData);
        if (changesDetected || forceChannelUpdate) {
            await updateClanChannel(client, cachedData);
        } else {
            logger.info('✅ No changes detected. Skipping channel purge and update.');
        }
    } catch (error) {
        logger.error(`❌ Failed to update clan data: ${error.message}`);
    }
}
/**
 *
 * @param newData
 */
async function updateDatabase(newData) {
    try {
        const currentData = await db.getAll('SELECT player_id, rsn, rank, joined_at FROM clan_members');
        const currentDataMap = new Map(currentData.map(({ player_id, rsn, rank, joined_at }) => [player_id, { rsn, rank, joined_at }]));
        let hasChanges = false;
        const updates = [];
        for (const { playerId, rsn, rank, joinedAt } of newData) {
            const existingEntry = currentDataMap.get(playerId);
            logger.info(`🔍 Checking: ${playerId}, ${rsn}, ${rank}, ${joinedAt}`);
            logger.info(`📌 DB Entry: ${existingEntry ? JSON.stringify(existingEntry) : 'None'}`);
            if (!existingEntry) {
                logger.warn(`🆕 New player detected: ${rsn} (ID: ${playerId})`);
                hasChanges = true;
                updates.push({ playerId, rsn, rank, joinedAt });
            } else if (existingEntry.rsn !== rsn || existingEntry.rank !== rank || (existingEntry.joined_at !== joinedAt && joinedAt !== null)) {
                logger.warn(`🔄 Change detected for ${rsn}:`);
                if (existingEntry.rsn !== rsn) {
                    logger.warn(`   🏷 RSN: ${existingEntry.rsn} → ${rsn}`);
                }
                if (existingEntry.rank !== rank) {
                    logger.warn(`   🎖 Rank: ${existingEntry.rank} → ${rank}`);
                }
                if (existingEntry.joined_at !== joinedAt && joinedAt !== null) {
                    logger.warn(`   📅 Joined At: ${existingEntry.joined_at} → ${joinedAt}`);
                }
                hasChanges = true;
                updates.push({ playerId, rsn, rank, joinedAt });
            } else {
                logger.info(`✅ No changes detected for ${rsn}.`);
            }
        }
        if (updates.length > 0) {
            for (const { playerId, rsn, rank, joinedAt } of updates) {
                const updateQuery = `
          INSERT INTO clan_members (player_id, rsn, rank, joined_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(player_id) DO UPDATE SET
            rsn = excluded.rsn,
            rank = excluded.rank,
            joined_at = COALESCE(excluded.joined_at, clan_members.joined_at)
        `;
                try {
                    await db.runQuery(updateQuery, [playerId, rsn, rank, joinedAt]);
                } catch (err) {
                    if (err.message.includes('UNIQUE constraint failed: clan_members.rsn')) {
                        logger.warn(`⚠️ Conflict detected for RSN '${rsn}'. Attempting to resolve...`);
                        const occupant = await db.getOne('SELECT player_id FROM clan_members WHERE rsn = ?', [rsn]);
                        if (occupant && occupant.player_id !== playerId) {
                            logger.warn(`🗑️ Removing occupant row #${occupant.player_id} which also has RSN '${rsn}'.`);
                            await db.runQuery('DELETE FROM clan_members WHERE player_id = ?', [occupant.player_id]);
                        }
                        await db.runQuery(updateQuery, [playerId, rsn, rank, joinedAt]);
                    } else {
                        throw err;
                    }
                }
            }
            logger.info(`✅ Updated ${updates.length} records in the database.`);
        } else {
            logger.info('✅ No changes detected. Skipping database update.');
        }
        return hasChanges;
    } catch (error) {
        logger.error(`❌ Failed to update database: ${error.message}`);
        return false;
    }
}
/**
 *
 * @param array
 * @param chunkSize
 */
function chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}
/**
 *
 * @param channel
 * @param embeds
 */
async function sendEmbedsInBatches(channel, embeds) {
    const batches = chunkArray(embeds, 10);
    for (const batch of batches) {
        try {
            await channel.send({ embeds: batch });
        } catch (error) {
            logger.error(`🚨 Error sending embed batch: ${error.message}`);
        }
    }
}
/**
 *
 * @param client
 * @param cachedData
 */
async function updateClanChannel(client, cachedData) {
    const row = await db.guild.getOne('SELECT channel_id FROM ensured_channels WHERE channel_key = ?', ['clan_members_channel']);
    if (!row) {
        logger.info('⚠️ No channel_id is configured in ensured_channels for clan_members_channel.');
        return;
    }
    const channelId = row.channel_id;
    const channel = await client.channels.fetch(channelId);
    await purgeChannel(channel);
    const embeds = [];
    let index = 1;
    for (const { player, rank, experience, lastProgressed } of cachedData) {
        if (!player || rank.toLowerCase() === 'private') continue;
        const rankEmoji = await getRankEmoji(rank);
        const color = await getRankColor(rank);
        const playerNameForLink = encodeURIComponent(player.replace(/ /g, '%20'));
        let lastProgressedTimestamp = null;
        if (lastProgressed && lastProgressed !== 'N/a') {
            const parsedDate = new Date(lastProgressed);
            if (!isNaN(parsedDate.getTime())) {
                lastProgressedTimestamp = Math.floor(parsedDate.getTime() / 1000);
            }
        }
        const embed = new EmbedBuilder()
            .setTitle(`${index}. ${rankEmoji} **${player}**`)
            .setURL(`https://wiseoldman.net/players/${playerNameForLink}`)
            .setColor(color)
            .addFields(
                { name: 'Rank:', value: `**\`${rank}\`**`, inline: true },
                { name: 'Total Exp:', value: `**\`${formatExp(experience)}\`**`, inline: true },
                {
                    name: 'Last Progressed:',
                    value: lastProgressedTimestamp ? `🕛 <t:${lastProgressedTimestamp}:d> <t:${lastProgressedTimestamp}:t>\n⌛ <t:${lastProgressedTimestamp}:R>` : '`N/a`',
                    inline: false,
                },
            );
        embeds.push(embed);
        index++;
    }
    await sendEmbedsInBatches(channel, embeds);
    await cleanupOrphanedPlayers();
    logger.info('✅ Clan channel updated with new data. 🎉');
}
module.exports = { updateData, updateClanChannel };
