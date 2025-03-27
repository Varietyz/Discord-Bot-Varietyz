// /modules/services/bingo/bingoinfodata.js

const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../../../utils/essentials/logger');
const { fetchChannel } = require('./handling/bingoEmbedHelper');
const { generateBingoCard } = require('../bingoImageGenerator');
const db = require('../../../utils/essentials/dbUtils');
const { getActiveEmbeds, createEmbedRecord, deleteEmbed } = require('./handling/bingoEmbedManager');
const readmeText = require('./bingoReadme');
const { getPatternDefinitionByKey } = require('../bingoPatternRecognition');

// We'll keep your existing code structure, but add a new function for
// building the "Bingo Patterns Reference" embed with fields for each pattern.
// Updated patternKeyMapping:
const patternKeyMapping = {
    line: 'row_0',
    multiple_lines: 'multiple_lines_rows_0_2',
    diagonal: 'diag_main',
    both_diagonals: 'both_diagonals',
    corners: 'corners',
    cross: 'cross',
    x_pattern: 'x_pattern_alternating', // or 'x_pattern_centered'
    outer_border: 'outer_border',
    full_board: 'full_board',
    checkerboard: 'checkerboard',
    inversed_checkerboard: 'inversed_checkerboard',
    zigzag: 'zigzag',
    diagonal_crosshatch: 'diagonal_crosshatch',
};

// Corrected buildActivePatternFields:
/**
 *
 * @param patternRows
 * @param numRows
 * @param numCols
 */
async function buildActivePatternFields(patternRows, numRows = 3, numCols = 5) {
    const fields = [];

    for (const p of patternRows) {
        const { pattern_key, created_at } = p;

        const jsKey = patternKeyMapping[pattern_key] || pattern_key;

        const definition = getPatternDefinitionByKey(jsKey, numRows, numCols) || {};
        const cells = definition.cells || [];

        const asciiGrid = generatePatternGrid(cells, numRows, numCols);

        fields.push({
            name: `${pattern_key}`,
            value: `\`\`\`\n${asciiGrid}\n\`\`\`<t:${Math.floor(new Date(created_at).getTime() / 1000)}:f>`,
            inline: true,
        });
    }

    return fields;
}

// 1) Our universal patterns reference as fields
/**
 *
 */
function getPatternsReferenceFields() {
    return [
        {
            name: 'Line (Rows)',
            value: '`40 pts`\n```\n✅ ✅ ✅ ✅ ✅\n❌ ❌ ❌ ❌ ❌\n❌ ❌ ❌ ❌ ❌\n```\n',
            inline: true,
        },
        {
            name: 'Line (Columns)',
            value: '`40 pts`\n```\n✅ ❌ ❌ ❌ ❌\n✅ ❌ ❌ ❌ ❌\n✅ ❌ ❌ ❌ ❌\n```',
            inline: true,
        },
        {
            name: 'Multiple Lines',
            value: '`120 pts`\n```\n✅ ✅ ✅ ✅ ✅\n✅ ✅ ✅ ✅ ✅\n❌ ❌ ❌ ❌ ❌\n```',
            inline: true,
        },

        {
            name: 'Main Diagonal',
            value: '`100 pts`\n```\n✅ ❌ ❌ ❌ ❌\n❌ ✅ ❌ ❌ ❌\n❌ ❌ ✅ ❌ ❌\n```',
            inline: true,
        },
        {
            name: 'Anti-Diagonal',
            value: '`100 pts`\n```\n❌ ❌ ❌ ❌ ✅\n❌ ❌ ❌ ✅ ❌\n❌ ❌ ✅ ❌ ❌\n```',
            inline: true,
        },
        {
            name: 'Both Diagonals X',
            value: '`220 pts`\n```\n✅ ❌ ❌ ❌ ✅\n❌ ✅ ❌ ✅ ❌\n✅ ❌ ✅ ❌ ❌\n```',
            inline: true,
        },

        {
            name: 'Four Corners',
            value: '`180 pts`\n```\n✅ ❌ ❌ ❌ ✅\n❌ ❌ ❌ ❌ ❌\n✅ ❌ ❌ ❌ ✅\n```',
            inline: true,
        },
        {
            name: 'Outer Border',
            value: '`600 pts`\n```\n✅ ✅ ✅ ✅ ✅\n✅ ❌ ❌ ❌ ✅\n✅ ✅ ✅ ✅ ✅\n```',
            inline: true,
        },
        {
            name: 'X (Alternating)',
            value: '`180 pts`\n```\n✅ ❌ ✅ ❌ ❌\n❌ ✅ ❌ ❌ ❌\n✅ ❌ ✅ ❌ ❌\n```',
            inline: true,
        },

        {
            name: 'X (Centered)',
            value: '`180 pts`\n```\n❌ ✅ ❌ ✅ ❌\n❌ ❌ ✅ ❌ ❌\n❌ ✅ ❌ ✅ ❌\n```',
            inline: true,
        },
        {
            name: 'Cross',
            value: '`260 pts`\n```\n❌ ❌ ✅ ❌ ❌\n✅ ✅ ✅ ✅ ✅\n❌ ❌ ✅ ❌ ❌\n```',
            inline: true,
        },
        {
            name: 'Zigzag',
            value: '`600 pts`\n```\n✅ ✅ ✅ ❌ ❌\n❌ ❌ ❌ ✅ ✅\n✅ ✅ ✅ ❌ ❌\n```',
            inline: true,
        },

        {
            name: 'Checkerboard',
            value: '`450 pts`\n```\n✅ ❌ ✅ ❌ ✅\n❌ ✅ ❌ ✅ ❌\n✅ ❌ ✅ ❌ ✅\n```',
            inline: true,
        },
        {
            name: 'Inversed Checker',
            value: '`450 pts`\n```\n❌ ✅ ❌ ✅ ❌\n✅ ❌ ✅ ❌ ✅\n❌ ✅ ❌ ✅ ❌\n```',
            inline: true,
        },
        {
            name: 'Full Board',
            value: '`1000 pts`\n```\n✅ ✅ ✅ ✅ ✅\n✅ ✅ ✅ ✅ ✅\n✅ ✅ ✅ ✅ ✅\n```',
            inline: true,
        },
    ];
}

