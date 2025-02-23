const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');
const logger = require('../essentials/logger');
const db = require('../essentials/dbUtils');
function normalizeString(str) {
    return str
        .toLowerCase()
        .trim()
        .replace(/[\s_-]+/g, '_');
}
async function getImagePath(metric) {
    try {
        const normalizedMetric = normalizeString(metric);
        const allEntries = await db.getAll('SELECT file_name, file_path FROM image_cache');
        const query = `
            SELECT file_path 
            FROM image_cache 
            WHERE REPLACE(TRIM(LOWER(file_name)), '-', '_') = ?
        `;
        const result = await db.getOne(query, [normalizedMetric]);

        if (!result) {
            logger.warn(`⚠️ No matching file path found for metric: "${normalizedMetric}"`);
            throw new Error(`No file path found for metric: "${metric}"`);
        }
        return result.file_path;
    } catch (err) {
        logger.error(`🚨 Error retrieving file path for metric "${metric}": ${err.message}`);
        throw err;
    }
}
const createCompetitionEmbed = async (client, type, metric, startsAt, endsAt, competitionId) => {
    let emojiFormat;
    if (type === 'SOTW') {
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
    return new ActionRowBuilder().addComponents(selectMenu);
};
module.exports = { createCompetitionEmbed, createVotingDropdown };