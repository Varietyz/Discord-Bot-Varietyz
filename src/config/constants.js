require('dotenv').config();

/**
 * @fileoverview
 * **Constants for Varietyz Bot** ⚙️
 *
 * Defines and exports all constant values used throughout the Varietyz Bot.
 * This module includes general bot configurations, Discord channel IDs, WOM API settings,
 * rate limiting configurations, and role definitions with associated emojis and colors.
 *
 * **Core Features:**
 * - Provides the bot's name and command prefix.
 * - Defines Discord channel IDs for various functionalities.
 * - Establishes a rank hierarchy and maps role names to their respective hierarchy indices.
 * - Specifies detailed role definitions with associated emojis and hexadecimal color codes.
 *
 * **External Dependencies:**
 * - **Discord.js**: For managing interactions with Discord.
 * - **Luxon**: For date and time manipulations.
 *
 * @module config/constants
 */

/**
 * Represents the hierarchy of roles based on their rank names.
 * Lower index indicates a lower rank.
 *
 * @constant {Array<string>}
 */
const roleRange = [
    'guest',
    'bronze',
    'iron',
    'steel',
    'mithril',
    'adamant',
    'rune',
    'dragon',
    'onyx',
    'zenyte',
    'legend',
    'myth',
    'tztok',
    'tzkal',
    'soul',
    'wild',
    'quester',
    'looter',
    'helper',
    'competitor',
    'special',
    'bingo jury',
    'nurse',
    'moderator',
    'administrator',
    'deputy owner',
    'owner',
];

/**
 * Maps each role name to its hierarchy index for quick reference.
 *
 * @constant {Object.<string, number>}
 */
const rankHierarchy = roleRange.reduce((acc, roleName, index) => {
    acc[roleName.toLowerCase()] = index;
    return acc;
}, {});

module.exports = {
    /**
     * @namespace GeneralBotConstants
     * @description General configuration constants for the Varietyz Bot.
     */
    WOM_GROUP_ID: process.env.WOM_GROUP_ID,
    WOM_VERIFICATION: process.env.WOM_VERIFICATION,

    /**
     * @namespace ChannelIDs
     * @description Discord channel IDs used by the bot for various functionalities.
     */
    DEBUG_CHANNEL_ID: '1247116497373892710',

    /**
     * @namespace
     * @description Clan rank hierarchy for easy sorting.
     */
    rankHierarchy,
};
