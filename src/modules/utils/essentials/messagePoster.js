const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const logger = require('./logger');

let cachedMessages = null;

function loadChannelMessages() {
    if (!cachedMessages) {
        const filePath = path.join(
            __dirname,
            '../../../config/channelMessages.json'
        );
        if (!fs.existsSync(filePath)) {
            logger.warn(
                'No channelMessages.json found, skipping auto-post messages.'
            );
            cachedMessages = {};
        } else {
            const raw = fs.readFileSync(filePath, 'utf-8');
            cachedMessages = JSON.parse(raw);
        }
    }
    return cachedMessages;
}

async function postChannelMessage(channel, messageKey) {
    const messages = loadChannelMessages();
    const msgConfig = messages[messageKey];
    if (!msgConfig) {
        logger.warn(`No message config found for key: ${messageKey}`);
        return;
    }

    const { type, content, embed, reactions } = msgConfig;
    let sentMessage;

    let embedObj = null;
    if (type === 'embed' || type === 'both') {
        if (embed) {
            embedObj = new EmbedBuilder();

            if (embed.title) embedObj.setTitle(embed.title);
            if (embed.description) embedObj.setDescription(embed.description);
            if (embed.color !== undefined) embedObj.setColor(embed.color);
            if (embed.thumbnailUrl) embedObj.setThumbnail(embed.thumbnailUrl);
            if (embed.imageUrl) embedObj.setImage(embed.imageUrl);
            if (embed.footerText) embedObj.setFooter({ text: embed.footerText });
        }
    }

    const payload = {};
    if ((type === 'text' || type === 'both') && content) {
        payload.content = content;
    }
    if (embedObj) {
        payload.embeds = [embedObj];
    }

    try {
        sentMessage = await channel.send(payload);
        logger.info(`Posted initial message: ${messageKey} in #${channel.name}`);
    } catch (err) {
        logger.warn(
            `Failed to post messageKey:${messageKey} in #${channel.name} - ${err}`
        );
    }

    if (sentMessage && Array.isArray(reactions)) {
        for (const reaction of reactions) {
            try {
                await sentMessage.react(reaction);
            } catch (err) {
                logger.warn(
                    `Failed to add reaction ${reaction} for messageKey:${messageKey}: ${err}`
                );
            }
        }
    }
}

module.exports = {
    postChannelMessage,
    loadChannelMessages,
};