// 2) Build a single embed for the patterns reference
/**
 *
 */
function buildPatternsReferenceEmbed() {
    const fields = getPatternsReferenceFields();

    const embed = new EmbedBuilder()
        .setTitle('🎲 Bingo Patterns Reference')
        .setDescription(
            `A comprehensive list of all possible Bingo patterns. 
Some events only activate certain ones, plus the mandatory Full Board.`,
        )
        .setColor(0x00bfff)
        .setTimestamp();

    fields.forEach((f) => embed.addFields(f));
    return embed;
}

// The rest is your existing code:

// Maximum character limit for a single embed description is ~4096.
const MAX_DESCRIPTION_CHARS = 4000;

// Helper to chunk text
/**
 *
 * @param text
 * @param maxLen
 */
function chunkText(text, maxLen) {
    const chunks = [];
    let current = '';

    for (const line of text.split('\n')) {
        if (current.length + line.length + 1 > maxLen) {
            chunks.push(current);
            current = line + '\n';
        } else {
            current += line + '\n';
        }
    }
    if (current.length) {
        chunks.push(current);
    }
    return chunks;
}

/**
 * Builds readme embeds where the last embed includes the active pattern fields.
 * @param {string[]} readmeChunks
 * @param {Array} patternFields
 * @param {number} eventId
 * @returns {EmbedBuilder[]} Array of embed builders.
 */
function buildReadmeEmbedsWithPatternFields(readmeChunks, patternFields, eventId) {
    const embedArray = [];
    readmeChunks.forEach((chunk, idx) => {
        const isLast = idx === readmeChunks.length - 1;
        const embed = new EmbedBuilder().setTitle(`Bingo Event #${eventId}`).setColor(0x3498db).setDescription(chunk.slice(0, MAX_DESCRIPTION_CHARS)).setTimestamp();
        if (isLast && patternFields.length > 0) {
            embed.addFields(patternFields);
        }
        embedArray.push(embed);
    });
    return embedArray;
}

/**
 * Generates a 3x5 ASCII grid from an array of {row, col} cells.
 * Marked cells are represented with ✅; unmarked with ❌.
 * @param {Array} cells
 * @param {number} numRows
 * @param {number} numCols
 * @returns {string}
 */
function generatePatternGrid(cells, numRows = 3, numCols = 5) {
    let result = '';

    for (let row = 0; row < numRows; row++) {
        let rowStr = '';
        for (let col = 0; col < numCols; col++) {
            const marked = cells.some((cell) => cell.row === row && cell.col === col);
            rowStr += marked ? '✅' : '❌';
            // Only add a space if this isn't the last column
            if (col < numCols - 1) {
                rowStr += ' ';
            }
        }
        result += rowStr;
        if (row < numRows - 1) result += '\n';
    }

    return result;
}

/**
 * Refreshes the Bingo Info Embed by deleting any old embed messages for a previous event
 * (assumed to be eventId - 1). If none are found, it deletes embeds for the current event.
 * Then, it resends updated embeds and the bingo card image.
 *
 * @param {number} eventId - The current event ID.
 * @param {object} client - The Discord client instance.
 */
