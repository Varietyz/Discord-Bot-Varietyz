/* eslint-disable jsdoc/require-returns */
/* eslint-disable no-unused-vars */
// @ts-nocheck
// src/modules/utils/embedUtils.js

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const logger = require('./logger');
const { getOne } = require('./dbUtils');

/**
 * Fetches the file path for the given metric from the database.
 * @param {string} metric - Metric name (e.g., 'agility').
 * @returns {Promise<string>} - The absolute file path.
 */
async function getImagePath(metric) {
    const row = await getOne('SELECT file_path FROM image_cache WHERE file_name = ?', [metric.toLowerCase()]);
    if (!row) {
        throw new Error(`Image for metric "${metric}" not found in the cache.`);
    }
    return row.file_path;
}

/**
 * Creates a competition embed with specified details.
 * @param {string} type - 'SOTW' or 'BOTW'.
 * @param {string} metric - Metric name.
 * @param {string} startsAt - ISO string for competition start time.
 * @param {string} endsAt - ISO string for competition end time.
 * @returns {Object} - The constructed embed and attachment.
 */
const createCompetitionEmbed = async (type, metric, startsAt, endsAt) => {
    const competitionTitle = type === 'SOTW' ? 'Skill of the Week' : 'Boss of the Week';

    // Fetch the image path from the cache
    const imagePath = await getImagePath(metric);

    // Create an attachment for the metric image
    const thumbnailAttachment = new AttachmentBuilder(imagePath, { name: `${metric}.png` });

    // Display name for the metric
    const displayMetric = metric
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

    const competitionDesc = `**Activity:** \`${displayMetric}\`\n\n` + `**Starts:**\n\`${new Date(startsAt).toUTCString()}\`\n` + `**Ends:**\n\`${new Date(endsAt).toUTCString()}\``;

    // Build the embed
    const embed = new EmbedBuilder()
        .setTitle(`**${competitionTitle}**`)
        .setDescription(competitionDesc)
        .setColor(type === 'SOTW' ? 0x3498db : 0xe74c3c)
        .setThumbnail(`attachment://${metric}.png`)
        .setFooter({ text: 'Select your preferred option from the dropdown menu to cast your vote.' })
        .setTimestamp();

    return { embed, thumbnailAttachment };
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
