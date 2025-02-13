const fs = require('fs');
const path = require('path');
const db = require('../../utils/essentials/dbUtils');
const logger = require('../../utils/essentials/logger');
const WOMApiClient = require('../../../api/wise_old_man/apiClient');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ComponentType } = require('discord.js');

// Helper sleep function to add delays between API calls.
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retrieves active clan ranks from the WOM API.
 * Converts the base role names (e.g. "mod") into a Set.
 *
 * @returns {Promise<Set<string>>} A set of active base role names.
 */
async function getActiveRanks() {
    try {
        const response = await WOMApiClient.request('groups', 'getGroupDetails', WOMApiClient.groupId);
        if (!response || !response.memberships) {
            logger.warn('⚠️ No memberships found in WOM API response.');
            return new Set();
        }
        const activeRanks = new Set(response.memberships.map((m) => m.role.toLowerCase()));
        logger.info(`✅ Retrieved ${activeRanks.size} active ranks from WOM API.`);
        return activeRanks;
    } catch (error) {
        logger.error(`❌ Error fetching active ranks: ${error.message}`);
        return new Set();
    }
}

/**
 * Syncs clan rank emojis in the guild.
 *
 * For each rank emoji defined in the image cache DB:
 * - If the rank (base name) is active according to the provided activeRanks set (or fetched from the API if not provided),
 * it will check if an emoji with the stored key (final key) exists.
 * - If not, it creates the emoji in the guild using the base name as its display name,
 * but stores the key as "emoji_" + baseName in the guild_emojis table.
 *
 * Then, instead of immediately deleting outdated emojis, it gathers them and sends an embed to an alert channel.
 * An admin can then confirm deletion before they are removed.
 *
 * @param guild - The Discord guild where the emojis should be synced.
 * @param {Set<string>} [activeRanksParam] - Optional set of active rank base names (e.g., "mod", "admin").
 * @returns {Promise<{ addedEmojis: number, deletedEmojis: number }>} The number of emojis created and deleted.
 */
