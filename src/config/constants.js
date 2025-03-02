require('dotenv').config();
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
    'specialist',
    'coordinator',
    'healer',
    'moderator',
    'administrator',
    'deputy owner',
    'owner',
];
const rankHierarchy = roleRange.reduce((acc, roleName, index) => {
    acc[roleName.toLowerCase()] = index;
    return acc;
}, {});

module.exports = {
    guestRank: 'pawn',
    WOM_GROUP_ID: process.env.WOM_GROUP_ID,
    WOM_VERIFICATION: process.env.WOM_VERIFICATION,
    DEBUG_CHANNEL_ID: '1247116497373892710',
    rankHierarchy,
};
