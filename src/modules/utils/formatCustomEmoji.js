/* eslint-disable jsdoc/require-returns */
/**
 * Formats an emoji for easy usage (`<:name:id>` or `<a:name:id>` for animated)
 * @param {Object} emoji - The emoji object from Discord
 */
function formatCustomEmoji(emoji) {
    return emoji.animated ? `<a:${emoji.name}:${emoji.id}>` : `<:${emoji.name}:${emoji.id}>`;
}

module.exports = { formatCustomEmoji };
