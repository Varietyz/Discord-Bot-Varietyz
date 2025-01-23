const { SlashCommandBuilder } = require("@discordjs/builders");
const logger = require("../functions/logger");
const { runQuery, getOne } = require("../../utils/dbUtils"); // Importing dbUtils functions
const axios = require("axios");

// Rate Limiting Configuration
const RATE_LIMIT = 5; // Maximum number of allowed attempts
const RATE_LIMIT_DURATION = 60 * 1000; // Time window in milliseconds (e.g., 1 minute)
const rateLimitMap = new Map(); // Map to track user requests

// Easter egg RSNs and their respective responses
const easterEggs = {
  zezima: {
    title: "🌟 Zezima",
    description:
      "Oh, **Zezima**? Shooting for the stars, huh? This name’s staying with the legend. 😂",
    color: 0xffd700, // Gold color
  },
  durial321: {
    title: "⚔️ Durial321",
    description:
      "Trying **Durial321**? Unless you’re reenacting the Falador Massacre, you’re no villain here. Next! 😅",
    color: 0xff4500, // Orange-red color
  },
  bluerose13x: {
    title: "🔧 Bluerose13x",
    description:
      "**Bluerose13x**—RuneScape’s OG smith. Unless you’re smelting history, let’s keep it in the past. 🛠️",
    color: 0x1e90ff, // Blue
  },
  "the old nite": {
    title: "🕊️ The Old Nite",
    description:
      "Unless you’re inspiring the entire RuneScape world like **The Old Nite**, this RSN’s sacred ground. Move along. 🌙",
    color: 0x696969, // Dark gray
  },
  "s u o m i": {
    title: "💎 S U O M I",
    description:
      "**SUOMI** climbed Everest (or the XP equivalent). You, however, might be stuck at Tutorial Island. 🏋️",
    color: 0x00ffff, // Cyan
  },
  woox: {
    title: "👑 Woox",
    description:
      "**Woox** didn’t set PvM records for someone else to take the glory. Stick to fighting goblins for now. 🔥",
    color: 0xff4500, // Orange-red
  },
  swampletics: {
    title: "🌿 Swampletics",
    description:
      "A Morytania-only Ironman with no bank? Unless you’re pulling a Swampletics 2.0, try another name. 🌲",
    color: 0x2e8b57, // Dark green
  },
  rendi: {
    title: "🎨 Rendi",
    description:
      "**Rendi** mastered glitches and chaos. If your best trick is forgetting to eat, this name’s not for you. 🌪️",
    color: 0x9370db, // Purple
  },
  "cursed you": {
    title: "😈 Cursed You",
    description:
      "Thinking of stealing **Cursed You**? Unless you’re dominating PvP, this name stays with the king. 💀",
    color: 0xdc143c, // Crimson
  },
  framed: {
    title: "🗞️ Framed",
    description:
      "Unless you’re narrating epic PK tales like **Framed**, this name isn’t for you. 🔥",
    color: 0x008080, // Teal
  },
  "sparc mac": {
    title: "💥 Sparc Mac",
    description:
      "Unless you’ve got PvP montages ready to upload, **Sparc Mac** is way out of your league. 😉",
    color: 0xff6347, // Tomato
  },
  "matt k": {
    title: "📜 Matt K",
    description:
      "If you can’t commit to hours of skilling grind, **Matt K** isn’t your vibe. Stick to chopping willows, rookie. 🌳",
    color: 0x4682b4, // Steel blue
  },
  tehnoobshow: {
    title: "🎥 TehNoobShow",
    description: "GUTHHHIIIIIIIIIIIIIIIXXXXXXXXXXXXX!!!!!!!!!!!!!!!!!!!!!!!!",
    color: 0xffd700, // Gold
  },
  nightmarerh: {
    title: "🌙 NightmareRH",
    description:
      "**NightmareRH** set the standard for fiery rants. Unless you’re going full chaos, this name isn’t yours. 😡",
    color: 0xff6347, // Red-orange
  },
  "3 hit u": {
    title: "⚔️ 3 Hit U",
    description:
      "**3 Hit U** owned the Duel Arena. Unless you’re planning to one-shot everyone, step away from the legend. 💪",
    color: 0x8b0000, // Dark red
  },
  kingduffy: {
    title: "👑 Kingduffy",
    description:
      "**Kingduffy** ruled RuneScape. Unless you’re planning a hostile leaderboard takeover, this isn’t your name. 👑",
    color: 0xffd700, // Gold
  },
  exact: {
    title: "🎯 Exact",
    description:
      "Soloing raids blindfolded? No? Then **Exact** isn’t your name. Stick to quest bosses. 🕹️",
    color: 0x2f4f4f, // Dark slate gray
  },
  forsberg888: {
    title: "🪓 Forsberg888",
    description:
      "Chopping yews for hours on end? Unless you’re matching **Forsberg888**, this name’s not yours. 🪓",
    color: 0x228b22, // Forest green
  },
  jebrim: {
    title: "🏃 Jebrim",
    description:
      "**Jebrim** lived rooftops and shortcuts. Unless you love rooftops more than loot, stick to running errands. 🏅",
    color: 0x00ff7f, // Spring green
  },
  "chris archie": {
    title: "📽️ Chris Archie",
    description:
      "Unless you’re creating iconic PK montages, **Chris Archie** isn’t for you. Stick to watching highlights! 🎬",
    color: 0xffd700, // Gold
  },
  kempq: {
    title: "⚡ KempQ",
    description:
      "Unless you’re mastering PKing with style, **KempQ** isn’t your name. Move along! ⚔️",
    color: 0x8b0000, // Dark red
  },
  drumgun: {
    title: "🎯 Drumgun",
    description:
      "Relentless grinding? Unless you’re hitting 200 million XP milestones back-to-back, leave **Drumgun** alone. 🏆",
    color: 0x8b0000, // Dark red
  },
  zarfot: {
    title: "📈 Zarfot",
    description:
      "**Zarfot** turned skilling into an art form. Unless you’ve got efficiency calculators for breakfast, this name’s off-limits. 🛠️",
    color: 0x00ced1, // Dark turquoise
  },
  syzygy: {
    title: "🚀 Syzygy",
    description:
      "Dominating hiscores with efficiency like **Syzygy**? No? Stick to your basic skilling plans. 📊",
    color: 0xffa500, // Orange
  },
  alkan: {
    title: "🔥 Alkan",
    description:
      "**Alkan** was maxing while you were still figuring out how to bank. Respect the grind. 🏋️",
    color: 0xff4500, // Orange-red
  },
  hexis: {
    title: "🌟 Hexis",
    description:
      "Skilling legends belong to **Hexis**. Unless you’re leading a clan XP race, this name isn’t for you. 👑",
    color: 0x32cd32, // Lime green
  },
  foot: {
    title: "🧠 Foot",
    description:
      "**Foot** doesn’t just play RuneScape; he rewrites the meta. If you’re not testing mechanics, leave the name. ⚙️",
    color: 0x00bfff, // Deep sky blue
  },
  b0aty: {
    title: "🎣 B0aty",
    description:
      "Unless you’re ready to dominate PvM and Ironman like **B0aty**, keep fishing for another name. 🎣",
    color: 0xff4500, // Orange-red
  },
  "a friend": {
    title: "🤝 A Friend",
    description:
      "**A Friend** taught us everything from PvM to money-making. Unless you’re sharing knowledge, this isn’t your name. 📚",
    color: 0x4682b4, // Steel blue
  },
  torvesta: {
    title: "⚔️ Torvesta",
    description:
      "Unless you’re keeping PvP alive like **Torvesta**, this RSN’s out of reach. Time to train! 🏹",
    color: 0xff4500, // Orange-red
  },
  settled: {
    title: "🌌 Settled",
    description:
      "**Settled** reinvented storytelling with Swampletics. Unless you’re crafting an epic tale, this name isn’t yours. 🌿",
    color: 0x2e8b57, // Dark green
  },
  faux: {
    title: "🌟 Faux",
    description:
      "Chill, educational, and legendary—that’s **Faux**. Unless you’re bringing the vibes, pick another name. 🎓",
    color: 0x00ff7f, // Spring green
  },
  perp: {
    title: "🎭 Perp",
    description:
      "**Perp** took challenges to a whole new level. Unless you’re redefining gameplay, leave it. 🎮",
    color: 0xffd700, // Gold
  },
  elvemage: {
    title: "✨ Elvemage",
    description:
      "Hybrid PKing innovator **Elvemage** doesn’t share his name. Stick to PvP practice, champ. 🛡️",
    color: 0x00ffff, // Cyan
  },
  "bonesaw pker": {
    title: "🦴 Bonesaw Pker",
    description:
      "PKing royalty **Bonesaw Pker** deserves respect. Unless you’re a wilderness veteran, step aside. 💀",
    color: 0x8b0000, // Dark red
  },
  "sk8r boi pk": {
    title: "🛹 SK8R BOI PK",
    description:
      "**SK8R BOI PK** defined early PvP. Unless you’re revolutionizing the Wilderness, this name’s not yours. ⚔️",
    color: 0x1e90ff, // Blue
  },
  imahama: {
    title: "🐟 iMahama",
    description:
      "A pure PKing legend. Unless your strategy is flawless, you’re not living up to **iMahama**. 🎯",
    color: 0x32cd32, // Lime green
  },
  gabe: {
    title: "🎲 Gabe",
    description:
      "**Gabe** ruled the Duel Arena. Unless you’re ready to stake it all, this name isn’t yours. 🎲",
    color: 0xff6347, // Tomato
  },
  sparky: {
    title: "🌟 Sparky",
    description:
      "Bringing humor to the RuneScape world? Unless you’re matching **Sparky**, leave the jokes aside. 🎭",
    color: 0xffd700, // Gold
  },
  "ice poseidon": {
    title: "❄️ Ice Poseidon",
    description:
      "**Ice Poseidon** brought OSRS to the mainstream. Controversy not included. Proceed cautiously. ☃️",
    color: 0x4682b4, // Steel blue
  },
  fantasy: {
    title: "🌌 Fantasy",
    description:
      "**Fantasy** paved the way for RuneScape Classic creators. Unless you’re teaching PvP strategies, skip this name. 🛡️",
    color: 0x8b0000, // Dark red
  },
  "lynx titan": {
    title: "💪 Lynx Titan",
    description:
      "Maxed 200M XP in every skill? Unless you’re planning to rewrite OSRS leaderboards, step away from **Lynx Titan**. 🏆",
    color: 0xffd700, // Gold
  },
  tks: {
    title: "🐟 Tks",
    description:
      "Unless you’re cooking and fishing like it’s 2001, **Tks** isn’t the name for you. Stick to shrimp, buddy. 🎣",
    color: 0x4682b4, // Steel blue
  },
  rab: {
    title: "👑 Rab",
    description:
      "**Rab**, the first to ever step foot in Gielinor back when it was DeviousMUD. Your adventure might be epic, but it’s no first-of-its-kind. Leave this one for the original trailblazer. 🌟",
    color: 0xdaa520, // Goldenrod
  },
};

