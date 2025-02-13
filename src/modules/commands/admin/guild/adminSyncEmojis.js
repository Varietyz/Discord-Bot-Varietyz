const { SlashCommandBuilder, PermissionFlagsBits, ComponentType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const db = require('../../../utils/essentials/dbUtils');
const logger = require('../../../utils/essentials/logger');

// Helper sleep function to add delays between API calls.
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('manage_emojis')
        .setDescription('Manage and synchronize emojis in the server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand((subcommand) => subcommand.setName('sync').setDescription('Synchronize emojis: Add missing ones & remove outdated ones from the server.'))
        .addSubcommand((subcommand) => subcommand.setName('delete').setDescription('Delete ALL emojis from the server (requires confirmation).')),

    async execute(interaction) {
        try {
            // Defer the reply (using ephemeral flag if desired)
            await interaction.deferReply({ flags: 64 });
            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'sync') {
                await this.syncEmojis(interaction);
            } else if (subcommand === 'delete') {
                await this.confirmDeleteAllEmojis(interaction);
            }
        } catch (error) {
            logger.error(`❌ Error executing /manage_emojis: ${error.message}`);
            await interaction.editReply('❌ **Error:** An issue occurred while processing your request.');
        }
    },

    /**
     * Synchronizes emojis:
     * - Skill/Boss emojis are uploaded if missing and removed if no longer in the DB.
     * - Rank emojis are uploaded only if active (per WOM API) and removed if not active.
     *
     * @param interaction
     * @returns
     */
    async syncEmojis(interaction) {
        try {
            const guild = interaction.guild;
            const guildEmojis = guild.emojis.cache;
            let addedEmojis = 0;
            let deletedEmojis = 0;

            // Step 2: Query the database for emoji file info.
            const skillBossEmojis = await db.image.getAll('SELECT file_name, file_path FROM emojis');
            logger.info(`🔄 Retrieved ${skillBossEmojis.length} skill/boss emojis from DB.`);

            // Build lookup maps for quick checks (all keys in lowercase).
            const skillBossEmojiMap = new Map(skillBossEmojis.map((e) => [e.file_name.toLowerCase(), e.file_path]));

            // --- UPLOAD MISSING EMOJIS ---

            // Upload Skill/Boss Emojis (static; not tied to active roles)
            for (const [baseName, filePath] of skillBossEmojiMap) {
                // Construct the final key for DB purposes.
                const finalEmojiKey = `emoji_${baseName}`;

                // Check in the guild_emojis table if the record exists.
                const exists = await db.guild.getOne('SELECT emoji_key FROM guild_emojis WHERE emoji_key = ?', [finalEmojiKey]);
                if (exists) {
                    logger.info(`Skipping creation for skill/boss emoji with key "${finalEmojiKey}" as it already exists in guild_emojis table.`);
                    continue;
                }

                // Resolve full file path.
                const fileFullPath = path.join(__dirname, '../../../../../', filePath);
                if (!fs.existsSync(fileFullPath)) {
                    logger.warn(`❌ Skill/Boss emoji file not found: ${fileFullPath}`);
                    continue;
                }

                try {
                    // Create the emoji in the guild with the base name (without the prefix).
                    logger.info(`Attempting to create skill/boss emoji: ${baseName}`);
                    const uploadedEmoji = await guild.emojis.create({
                        attachment: fileFullPath,
                        name: baseName, // Actual emoji name in the guild is the base name.
                    });

                    logger.info(`🎉 Uploaded skill/boss emoji: ${uploadedEmoji.name}`);
                    const emojiFormat = uploadedEmoji.animated ? `<a:${uploadedEmoji.name}:${uploadedEmoji.id}>` : `<:${uploadedEmoji.name}:${uploadedEmoji.id}>`;

                    // Update the guild_emojis table using the final key.
                    await db.guild.runQuery(
                        `INSERT INTO guild_emojis (emoji_id, emoji_key, emoji_name, emoji_format, animated)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(emoji_id) DO UPDATE 
             SET emoji_key = excluded.emoji_key, emoji_name = excluded.emoji_name, emoji_format = excluded.emoji_format, animated = excluded.animated`,
                        [
                            uploadedEmoji.id,
                            finalEmojiKey, // Store the key as "emoji_mod"
                            uploadedEmoji.name, // This should be the base name ("mod")
                            emojiFormat,
                            uploadedEmoji.animated ? 1 : 0,
                        ],
                    );
                    addedEmojis++;
                    await sleep(2500); // Delay to help mitigate rate limits.
                } catch (error) {
                    logger.error(`❌ Failed to upload skill/boss emoji (${baseName}): ${error.message}`);
                }
            }

            // --- DELETE OUTDATED EMOJIS ---

            // Pre-fetch all managed emoji records from the guild_emojis table.
            const guildEmojiRecords = await db.guild.getAll('SELECT emoji_id, emoji_key FROM guild_emojis');
            // Build a map: emoji ID → stored emoji_key (e.g., "emoji_mod")
            const guildEmojiKeyMap = new Map();
            for (const rec of guildEmojiRecords) {
                guildEmojiKeyMap.set(rec.emoji_id, rec.emoji_key);
            }

            // Loop through guild emojis to delete outdated ones.
            for (const emoji of guildEmojis.values()) {
                // Retrieve the stored key from our database, if managed.
                const storedKey = guildEmojiKeyMap.get(emoji.id);
                if (!storedKey) continue; // Not managed by our system.

                // We compare using the stored key.
                if (skillBossEmojiMap.has(storedKey.substring(6))) {
                    // For skill/boss emojis: if the backing file is missing, delete.
                    const filePath = skillBossEmojiMap.get(storedKey.substring(6));
                    const fileFullPath = path.join(__dirname, '../../../../../', filePath);
                    if (!fs.existsSync(fileFullPath)) {
                        try {
                            await emoji.delete();
                            deletedEmojis++;
                            await sleep(1500); // Small delay between deletions.
                            logger.info(`🗑 Removed outdated skill/boss emoji (key: ${storedKey}, file missing)`);
                        } catch (error) {
                            logger.warn(`⚠️ Failed to remove skill/boss emoji (key: ${storedKey}): ${error.message}`);
                        }
                    }
                }
            }

            await interaction.editReply(`✅ **Emoji Sync Complete!**\n- **Uploaded:** ${addedEmojis} new emojis\n- **Deleted:** ${deletedEmojis} outdated emojis`);
        } catch (error) {
            logger.error(`❌ Error syncing emojis: ${error.message}`);
            await interaction.editReply('❌ **Error:** Failed to sync emojis.');
        }
    },

    /**
     * Prompts the user to confirm deletion of all emojis from the guild.
     *
     * @param interaction
     */
    async confirmDeleteAllEmojis(interaction) {
        try {
            const confirmRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('confirm_delete_emojis').setLabel('⚠️ Yes, Delete All Emojis').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('cancel_delete_emojis').setLabel('❌ Cancel').setStyle(ButtonStyle.Secondary),
            );

            await interaction.editReply({
                content: '⚠️ **Are you sure you want to delete ALL emojis from the server?**\nThis action **cannot** be undone.',
                components: [confirmRow],
            });

            const filter = (i) => i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({
                filter,
                componentType: ComponentType.Button,
                time: 15000,
            });

            collector.on('collect', async (i) => {
                if (i.customId === 'confirm_delete_emojis') {
                    await this.deleteAllEmojis(i);
                } else {
                    await i.update({ content: '❌ Emoji deletion **cancelled**.', components: [] });
                }
                collector.stop();
            });

            collector.on('end', (collected) => {
                if (collected.size === 0) {
                    interaction.editReply({ content: '❌ **Confirmation timed out.** Emoji deletion cancelled.', components: [] });
                }
            });
        } catch (error) {
            logger.error(`❌ Error prompting emoji deletion: ${error.message}`);
            await interaction.editReply('❌ **Error:** Could not process deletion confirmation.');
        }
    },

    /**
     * Deletes all emojis from the Discord guild.
     *
     * @param interaction
     */
    async deleteAllEmojis(interaction) {
        try {
            const guildEmojis = interaction.guild.emojis.cache;
            let deletedEmojis = 0;

            for (const emoji of guildEmojis.values()) {
                try {
                    await emoji.delete();
                    deletedEmojis++;
                    await sleep(1500); // Delay between deletions.
                    logger.info(`🗑 Deleted emoji: ${emoji.name}`);
                } catch (error) {
                    logger.warn(`⚠️ Failed to delete emoji (${emoji.name}): ${error.message}`);
                }
            }

            await interaction.update({
                content: `🗑 **All emojis have been deleted.**\n- **Deleted:** ${deletedEmojis} emojis`,
                components: [],
            });
        } catch (error) {
            logger.error(`❌ Error deleting all emojis: ${error.message}`);
            await interaction.editReply('❌ **Error:** Failed to delete all emojis.');
        }
    },
};
