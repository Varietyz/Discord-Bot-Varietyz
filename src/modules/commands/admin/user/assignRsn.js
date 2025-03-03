const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, EmbedBuilder } = require('discord.js');
const logger = require('../../../utils/essentials/logger');
const { runQuery, getOne } = require('../../../utils/essentials/dbUtils');
const { normalizeRsn } = require('../../../utils/normalizing/normalizeRsn');
const { validateRsn } = require('../../../utils/helpers/validateRsn');
const { fetchPlayerData } = require('../../../utils/fetchers/fetchPlayerData');
const { updatePlayerData } = require('../../../utils/essentials/updatePlayerData');
const { updateEventBaseline } = require('../../../services/bingo/bingoTaskManager');
const { fetchAndProcessMember } = require('../../../services/autoRoles');
const getPlayerLink = require('../../../utils/fetchers/getPlayerLink');
const getEmojiWithFallback = require('../../../utils/fetchers/getEmojiWithFallback');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('assign_rsn')
        .setDescription('ADMIN: Assign a RuneScape Name (RSN) to a guild member.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addUserOption((option) => option.setName('target').setDescription('The guild member to assign an RSN to.').setRequired(true))
        .addStringOption((option) => option.setName('rsn').setDescription('The RuneScape Name to assign.').setRequired(true)),
    async execute(interaction) {
        try {
            const targetUser = interaction.options.getUser('target');
            const rsn = interaction.options.getString('rsn');
            const loadingEmoji = await getEmojiWithFallback('emoji_clan_loading', 'loading....');
            const profileLink = await getPlayerLink(rsn);
            logger.info(`🔍 Admin ${interaction.user.id} attempting to assign RSN "\`${rsn}\`" to user \`${targetUser.id}\`.`);
            const validation = validateRsn(rsn);
            if (!validation.valid) {
                return await interaction.reply({
                    content: `❌ **Error:** ${validation.message} Please check your input and try again.`,
                    flags: 64,
                });
            }
            const normalizedRsn = normalizeRsn(rsn);
            const playerData = await fetchPlayerData(normalizedRsn);
            if (!playerData) {
                return await interaction.reply({
                    content: `❌ **Verification Failed:** The RSN "${profileLink}" could not be verified on Wise Old Man. Please ensure the name exists and try again.`,
                    flags: 64,
                });
            }
            const womPlayerId = playerData.id;
            const existingUser = await getOne('SELECT discord_id FROM registered_rsn WHERE LOWER(REPLACE(REPLACE(rsn, "-", " "), "_", " ")) = ? LIMIT 1', [normalizedRsn]);
            if (existingUser) {
                return await interaction.reply({
                    content: `🚫 **Conflict:** The RSN "${profileLink}" is already registered by <@${existingUser.discord_id}>.`,
                    flags: 64,
                });
            }
            const confirmationRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('confirm_assign_rsn').setLabel('Confirm').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('cancel_assign_rsn').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
            );
            await interaction.reply({
                content: `⚠️ **Confirmation Required**\nAre you sure you want to assign the RSN "${profileLink}" to <@${targetUser.id}>?`,
                components: [confirmationRow],
                flags: 64,
            });
            const filter = (i) => i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({
                filter,
                time: 15000,
                max: 1,
            });
            collector.on('collect', async (i) => {
                if (i.customId === 'confirm_assign_rsn') {
                    await runQuery('INSERT INTO registered_rsn (player_id, discord_id, rsn, registered_at) VALUES (?, ?, ?, ?)', [womPlayerId, targetUser.id, rsn, new Date().toISOString()]);
                    await interaction.reply({
                        content: `${loadingEmoji} Collecting player data for ${profileLink} \`(WOM ID: ${womPlayerId})\`...`,
                        flags: 64,
                    });
                    await updatePlayerData(rsn, womPlayerId);
                    const guild = interaction.guild;
                    await fetchAndProcessMember(guild, targetUser.id);

                    // Query for clan membership by joining registered_rsn and clan_members
                    const validRegistration = await getOne(
                        `
    SELECT r.*, cm.player_id AS clan_player_id
    FROM registered_rsn AS r
    INNER JOIN clan_members AS cm 
      ON r.player_id = cm.player_id
      AND LOWER(r.rsn) = LOWER(cm.rsn)
    WHERE r.player_id = ?
    LIMIT 1
    `,
                        [womPlayerId],
                    );

                    if (validRegistration && validRegistration.clan_player_id) {
                        await interaction.editReply({
                            content: `${loadingEmoji} ${profileLink} \`(WOM ID: ${womPlayerId})\` is confirmed as a clan member. Registering for bingo...`,
                            flags: 64,
                        });
                        await updateEventBaseline();
                    } else {
                        logger.info(`Player with WOM ID ${womPlayerId} and RSN ${rsn} is not a clan member. Skipping baseline update.`);
                    }

                    await interaction.editReply({
                        content: `✅ **Success!** The RSN "${profileLink}" \`(WOM ID: ${womPlayerId})\` assigned to user \`${targetUser.id}\` by admin ${interaction.user.id}`,
                        flags: 64,
                    });
                    logger.info(`✅ RSN "${profileLink}" \`(WOM ID: ${womPlayerId})\` assigned to user \`${targetUser.id}\` by admin ${interaction.user.id}`);
                    const userEmbed = new EmbedBuilder()
                        .setColor(0x00ff00)
                        .setTitle('✅ RSN Registered')
                        .setDescription(`Your RuneScape Name "${profileLink}" \`(WOM ID: ${womPlayerId})\` has been successfully registered in our records.\n\n*This action was performed by: <@${interaction.user.id}>*`)
                        .setFooter({ text: 'Varietyz Bot' })
                        .setTimestamp();
                    await targetUser.send({ embeds: [userEmbed] }).catch(() => {
                        logger.warn(`⚠️ Failed to send DM to user \`${targetUser.id}\`.`);
                    });
                    await i.update({
                        content: `✅ **Success:** The RSN "${profileLink}" \`(WOM ID: ${womPlayerId})\` has been successfully assigned to <@${targetUser.id}>.`,
                        components: [],
                        flags: 64,
                    });
                } else if (i.customId === 'cancel_assign_rsn') {
                    await i.update({
                        content: '❌ **Canceled:** RSN assignment has been canceled.',
                        components: [],
                        flags: 64,
                    });
                }
            });
            collector.on('end', async (collected, reason) => {
                if (reason === 'time' && collected.size === 0) {
                    await interaction.editReply({
                        content: '⌛ **Timeout:** Confirmation timed out. RSN assignment has been canceled.',
                        components: [],
                        flags: 64,
                    });
                }
            });
        } catch (error) {
            logger.error(`❌ Error executing /admin_assign_rsn command: ${error.message}`);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: '❌ **Error:** An error occurred while processing the request. Please try again later.',
                    flags: 64,
                });
            } else {
                await interaction.reply({
                    content: '❌ **Error:** An error occurred while processing the request. Please try again later.',
                    flags: 64,
                });
            }
        }
    },
};
