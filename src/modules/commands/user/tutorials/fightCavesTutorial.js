/* eslint-disable max-len */
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('../../../utils/essentials/logger');

module.exports = {
    data: new SlashCommandBuilder().setName('fight_caves_tutorial').setDescription('A comprehensive guide to conquering the TzHaar Fight Cave and earning the Fire Cape!'),

    async execute(interaction) {
        try {
            await interaction.deferReply({ flags: 64 });

            // Main Navigation Buttons (max 5 per row)
            const mainButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('overview').setLabel('🏆 Overview').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('gear').setLabel('🛡️ Gear').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('waves').setLabel('🌊 Waves').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('monsters').setLabel('👹 Monsters').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('jad').setLabel('🔥 TzTok-Jad').setStyle(ButtonStyle.Primary),
            );

            const mainButtons2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('tips').setLabel('💡 Tips').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('insights').setLabel('🏆 Insights').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('resources').setLabel('📜 Resources').setStyle(ButtonStyle.Secondary),
            );

            // Gear Navigation Buttons split into two rows (5 buttons in first row, 1 Back button in second)
            const gearButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('gear_ranged').setLabel('🏹 Ranged').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('gear_melee').setLabel('⚔️ Melee').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('gear_magic').setLabel('✨ Magic').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('gear_pure').setLabel('🔥 Pure').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('gear_iron').setLabel('🛡️ Iron').setStyle(ButtonStyle.Primary),
            );
            const gearBackButton = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('back').setLabel('⬅️ Back').setStyle(ButtonStyle.Secondary));

            // Embed 1: Overview
            const embedOverview = new EmbedBuilder()
                .setTitle('🔥 Fight Caves Tutorial: Overview')
                .setDescription(
                    'Welcome to the **TzHaar Fight Cave** guide! \n\n' +
                        '🏰 **Location:** Deep within the Karamja Volcano\n' +
                        '🎯 **Objective:** Survive 63 waves of increasingly difficult monsters to face **TzTok-Jad** and earn the coveted **Fire Cape**.\n\n' +
                        'This guide covers recommended gear, detailed wave & monster strategies, key tips, and external resources—designed for both new and experienced players.',
                )
                .setColor(0x3498db)
                .setFooter({ text: 'Fight Caves Tutorial • Overview' })
                .setTimestamp();

            // ───── RANGED SETUP ─────────────────────────────────────────────
            const embedGearRanged = new EmbedBuilder().setTitle('🏹 Recommended Ranged Setup for Fight Cave').setColor(0x2ecc71).setFooter({ text: 'Fight Caves Tutorial • Ranged Setup' }).setTimestamp().addFields(
                {
                    name: '🪖 Head',
                    value: '**1.** `Slayer helmet (i)` (on task) / `Black mask (i)` (on task)\n**2.** `Masori mask (f)`\n**3.** `Masori mask` / `Crystal helm`\n**4.** `Blessed coif` / `Archer helm`\n**5.** `Neitiznot faceguard` / `Helm of Neitiznot`',
                    inline: false,
                },
                {
                    name: '📿 Neck',
                    value: '**1.** `Necklace of anguish`\n**2.** `Dragonbone necklace` / `Bonecrusher necklace`\n**3.** `Amulet of fury`\n**4.** `Amulet of glory`\n**5.** `Stole`',
                    inline: false,
                },
                {
                    name: '🎒 Back',
                    value: '**1.** `Dizana\'s quiver`\n**2.** `Ava\'s Assembler` (or best Ava\'s Device)\n**3.** `Ranging cape (t)`\n**4.** `Vestment cloak`\n**5.** `Ardougne cloak 4`',
                    inline: false,
                },
                {
                    name: '👕 Body',
                    value: '**1.** `Masori body (f)`\n**2.** `Crystal body`\n**3.** `Blessed body`\n**4.** `Karil\'s Leathertop`\n**5.** `Black d\'hide body`',
                    inline: false,
                },
                {
                    name: '👖 Legs',
                    value: '**1.** `Masori chaps (f)`\n**2.** `Crystal legs`\n**3.** `Blessed chaps`\n**4.** `Karil\'s Leatherskirt`\n**5.** `Black d\'hide chaps`',
                    inline: false,
                },
                {
                    name: '⚔️ Weapon',
                    value: '**1.** `Toxic Blowpipe & Twisted Bow`\n**2.** `Bow of Faerdhinen`\n**3.** `Zaryte Crossbow` / `Armald Crossbow`\n**4.** `Dragon Crossbow` / `Karil\'s Crossbow` / `Rune Crossbow`\n**5.** `Magic Shortbow (i)` / `Crystal Bow`',
                    inline: false,
                },
                {
                    name: '🛡️ Shield',
                    value: '**1.** `Twisted Buckler`\n**2.** `Dragonfire Ward`\n**3.** `Odium Ward`\n**4.** `Crystal Shield` / `Blessed Spirit Shield`\n**5.** `Toktz-ket-xil` / `Dragon Kiteshield`',
                    inline: false,
                },
                {
                    name: '📜 Ammo/Spell',
                    value: '**1.** `Rada\'s Blessing 4` / `Dragon Arrow & Dragon Dart` (for Toxic Blowpipe)\n**2.** `Any Blessing` / `Amethyst Arrow & Amethyst Dart`\n**3.** `Broad bolts` / `Diamond bolts (e)` / `Bolt racks` / `Rune Arrow`',
                    inline: false,
                },
                {
                    name: '👐 Hands',
                    value: '**1.** `Zaryte Vambraces`\n**2.** `Barrows Gloves`\n**3.** `Blessed Vambraces`\n**4.** `Dragon Gloves`\n**5.** `Regen Bracelet`',
                    inline: false,
                },
                {
                    name: '👢 Boots',
                    value: '**1.** `Pegasian Boots`\n**2.** `Blessed Boots`\n**3.** `Aranea Boots`\n**4.** `Ranger Boots`\n**5.** `Mixed Hide Boots`',
                    inline: false,
                },
                {
                    name: '💍 Ring',
                    value: '**1.** `Venator Ring` / `Lightbearer` (if using Blowpipe)\n**2.** `Archer\'s Ring (i)`\n**3.** `Ring of Suffering (i)`\n**4.** `Ring of the Gods (i)`\n**5.** `Ring of Shadows` / `Granite Ring (i)` / `Explorer\'s Ring 4`',
                    inline: false,
                },
                {
                    name: '📦 Inventory Suggestions',
                    value: '**1.** `2–3 Bastion potions`\n**2.** `6–8 Saradomin Brews`\n**3.** Fill remaining slots with `Super Restores/Prayer Potions` (~1:3 restore-to-brew ratio)\n**4.** A weapon to autocast `blood spells` (for healing off Tz-Keks)',
                    inline: false,
                },
            );

            // ───── MELEE SETUP ──────────────────────────────────────────────
            const embedGearMelee = new EmbedBuilder().setTitle('⚔️ Recommended Melee Setup for Fight Cave').setColor(0xe74c3c).setFooter({ text: 'Fight Caves Tutorial • Melee Setup' }).setTimestamp().addFields(
                {
                    name: '🪖 Head',
                    value: '**1.** `Slayer helmet (i)` / `Torva Full Helm`\n**2.** `Neitiznot Faceguard`\n**3.** `Serpentine Helm` > `Blood Moon Helm`\n**4.** `Helm of Neitiznot` / `Verac\'s Helm`\n**5.** `Torag\'s Helm` / `Dharok\'s Helm`',
                    inline: false,
                },
                {
                    name: '📿 Neck',
                    value: '**1.** `Amulet of Rancour`\n**2.** `Amulet of Torture`\n**3.** `Amulet of Blood Fury` / `Amulet of Fury`\n**4.** `Amulet of Glory` / `Amulet of Strength`',
                    inline: false,
                },
                {
                    name: '🎒 Back',
                    value: '**1.** `Infernal Cape`\n**2.** `Fire Cape`\n**3.** `Cape of Accomplishment`\n**4.** `Obsidian Cape`\n**5.** `Vestment Cloak`',
                    inline: false,
                },
                {
                    name: '👕 Body',
                    value: '**1.** `Torva Platebody`\n**2.** `Bandos Chestplate` / `Fighter Torso` / `Blood Moon Chestplate`\n**3.** `Verac\'s Brassard` / `Guthan\'s Platebody`\n**4.** `Torag\'s Platebody` / `Dharok\'s Platebody`',
                    inline: false,
                },
                {
                    name: '👖 Legs',
                    value: '**1.** `Torva Platelegs`\n**2.** `Bandos Tassets` / `Blood Moon Tassets`\n**3.** `Verac\'s Plateskirt`\n**4.** `Torag\'s Platelegs` / `Dharok\'s Platelegs`\n**5.** `Guthan\'s Chainskirt`',
                    inline: false,
                },
                {
                    name: '⚔️ Weapon',
                    value: '**1.** `Scythe of Vitur`\n**2.** `Blade of Saeldor` / `Ghrazi Rapier` / `Inquisitor\'s Mace`\n**3.** `Osmumten\'s Fang` / `Noxious Halberd`\n**4.** `Zamorakian Hasta`\n**5.** `Abyssal Tentacle` > `Abyssal Whip`',
                    inline: false,
                },
                {
                    name: '🛡️ Shield',
                    value: '**1.** `Avernic Defender`\n**2.** `Dragon Defender`\n**3.** `Dragonfire Shield`\n**4.** `Crystal Shield`',
                    inline: false,
                },
                {
                    name: '📜 Ammo/Spell',
                    value: '**1.** `Rada\'s Blessing 4`\n**2.** `God Blessing` / `Rada\'s Blessing 3/2`',
                    inline: false,
                },
                {
                    name: '👐 Hands',
                    value: '**1.** `Ferocious Gloves`\n**2.** `Barrows Gloves`\n**3.** `Regen Bracelet`',
                    inline: false,
                },
                {
                    name: '👢 Boots',
                    value: '**1.** `Primordial Boots`\n**2.** `Echo Boots` / `Guardian Boots`\n**3.** `Dragon Boots`\n**4.** `Bandos Boots`\n**5.** `Rune Boots`',
                    inline: false,
                },
                {
                    name: '💍 Ring',
                    value: '**1.** `Lightbearer` (if using Voidwaker/Claws)\n**2.** `Ultor Ring`\n**3.** `Berserker Ring (i)`\n**4.** `Brimstone Ring`\n**5.** `Ring of Suffering (i)`',
                    inline: false,
                },
                {
                    name: '⭐ Special Attack',
                    value: '**1.** `Voidwaker` > `Dragon Claws` > `Saradomin Godsword` (for cave healing) > `Crystal Halberd`',
                    inline: false,
                },
                {
                    name: '📦 Inventory Suggestions',
                    value: '**1.** `3–4 Divine Super Combat Potions`\n**2.** `7–9 Saradomin Brews`\n**3.** `13–15 Super Restores`\n**4.** `2 Stamina Potions`\n**5.** `Rune pouch` (or Divine Rune Pouch for Vengeance)\n**6.** `Book of the Dead` (if using thralls)\n**7.** Adjust Prayer Potions if using Guthan\'s for healing',
                    inline: false,
                },
            );

            // ───── MAGIC SETUP ──────────────────────────────────────────────
            const embedGearMagic = new EmbedBuilder().setTitle('✨ Recommended Magic Setup for Fight Cave').setColor(0x3498db).setFooter({ text: 'Fight Caves Tutorial • Magic Setup' }).setTimestamp().addFields(
                {
                    name: '🪖 Head',
                    value: '**1.** `Slayer helmet (i) (on task)` / `Ancestral Hat`\n**2.** `Void Mage Helm`\n**3.** `Ahrim\'s Hood`',
                    inline: false,
                },
                {
                    name: '📿 Neck',
                    value: '**1.** `Occult Necklace`\n**2.** `Dragonbone Necklace` / `Bonecrusher Necklace`',
                    inline: false,
                },
                {
                    name: '🎒 Back',
                    value: '**1.** `Imbued God Cape`\n**2.** `God Capes`\n**3.** `Infernal Cape` / `Fire Cape` / `Cape of Accomplishment`\n**4.** `Vestment Cloak`',
                    inline: false,
                },
                {
                    name: '👕 Body',
                    value: '**1.** `Ancestral Robe Top`\n**2.** `Virtus Robe Top`\n**3.** `Elite Void Top`\n**4.** `Ahrim\'s Robetop`',
                    inline: false,
                },
                {
                    name: '👖 Legs',
                    value: '**1.** `Ancestral Robe Bottom`\n**2.** `Virtus Robe Bottom`\n**3.** `Elite Void Robe`\n**4.** `Ahrim\'s Robeskirt`',
                    inline: false,
                },
                {
                    name: '⚔️ Weapon',
                    value: '**1.** `Tumeken\'s Shadow`\n**2.** `Sanguinesti Staff`',
                    inline: false,
                },
                {
                    name: '🛡️ Shield',
                    value: '**1.** `Elidinis\' Ward (f)`\n**2.** `Arcane Spirit Shield`\n**3.** `Ancient Wyvern Shield`\n**4.** `Malediction Ward`\n**5.** `Crystal Shield` / `Blessed Spirit Shield`',
                    inline: false,
                },
                {
                    name: '📜 Ammo/Spell',
                    value: '**1.** `Rada\'s Blessing 4`\n**2.** `God Blessing`',
                    inline: false,
                },
                {
                    name: '👐 Hands',
                    value: '**1.** `Tormented Bracelet`\n**2.** `Barrows Gloves`\n**3.** `Regen Bracelet`',
                    inline: false,
                },
                {
                    name: '👢 Boots',
                    value: '**1.** `Eternal Boots`\n**2.** `Echo/Guardian Boots`\n**3.** `Bandos/Infinity/Aranea Boots`',
                    inline: false,
                },
                {
                    name: '💍 Ring',
                    value: '**1.** `Magus Ring`\n**2.** `Seers\' Ring (i)` / `Brimstone Ring`\n**3.** `Ring of Suffering (i)`\n**4.** `Ring of the Gods (i)`\n**5.** `Granite Ring (i)` / `Ring of Shadows` / `Explorer\'s Ring 4`',
                    inline: false,
                },
                {
                    name: '⭐ Special Attack',
                    value: '**1.** `Eldritch Nightmare Staff` > `Blood Spells`',
                    inline: false,
                },
                {
                    name: '📦 Inventory Suggestions',
                    value: '**1.** `6–9 Saradomin Brews`\n**2.** `2–3 Super Restores`\n**3.** `Runes for your chosen spells` (2000–2500 casts)\n**4.** Optional: `1000 Blood Barrage casts` for healing\n**5.** Optional: `Saturated Heart` (for boosting Magic level)',
                    inline: false,
                },
            );

            // ───── PURE SETUP ──────────────────────────────────────────────
            const embedGearPure = new EmbedBuilder().setTitle('🔥 Recommended Pure Setup for Fight Cave').setColor(0xf1c40f).setFooter({ text: 'Fight Caves Tutorial • Pure Setup' }).setTimestamp().addFields(
                {
                    name: '🪖 Head',
                    value: '**1.** `Mitre`\n**2.** `Robin Hood Hat`\n**3.** `Initiate Sallet (Defence 20)`\n**4.** `Bearhead` / `Halo (Defence 1)`',
                    inline: false,
                },
                {
                    name: '📿 Neck',
                    value: '**1.** `Necklace of anguish`\n**2.** `Amulet of Fury`\n**3.** `Amulet of Glory`\n**4.** `Stole`',
                    inline: false,
                },
                {
                    name: '🎒 Back',
                    value: '**1.** `Ranging Cape (t)`\n**2.** `Ava\'s Accumulator`\n**3.** `Fire Cape`\n**4.** `Cape of Accomplishment`\n**5.** `Vestment Cloak`',
                    inline: false,
                },
                {
                    name: '👕 Body',
                    value: '**1.** `Rangers\' Tunic`\n**2.** `Vestment Robe Top`\n**3.** `Monk\'s Robe Top`\n**4.** `Initiate Hauberk (Defence 20)`',
                    inline: false,
                },
                {
                    name: '👖 Legs',
                    value: '**1.** `Blessed Chaps`\n**2.** `Black d\'hide Chaps`\n**3.** `Rangers\' Tights`\n**4.** `Vestment Robe Legs`\n**5.** `Monk\'s Robe`',
                    inline: false,
                },
                {
                    name: '⚔️ Weapon',
                    value: '**1.** `Toxic Blowpipe & Twisted Bow`\n**2.** `Zaryte Crossbow`\n**3.** `Armadyl Crossbow`\n**4.** `Dragon Crossbow` / `Karil\'s Crossbow` / `Rune Crossbow`\n**5.** `Magic Shortbow (i)` / `Crystal Bow`',
                    inline: false,
                },
                {
                    name: '🛡️ Shield',
                    value: '**1.** `Book of Law`\n**2.** `Unholy Book`\n**3.** `Book of Balance`\n**4.** `Holy Book`',
                    inline: false,
                },
                {
                    name: '📜 Ammo/Spell',
                    value: '**1.** `Diamond Dragon Bolts (e)` / `Dragon Arrows` / `Any Blessing` & `Dragon Darts`\n**2.** (If using Karil\'s Crossbow) `Bolt Racks`',
                    inline: false,
                },
                {
                    name: '👐 Hands',
                    value: '**1.** `Blessed Vambraces`\n**2.** `Adamant Gloves (Defence 13)`\n**3.** `Regen Bracelet`\n**4.** `Mithril Gloves (Defence 1)` / `Combat Bracelet`',
                    inline: false,
                },
                {
                    name: '👢 Boots',
                    value: '**1.** `Aranea Boots`\n**2.** `Ranger Boots`\n**3.** `Holy Sandals`\n**4.** `Fancy/Fighting Boots`',
                    inline: false,
                },
                {
                    name: '💍 Ring',
                    value: '**1.** `Ring of the Gods (i)`\n**2.** `Venator Ring`',
                    inline: false,
                },
                {
                    name: '📦 Inventory Suggestions',
                    value: '**1.** `10 Saradomin Brews`\n**2.** `300+ Purple Sweets`\n**3.** `14–15 Super Restores`\n**4.** `1–2 Bastion Potions`\n**5.** `Dragon Darts` or `Diamond Bolts (e)` for Jad',
                    inline: false,
                },
            );

            // ───── EARLY-GAME IRON SETUP ──────────────────────────────────────
            const embedGearIron = new EmbedBuilder().setTitle('🛡️ Recommended Early-Game Iron Setup for Fight Cave').setColor(0x9b59b6).setFooter({ text: 'Fight Caves Tutorial • Iron Setup' }).setTimestamp().addFields(
                {
                    name: '🪖 Head',
                    value: '**1.** `Slayer helmet (i) / Black mask (i)` (if on task)\n**2.** `Verac\'s Helm`\n**3.** `Void Ranger Helm`\n**4.** `Helm of Neitiznot`',
                    inline: false,
                },
                {
                    name: '📿 Neck',
                    value: '**1.** `Unholy Symbol`\n**2.** `Holy Symbol`\n**3.** `Amulet of Glory`\n**4.** `Amulet of Power`',
                    inline: false,
                },
                {
                    name: '🎒 Back',
                    value: '**1.** `Ava\'s Accumulator / Ava\'s Device`\n**2.** `Ranging Cape`\n**3.** `Cape of Accomplishment`\n**4.** `Ardougne Cloak`',
                    inline: false,
                },
                {
                    name: '👕 Body',
                    value: '**1.** `Karil\'s Leathertop`\n**2.** `Blessed Body`\n**3.** `Void Knight Top`\n**4.** `Black d\'hide Body`',
                    inline: false,
                },
                {
                    name: '👖 Legs',
                    value: '**1.** `Karil\'s Leatherskirt`\n**2.** `Blessed Chaps`\n**3.** `Void Knight Robe`\n**4.** `Black d\'hide Chaps`',
                    inline: false,
                },
                {
                    name: '⚔️ Weapon',
                    value: '**1.** `Karil\'s Crossbow`\n**2.** `Hunters\' Sunlight Crossbow`\n**3.** `Crystal Bow`\n**4.** `Rune Crossbow`',
                    inline: false,
                },
                {
                    name: '🛡️ Shield',
                    value: '**1.** `Book of Law`\n**2.** `Unholy Book` / `Book of Balance` / `Holy Book`\n**3.** `Damaged Book`\n**4.** `Crystal Shield`',
                    inline: false,
                },
                {
                    name: '📜 Ammo/Spell',
                    value: '**1.** `Bolt Racks` (for Karil\'s Crossbow)\n**2.** `Sunlight Antler Bolts` (for Hunters\' Sunlight Crossbow)\n**3.** `Broad Bolts` / `Diamond Bolts (e)` (for Jad)\n**4.** `Any Blessing` (for Crystal Bow)',
                    inline: false,
                },
                {
                    name: '👐 Hands',
                    value: '**1.** `Barrows Gloves`\n**2.** `Combat Bracelet` / `Black Spiky Vambraces` / `Black d\'hide Vambraces`',
                    inline: false,
                },
                {
                    name: '👢 Boots',
                    value: '**1.** `Holy Sandals`\n**2.** `Blessed Boots`\n**3.** `Shayzien Boots (5)`\n**4.** `Mixed Hide Boots` / `Snakeskin Boots`',
                    inline: false,
                },
                {
                    name: '💍 Ring',
                    value: '**1.** `Explorer\'s Ring`\n**2.** `Ring of Recoil`',
                    inline: false,
                },
                {
                    name: '⭐ Special Attack',
                    value: '**1.** `Ancient Mace`',
                    inline: false,
                },
                {
                    name: '📦 Inventory Suggestions',
                    value: '**1.** `17 Prayer Potions` or `Super Restores`\n**2.** `7 Tuna Potatoes`\n**3.** `4 Cooked Karambwan`\n**4.** `Holy Wrench` (optional – compare restoration values)\n**5.** `Diamond Bolts (e)`\n**6.** `Rune Pouch with Blood Spell Runes`\n**7.** High-healing food to eat in a pinch',
                    inline: false,
                },
            );

            // Embed 3: Detailed Strategy & Wave Breakdown
            const embedWaves = new EmbedBuilder()
                .setTitle('⚔️ Detailed Strategy & Wave Breakdown')
                .setColor(0xe67e22)
                .setFooter({ text: 'Fight Caves Tutorial • Strategy & Waves' })
                .setTimestamp()
                .addFields(
                    {
                        name: '📉 Waves 1–30',
                        value:
                            '**Focus:** Use hit-and-run tactics against low-level monsters (e.g., `Tz-Kih` [22] & `Tz-Kek` [45]).\n' +
                            '**Tip:** Prioritize killing `Tz-Kih` to minimize Prayer drain (drains 100% damage + 1 Prayer per hit).\n' +
                            '**Stacking:** Two of the same monster in a wave cause the next wave to replace them with one monster of the next higher level.',
                        inline: false,
                    },
                    {
                        name: '📈 Waves 31–61',
                        value:
                            '**Challenge:** Increased threat from `Ket-Zeks` (360) and `Yt-MejKots` (180).\n' +
                            '**Defense:** Switch to **Protect from Magic** when facing Ket-Zeks.\n' +
                            '**Positioning:** Use safespots (e.g., Italy Rock, Long Rock, Dragon Rock) to funnel monsters.\n' +
                            '**Healing:** Wave 61 is your last chance to heal using Guthan’s – eliminate the 360s first.',
                        inline: false,
                    },
                    {
                        name: '⚡ Wave 62',
                        value:
                            '**Key Moment:** Identify the **orange** Ket-Zek – its spawn point determines where `TzTok-Jad` (702) will appear on Wave 63. 👀\n' +
                            '**Tactics:**\n' +
                            '• If you cannot keep all healers away using Italy Rock, switch to a few `black chinchompas` after a Prayer switch.\n' +
                            '• Otherwise, be prepared to quickly kill the healers or, if experienced, run through Jad to trap them.',
                        inline: false,
                    },
                    {
                        name: '🔥 Wave 63 – Final Showdown',
                        value:
                            '**Boss Fight:** Face `TzTok-Jad` (702) alongside 4 `Yt-HurKots` (108) that heal him.\n' +
                            '**Critical Actions:**\n' +
                            '• **Melee:** Jad’s melee attack gives no warning—stay at a distance.\n' +
                            '• **Magic:** Listen for his growl and rear-up animation 🔊; switch to **Protect from Magic** immediately.\n' +
                            '• **Ranged:** Preemptively use **Protect from Missiles** as Jad’s stomps cause floor cracks.\n' +
                            '**Healers Warning:** Even for high-level pures, Jad’s healers are lethal if not handled quickly.',
                        inline: false,
                    },
                    {
                        name: '💡 Additional Strategy & Tips',
                        value:
                            '**Kill Order:** `Tz-Kih` (22) → `Tok-Xil` (90) → `Ket-Zek` (360) → `Yt-MejKot` (180) → `Tz-Kek` (45/22)\n' +
                            '**Spawn Points:** On Wave 3, note where the level‑45 `Tz-Kek` spawns – this predicts Jad’s spawn on Wave 63.\n' +
                            '**Prayer & Healing:** Perfect your Prayer flicking and ensure you kill major threats before healing.\n' +
                            '**Logging Out:** Do not log out on Wave 62; log out on Wave 61 after healing and setting your quick Prayer to Protect from Magic.',
                        inline: false,
                    },
                );

            // Embed 4: Monster Breakdown & Wave Details
            const monsterData = {
                'Tz-Kih': {
                    level: 22,
                    description: 'Quick, low-HP melee attackers that drain Prayer (100% damage + 1 point per hit).',
                    notes: 'Total: 48. Priority: Kill these first to reduce Prayer drain.',
                },
                'Tz-Kek': {
                    level: 45,
                    description: 'A slightly tougher monster; killing one spawns two lower-level (22) variants.',
                    notes: 'Serves as a transition in wave progression.',
                },
                'Tok-Xil': {
                    level: 90,
                    description: 'A highly accurate ranged fighter capable of devastating damage if not countered.',
                    notes: 'Priority: Second target after Tz-Kih.',
                },
                'Yt-MejKot': {
                    level: 180,
                    description: 'Slow melee attackers that can heal themselves and adjacent foes.',
                    notes: 'Priority: Fourth target; use obstacles to limit their healing.',
                },
                'Ket-Zek': {
                    level: 360,
                    description: 'A massive monster with dangerous Magic and Melee attacks. Always use **Protect from Magic**.',
                    notes: 'Priority: Third target; eliminate quickly for safe healing.',
                },
                'TzTok-Jad': {
                    level: 702,
                    description: 'The final boss using a mix of Melee, Magic, and Ranged. Requires precise Prayer switching.',
                    notes: 'Spawns on Wave 63 where the orange Ket-Zek appears. Max hit: 97.',
                },
                'Yt-HurKot': {
                    level: 108,
                    description: 'Small healers that appear when Jad is at half health and can rapidly restore his HP.',
                    notes: 'Priority: Must be neutralized quickly to prevent Jad from regenerating.',
                },
            };

            const monsterImageMap = {
                'Tz-Kih': 'https://oldschool.runescape.wiki/images/Tz-Kih.png',
                'Tz-Kek': 'https://oldschool.runescape.wiki/images/thumb/Tz-Kek_%28level_45%29.png/250px-Tz-Kek_%28level_45%29.png?2c78c',
                'Tok-Xil': 'https://oldschool.runescape.wiki/images/Tok-Xil_%281%29.png?36c4b',
                'Yt-MejKot': 'https://oldschool.runescape.wiki/images/thumb/Yt-MejKot_%281%29.png/458px-Yt-MejKot_%281%29.png?cb21d&20190310043412',
                'Ket-Zek': 'https://oldschool.runescape.wiki/images/thumb/Ket-Zek_%281%29.png/739px-Ket-Zek_%281%29.png?d25f0&20190514013355',
                'TzTok-Jad': 'https://oldschool.runescape.wiki/images/TzTok-Jad.png',
                'Yt-HurKot': 'https://oldschool.runescape.wiki/images/Yt-HurKot.png',
            };

            const monsterWikiPageMap = {
                'Tz-Kih': 'https://oldschool.runescape.wiki/w/Tz-Kih',
                'Tz-Kek': 'https://oldschool.runescape.wiki/w/Tz-Kek',
                'Tok-Xil': 'https://oldschool.runescape.wiki/w/Tok-Xil',
                'Yt-MejKot': 'https://oldschool.runescape.wiki/w/Yt-MejKot',
                'Ket-Zek': 'https://oldschool.runescape.wiki/w/Ket-Zek',
                'TzTok-Jad': 'https://oldschool.runescape.wiki/w/TzTok-Jad',
                'Yt-HurKot': 'https://oldschool.runescape.wiki/w/Yt-HurKot',
            };

            const embedMonsters = Object.entries(monsterData).map(([name, data]) => {
                return new EmbedBuilder()
                    .setTitle(`👹 ${name} (level ${data.level})`)
                    .setURL(monsterWikiPageMap[name])
                    .setDescription(data.description)
                    .addFields({ name: '📌 Notes', value: data.notes, inline: false })
                    .setThumbnail(monsterImageMap[name])
                    .setColor(0xc0392b)
                    .setFooter({ text: 'Fight Caves Tutorial • Monster Breakdown' })
                    .setTimestamp();
            });

            // Embed 5: Tips & Tricks for Success (updated with fields)
            const embedTips = new EmbedBuilder()
                .setTitle('💡 Tips & Tricks')
                .setColor(0x9b59b6)
                .setFooter({ text: 'Fight Caves Tutorial • Tips & Tricks' })
                .setTimestamp()
                .addFields(
                    {
                        name: '🔒 Logging Out',
                        value: '• Finish the current wave before logging out to safely regenerate HP.\n' + '• **Log out on Wave 61** after healing and setting your quick Prayer to Protect from Magic; logging out after Wave 62 leaves you vulnerable.',
                        inline: false,
                    },
                    {
                        name: '🛠️ Practice & Inventory',
                        value:
                            '• Use simulators like [Jad Sim](https://runeapps.org/jadsim_app) to refine your timing.\n' +
                            '• Pack ample food, potions, and prayer restores for a prolonged run.\n' +
                            '• Consider using the **Toxic Blowpipe** for rapid attacks and venom, or the **Saradomin Godsword** for essential healing.',
                        inline: false,
                    },
                    {
                        name: '🏰 Safe Spotting & Combat',
                        value:
                            '• Experiment with different safespots (e.g., Italy Rock, Long Rock, Dragon Rock) to suit your playstyle.\n' +
                            '• Disable auto-retaliate unless absolutely necessary; focus on precise Prayer flicking.\n' +
                            '• The **ancient mace** can be a budget alternative, though it\'s less effective.',
                        inline: false,
                    },
                );

            // Embed 6: External Resources & Further Reading
            const embedResources = new EmbedBuilder()
                .setTitle('🔗 External Resources & Guides')
                .setColor(0x3498db)
                .setFooter({ text: 'Fight Caves Tutorial • External Resources' })
                .setTimestamp()
                .setDescription(
                    '• [YouTube Guide: Fire Cape 1](https://www.youtube.com/watch?v=FS9WhmnxFb8)\n' +
                        '• [YouTube Guide: Fire Cape 2](https://www.youtube.com/watch?v=DnUgdYGGIjI)\n' +
                        '• [OSRS Wiki: TzHaar Fight Cave](https://oldschool.runescape.wiki/w/TzHaar_Fight_Cave)\n' +
                        '• [Rotations & Spawn Patterns](https://oldschool.runescape.wiki/w/TzHaar_Fight_Cave/Rotations)\n' +
                        '• [TzHaar Fight Cave Strategies](https://oldschool.runescape.wiki/w/TzHaar_Fight_Cave/Strategies)',
                );

            // Embed 7: Additional Insights & Final Advice
            const embedInsights = new EmbedBuilder()
                .setTitle('🏆 Additional Insights & Final Advice')
                .setColor(0x1abc9c)
                .setFooter({ text: 'Fight Caves Tutorial • Final Advice' })
                .setTimestamp()
                .addFields(
                    {
                        name: '🎖️ Rewards & Benefits',
                        value: '• Completing the Fight Cave earns you the prestigious **Fire Cape** and valuable Tokkul.\n' + '• You also gain significant Slayer XP and, if on task, a chance for a pet TzRek-jad.',
                        inline: false,
                    },
                    {
                        name: '🔄 Adaptability & Strategy',
                        value:
                            '• Adjust your strategy based on your combat style—Ranged is generally recommended, though melee and magic work with precise Prayer switching.\n' +
                            '• Patience and practice are key; master monster patterns and use safespots to reduce damage.',
                        inline: false,
                    },
                    {
                        name: '🤝 Community & Learning',
                        value: '• Engage with fellow players in forums or clans to share strategies and gain insights.\n' + '• Stay updated on changes via the OSRS Wiki and community discussions.',
                        inline: false,
                    },
                );

            const embedJad = new EmbedBuilder()
                .setTitle('🔥 TzTok-Jad: Final Boss Guide')
                .setImage('https://oldschool.runescape.wiki/images/TzTok-Jad.png')
                .setColor(0xdc3545)
                .setFooter({ text: 'Fight Caves Guide: TzTok-Jad Mechanics' })
                .setTimestamp()
                .addFields(
                    {
                        name: 'ℹ️ General Information',
                        value:
                            '**TzTok-Jad** is the final monster encountered in the TzHaar Fight Caves. When examined, it displays the discouraging message _"This is going to hurt..."_. Jad is one of the highest levelled monsters in Old School RuneScape (Level 702) and requires persistence and determination to defeat.\n\n' +
                            '• **Progression:** You must fight 62 progressively tougher waves before reaching Jad.\n' +
                            '• **Combat Styles:** Jad uses Magic, Ranged, and Melee. He only uses Melee when you\'re adjacent; otherwise, he alternates randomly between Magic and Ranged.\n' +
                            '• **Auto-Retaliate:** Disable it unless your Prayer switching is exceptionally slow.',
                        inline: false,
                    },
                    {
                        name: '🔄 Wave Progression & Spawn Tricks',
                        value:
                            '• **Wave Display:** The current wave is shown at the beginning of each wave.\n' +
                            '• **Spawn Location:** Jad spawns where the orange (off-colour) Ket‑Zek appears on wave 62.\n' +
                            '• **Spawn Trick:** On wave 3, note where the level‑45 Tz‑Kek spawns. If it’s in a favorable location (e.g., south of Italy Rock), continue; if not, exit and reset for a better Jad spawn.\n' +
                            '• **Logout Strategy:** Do NOT log out on wave 62. Instead, log out on wave 61 after finishing the wave, set your quick Prayer to Protect from Magic, and then log back in. Logging out after wave 62 will leave you vulnerable.',
                        inline: false,
                    },
                    {
                        name: '⚔️ Attack Mechanics',
                        value:
                            '• **Melee:** Jad slams his fist into you. This is his fastest attack, but it gives no warning. Stay at a distance to avoid it.\n' +
                            '• **Magic:** Jad rears up and growls before breathing fire. You can hear him inhale/growl (similar to Retribution activating). **Switch to Protect from Magic immediately** while he’s rearing up, as once he fires, it’s too late.\n' +
                            '• **Ranged:** Jad slams his front legs onto the ground, causing large floor cracks. You must have **Protect from Missiles** active before the hit registers because the sound cue occurs after damage.',
                        inline: false,
                    },
                    {
                        name: '💉 Healer Mechanics',
                        value:
                            '• When Jad reaches **50% HP**, he summons 4 **Yt-HurKot Healers** (Level 108, 60 HP each) that can rapidly regenerate his health.\n' +
                            '• **Tactic:** Each healer must be hit at least once to divert its healing attention. However, if you take too much damage from them, you may kill them—which can be dangerous because any surviving healer may cause Jad to return to full health.\n' +
                            '• **Alternative:** If all healers attack you simultaneously, you can try running through Jad so they get trapped behind him—but only if you’re experienced (this technique requires a precise east–west or vice versa movement).\n' +
                            '• **Note:** It is NOT advised to tank the healers; even leaving one active can lead to Jad fully regenerating.',
                        inline: false,
                    },
                    {
                        name: '💡 Additional Tips & Notes',
                        value:
                            '• **Prayer Flicking:** Stay calm and perfect your timing. Always switch your Protection Prayer immediately upon hearing Jad’s cues.\n' +
                            '• **Long-Range Stance:** If using a ranged weapon and healers appear on the opposite side of Jad, consider switching to long-range mode to avoid getting caught in melee distance.\n' +
                            '• **Health Management:** When taking damage from Jad, avoid overusing food or potions. Heal incrementally, prioritizing Prayer switches.\n' +
                            '• **Targeting Healers:** Get the attention of all 4 healers without killing them if possible; leaving even one active can cause Jad to heal back to full.\n' +
                            '• **Overall Strategy:** Always prioritize killing in this order: `Tz-Kih` (22) → `Tok-Xil` (90) → `Ket-Zek` (360) → `Yt-MejKot` (180) → `Tz-Kek` (45/22). Use obstacles or safespots to limit incoming damage.',
                        inline: false,
                    },
                );

            // Main embed map for non-gear buttons
            const embedMap = {
                overview: embedOverview,
                waves: embedWaves,
                monsters: embedMonsters, // This is an array of 7 embeds.
                jad: embedJad,
                tips: embedTips,
                insights: embedInsights,
                resources: embedResources,
            };

            // Gear embed map for gear category buttons
            const gearEmbedMap = {
                gear_ranged: embedGearRanged,
                gear_melee: embedGearMelee,
                gear_magic: embedGearMagic,
                gear_pure: embedGearPure,
                gear_iron: embedGearIron,
            };

            // Initially, send the overview with the main navigation buttons.
            await interaction.editReply({ embeds: [embedOverview], components: [mainButtons, mainButtons2] });

            const collector = interaction.channel.createMessageComponentCollector({ time: 300000 });

            collector.on('collect', async (i) => {
                await i.deferUpdate();

                // Check for main gear button
                if (i.customId === 'gear') {
                    return interaction.editReply({ embeds: [embedGearRanged], components: [gearButtons, gearBackButton] });
                }
                // Gear category buttons
                if (i.customId.startsWith('gear_')) {
                    if (gearEmbedMap[i.customId]) {
                        return interaction.editReply({ embeds: [gearEmbedMap[i.customId]], components: [gearButtons, gearBackButton] });
                    }
                }
                // "Back" button from gear navigation: return to main navigation.
                if (i.customId === 'back') {
                    return interaction.editReply({ embeds: [embedOverview], components: [mainButtons, mainButtons2] });
                }
                // Otherwise, main navigation items:
                if (embedMap[i.customId]) {
                    // If the value is an array (like for monsters), send it directly.
                    const embedsToSend = Array.isArray(embedMap[i.customId]) ? embedMap[i.customId] : [embedMap[i.customId]];
                    return interaction.editReply({ embeds: embedsToSend, components: [mainButtons, mainButtons2] });
                }
            });
        } catch (error) {
            logger.error('Error executing /fight_caves_tutorial:', error);
            await interaction.editReply({ content: '❌ An error occurred.', flags: 64 });
        }
    },
};
