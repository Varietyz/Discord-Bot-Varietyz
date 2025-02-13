require('dotenv').config();
const {
    guild: { getOne },
} = require('../modules/utils/essentials/dbUtils');
const logger = require('../modules/utils/essentials/logger');
const deasync = require('deasync');

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

/**
 *
 * @param table
 * @param column
 * @param key
 * @returns
 */
function fetchChannel(table, column, key) {
    let done = false;
    let result = null;
    getOne(`SELECT channel_id FROM ${table} WHERE ${column} = ?`, [key])
        .then((row) => {
            result = row ? row.channel_id : null;
            done = true;
        })
        .catch((err) => {
            logger.error(`Error fetching channel for ${key}:`, err);
            done = true;
        });
    // Block until done is true.
    deasync.loopWhile(() => !done);
    return result;
}

// Define your channel constants synchronously
const TOP_TEN_CHANNEL_ID = fetchChannel('comp_channels', 'comp_key', 'top_10_channel');
const HALL_OF_FAME_CHANNEL_ID = fetchChannel('comp_channels', 'comp_key', 'results_channel');
const BOTW_CHANNEL_ID = fetchChannel('comp_channels', 'comp_key', 'botw_channel');
const SOTW_CHANNEL_ID = fetchChannel('comp_channels', 'comp_key', 'sotw_channel');
const EVENTS_NOTIFICATIONS_CHANNEL_ID = fetchChannel('comp_channels', 'comp_key', 'notif_channel');

const MEMBER_CHANNEL_ID = fetchChannel('setup_channels', 'setup_key', 'clan_members_channel');
const ROLE_CHANNEL_ID = fetchChannel('setup_channels', 'setup_key', 'auto_roles_channel');
const VOICE_CHANNEL_ID = fetchChannel('setup_channels', 'setup_key', 'activity_voice_channel');
const NAME_CHANGE_CHANNEL_ID = fetchChannel('setup_channels', 'setup_key', 'name_changes_channel');

module.exports = {
    /**
     * @namespace GeneralBotConstants
     * @description General configuration constants for the Varietyz Bot.
     */
    APP_NAME: 'Varietyz Bot',
    COMMAND_PREFIX: '!',
    WOM_GROUP_ID: process.env.WOM_GROUP_ID,
    WOM_VERIFICATION: process.env.WOM_VERIFICATION,

    /**
     * @namespace ChannelIDs
     * @description Discord channel IDs used by the bot for various functionalities.
     */
    MEMBER_CHANNEL_ID,
    ROLE_CHANNEL_ID,
    VOICE_CHANNEL_ID,
    NAME_CHANGE_CHANNEL_ID,
    DEBUG_CHANNEL_ID: '1247116497373892710',
    CLAN_CHAT_CHANNEL_ID: '1223648768126222450',

    TOP_TEN_CHANNEL_ID,
    SOTW_CHANNEL_ID,
    BOTW_CHANNEL_ID,
    HALL_OF_FAME_CHANNEL_ID,
    EVENTS_NOTIFICATIONS_CHANNEL_ID,

    /**
     * @namespace
     * @description Clan rank hierarchy for easy sorting.
     */
    rankHierarchy,
};
