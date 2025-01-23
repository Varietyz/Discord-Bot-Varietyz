// @ts-nocheck
/**
 * @fileoverview Defines the `/rsnlist` slash command for the Varietyz Bot.
 * This command retrieves and displays all registered RuneScape Names (RSNs) along with their associated ranks for clan members.
 *
 * @module modules/commands/rsnlist
 */

const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const { normalizeRSN, getRankEmoji } = require('../utils');
const logger = require('../functions/logger');
const { getAll } = require('../../utils/dbUtils'); // Importing dbUtils functions

/**
 * Validates whether the embed description size is within Discord's allowed limit.
 *
 * @function isValidEmbedSize
 * @param {string} embedDescription - The content of the embed's description.
 * @param {number} [maxDescriptionLength=4096] - The maximum allowed length for the embed description.
 * @returns {boolean} - Returns `true` if the description size is valid, `false` otherwise.
 * @example
 * const isValid = isValidEmbedSize("Some description text", 4096);
 * logger.info(isValid); // true
 */
function isValidEmbedSize(embedDescription, maxDescriptionLength = 4096) {
    return embedDescription.length <= maxDescriptionLength;
}

/**
 * Loads all registered RSNs from the database.
 *
 * @async
 * @function loadRSNData
 * @returns {Promise<Object.<string, string[]>>} - A promise that resolves to an object where keys are user IDs and values are arrays of RSNs.
 * @example
 * const rsnData = await loadRSNData();
 * logger.info(rsnData);
 * // Output: { '123456789012345678': ['PlayerOne', 'PlayerTwo'], '876543210987654321': ['PlayerThree'] }
 */
const loadRSNData = async () => {
    const rows = await getAll('SELECT user_id, rsn FROM registered_rsn');
    const rsnData = {};
    rows.forEach((row) => {
        if (!rsnData[row.user_id]) rsnData[row.user_id] = [];
        rsnData[row.user_id].push(row.rsn);
    });
    // @ts-ignore
    return rsnData;
};

/**
 * Loads all clan members from the database.
 *
 * @async
 * @function loadClanMembers
 * @returns {Promise<Array<{ name: string, rank: string }>>} - A promise that resolves to an array of clan member objects.
 * @example
 * const clanMembers = await loadClanMembers();
 * logger.info(clanMembers);
 * // Output: [ { name: 'PlayerOne', rank: 'Iron' }, { name: 'PlayerTwo', rank: 'Gold' } ]
 */
const loadClanMembers = async () => {
    return await getAll('SELECT name, rank FROM clan_members');
};

/**
 * Prepares the embed content for a user by formatting their RSNs and associated ranks.
 *
 * @function prepareUserContent
 * @param {string} userId - The Discord user ID.
 * @param {string[]} rsns - An array of RSNs linked to the user.
 * @param {Array<{ name: string, rank: string }>} clanMembers - An array of clan member objects.
 * @returns {string} - A formatted string containing the user's mention and their RSNs with ranks.
 * @example
 * const content = prepareUserContent('123456789012345678', ['PlayerOne'], [{ name: 'PlayerOne', rank: 'Iron' }]);
 * logger.info(content);
 * // Output:
 * // "\n<@123456789012345678>\n- 🟦[PlayerOne](https://wiseoldman.net/players/playerone)\n"
 */
function prepareUserContent(userId, rsns, clanMembers) {
    const userTag = `\n<@${userId}>`;
    const rsnContent = rsns
        .map((rsn) => {
            const normalizedRSN = normalizeRSN(rsn);
            const member = clanMembers.find((member) => normalizeRSN(member.name) === normalizedRSN);
            const rank = member ? member.rank : '';
            const emoji = member ? getRankEmoji(rank) : '';
            const profileLink = `https://wiseoldman.net/players/${encodeURIComponent(rsn.replace(/ /g, '%20').toLowerCase())}`;

            return rank ? `- ${emoji}[${rsn}](${profileLink})` : `- [${rsn}](${profileLink})`;
        })
        .join('\n');

    return `${userTag}\n${rsnContent}\n`;
}

