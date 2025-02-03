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
    APP_NAME: 'Varietyz Bot',
    COMMAND_PREFIX: '!',
    WOM_GROUP_ID: process.env.WOM_GROUP_ID,
    WOM_VERIFICATION: process.env.WOM_VERIFICATION,

    /**
     * @namespace ChannelIDs
     * @description Discord channel IDs used by the bot for various functionalities.
     */
    MEMBER_CHANNEL_ID: '1330366250953740288',
    NAME_CHANNEL_ID: '1240749320538427515',
    ROLE_CHANNEL_ID: '1227268636180353034',
    VOICE_CHANNEL_ID: '1225068669130903603',
    NAME_CHANGE_CHANNEL_ID: '1126619522871341106',
    DEBUG_CHANNEL_ID: '1247116497373892710',
    CLAN_CHAT_CHANNEL_ID: '1223648768126222450',

    SOTW_CHANNEL_ID: '1280229698642903255',
    BOTW_CHANNEL_ID: '1282072131835924534',
    HALL_OF_FAME_CHANNEL_ID: '1282300691750195366',
    EVENTS_NOTIFICATIONS_CHANNEL_ID: '1126623272956592298',
    TOP_TEN_CHANNEL_ID: '1282383006291591188',

    /**
     * @namespace rankHierarchy
     * @description Clan rank hierarchy for easy sorting.
     */
    rankHierarchy,

    /**
     * @typedef {Object} Rank
     * @property {string} emoji - The emoji associated with the rank.
     * @property {string} role - The name of the Discord role.
     * @property {number} color - The hexadecimal color code for the role.
     */

    /**
     * @namespace Ranks
     * @description Definitions for various roles within the Discord server, including associated emojis and colors.
     * @type {Object.<string, Rank>}
     */
    RANKS: {
        owner: {
            emoji: '<:Clan_icon__Owner:1223270860152901816>',
            role: 'Owner',
            color: 0xffff00, // Yellow
        },
        'deputy owner': {
            emoji: '<:Deputy_owner:1223270849474203689>',
            role: 'Deputy owner',
            color: 0xdfefd6, // Pale Green
        },
        administrator: {
            emoji: '<:Administrator:1223270845099675708>',
            role: 'Administrator',
            color: 0xeea143, // Sandy Brown
        },
        moderator: {
            emoji: '<:Moderator:1223270857133129770>',
            role: 'Moderator',
            color: 0xfffbc3, // Light Yellow
        },
        private: {
            emoji: '<:Private:1223270938037194906>',
            role: 'Private',
            color: 0x3f3f3f, // Very Dark Gray
        },
        healer: {
            emoji: '<:Healer:1241140696912494704>',
            role: 'Nurse',
            color: 0x178c51, // Medium Sea Green
        },
        coordinator: {
            emoji: '<:Coordinator:1223270848035557428>',
            role: 'Bingo Jury',
            color: 0x443310, // Dark Brown
        },
        specialist: {
            emoji: '<:Specialist:1223270868218806292>',
            role: 'Special',
            color: 0xe42801, // Red Orange
        },
        bronze: {
            emoji: '<:Bronze:1223270846630727720>',
            role: 'Bronze',
            color: 0x9c643a, // Bronze
        },
        iron: {
            emoji: '<:Iron:1223270853488148571>',
            role: 'Iron',
            color: 0x565958, // Dark Gray
        },
        steel: {
            emoji: '<:Steel:1223270942302670948>',
            role: 'Steel',
            color: 0x9c9c9c, // Light Gray
        },
        mithril: {
            emoji: '<:Mithril:1223270855522517112>',
            role: 'Mithril',
            color: 0x4441bf, // Dark Blue
        },
        adamant: {
            emoji: '<:Adamant:1223270842868174858>',
            role: 'Adamant',
            color: 0x258f4a, // Forest Green
        },
        rune: {
            emoji: '<:Rune:1223270864477360190>',
            role: 'Rune',
            color: 0x368eb4, // Steel Blue
        },
        dragon: {
            emoji: '<:Dragon:1223270851244327063>',
            role: 'Dragon',
            color: 0xbe2532, // Fire Brick Red
        },
        onyx: {
            emoji: '<:Onyx:1223270858974564352>',
            role: 'Onyx',
            color: 0x151515, // Onyx
        },
        zenyte: {
            emoji: '<:Zenyte:1223270871892889610>',
            role: 'Zenyte',
            color: 0xe47a1a, // Orange
        },
        legend: {
            emoji: '<:Legend:1268229372226048083>',
            role: 'Legend',
            color: 0xd7debd, // Light Green
        },
        myth: {
            emoji: '<:Myth:1268229429973356544>',
            role: 'Myth',
            color: 0x2884c2, // Blue
        },
        tztok: {
            emoji: '<:TzTok:1268230116987899934>',
            role: 'TzTok',
            color: 0xfec102, // Bright Yellow
        },
        tzkal: {
            emoji: '<:TzKal:1268230240451166369>',
            role: 'TzKal',
            color: 0xc4550b, // Dark Red
        },
        soul: {
            emoji: '<:Soul:1268234576640213083>',
            role: 'Soul',
            color: 0xa8aef1, // Light Purple
        },
        competitor: {
            emoji: '<:Competitor:1268230428276424736>',
            role: 'Competitor',
            color: 0x48de6f, // Green
        },
        helper: {
            emoji: '<:Helper:1268230490075299951>',
            role: 'Helper',
            color: 0xf0e23a, // Bright Yellow
        },
        looter: {
            emoji: '<:Looter:1268230549676359710>',
            role: 'Looter',
            color: 0xa40cc5, // Purple
        },
        quester: {
            emoji: '<:Quester:1268230607540850689>',
            role: 'Quester',
            color: 0x3a7fdc, // Medium Blue
        },
        wild: {
            emoji: '<:Wild:1268230647265362073>',
            role: 'Wild',
            color: 0x434343, // Grey
        },
    },
};
