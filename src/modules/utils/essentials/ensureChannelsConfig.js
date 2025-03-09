/**
 * channelConfigs.js
 *
 * This file exports:
 * 1) A permissionsMap object that provides reusable sets of permissionOverwrites.
 * 2) An array of categoryConfigs, each specifying a categoryName, optional categoryPermissionsKey,
 *    and the channels that belong in it.
 * 3) An array of noCategoryChannels for channels that should be created at the top level (no category).
 */

const { PermissionsBitField } = require('discord.js');

/**
 * A reusable map of permission overwrites.
 * Each key returns a function that takes `guild` and returns an array of permissionOverwrites.
 */
const permissionsMap = {
    /**
     * 1) Everyone read-only (can see, can read history, cannot send).
     * @param guild
     */
    everyoneReadOnly: (guild) => [
        {
            id: guild.roles.everyone.id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory],
            deny: [PermissionsBitField.Flags.SendMessages],
        },
    ],

    /**
     * 2) Everyone hidden (cannot see the channel).
     * @param guild
     */
    everyoneHidden: (guild) => [
        {
            id: guild.roles.everyone.id,
            deny: [PermissionsBitField.Flags.ViewChannel],
        },
    ],

    /**
     * 3) Live Gains channels:
     *    - Everyone: can view, read, react, but cannot send or create threads.
     *    - Admins: can send/manage messages.
     * @param guild
     */
    liveGainsChannels: (guild) => {
        const adminRole = guild.roles.cache.find((r) => r.permissions.has(PermissionsBitField.Flags.Administrator));
        return [
            {
                id: guild.roles.everyone.id,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.AddReactions],
                deny: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.CreatePublicThreads, PermissionsBitField.Flags.CreatePrivateThreads, PermissionsBitField.Flags.SendMessagesInThreads],
            },
            {
                id: adminRole?.id,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageMessages],
            },
        ];
    },

    /**
     * 4) Logging channels:
     *    - Everyone: hidden
     *    - Admins: full read/write
     * @param guild
     */
    loggingChannels: (guild) => {
        const adminRole = guild.roles.cache.find((r) => r.permissions.has(PermissionsBitField.Flags.Administrator));
        return [
            {
                id: guild.roles.everyone.id,
                deny: [PermissionsBitField.Flags.ViewChannel],
            },
            {
                id: adminRole?.id,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
            },
        ];
    },

    /**
     * 5) Voice channel where everyone can see but cannot connect.
     * @param guild
     */
    voiceDenyConnect: (guild) => [
        {
            id: guild.roles.everyone.id,
            allow: [PermissionsBitField.Flags.ViewChannel],
            deny: [PermissionsBitField.Flags.Connect],
        },
    ],
};

/**
 * An array of categories, each with:
 *  - categoryName
 *  - optional categoryPermissionsKey (permissions for the category itself)
 *  - channels[]: a list of channels to create in that category
 */