/**
 * Defines the `/rsnlist` slash command using Discord's SlashCommandBuilder.
 *
 * @constant {SlashCommandBuilder}
 * @example
 * // This command can be registered with Discord's API
 * const rsnListCommand = module.exports.data;
 */
module.exports.data = new SlashCommandBuilder().setName('rsnlist').setDescription('View all registered RSNs and their associated ranks for clan members.').setDefaultMemberPermissions(1); // Administrator permissions

/**
 * Executes the `/rsnlist` command, fetching and displaying all registered RSNs and their ranks.
 *
 * @async
 * @function execute
 * @param {Discord.CommandInteraction} interaction - The interaction object representing the command execution.
 * @returns {Promise<void>} - Resolves when the command has been executed.
 * @example
 * // Handler in your bot's command execution logic
 * if (commandName === 'rsnlist') {
 * await commands.rsnlist.execute(interaction);
 * }
 */
module.exports.execute = async (interaction) => {
    try {
        logger.info(`Command 'rsnlist' triggered by user: ${interaction.user.username}`);
        await interaction.deferReply({ flags: 64 }); // Ephemeral reply

        logger.info('Loading RSN data and clan members...');
        const rsnData = await loadRSNData(); // Load RSN data from DB
        const clanMembers = await loadClanMembers(); // Load clan members from DB

        logger.info(`Loaded ${Object.keys(rsnData).length} RSN entries.`);
        logger.info(`Loaded ${clanMembers.length} clan members.`);

        if (Object.keys(rsnData).length === 0) {
            const embed = new EmbedBuilder().setTitle('No RSNs Registered').setDescription('⚠️ No RSNs are currently registered. Use `/rsn` to register your first one! 📝').setColor('Red');
            logger.info('No RSNs are registered. Sending embed to user.');
            return await interaction.editReply({ embeds: [embed], flags: 64 });
        }

        const MAX_EMBED_DESCRIPTION = 4096;
        const MAX_EMBEDS_PER_MESSAGE = 10;

        let embeds = [];
        let currentEmbedDescription = '';
        let isFirstEmbed = true;

        logger.info('Iterating through RSN data to prepare embed content...');

        for (const [userId, rsns] of Object.entries(rsnData)) {
            const userInfoContent = prepareUserContent(userId, rsns, clanMembers);

            logger.debug(`Generated userInfoContent for userId: ${userId}`);
            logger.debug(`Content size: ${userInfoContent.length}`);

            if (!isValidEmbedSize(currentEmbedDescription + userInfoContent, MAX_EMBED_DESCRIPTION)) {
                const embed = new EmbedBuilder().setDescription(currentEmbedDescription).setColor('Green');

                if (isFirstEmbed) {
                    embed.setTitle('Registered RSNs');
                    isFirstEmbed = false; // Subsequent embeds will not have a title
                }

                logger.info('Adding new embed due to size constraint.');
                embeds.push(embed);
                currentEmbedDescription = userInfoContent;

                if (embeds.length === MAX_EMBEDS_PER_MESSAGE) {
                    logger.info(`Sending batch of ${embeds.length} embeds.`);
                    try {
                        await interaction.followUp({ embeds, flags: 64 });
                    } catch (followUpError) {
                        logger.error(`❌ Failed to send a batch of embeds: ${followUpError.message}. 🛠️`);
                    }
                    embeds = [];
                }
            } else {
                currentEmbedDescription += userInfoContent;
            }
        }

        if (currentEmbedDescription) {
            const finalEmbed = new EmbedBuilder().setDescription(currentEmbedDescription).setColor('Green');
            if (isFirstEmbed) {
                finalEmbed.setTitle('Registered RSNs');
            }
            embeds.push(finalEmbed);
        }

        for (const embed of embeds) {
            try {
                logger.info('📦 Sending a grouped embed to the user...');
                await interaction.followUp({ embeds: [embed], flags: 64 });
            } catch (error) {
                logger.error(`❌ Error occurred while sending a grouped embed: ${error.message}. ⚠️`);
            }
        }
    } catch (err) {
        logger.error(`Error executing rsnlist command: ${err.message}`);
        await interaction.editReply({
            content: '❌ An error occurred while executing the command. Please try again later. 🛠️',
            flags: 64,
        });
    }
};