/**
 * Validate RSN format.
 *
 * @param {string} rsn - RSN to validate.
 * @returns {Object} - { valid: Boolean, message: String }
 */
const validateRsn = (rsn) => {
  if (typeof rsn !== "string") {
    return {
      valid: false,
      message: "RSN must be a string.",
    };
  }

  const trimmedRsn = rsn.trim();

  if (trimmedRsn.length < 1 || trimmedRsn.length > 12) {
    return {
      valid: false,
      message: "RSN must be between 1 and 12 characters long.",
    };
  }

  // Allow letters, numbers, and single spaces between words
  // Disallow hyphens and underscores
  if (!/^[a-zA-Z0-9]+(?: [a-zA-Z0-9]+)*$/.test(trimmedRsn)) {
    return {
      valid: false,
      message:
        "RSN can only contain letters, numbers, and single spaces between words. (If your RSN includes a hyphen or underscore, replace it with a space)",
    };
  }

  const forbiddenPhrases = ["Java", "Mod", "Jagex"];
  if (
    forbiddenPhrases.some((phrase) =>
      trimmedRsn.toLowerCase().includes(phrase.toLowerCase()),
    )
  ) {
    return {
      valid: false,
      message:
        'RSN cannot contain forbidden phrases like "Java", "Mod", or "Jagex".',
    };
  }

  return { valid: true };
};

