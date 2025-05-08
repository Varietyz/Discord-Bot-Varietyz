const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../../../utils/essentials/logger');
const { fetchChannel } = require('./handling/bingoEmbedHelper');
const { generateBingoCard } = require('../bingoImageGenerator');
const db = require('../../../utils/essentials/dbUtils');
const { getActiveEmbeds, createEmbedRecord, deleteEmbed } = require('./handling/bingoEmbedManager');
const readmeText = require('./bingoReadme');
const { getPatternDefinitionByKey } = require('../bingoPatternRecognition');

const patternKeyMapping = {
    line: 'row_0',
    multiple_lines: 'multiple_lines_rows_0_2',
    diagonal: 'diag_main',
    both_diagonals: 'both_diagonals',
    corners: 'corners',
    cross: 'cross',
    x_pattern: 'x_pattern_alternating', 
    outer_border: 'outer_border',
    full_board: 'full_board',
    checkerboard: 'checkerboard',
    inversed_checkerboard: 'inversed_checkerboard',
    zigzag: 'zigzag',
    diagonal_crosshatch: 'diagonal_crosshatch',
};

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

const MAX_DESCRIPTION_CHARS = 4000;

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

function generatePatternGrid(cells, numRows = 3, numCols = 5) {
    let result = '';

    for (let row = 0; row < numRows; row++) {
        let rowStr = '';
        for (let col = 0; col < numCols; col++) {
            const marked = cells.some((cell) => cell.row === row && cell.col === col);
            rowStr += marked ? '✅' : '❌';

            if (col < numCols - 1) {
                rowStr += ' ';
            }
        }
        result += rowStr;
        if (row < numRows - 1) result += '\n';
    }

    return result;
}

async function refreshBingoInfoEmbed(eventId, client) {
    try {
        logger.info(`[BingoInfoData] 🔄 DELETING and RESENDING all Bingo Info Embeds and Card for event #${eventId}`);

        const channel = await fetchChannel(client, 'bingo_card_channel');
        if (!channel) {
            logger.error('[BingoInfoData] ❌ Channel not found.');
            return;
        }

        const boardRow = await db.getOne('SELECT board_id FROM bingo_state WHERE event_id=?', [eventId]);
        if (!boardRow) {
            logger.warn(`[BingoInfoData] ❌ No board found for event #${eventId}`);
            return;
        }
        const boardId = boardRow.board_id;

        const bingoCardBuffer = await generateBingoCard(boardId, boardId, false);
        if (!bingoCardBuffer) {
            logger.error(`[BingoInfoData] ❌ ERROR: Bingo card generation failed for board ID=${boardId}`);
            return;
        }

        const cardAttachment = new AttachmentBuilder(bingoCardBuffer, { name: 'bingo_card.png' });

        const patternRows = await db.getAll('SELECT pattern_key, created_at FROM bingo_pattern_rotation WHERE event_id=?', [eventId]);
        const patternFields = await buildActivePatternFields(patternRows, 3, 5);

        const readmeChunks = chunkText(readmeText, MAX_DESCRIPTION_CHARS);
        const infoEmbeds = buildReadmeEmbedsWithPatternFields(readmeChunks, patternFields, eventId);

        if (infoEmbeds.length > 0) {
            infoEmbeds[0].setImage(null);
        }

        const universalPatternsEmbed = buildPatternsReferenceEmbed();

        const previousEventId = eventId - 1;
        const messageTypes = ['bingo_info', 'bingo_patterns', 'bingo_image'];

        for (const type of messageTypes) {
            let oldEmbeds = await getActiveEmbeds(previousEventId, type);
            if (!oldEmbeds || oldEmbeds.length === 0) {

                oldEmbeds = await getActiveEmbeds(eventId, type);
            }
            for (const embed of oldEmbeds) {
                await deleteEmbed(client, embed.channel_id, embed.message_id, embed.embed_id);
                logger.info(`Deleted embed ${embed.embed_id} from channel ${embed.channel_id} (event ${embed.event_id})`);
            }
        }

        logger.info('[BingoInfoData] ✅ OLD MESSAGES DELETED for previous or current event. Now resending.');

        const mainMessage = await channel.send({ embeds: [infoEmbeds[0]] });
        await createEmbedRecord(eventId, null, null, null, mainMessage.id, channel.id, 'bingo_info');

        const imageMessage = await channel.send({ files: [cardAttachment] });
        await createEmbedRecord(eventId, null, null, null, imageMessage.id, channel.id, 'bingo_image');

        for (let i = 1; i < infoEmbeds.length; i++) {
            const extraMessage = await channel.send({ embeds: [infoEmbeds[i]] });
            await createEmbedRecord(eventId, null, null, null, extraMessage.id, channel.id, 'bingo_info');
        }

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
