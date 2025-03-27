const { SlashCommandBuilder } = require('@discordjs/builders');
const logger = require('../../utils/essentials/logger');
const { runQuery, getOne } = require('../../utils/essentials/dbUtils');
const { easterEggs } = require('../../../config/easterEggs');
const { validateRsn } = require('../../utils/helpers/validateRsn');
const { fetchPlayerData } = require('../../utils/fetchers/fetchPlayerData');
const { updateEventBaseline } = require('../../services/bingo/bingoTaskManager');
const { fetchAndProcessMember } = require('../../services/autoRoles');
const { updatePlayerData } = require('../../utils/essentials/updatePlayerData');
const getPlayerLink = require('../../utils/fetchers/getPlayerLink');
const getEmojiWithFallback = require('../../utils/fetchers/getEmojiWithFallback');
const normalizeStr = require('../../utils/normalizing/normalizeStr');

const RATE_LIMIT = 5;
const RATE_LIMIT_DURATION = 60 * 1000;
const rateLimitMap = new Map();

module.exports.data = new SlashCommandBuilder()
    .setName('rsn')
    .setDescription('Register your Old School RuneScape Name (RSN)')
    .addStringOption((option) => option.setName('name').setDescription('Your Old School RuneScape Name to register').setRequired(true).setMinLength(1).setMaxLength(12));
module.exports.execute = async (interaction) => {
    const loadingEmoji = await getEmojiWithFallback('emoji_clan_loading', 'Loading... ');

    let rsn = '';

    try {
        rsn = interaction.options.getString('name').replace(/[_]/g, ' ').trim();

        const normalizedRsn = normalizeStr(rsn);
        const playerData = await fetchPlayerData(normalizedRsn);
        const profileLink = await getPlayerLink(rsn);
        const validation = validateRsn(rsn);
        const currentTime = Date.now();

        const womPlayerId = playerData.id;
        const guild = interaction.guild;
        const discordId = interaction.user.id;

        const userData = rateLimitMap.get(discordId) || {
            count: 0,
            firstRequest: currentTime,
        };

        if (easterEggs[normalizedRsn]) {
            const { title, description, color } = easterEggs[normalizedRsn];
            return await interaction.reply({
                embeds: [
                    {
                        title,
                        description,
                        color,
                    },
                ],
                flags: 64,
            });
        }

        if (!validation.valid) {
            return await interaction.reply({
                content: `❌ **Error:** ${validation.message} Please check your input and try again. 🛠️`,
                flags: 64,
            });
        }

        if (currentTime - userData.firstRequest < RATE_LIMIT_DURATION) {
            if (userData.count >= RATE_LIMIT) {
                const retryAfter = Math.ceil((RATE_LIMIT_DURATION - (currentTime - userData.firstRequest)) / 1000);
                return await interaction.reply({
                    content: `🚫 **Rate Limit:** You're using this command too frequently. Please wait \`${retryAfter}\` second(s) before trying again. ⏳`,
                    flags: 64,
                });
            }
            userData.count += 1;
        } else {
            userData.count = 1;
            userData.firstRequest = currentTime;
        }
        rateLimitMap.set(discordId, userData);
        setTimeout(() => rateLimitMap.delete(discordId), RATE_LIMIT_DURATION);

        logger.info(`🔍 User \`${discordId}\` attempting to register RSN: \`${rsn}\``);

        if (!playerData) {
            return await interaction.reply({
                content: `❌ **Verification Failed:** The RSN ${profileLink} could not be verified on Wise Old Man. This might be because the name is not linked to an account on wise old man. Please ensure the name exists and try again.`,
                flags: 64,
            });
        }

        const existingUser = await getOne(
            `
      SELECT discord_id FROM registered_rsn
      WHERE LOWER(REPLACE(REPLACE(rsn, '-', ' '), '_', ' ')) = ?
      LIMIT 1
      `,
            [normalizedRsn],
        );
        if (existingUser && existingUser.discord_id !== discordId) {
            return await interaction.reply({
                content: `🚫 **Conflict:** ${profileLink} is already registered by <@${existingUser.discord_id}>. 🛡️`,
                flags: 64,
            });
        }
        const isRegistered = await getOne(
            `
      SELECT 1 FROM registered_rsn
      WHERE discord_id = ? AND LOWER(REPLACE(REPLACE(rsn, '-', ' '), '_', ' ')) = ?
      LIMIT 1
      `,
            [discordId, normalizedRsn],
        );
        if (isRegistered) {
            return await interaction.reply({
                content: `⚠️ **Notice:** ${profileLink} is already registered to your account. No action was taken. ✅`,
                flags: 64,
            });
        }
        try {
            await runQuery(
                `
        INSERT INTO registered_rsn (player_id, discord_id, rsn, registered_at)
        VALUES (?, ?, ?, ?)
        `,
                [womPlayerId, discordId, rsn, new Date().toISOString()],
            );

            await interaction.reply({
                content: `${loadingEmoji} Collecting player data for ${profileLink} \`(WOM ID: ${womPlayerId})\`...`,
                flags: 64,
            });
            await updatePlayerData(rsn, womPlayerId);

            await fetchAndProcessMember(guild, discordId);

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
                content: `✅ **Success!** The RSN ${profileLink} \`(WOM ID: ${womPlayerId})\` has been successfully registered to your account. 🏆`,
                flags: 64,
            });
            logger.info(`✅ RSN \`${rsn}\` (WOM ID: \`${womPlayerId}\`) successfully registered for user \`${discordId}\`.`);
        } catch (insertErr) {
            if (insertErr.message.includes('UNIQUE constraint failed')) {
                return await interaction.reply({
                    content: `🚫 **Oops!** The RSN ${profileLink} was just registered by someone else. Please choose another one. 🔄`,
                    flags: 64,
                });
            } else {
                throw insertErr;
            }
        }
    } catch (err) {
        logger.error(`❌ Error executing /rsn command: ${err.message}`);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: `❌ **Error:** An error occurred while registering \`${rsn}\`. Please try again later. 🛠️`,
                flags: 64,
            });
        } else {
            await interaction.reply({
                content: '❌ **Error:** Something went wrong while processing your request. Please try again later. 🛠️',
                flags: 64,
            });
        }
    }
};