const categoryConfigs = [
    {
        categoryName: '🏆∙Competitions of the Week',
        categoryPermissionsKey: null, // no special overwrites at the category level
        channels: [
            {
                key: 'top_10_channel',
                name: '🏅∙top-10',
                topic: 'Displays the top 10 rankings for weekly competitions.',
                type: 'GuildAnnouncement',
                permissionsKey: 'everyoneReadOnly',
            },
            {
                key: 'results_channel',
                name: '🏅∙results',
                topic: 'Logs and announces the overall results for weekly competitions.',
                type: 'GuildAnnouncement',
                permissionsKey: 'everyoneReadOnly',
            },
            {
                key: 'botw_channel',
                name: '🏆∙bosses🦖',
                topic: 'Holds data and results for the Boss of the Week competition.',
                type: 'GuildAnnouncement',
                permissionsKey: 'everyoneReadOnly',
            },
            {
                key: 'sotw_channel',
                name: '🏆∙skills📊',
                topic: 'Holds data and results for the Skill of the Week competition.',
                type: 'GuildAnnouncement',
                permissionsKey: 'everyoneReadOnly',
            },
            {
                key: 'notif_channel',
                name: '🏆∙notifications',
                topic: 'Broadcasts notifications and updates for weekly competitions.',
                type: 'GuildAnnouncement',
                permissionsKey: 'everyoneReadOnly',
            },
        ],
    },
    {
        categoryName: '🌐 ‣ Live Gains',
        categoryPermissionsKey: 'everyoneHidden', // hide the category from everyone
        channels: [
            {
                key: 'clanchat_channel',
                name: '💬‣‣-clan-chat',
                topic: 'Logs clanchat webhook.\nUse \'/clanchat_tutorial\' to learn how to keep this channel up to date.',
                type: 'GuildAnnouncement',
                permissionsKey: 'liveGainsChannels',
            },
            {
                key: 'clue_scrolls_channel',
                name: '📜‣‣-clue-scrolls',
                topic: 'Sends ingame actions via webhook.\nUse \'/live_gains_tutorial\' for adding yourself to tracking.',
                type: 'GuildAnnouncement',
                permissionsKey: 'liveGainsChannels',
            },
            {
                key: 'collection_log_channel',
                name: '📖‣‣-collection-log',
                topic: 'Sends ingame actions via webhook.\nUse \'/live_gains_tutorial\' for adding yourself to tracking.',
                type: 'GuildAnnouncement',
                permissionsKey: 'liveGainsChannels',
            },
            {
                key: 'deaths_channel',
                name: '💀‣‣-deaths',
                topic: 'Sends ingame actions via webhook.\nUse \'/live_gains_tutorial\' for adding yourself to tracking.',
                type: 'GuildAnnouncement',
                permissionsKey: 'liveGainsChannels',
            },
            {
                key: 'levels_channel',
                name: '📊‣‣-levels',
                topic: 'Sends ingame actions via webhook.\nUse \'/live_gains_tutorial\' for adding yourself to tracking.',
                type: 'GuildAnnouncement',
                permissionsKey: 'liveGainsChannels',
            },
            {
                key: 'drops_channel',
                name: '💰‣‣-drops',
                topic: 'Sends ingame actions via webhook.\nUse \'/live_gains_tutorial\' for adding yourself to tracking.',
                type: 'GuildAnnouncement',
                permissionsKey: 'liveGainsChannels',
            },
            {
                key: 'pets_channel',
                name: '🐶‣‣-pets',
                topic: 'Sends ingame actions via webhook.\nUse \'/live_gains_tutorial\' for adding yourself to tracking.',
                type: 'GuildAnnouncement',
                permissionsKey: 'liveGainsChannels',
            },
            {
                key: 'quests_channel',
                name: '🧭‣‣-quests',
                topic: 'Sends ingame actions via webhook.\nUse \'/live_gains_tutorial\' for adding yourself to tracking.',
                type: 'GuildAnnouncement',
                permissionsKey: 'liveGainsChannels',
            },
        ],
    },
    {
        categoryName: '📁 ‣‣ Logging',
        categoryPermissionsKey: 'everyoneHidden', // hide the category from everyone
        channels: [
            {
                key: 'transcripts',
                name: '📋‣-‣transcripts',
                topic: 'Stores chat transcripts.',
                type: 'GuildAnnouncement',
                permissionsKey: 'loggingChannels',
            },
            {
                key: 'moderation_logs',
                name: '📋‣-‣moderation-logs',
                topic: 'Logs bans, kicks, mutes, and warnings.',
                type: 'GuildAnnouncement',
                permissionsKey: 'loggingChannels',
            },
            {
                key: 'message_logs',
                name: '📋‣-‣message-logs',
                topic: 'Tracks message edits and deletions.',
                type: 'GuildAnnouncement',
                permissionsKey: 'loggingChannels',
            },
            {
                key: 'member_logs',
                name: '📋‣-‣member-logs',
                topic: 'Logs member joins, leaves, and role changes.',
                type: 'GuildAnnouncement',
                permissionsKey: 'loggingChannels',
            },
            {
                key: 'role_logs',
                name: '📋‣-‣role-logs',
                topic: 'Tracks role creations, deletions, and updates.',
                type: 'GuildAnnouncement',
                permissionsKey: 'loggingChannels',
            },
            {
                key: 'server_logs',
                name: '📋‣-‣server-logs',
                topic: 'Records important server changes.',
                type: 'GuildAnnouncement',
                permissionsKey: 'loggingChannels',
            },
            {
                key: 'channel_logs',
                name: '📋‣-‣channel-logs',
                topic: 'Logs channel creations, deletions, and updates.',
                type: 'GuildAnnouncement',
                permissionsKey: 'loggingChannels',
            },
            {
                key: 'voice_logs',
                name: '📋‣-‣voice-logs',
                topic: 'Tracks voice channel joins, leaves, and mutes.',
                type: 'GuildAnnouncement',
                permissionsKey: 'loggingChannels',
            },
            {
                key: 'invite_logs',
                name: '📋‣-‣invite-logs',
                topic: 'Logs invite link creations and uses.',
                type: 'GuildAnnouncement',
                permissionsKey: 'loggingChannels',
            },
            {
                key: 'thread_logs',
                name: '📋‣-‣thread-logs',
                topic: 'Tracks thread creations, deletions, and updates.',
                type: 'GuildAnnouncement',
                permissionsKey: 'loggingChannels',
            },
            {
                key: 'reacted_logs',
                name: '📋‣-‣reacted-logs',
                topic: 'Tracks message reactions.',
                type: 'GuildAnnouncement',
                permissionsKey: 'loggingChannels',
            },
            {
                key: 'event_logs',
                name: '📋‣-‣event-logs',
                topic: 'Logs member profile events in the server.',
                type: 'GuildAnnouncement',
                permissionsKey: 'loggingChannels',
            },
            {
                key: 'stage_logs',
                name: '📋‣-‣stage-logs',
                topic: 'Logs stage channel updates.',
                type: 'GuildAnnouncement',
                permissionsKey: 'loggingChannels',
            },
            {
                key: 'boost_logs',
                name: '📋‣-‣boost-logs',
                topic: 'Tracks when members boost the server.',
                type: 'GuildAnnouncement',
                permissionsKey: 'loggingChannels',
            },
            {
                key: 'bot_logs',
                name: '📋‣-‣bot-logs',
                topic: 'Logs bot actions and errors.',
                type: 'GuildAnnouncement',
                permissionsKey: 'loggingChannels',
            },
            {
                key: 'database_logs',
                name: '📋‣-‣database-logs',
                topic: 'Logs database actions.',
                type: 'GuildAnnouncement',
                permissionsKey: 'loggingChannels',
            },
            {
                key: 'critical_alerts',
                name: '🚨‣-‣critical-alerts🚨',
                topic: 'Logs critical alerts from database and unresolved actions.',
                type: 'GuildAnnouncement',
                permissionsKey: 'loggingChannels',
            },
        ],
    },
    {
        categoryName: '🎲∙Bingoooo',
        categoryPermissionsKey: null, // no special overwrites at the category level
        channels: [
            {
                key: 'bingo_notification_channel',
                name: '📢∙-task-completions',
                topic: '📢 Real-time updates and notifications for task completions.',
                type: 'GuildAnnouncement',
                permissionsKey: 'everyoneReadOnly',
            },
            {
                key: 'bingo_card_channel',
                name: '📖∙-bingo-info',
                topic: '📖 Learn about the bingo, how it works and how to participate.',
                type: 'GuildAnnouncement',
                permissionsKey: 'everyoneReadOnly',
            },
            {
                key: 'bingo_leaderboard_channel',
                name: '🏆∙-bingo-leaderboard',
                topic: '🏆 Current Bingo leaderboard and who’s leading the event!',
                type: 'GuildAnnouncement',
                permissionsKey: 'everyoneReadOnly',
            },
            {
                key: 'bingo_patterns_channel',
                name: '📊∙-pattern-completion',
                topic: '📊 Track team and individual pattern progress with real-time updates.',
                type: 'GuildAnnouncement',
                permissionsKey: 'everyoneReadOnly',
            },
        ],
    },
];

/**
 * An array of channels that do NOT belong to any category.
 */
const noCategoryChannels = [
    {
        key: 'clan_members_channel',
        name: '📖∙-ingame-clannies',
        topic: 'Displays the clan members.',
        type: 'GuildAnnouncement',
        permissionsKey: 'everyoneReadOnly',
    },
    {
        key: 'name_change_channel',
        name: '🔃∙-name-changes',
        topic: 'Logs and announces the name changes.',
        type: 'GuildAnnouncement',
        permissionsKey: 'everyoneReadOnly',
    },
    {
        key: 'auto_roles_channel',
        name: '🔃∙-auto-roles',
        topic: 'Logs and announces the automatic role changes.',
        type: 'GuildAnnouncement',
        permissionsKey: 'everyoneReadOnly',
    },
    {
        key: 'activity_voice_channel',
        name: '⌛loading..',
        // For voice channels, no "topic" is displayed in Discord, but you can store a purpose in this field
        topic: 'Voice channel for activity status — read-only to everyone, no connect.',
        type: 'GuildVoice',
        permissionsKey: 'voiceDenyConnect',
    },
];

module.exports = {
    permissionsMap,
    categoryConfigs,
    noCategoryChannels,
};