/**
 * Normalize RSN for consistent comparison.
 *
 * @param {string} rsn - RSN to normalize.
 * @returns {string} - Normalized RSN.
 */
const normalizeRsn = (rsn) => {
  return rsn
    .replace(/[-_]/g, " ") // Replace hyphens and underscores with spaces
    .replace(/\s+/g, " ") // Replace multiple spaces with a single space
    .trim() // Remove leading and trailing spaces
    .toLowerCase(); // Convert to lowercase
};

/**
 * Fetch player data from WOM API using cURL.
 * @param {string} rsn - The RSN to fetch data for.
 * @returns {Object|null} - Player data from WOM API or null if unavailable.
 */
async function fetchPlayerData(rsn) {
  const url = `https://api.wiseoldman.net/v2/players/${encodeURIComponent(rsn)}`;

  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      logger.warn(`[fetchPlayerData] RSN '${rsn}' not found on Wise Old Man.`);
      return null; // Handle 404 errors gracefully
    } else if (error.response && error.response.status === 429) {
      logger.warn(
        `[fetchPlayerData] Rate limited by WOM API. Please try again later.`,
      );
      throw new Error("Rate limited by WOM API.");
    } else {
      logger.error(
        `[fetchPlayerData] Unexpected error fetching RSN '${rsn}': ${error.message}`,
      );
      throw error; // Rethrow unexpected errors
    }
  }
}

