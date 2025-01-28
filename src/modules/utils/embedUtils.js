/* eslint-disable jsdoc/require-returns */
/* eslint-disable no-unused-vars */
// @ts-nocheck
// src/modules/utils/embedUtils.js

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');
const logger = require('./logger');
const db = require('./dbUtils');
/**
 * Normalizes a string for comparison (e.g., trims spaces, converts to lowercase, replaces special characters).
 * @param {string} str - The string to normalize.
 * @returns {string} - The normalized string.
 */
function normalizeString(str) {
    return str
        .toLowerCase()
        .trim()
        .replace(/[\s_-]+/g, '_'); // Replace spaces, dashes, and underscores with a single underscore
}

/**
 * Retrieves the file path for a given metric from the database with detailed logging.
 * @param {string} metric - The metric name to look up.
 * @returns {Promise<string>} - The file path associated with the metric.
 * @throws {Error} - Throws an error if the metric is not found.
 */
async function getImagePath(metric) {
    try {
        // Normalize the input metric
        const normalizedMetric = normalizeString(metric);
        logger.debug(`Looking up file path for normalized metric: "${normalizedMetric}"`);

        // Fetch all entries for debugging purposes
        const allEntries = await db.getAll('SELECT file_name, file_path FROM image_cache');
        logger.debug(`Current database entries:\n${JSON.stringify(allEntries, null, 2)}`);

        // Query the database with enhanced normalization
        const query = `
            SELECT file_path 
            FROM image_cache 
            WHERE REPLACE(TRIM(LOWER(file_name)), '-', '_') = ?
        `;
        logger.debug(`Executing query: ${query}, with parameter: "${normalizedMetric}"`);
        const result = await db.getOne(query, [normalizedMetric]);

        if (!result) {
            logger.warn(`No matching file_path found for metric: "${normalizedMetric}"`);
            throw new Error(`No file path found for metric: "${metric}"`);
        }

        logger.debug(`Found file path: "${result.file_path}" for metric: "${normalizedMetric}"`);
        return result.file_path;
    } catch (err) {
        logger.error(`Error retrieving file path for metric "${metric}": ${err.message}`);
        throw err;
    }
}

/**
 * Creates a competition embed with attached images from the local `resources` folder.
 * @param {Client} client - The Discord.js client.
 * @param {string} type - Competition type: 'SOTW' or 'BOTW'.
 * @param {string} metric - The metric name.
 * @param {string} startsAt - ISO start date of the competition.
 * @param {string} endsAt - ISO end date of the competition.
 * @returns {Promise<{ embeds: EmbedBuilder[], files: AttachmentBuilder[] }>} - The embed and its attachments.
 */
const createCompetitionEmbed = async (client, type, metric, startsAt, endsAt) => {
    const competitionTitle = type === 'SOTW' ? 'Skill of the Week' : 'Boss of the Week';

    logger.debug(`Creating competition embed for metric: "${metric}"`);
    logger.debug(`Competition type: "${type}", Starts: "${startsAt}", Ends: "${endsAt}"`);

    // Path to the resources folder
    const resourcesFolder = path.resolve(__dirname, '../../resources');

    // Determine the file path for the thumbnail image
    const imagePath = path.join(resourcesFolder, 'skills_bosses', `${metric.toLowerCase()}.png`);
    logger.debug(`Resolved local image path: "${imagePath}"`);

    // Check if the file exists
    let imageAttachment;
    try {
        imageAttachment = new AttachmentBuilder(imagePath, { name: `${metric}.png` });
    } catch (err) {
        logger.warn(`No image found for metric "${metric}". Using default.`);
        imageAttachment = new AttachmentBuilder(
            path.join(resourcesFolder, 'default.png'), // Fallback image
            { name: 'default.png' },
        );
    }

    // Build the embed
    const embed = new EmbedBuilder()
        .setTitle(`**${competitionTitle}**`)
        .setDescription(`**Activity:** \`${metric.toUpperCase()}\`\n\n` + `**Starts:**\n\`${new Date(startsAt).toUTCString()}\`\n` + `**Ends:**\n\`${new Date(endsAt).toUTCString()}\``)
        .setColor(type === 'SOTW' ? 0x3498db : 0xe74c3c)
        .setThumbnail(`attachment://${metric}.png`) // Reference the attachment
        .setFooter({ text: 'Select your preferred option from the dropdown menu to cast your vote.' })
        .setTimestamp();

    // Return the embed and attachment
    return { embeds: [embed], files: [imageAttachment] };
};

/**
 *
 * @param participations
 * @param competitionType
 * @param guild
 */
function buildLeaderboardDescription(participations, competitionType, guild) {
    let desc = '';
    participations.slice(0, 10).forEach((p, idx) => {
        const gained = p.progress.gained.toLocaleString();
        const username = p.player.displayName;

        // Possibly do a DB lookup to find a discord mention if you want
        // let userDisplay = ...
        const userDisplay = username;

        // Add line
        desc += `**${idx + 1}.** ${userDisplay} — \`${gained}\`\n`;
    });
    return desc;
}

/**
 * Creates a voting dropdown menu with provided options.
 * Expects "options" to include a "voteCount" property if you want to display it.
 * @param {Array<Object>} options - Array of option objects
 * with shape { label, description, value, voteCount? }.
 * @returns {ActionRowBuilder} - The action row containing the select menu.
 */
const createVotingDropdown = (options) => {
    // If no options, handle gracefully
    if (!options || options.length === 0) {
        const selectMenu = new StringSelectMenuBuilder().setCustomId('vote_dropdown').setPlaceholder('No options available').setDisabled(true);

        return new ActionRowBuilder().addComponents(selectMenu);
    }

    // Map each item into the Discord.js SelectMenuOption format
    const dropdownOptions = options.map((opt) => {
        const votesText = opt.voteCount !== undefined ? ` (${opt.voteCount} votes)` : '';
        return {
            label: `${opt.label}${votesText}`, // e.g. "AGILITY (5 votes)"
            description: opt.description, // e.g. "Vote for AGILITY"
            value: opt.value, // e.g. "agility"
        };
    });

    const selectMenu = new StringSelectMenuBuilder().setCustomId('vote_dropdown').setPlaceholder('Select an option to vote').addOptions(dropdownOptions);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    return row;
};

module.exports = { createCompetitionEmbed, buildLeaderboardDescription, createVotingDropdown };