async function syncClanRankEmojis(guild, activeRanksParam) {
    let addedEmojis = 0;
    let deletedEmojis = 0;

    // Use the provided activeRanks set or fetch from the API.
    const activeRanks = activeRanksParam || (await getActiveRanks());
    if (!activeRanks.size) {
        logger.warn('⚠️ No active ranks found in WOM API. Aborting rank emoji sync.');
        return { addedEmojis, deletedEmojis };
    }
    logger.info(`🔄 Found ${activeRanks.size} active ranks. Proceeding with rank emoji sync...`);

    // Query the database for rank emoji file info.
    const rankEmojis = await db.image.getAll('SELECT file_name, file_path FROM ranks');
    logger.info(`🔄 Retrieved ${rankEmojis.length} rank emojis from DB.`);

    // Build a lookup map: base name → file path (all keys in lowercase)
    const rankEmojiMap = new Map(rankEmojis.map((e) => [e.file_name.toLowerCase(), e.file_path]));

    // --- CREATION PHASE ---
    for (const [baseName, filePath] of rankEmojiMap) {
        // Only process if the role is active.
        if (!activeRanks.has(baseName)) {
            logger.info(`Skipping rank emoji "${baseName}" because its role is not active.`);
            continue;
        }

        // Construct the final key for DB purposes: e.g. "emoji_mod"
        const finalEmojiKey = `emoji_${baseName}`;

        // Check if an emoji with this key already exists in the guild_emojis table.
        const exists = await db.guild.getOne('SELECT emoji_key FROM guild_emojis WHERE emoji_key = ?', [finalEmojiKey]);
        if (exists) {
            logger.info(`Skipping creation for rank emoji with key "${finalEmojiKey}" as it already exists in guild_emojis table.`);
            continue;
        }

        // Resolve the full file path.
        const fileFullPath = path.join(__dirname, '../../../../', filePath);
        if (!fs.existsSync(fileFullPath)) {
            logger.warn(`❌ Rank emoji file not found: ${fileFullPath}`);
            continue;
        }

        try {
            logger.info(`Attempting to create rank emoji: ${baseName}`);
            // Create the emoji with the base name so its visible name is "mod" (without the prefix).
            const uploadedEmoji = await guild.emojis.create({
                attachment: fileFullPath,
                name: baseName,
            });
            logger.info(`🎉 Uploaded rank emoji: ${uploadedEmoji.name}`);

            const emojiFormat = uploadedEmoji.animated ? `<a:${uploadedEmoji.name}:${uploadedEmoji.id}>` : `<:${uploadedEmoji.name}:${uploadedEmoji.id}>`;

            // Store the emoji in the guild_emojis table with the final key.
            await db.guild.runQuery(
                `INSERT INTO guild_emojis (emoji_id, emoji_key, emoji_name, emoji_format, animated)
                 VALUES (?, ?, ?, ?, ?)
                 ON CONFLICT(emoji_id) DO UPDATE 
                 SET emoji_key = excluded.emoji_key, emoji_name = excluded.emoji_name, emoji_format = excluded.emoji_format, animated = excluded.animated`,
                [
                    uploadedEmoji.id,
                    finalEmojiKey, // e.g., "emoji_mod"
                    uploadedEmoji.name, // e.g., "mod"
                    emojiFormat,
                    uploadedEmoji.animated ? 1 : 0,
                ],
            );
            addedEmojis++;
        } catch (error) {
            logger.error(`❌ Failed to upload rank emoji (${baseName}): ${error.message}`);
        }
        await sleep(3500); // Delay to help mitigate rate limits.
    }

    // --- DELETION PHASE (with Confirmation) ---

    // Define a set of base names that should not be prompted for auto-delete.
    const exclusionSet = new Set(['hunter', 'magic', 'slayer', 'guest']);

    // Build a set of active keys by prefixing each active role with "emoji_"
    const activeKeys = new Set([...activeRanks].map((role) => `emoji_${role}`));

    // Pre-fetch all managed emoji records from the guild_emojis table.
    const guildEmojiRecords = await db.guild.getAll('SELECT emoji_id, emoji_key FROM guild_emojis');
    const guildEmojiKeyMap = new Map();
    for (const rec of guildEmojiRecords) {
        guildEmojiKeyMap.set(rec.emoji_id, rec.emoji_key);
    }

    // Gather outdated rank emojis: those managed by our system that are rank emojis (their base name exists in rankEmojiMap)
    // but whose stored key is not in the active keys set.
    const outdatedEmojis = [];
    for (const emoji of guild.emojis.cache.values()) {
        const storedKey = guildEmojiKeyMap.get(emoji.id);
        if (!storedKey) continue; // Not managed by our system.

        // Extract the base name by removing the "emoji_" prefix.
        const baseName = storedKey.substring(6);

        // Skip deletion for excluded ranks.
        if (exclusionSet.has(baseName)) continue;

        // If this emoji is a rank emoji and its stored key is not in activeKeys, it is outdated.
        if (rankEmojiMap.has(baseName) && !activeKeys.has(storedKey)) {
            outdatedEmojis.push(emoji);
        }
    }

    if (outdatedEmojis.length > 0) {
        // Retrieve the alert channel data from the guild_channels table.
        const channelData = await db.guild.getOne('SELECT channel_id FROM guild_channels WHERE channel_key = ?', ['channel_dataalerts']);
        if (channelData) {
            const alertChannel = await guild.channels.fetch(channelData.channel_id).catch(() => null);
            if (alertChannel) {
                // Create an embed listing outdated emojis.
                const embed = new EmbedBuilder()
                    .setTitle('Outdated Rank Emojis Detected')
                    .setDescription(`The following rank emojis are no longer active and are scheduled for deletion:\n\n${outdatedEmojis.map((e) => e.name).join('\n')}`)
                    .setColor(0xff0000)
                    .setTimestamp();

                // Create buttons for confirmation.
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('confirm_delete_outdated').setLabel('Confirm Deletion').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('cancel_delete_outdated').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
                );

                // Send the embed to the alert channel.
                const confirmationMessage = await alertChannel.send({ embeds: [embed], components: [row] });
                logger.info('Sent deletion confirmation embed to alert channel.');

                // Await response from an admin.
                try {
                    const collected = await confirmationMessage.awaitMessageComponent({
                        filter: (i) => i.member?.permissions.has('Administrator') || i.user.id === guild.ownerId,
                        componentType: ComponentType.Button,
                        time: 60000,
                    });

                    if (collected.customId === 'confirm_delete_outdated') {
                        // Delete the outdated emojis.
                        for (const emoji of outdatedEmojis) {
                            try {
                                await emoji.delete();
                                deletedEmojis++;
                                logger.info(`🗑 Removed outdated rank emoji (key: ${guildEmojiKeyMap.get(emoji.id)})`);
                                await sleep(2500);
                            } catch (error) {
                                logger.warn(`⚠️ Failed to remove rank emoji (key: ${guildEmojiKeyMap.get(emoji.id)}): ${error.message}`);
                            }
                        }
                        await collected.update({ content: `✅ Deleted ${outdatedEmojis.length} outdated rank emojis.`, components: [] });
                    } else {
                        await collected.update({ content: '❌ Deletion of outdated rank emojis cancelled.', components: [] });
                    }
                } catch (err) {
                    logger.warn('⚠️ No response for outdated emoji deletion confirmation. Skipping deletion.');
                    await confirmationMessage.edit({ content: '⚠️ Deletion confirmation timed out.', components: [] });
                }
            } else {
                logger.warn('⚠️ Alert channel not found in guild.');
            }
        } else {
            logger.warn('⚠️ No alert channel data found in guild_channels table for key "channel_dataalerts".');
        }
    } else {
        logger.info('✅ No outdated rank emojis detected for deletion.');
    }

    logger.info(`✅ Rank emoji sync complete. Total added: ${addedEmojis}, deleted: ${deletedEmojis}`);
    return { addedEmojis, deletedEmojis };
}

module.exports = {
    syncClanRankEmojis,
    getActiveRanks,
};