/**
 * Define the /rsn command
 */
module.exports.data = new SlashCommandBuilder()
  .setName("rsn")
  .setDescription("Register your Old School RuneScape Name (RSN)")
  .addStringOption((option) =>
    option
      .setName("name")
      .setDescription("Your Old School RuneScape Name to register")
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(12),
  );

/**
 * Execute the /rsn command
 *
 * @param {CommandInteraction} interaction
 */
module.exports.execute = async (interaction) => {
  let rsn = "";
  try {
    rsn = interaction.options.getString("name"); // Get RSN input from user

    // Check for Easter egg RSNs
    const lowerRsn = rsn.toLowerCase();
    if (easterEggs[lowerRsn]) {
      const { title, description, color } = easterEggs[lowerRsn];
      return await interaction.reply({
        embeds: [
          {
            title,
            description,
            color,
          },
        ],
        flags: 64, // EPHEMERAL
      });
    }

    // Validate RSN format
    const validation = validateRsn(rsn);
    if (!validation.valid) {
      return await interaction.reply({
        content: `❌ ${validation.message} Please check your input and try again. 🛠️`,
        flags: 64, // EPHEMERAL
      });
    }

    const userId = interaction.user.id;
    const currentTime = Date.now();
    const userData = rateLimitMap.get(userId) || {
      count: 0,
      firstRequest: currentTime,
    };

    if (currentTime - userData.firstRequest < RATE_LIMIT_DURATION) {
      if (userData.count >= RATE_LIMIT) {
        const retryAfter = Math.ceil(
          (RATE_LIMIT_DURATION - (currentTime - userData.firstRequest)) / 1000,
        );
        return await interaction.reply({
          content: `🚫 You're using this command too frequently. Please wait \`${retryAfter}\` second(s) before trying again. ⏳`,
          flags: 64, // EPHEMERAL
        });
      }
      userData.count += 1;
    } else {
      userData.count = 1;
      userData.firstRequest = currentTime;
    }

    rateLimitMap.set(userId, userData);

    // Schedule removal of the user's rate limit data after RATE_LIMIT_DURATION
    setTimeout(() => rateLimitMap.delete(userId), RATE_LIMIT_DURATION);

    const normalizedRsn = normalizeRsn(rsn);

    logger.info(`User ${userId} attempting to register RSN '${rsn}'`);

    // Step 1: Fetch player data from WOM API
    const playerData = await fetchPlayerData(normalizedRsn);
    if (!playerData) {
      const profileLink = `https://wiseoldman.net/players/${encodeURIComponent(
        normalizedRsn,
      )}`;
      return await interaction.reply({
        content: `❌ The RSN \`${rsn}\` could not be verified on Wise Old Man. This might be because the name is not linked to an account or the WOM database needs an update. Please ensure the name exists and try again.\n\n🔗 [View Profile](${profileLink})`,
        flags: 64, // EPHEMERAL
      });
    }

    // Step 2: Check if RSN already exists under another user's account
    const existingUser = await getOne(
      `
  SELECT user_id FROM registered_rsn
  WHERE LOWER(REPLACE(REPLACE(rsn, '-', ' '), '_', ' ')) = ?
  LIMIT 1
  `,
      [normalizedRsn],
    );

    if (existingUser && existingUser.user_id !== userId) {
      return await interaction.reply({
        content: `🚫 The RSN \`${rsn}\` is already registered by another user: <@${existingUser.user_id}>. 🛡️`,
        flags: 64, // EPHEMERAL
      });
    }

    // Step 3: Check if RSN is already registered to the user
    const isRegistered = await getOne(
      `
  SELECT 1 FROM registered_rsn
  WHERE user_id = ? AND LOWER(REPLACE(REPLACE(rsn, '-', ' '), '_', ' ')) = ?
  LIMIT 1
  `,
      [userId, normalizedRsn],
    );

    if (isRegistered) {
      return await interaction.reply({
        content: `⚠️ The RSN \`${rsn}\` is already registered to your account. No action was taken. ✅`,
        flags: 64, // EPHEMERAL
      });
    }

    // Step 4: Register the RSN
    try {
      await runQuery(
        `
    INSERT INTO registered_rsn (user_id, rsn, registered_at)
    VALUES (?, ?, ?)
    `,
        [userId, rsn, new Date().toISOString()],
      );

      await interaction.reply({
        content: `🎉 **Success!** The RSN \`${rsn}\` has been registered to your account. 🏆`,
        flags: 64,
      });

      logger.info(`RSN '${rsn}' successfully registered for user ${userId}`);
    } catch (insertErr) {
      if (insertErr.message.includes("UNIQUE constraint failed")) {
        // RSN already exists due to race condition
        return await interaction.reply({
          content: `🚫 Oops! The RSN \`${rsn}\` was just registered by someone else. Please choose another one. 🔄`,
          flags: 64,
        });
      } else {
        throw insertErr; // Let the outer catch handle other errors
      }
    }
  } catch (err) {
    logger.error(`Error executing /rsn command: ${err.message}`);

    // Check if the interaction has already been replied to
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: `❌ An error occurred while registering \`${rsn}\`. Please try again later. 🛠️`,
        flags: 64, // EPHEMERAL
      });
    } else {
      await interaction.reply({
        content: `❌ Something went wrong while processing your request. Please try again later. 🛠️`,
        flags: 64, // EPHEMERAL
      });
    }
  }
};
