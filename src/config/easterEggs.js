/**
 * @fileoverview
 * **Easter Egg Responses for RSNs** 🎉
 *
 * This module defines a set of Easter egg responses for special RuneScape Names (RSNs).
 * For each key (RSN in lowercase), it provides a unique title, description, and color.
 * These responses are used to generate fun or themed messages when a user registers or queries one of these legendary RSNs.
 *
 * **Core Features:**
 * - Maps specific RSNs to unique titles, descriptions, and colors.
 * - Provides responses for well-known RSNs such as **Zezima**, **Woox**, and **Durial321**.
 * - Supports various colored responses to match the iconic status of each RSN.
 *
 * @module config/easterEggs
 */

/**
 * @typedef {Object} EasterEgg
 * @property {string} title - The title to display for the RSN.
 * @property {string} description - The description or message associated with the RSN.
 * @property {number} color - The color code (in hexadecimal) used for styling responses.
 */

/**
 * An object mapping special RSNs (in lowercase) to their Easter egg responses.
 * @type {Object.<string, EasterEgg>}
 */

module.exports = {
    easterEggs: {
        zezima: {
            title: '🌟 Zezima',
            description: 'Oh, **Zezima**? Shooting for the stars, huh? This name’s staying with the legend. 😂',
            color: 0xffd700, // Gold color
        },
        durial321: {
            title: '⚔️ Durial321',
            description: 'Trying **Durial321**? Unless you’re reenacting the Falador Massacre, you’re no villain here. Next! 😅',
            color: 0xff4500, // Orange-red color
        },
        bluerose13x: {
            title: '🔧 Bluerose13x',
            description: '**Bluerose13x**—RuneScape’s OG smith. Unless you’re smelting history, let’s keep it in the past. 🛠️',
            color: 0x1e90ff, // Blue
        },
        'the old nite': {
            title: '🕊️ The Old Nite',
            description: 'Unless you’re inspiring the entire RuneScape world like **The Old Nite**, this RSN’s sacred ground. Move along. 🌙',
            color: 0x696969, // Dark gray
        },
        's u o m i': {
            title: '💎 S U O M I',
            description: '**SUOMI** climbed Everest (or the XP equivalent). You, however, might be stuck at Tutorial Island. 🏋️',
            color: 0x00ffff, // Cyan
        },
        woox: {
            title: '👑 Woox',
            description: '**Woox** didn’t set PvM records for someone else to take the glory. Stick to fighting goblins for now. 🔥',
            color: 0xff4500, // Orange-red
        },
        swampletics: {
            title: '🌿 Swampletics',
            description: 'A Morytania-only Ironman with no bank? Unless you’re pulling a Swampletics 2.0, try another name. 🌲',
            color: 0x2e8b57, // Dark green
        },
        rendi: {
            title: '🎨 Rendi',
            description: '**Rendi** mastered glitches and chaos. If your best trick is forgetting to eat, this name’s not for you. 🌪️',
            color: 0x9370db, // Purple
        },
        'cursed you': {
            title: '😈 Cursed You',
            description: 'Thinking of stealing **Cursed You**? Unless you’re dominating PvP, this name stays with the king. 💀',
            color: 0xdc143c, // Crimson
        },
        framed: {
            title: '🗞️ Framed',
            description: 'Unless you’re narrating epic PK tales like **Framed**, this name isn’t for you. 🔥',
            color: 0x008080, // Teal
        },
        'sparc mac': {
            title: '💥 Sparc Mac',
            description: 'Unless you’ve got PvP montages ready to upload, **Sparc Mac** is way out of your league. 😉',
            color: 0xff6347, // Tomato
        },
        'matt k': {
            title: '📜 Matt K',
            description: 'If you can’t commit to hours of skilling grind, **Matt K** isn’t your vibe. Stick to chopping willows, rookie. 🌳',
            color: 0x4682b4, // Steel blue
        },
        tehnoobshow: {
            title: '🎥 TehNoobShow',
            description: 'GUTHHHIIIIIIIIIIIIIIIXXXXXXXXXXXXX!!!!!!!!!!!!!!!!!!!!!!!!',
            color: 0xffd700, // Gold
        },
        nightmarerh: {
            title: '🌙 NightmareRH',
            description: '**NightmareRH** set the standard for fiery rants. Unless you’re going full chaos, this name isn’t yours. 😡',
            color: 0xff6347, // Red-orange
        },
        '3 hit u': {
            title: '⚔️ 3 Hit U',
            description: '**3 Hit U** owned the Duel Arena. Unless you’re planning to one-shot everyone, step away from the legend. 💪',
            color: 0x8b0000, // Dark red
        },
        kingduffy: {
            title: '👑 Kingduffy',
            description: '**Kingduffy** ruled RuneScape. Unless you’re planning a hostile leaderboard takeover, this isn’t your name. 👑',
            color: 0xffd700, // Gold
        },
        exact: {
            title: '🎯 Exact',
            description: 'Soloing raids blindfolded? No? Then **Exact** isn’t your name. Stick to quest bosses. 🕹️',
            color: 0x2f4f4f, // Dark slate gray
        },
        forsberg888: {
            title: '🪓 Forsberg888',
            description: 'Chopping yews for hours on end? Unless you’re matching **Forsberg888**, this name’s not yours. 🪓',
            color: 0x228b22, // Forest green
        },
        jebrim: {
            title: '🏃 Jebrim',
            description: '**Jebrim** lived rooftops and shortcuts. Unless you love rooftops more than loot, stick to running errands. 🏅',
            color: 0x00ff7f, // Spring green
        },
        'chris archie': {
            title: '📽️ Chris Archie',
            description: 'Unless you’re creating iconic PK montages, **Chris Archie** isn’t for you. Stick to watching highlights! 🎬',
            color: 0xffd700, // Gold
        },
        kempq: {
            title: '⚡ KempQ',
            description: 'Unless you’re mastering PKing with style, **KempQ** isn’t your name. Move along! ⚔️',
            color: 0x8b0000, // Dark red
        },
        drumgun: {
            title: '🎯 Drumgun',
            description: 'Relentless grinding? Unless you’re hitting 200 million XP milestones back-to-back, leave **Drumgun** alone. 🏆',
            color: 0x8b0000, // Dark red
        },
        zarfot: {
            title: '📈 Zarfot',
            description: '**Zarfot** turned skilling into an art form. Unless you’ve got efficiency calculators for breakfast, this name’s off-limits. 🛠️',
            color: 0x00ced1, // Dark turquoise
        },
        syzygy: {
            title: '🚀 Syzygy',
            description: 'Dominating hiscores with efficiency like **Syzygy**? No? Stick to your basic skilling plans. 📊',
            color: 0xffa500, // Orange
        },
        alkan: {
            title: '🔥 Alkan',
            description: '**Alkan** was maxing while you were still figuring out how to bank. Respect the grind. 🏋️',
            color: 0xff4500, // Orange-red
        },
        hexis: {
            title: '🌟 Hexis',
            description: 'Skilling legends belong to **Hexis**. Unless you’re leading a clan XP race, this name isn’t for you. 👑',
            color: 0x32cd32, // Lime green
        },
        foot: {
            title: '🧠 Foot',
            description: '**Foot** doesn’t just play RuneScape; he rewrites the meta. Unless you love rooftops, leave the name. ⚙️',
            color: 0x00bfff, // Deep sky blue
        },
        b0aty: {
            title: '🎣 B0aty',
            description: 'Unless you’re ready to dominate PvM and Ironman like **B0aty**, keep fishing for another name. 🎣',
            color: 0xff4500, // Orange-red
        },
        'a friend': {
            title: '🤝 A Friend',
            description: '**A Friend** taught us everything from PvM to money-making. Unless you’re sharing knowledge, this isn’t your name. 📚',
            color: 0x4682b4, // Steel blue
        },
        torvesta: {
            title: '⚔️ Torvesta',
            description: 'Unless you’re keeping PvP alive like **Torvesta**, this RSN’s out of reach. Time to train! 🏹',
            color: 0xff4500, // Orange-red
        },
        settled: {
            title: '🌌 Settled',
            description: '**Settled** reinvented storytelling with Swampletics. Unless you’re crafting an epic tale, this name isn’t yours. 🌿',
            color: 0x2e8b57, // Dark green
        },
        faux: {
            title: '🌟 Faux',
            description: 'Chill, educational, and legendary—that’s **Faux**. Unless you’re bringing the vibes, pick another name. 🎓',
            color: 0x00ff7f, // Spring green
        },
        perp: {
            title: '🎭 Perp',
            description: '**Perp** took challenges to a whole new level. Unless you’re redefining gameplay, leave it. 🎮',
            color: 0xffd700, // Gold
        },
        elvemage: {
            title: '✨ Elvemage',
            description: 'Hybrid PKing innovator **Elvemage** doesn’t share his name. Stick to PvP practice, champ. 🛡️',
            color: 0x00ffff, // Cyan
        },
        'bonesaw pker': {
            title: '🦴 Bonesaw Pker',
            description: 'PKing royalty **Bonesaw Pker** deserves respect. Unless you’re a wilderness veteran, step aside. 💀',
            color: 0x8b0000, // Dark red
        },
        'sk8r boi pk': {
            title: '🛹 SK8R BOI PK',
            description: '**SK8R BOI PK** defined early PvP. Unless you’re revolutionizing the Wilderness, this name’s not yours. ⚔️',
            color: 0x1e90ff, // Blue
        },
        imahama: {
            title: '🐟 iMahama',
            description: 'A pure PKing legend. Unless your strategy is flawless, you’re not living up to **iMahama**. 🎯',
            color: 0x32cd32, // Lime green
        },
        gabe: {
            title: '🎲 Gabe',
            description: '**Gabe** ruled the Duel Arena. Unless you’re ready to stake it all, this name isn’t yours. 🎲',
            color: 0xff6347, // Tomato
        },
        sparky: {
            title: '🌟 Sparky',
            description: 'Bringing humor to the RuneScape world? Unless you’re matching **Sparky**, leave the jokes aside. 🎭',
            color: 0xffd700, // Gold
        },
        'ice poseidon': {
            title: '❄️ Ice Poseidon',
            description: '**Ice Poseidon** brought OSRS to the mainstream. Controversy not included. Proceed cautiously. ☃️',
            color: 0x4682b4, // Steel blue
        },
        fantasy: {
            title: '🌌 Fantasy',
            description: '**Fantasy** paved the way for RuneScape Classic creators. Unless you’re teaching PvP strategies, skip this name. 🛡️',
            color: 0x8b0000, // Dark red
        },
        'lynx titan': {
            title: '💪 Lynx Titan',
            description: 'Maxed 200M XP in every skill? Unless you’re planning to rewrite OSRS leaderboards, step away from **Lynx Titan**. 🏆',
            color: 0xffd700, // Gold
        },
        tks: {
            title: '🐟 Tks',
            description: 'Unless you’re cooking and fishing like it’s 2001, **Tks** isn’t the name for you. Stick to shrimp, buddy. 🎣',
            color: 0x4682b4, // Steel blue
        },
        rab: {
            title: '👑 Rab',
            description: '**Rab**, the first to ever step foot in Gielinor back when it was DeviousMUD. Your adventure might be epic, but it’s no first-of-its-kind. Leave this one for the original trailblazer. 🌟',
            color: 0xdaa520, // Goldenrod
        },
    },
};