async function refreshBingoInfoEmbed(eventId, client) {
    try {
        logger.info(`[BingoInfoData] 🔄 DELETING and RESENDING all Bingo Info Embeds and Card for event #${eventId}`);

        // Fetch the appropriate channel.
        const channel = await fetchChannel(client, 'bingo_card_channel');
        if (!channel) {
            logger.error('[BingoInfoData] ❌ Channel not found.');
            return;
        }

        // Fetch the board ID associated with this event.
        const boardRow = await db.getOne('SELECT board_id FROM bingo_state WHERE event_id=?', [eventId]);
        if (!boardRow) {
            logger.warn(`[BingoInfoData] ❌ No board found for event #${eventId}`);
            return;
        }
        const boardId = boardRow.board_id;

        // 🎲 Generate the Bingo card image buffer.
        const bingoCardBuffer = await generateBingoCard(boardId, boardId, false);
        if (!bingoCardBuffer) {
            logger.error(`[BingoInfoData] ❌ ERROR: Bingo card generation failed for board ID=${boardId}`);
            return;
        }

        // ✅ Prepare the image attachment.
        const cardAttachment = new AttachmentBuilder(bingoCardBuffer, { name: 'bingo_card.png' });

        // ✅ Ensure patterns are correctly loaded.
        const patternRows = await db.getAll('SELECT pattern_key, created_at FROM bingo_pattern_rotation WHERE event_id=?', [eventId]);
        const patternFields = await buildActivePatternFields(patternRows, 3, 5);

        const readmeChunks = chunkText(readmeText, MAX_DESCRIPTION_CHARS);
        const infoEmbeds = buildReadmeEmbedsWithPatternFields(readmeChunks, patternFields, eventId);

        // ✅ Remove the image from the first embed (since we're sending it separately).
        if (infoEmbeds.length > 0) {
            infoEmbeds[0].setImage(null);
        }

        // ✅ Build the Universal Patterns Embed.
        const universalPatternsEmbed = buildPatternsReferenceEmbed();

        // 🔥 **DELETE ALL OLD MESSAGES BEFORE RESENDING**
        // First, attempt to delete embeds from the previous event (eventId - 1).
        // If no embeds are found for the previous event, then delete using the current event id.
        const previousEventId = eventId - 1;
        const messageTypes = ['bingo_info', 'bingo_patterns', 'bingo_image'];

        for (const type of messageTypes) {
            let oldEmbeds = await getActiveEmbeds(previousEventId, type);
            if (!oldEmbeds || oldEmbeds.length === 0) {
                // If no previous event embeds found, try current event embeds.
                oldEmbeds = await getActiveEmbeds(eventId, type);
            }
            for (const embed of oldEmbeds) {
                await deleteEmbed(client, embed.channel_id, embed.message_id, embed.embed_id);
                logger.info(`Deleted embed ${embed.embed_id} from channel ${embed.channel_id} (event ${embed.event_id})`);
            }
        }

        logger.info('[BingoInfoData] ✅ OLD MESSAGES DELETED for previous or current event. Now resending.');

        // ✅ Resend the first embed (without an image).
        const mainMessage = await channel.send({ embeds: [infoEmbeds[0]] });
        await createEmbedRecord(eventId, null, null, null, mainMessage.id, channel.id, 'bingo_info');

        // ✅ Resend the Bingo Card Image as a separate message.
        const imageMessage = await channel.send({ files: [cardAttachment] });
        await createEmbedRecord(eventId, null, null, null, imageMessage.id, channel.id, 'bingo_image');

        // ✅ Resend remaining Bingo Info Embeds (continuation of details).
        for (let i = 1; i < infoEmbeds.length; i++) {
            const extraMessage = await channel.send({ embeds: [infoEmbeds[i]] });
            await createEmbedRecord(eventId, null, null, null, extraMessage.id, channel.id, 'bingo_info');
        }

        // ✅ Resend Universal Patterns Embed.
        const patternsMessage = await channel.send({ embeds: [universalPatternsEmbed] });
        await createEmbedRecord(eventId, null, null, null, patternsMessage.id, channel.id, 'bingo_patterns');

        logger.info(`[BingoInfoData] ✅ SUCCESS: Deleted & Resent ALL Bingo Info Embeds and Card for event #${eventId}`);
    } catch (err) {
        logger.error(`[BingoInfoData] ❌ ERROR: ${err.message}`);
    }
}

module.exports = {
    refreshBingoInfoEmbed,
    buildActivePatternFields,
};
