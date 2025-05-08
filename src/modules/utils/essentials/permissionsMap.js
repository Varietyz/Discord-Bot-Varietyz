const { PermissionsBitField } = require('discord.js');

const permissionsMap = {

    publicReadOnly: (guild, role = null) => {
        const perms = [
            {
                id: guild.roles.everyone.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.ReadMessageHistory,
                ],
                deny: [PermissionsBitField.Flags.SendMessages],
            },
        ];
        if (role?.id) {
            perms.push({
                id: role.id,
                allow: [PermissionsBitField.Flags.SendMessages],
            });
        }
        return perms;
    },

    publicWrite: (guild) => [
        {
            id: guild.roles.everyone.id,
            allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory,
            ],
        },
    ],

    staffOnly: (guild, role = null) => {
        const admin = guild.roles.cache.find((r) =>
            r.permissions.has(PermissionsBitField.Flags.Administrator)
        );
        const perms = [
            {
                id: guild.roles.everyone.id,
                deny: [PermissionsBitField.Flags.ViewChannel],
            },
            {
                id: admin?.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                ],
            },
        ];
        if (role?.id) {
            perms.push({
                id: role.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                ],
            });
        }
        return perms;
    },

    modOnly: (guild, role = null) => {
        const mod = guild.roles.cache.find((r) =>
            r.name.toLowerCase().includes('mod')
        );
        const perms = [
            {
                id: guild.roles.everyone.id,
                deny: [PermissionsBitField.Flags.ViewChannel],
            },
            {
                id: mod?.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                ],
            },
        ];
        if (role?.id) {
            perms.push({
                id: role.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                ],
            });
        }
        return perms;
    },

    voiceReadNoJoin: (guild, role = null) => {
        const perms = [
            {
                id: guild.roles.everyone.id,
                allow: [PermissionsBitField.Flags.ViewChannel],
                deny: [PermissionsBitField.Flags.Connect],
            },
        ];
        if (role?.id) {
            perms.push({
                id: role.id,
                allow: [PermissionsBitField.Flags.Connect],
            });
        }
        return perms;
    },

    voiceSpeakOnly: (guild, role = null) => {
        const streamer = guild.roles.cache.find((r) =>
            r.name.toLowerCase().includes('streamer')
        );
        const perms = [
            {
                id: guild.roles.everyone.id,
                deny: [PermissionsBitField.Flags.Connect],
            },
            {
                id: streamer?.id,
                allow: [
                    PermissionsBitField.Flags.Connect,
                    PermissionsBitField.Flags.Speak,
                ],
            },
        ];
        if (role?.id) {
            perms.push({
                id: role.id,
                allow: [
                    PermissionsBitField.Flags.Connect,
                    PermissionsBitField.Flags.Speak,
                ],
            });
        }
        return perms;
    },

    readAndReactOnly: (guild, role = null) => {
        const perms = [
            {
                id: guild.roles.everyone.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.ReadMessageHistory,
                    PermissionsBitField.Flags.AddReactions,
                ],
                deny: [PermissionsBitField.Flags.SendMessages],
            },
        ];
        if (role?.id) {
            perms.push({
                id: role.id,
                allow: [PermissionsBitField.Flags.SendMessages],
            });
        }
        return perms;
    },

    feedbackWriteOnly: (guild, role = null) => {
        const perms = [
            {
                id: guild.roles.everyone.id,
                deny: [PermissionsBitField.Flags.ViewChannel],
            },
        ];
        if (role?.id) {
            perms.push({
                id: role.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                ],
            });
        }
        return perms;
    },

    teamOnly: (guild, role) => [
        {
            id: guild.roles.everyone.id,
            deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
            id: role?.id,
            allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
            ],
        },
    ],

    donatorOnly: (guild, role) => [
        {
            id: guild.roles.everyone.id,
            deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
            id: role?.id,
            allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.UseApplicationCommands,
                PermissionsBitField.Flags.SendMessages,
            ],
        },
    ],

    adultOnly: (guild, role = null) => {
        const r18 = guild.roles.cache.find((r) =>
            r.name.toLowerCase().includes('18+')
        );
        const perms = [
            {
                id: guild.roles.everyone.id,
                deny: [PermissionsBitField.Flags.ViewChannel],
            },
            {
                id: r18?.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                ],
            },
        ];
        if (role?.id) {
            perms.push({
                id: role.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                ],
            });
        }
        return perms;
    },

    designerOnly: (guild, role) => [
        {
            id: guild.roles.everyone.id,
            deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
            id: role?.id,
            allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.AttachFiles,
            ],
        },
    ],

    customRoleOnly: (guild, role) => [
        {
            id: guild.roles.everyone.id,
            deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
            id: role?.id,
            allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory,
            ],
        },
    ],

    verifiedReadOnly: (guild, role = null) => {

        const verifiedRole = guild.roles.cache.find((r) => r.name === 'Verified');
        const perms = [

            {
                id: guild.roles.everyone.id,
                deny: [PermissionsBitField.Flags.ViewChannel],
            },
        ];

        if (verifiedRole?.id) {
            perms.push({
                id: verifiedRole.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.ReadMessageHistory,
                ],
            });
        }

        if (role?.id) {
            perms.push({
                id: role.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.ReadMessageHistory,
                ],
            });
        }
        return perms;
    },

    verifiedWrite: (guild, role = null) => {
        const verifiedRole = guild.roles.cache.find((r) => r.name === 'Verified');
        const perms = [
            {
                id: guild.roles.everyone.id,
                deny: [PermissionsBitField.Flags.ViewChannel],
            },
        ];
        if (verifiedRole?.id) {
            perms.push({
                id: verifiedRole.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.ReadMessageHistory,
                    PermissionsBitField.Flags.SendMessages,
                ],
            });
        }
        if (role?.id) {
            perms.push({
                id: role.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.ReadMessageHistory,
                    PermissionsBitField.Flags.SendMessages,
                ],
            });
        }
        return perms;
    },

    verifiedReadReact: (guild, role = null) => {
        const verifiedRole = guild.roles.cache.find((r) => r.name === 'Verified');
        const perms = [
            {
                id: guild.roles.everyone.id,
                deny: [PermissionsBitField.Flags.ViewChannel],
            },
        ];
        if (verifiedRole?.id) {
            perms.push({
                id: verifiedRole.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.ReadMessageHistory,
                    PermissionsBitField.Flags.AddReactions,
                ],
                deny: [PermissionsBitField.Flags.SendMessages],
            });
        }
        if (role?.id) {
            perms.push({
                id: role.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.ReadMessageHistory,
                    PermissionsBitField.Flags.AddReactions,
                ],
                deny: [PermissionsBitField.Flags.SendMessages],
            });
        }
        return perms;
    },
    premiumOnly: (guild, role = null) => {

        const premiumRole = guild.roles.cache.find(
            (r) =>
                r.name.toLowerCase().includes('premium') ||
        r.name.toLowerCase().includes('supporter') ||
        r.name.toLowerCase().includes('patreon') ||
        r.name.toLowerCase().includes('booster')
        );

        const perms = [

            {
                id: guild.roles.everyone.id,
                deny: [PermissionsBitField.Flags.ViewChannel],
            },
        ];

        if (premiumRole?.id) {
            perms.push({
                id: premiumRole.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.ReadMessageHistory,
                    PermissionsBitField.Flags.SendMessages,
                ],
            });
        }

        if (role?.id) {
            perms.push({
                id: role.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.ReadMessageHistory,
                    PermissionsBitField.Flags.SendMessages,
                ],
            });
        }

        return perms;
    },
    clanOnly: (guild, role = null) => {
        const clanRole = guild.roles.cache.find((r) => r.name === 'Clan Member');
        const perms = [
            {
                id: guild.roles.everyone.id,
                deny: [PermissionsBitField.Flags.ViewChannel],
            },
        ];

        if (clanRole?.id) {
            perms.push({
                id: clanRole.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.ReadMessageHistory,
                    PermissionsBitField.Flags.SendMessages,
                ],
            });
        }

        if (role?.id) {
            perms.push({
                id: role.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.ReadMessageHistory,
                    PermissionsBitField.Flags.SendMessages,
                ],
            });
        }

        return perms;
    },
};

module.exports = { permissionsMap };
