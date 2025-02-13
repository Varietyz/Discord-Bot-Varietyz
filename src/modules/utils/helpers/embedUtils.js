/* eslint-disable jsdoc/check-param-names */
/* eslint-disable max-len */
/* eslint-disable jsdoc/require-returns */
/* eslint-disable no-unused-vars */
// @ts-nocheck
// src/modules/utils/embedUtils.js

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');
const logger = require('../essentials/logger');
const db = require('../essentials/dbUtils');

/**
 * 🎯 **Normalizes a String for Comparison**
 *
 * Trims the input string, converts it to lowercase, and replaces spaces, dashes, and underscores
 * with a single underscore. Useful for standardizing metric names and other identifiers.
 *
 * @param {string} str - The string to normalize.
 * @returns {string} The normalized string.
 *
 * @example
 * const normalized = normalizeString('  My-Example_String  ');
 * // normalized === 'my_example_string'
 */
function normalizeString(str) {
    return str
        .toLowerCase()
        .trim()
        .replace(/[\s_-]+/g, '_');
}

/**
 * 🎯 **Retrieves the Image Path for a Given Metric**
 *
 * Looks up the file path for the provided metric name in the image cache database.
 * Uses normalization to improve matching and logs details for debugging.
 *
 * @async
 * @param {string} metric - The metric name to look up.
 * @returns {Promise<string>} The file path associated with the metric.
 * @throws {Error} Throws an error if the metric is not found.
 *
 * @example
 * const imagePath = await getImagePath('Mining');
 * console.log(imagePath);
 */
async function getImagePath(metric) {
    try {
        const normalizedMetric = normalizeString(metric);
        //logger.debug(`🔍 Looking up file path for normalized metric: "${normalizedMetric}"`);

        const allEntries = await db.getAll('SELECT file_name, file_path FROM image_cache');
        //logger.debug(`📊 Current database entries:\n${JSON.stringify(allEntries, null, 2)}`);

        const query = `
            SELECT file_path 
            FROM image_cache 
            WHERE REPLACE(TRIM(LOWER(file_name)), '-', '_') = ?
        `;
        //logger.debug(`🔗 Executing query: ${query}, with parameter: "${normalizedMetric}"`);
        const result = await db.getOne(query, [normalizedMetric]);

        if (!result) {
            logger.warn(`⚠️ No matching file path found for metric: "${normalizedMetric}"`);
            throw new Error(`No file path found for metric: "${metric}"`);
        }

        //logger.debug(`✅ Found file path: "${result.file_path}" for metric: "${normalizedMetric}"`);
        return result.file_path;
    } catch (err) {
        logger.error(`🚨 Error retrieving file path for metric "${metric}": ${err.message}`);
        throw err;
    }
}

/**
 * 🎯 **Creates a Competition Embed with Images and Voting Options**
 *
 * Builds an embed for a competition, complete with a thumbnail image, title, description,
 * time fields, and additional styling. The embed includes a clickable title linking to the competition page.
 *
 * @async
 * @param {Client} client - The Discord.js client.
 * @param {string} type - The competition type: 'SOTW' or 'BOTW'.
 * @param {string} metric - The metric name for the competition.
 * @param {string} startsAt - ISO-formatted start date of the competition.
 * @param {string} endsAt - ISO-formatted end date of the competition.
 * @param {string|number} competitionId - The unique identifier for the competition.
 * @returns {Promise<{ embeds: EmbedBuilder[], files: AttachmentBuilder[] }>} An object containing the embed and its attachments.
 *
 * @example
 * const { embeds, files } = await createCompetitionEmbed(client, 'SOTW', 'mining', '2023-03-01T12:00:00Z', '2023-03-08T23:59:00Z', 123);
 */
const createCompetitionEmbed = async (client, type, metric, startsAt, endsAt, competitionId) => {
    // Await the queries to get the emoji formats.
    let emojiFormat;
    if (type === 'SOTW') {
        // getAll returns an array; extract the first result.
        const overallEmojis = await db.guild.getAll('SELECT emoji_format FROM guild_emojis WHERE emoji_key = ?', ['emoji_overall']);
        emojiFormat = overallEmojis.length > 0 ? overallEmojis[0].emoji_format : '';
    } else {
        const slayerEmojis = await db.guild.getAll('SELECT emoji_format FROM guild_emojis WHERE emoji_key = ?', ['emoji_slayer']);
        emojiFormat = slayerEmojis.length > 0 ? slayerEmojis[0].emoji_format : '';
    }
    const competitionTitle = type === 'SOTW' ? `${emojiFormat} Skill of the Week` : `${emojiFormat} Boss of the Week`;
    const titleFallback = type === 'SOTW' ? '📊 Skill of the Week' : '🐉 Boss of the Week';
    const displayedTitle = competitionTitle.includes('<:') ? competitionTitle : titleFallback;

    const resourcesFolder = path.resolve(__dirname, '../../../resources');
    const imagePath = path.join(resourcesFolder, 'skills_bosses', `${metric.toLowerCase()}.png`);

    let imageAttachment;
    try {
        imageAttachment = new AttachmentBuilder(imagePath, { name: `${metric}.png` });
    } catch (err) {
        logger.warn(`⚠️ No image found for metric "${metric}". Using default image.`);
        imageAttachment = new AttachmentBuilder(path.join(resourcesFolder, 'default.png'), { name: 'default.png' });
    }

    let guild;
    try {
        guild = await client.guilds.fetch(process.env.GUILD_ID);
    } catch (err) {
        logger.warn(`⚠️ Failed to fetch guild. Reason: ${err.message}`);
        guild = null;
    }

    let metricEmoji = '';
    if (guild) {
        const normalizedMetric = metric.toLowerCase().replace(/\s+/g, '_');
        const foundEmoji = guild.emojis.cache.find((e) => e.name.toLowerCase() === normalizedMetric);

        if (foundEmoji && foundEmoji.available) {
            metricEmoji = foundEmoji.toString();
        } else {
            // Fallback if emoji is not found.
            metricEmoji = type === 'SOTW' ? emojiFormat : '⚔️';
            logger.warn(`⚠️ Custom emoji "${normalizedMetric}" not found or unavailable. Using fallback ${metricEmoji}`);
        }
    } else {
        logger.warn(`⚠️ Guild is undefined; cannot fetch emoji for metric: ${metric}`);
        metricEmoji = type === 'SOTW' ? emojiFormat : '⚔️';
    }

    const formattedMetric = metric
        .toLowerCase()
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    const start = formatTimestamp(startsAt);
    const end = formatTimestamp(endsAt);

    const embed = new EmbedBuilder()
        .setTitle(`**${displayedTitle}**`)
        .setURL(`https://wiseoldman.net/competitions/${competitionId}`)
        .setDescription(`## ${metricEmoji} [${formattedMetric}](https://oldschool.runescape.wiki/w/${metric})`)
        .addFields(
            {
                name: 'Start',
                value: `🕛 <t:${start.unixTimestamp}:t>\n📅 <t:${start.unixTimestamp}:D>\n⌛ <t:${start.unixTimestamp}:R>`,
                inline: true,
            },
            {
                name: 'Ends',
                value: `🕛 <t:${end.unixTimestamp}:t>\n📅 <t:${end.unixTimestamp}:D>\n⌛ <t:${end.unixTimestamp}:R>`,
                inline: true,
            },
        )
        .setColor(type === 'SOTW' ? 0x3498db : 0xe74c3c)
        .setThumbnail(`attachment://${metric}.png`)
        .setImage(type === 'SOTW' ? 'https://i.ibb.co/DP2F5L9/sotw-banner.png' : 'https://i.ibb.co/MGLHPrk/botw-banner.png');

    return { embeds: [embed], files: [imageAttachment] };
};

/**
 * 🎯 **Formats a Timestamp for Display**
 *
 * Converts an ISO date string into a human-readable object containing the day of the week,
 * formatted time, and formatted date in UTC.
 *
 * @param {string} dateString - The ISO date string.
 * @returns {Object} An object with `dayOfWeek`, `formattedTime`, and `formattedDate` properties.
 *
 * @example
 * const timestamp = formatTimestamp('2023-03-15T18:30:00Z');
 * console.log(timestamp.dayOfWeek); // e.g., "Wednesday"
 */
function formatTimestamp(dateString) {
    const date = new Date(dateString);
    const unixTimestamp = Math.floor(date.getTime() / 1000); // Convert to UNIX time (seconds)

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = days[date.getUTCDay()];

    const options = { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' };
    const formattedTime = date.toLocaleTimeString('en-US', options);

    const formattedDate = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

    return { dayOfWeek, formattedTime, formattedDate, unixTimestamp };
}

/**
 * 🎯 **Creates a Voting Dropdown Menu**
 *
 * Generates an ActionRow containing a StringSelectMenu for voting.
 * If no options are provided, returns a disabled menu with a placeholder message.
 *
 * @param {Array<Object>} options - An array of option objects with keys: label, description, value, and optionally voteCount.
 * @param {string} type - The competition type, used to customize the placeholder.
 * @returns {ActionRowBuilder} An action row containing the voting dropdown.
 *
 * @example
 * const dropdown = createVotingDropdown([
 * { label: 'Mining', description: 'Vote for Mining', value: 'mining', voteCount: 10 },
 * { label: 'Fishing', description: 'Vote for Fishing', value: 'fishing', voteCount: 5 }
 * ], 'SOTW');
 */
const createVotingDropdown = (options, type) => {
    if (!options || options.length === 0) {
        const selectMenu = new StringSelectMenuBuilder().setCustomId('vote_dropdown').setPlaceholder('⚠️ Voting is currently disabled').setDisabled(true);

        return new ActionRowBuilder().addComponents(selectMenu);
    }

    const dropdownOptions = options.map((opt) => {
        const votesText = opt.voteCount !== undefined ? `Votes: ${opt.voteCount}` : '';
        return {
            label: opt.label,
            description: `${opt.description}${votesText}`,
            value: opt.value,
        };
    });

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('vote_dropdown')
        .setPlaceholder(type === 'SOTW' ? '☝️ Select a skill to vote' : '☝️ Select a boss to vote')
        .addOptions(dropdownOptions);
    //logger.debug(`🎯 Competition type: ${type}`);
    return new ActionRowBuilder().addComponents(selectMenu);
};

module.exports = { createCompetitionEmbed, createVotingDropdown };
