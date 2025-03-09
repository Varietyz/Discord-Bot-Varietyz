// cacheImages.js

const axios = require('axios');
const fs = require('fs/promises');
const path = require('path');
const pLimit = require('p-limit'); // Ensure p-limit@3 is installed
const metrics = require('./metrics'); // Import the metrics list

// Configuration
const CACHE_DIR = path.join(__dirname, 'image-cache');
const CONCURRENCY_LIMIT = 5; // Number of concurrent downloads

// BOTW Name Map
const BOTW_NAME_MAP = {
    phosanis_nightmare: 'The_Nightmare.png',
    nightmare: 'The_Nightmare.png',
    kril_tsutsaroth: 'K%27ril_Tsutsaroth.png',
    kreearra: 'Kree%27arra.png',
    calvarion: 'Calvar%27ion.png',
    vetion: 'Vet%27ion.png',
    tztok_jad: 'TzTok-Jad.png',
    tzkal_zuk: 'TzKal-Zuk.png',
    barrows_chests: 'Chest_(Barrows).png',
    chambers_of_xeric: 'Chambers_of_Xeric_logo.png',
    chambers_of_xeric_challenge_mode: 'Chambers_of_Xeric_logo.png',
    theatre_of_blood: 'Theatre_of_Blood_logo.png',
    theatre_of_blood_hard_mode: 'Theatre_of_Blood_logo.png',
    tombs_of_amascut: 'Tombs_of_Amascut.png',
    tombs_of_amascut_expert: 'Tombs_of_Amascut.png',
    the_gauntlet: 'Crystalline_Hunllef.png',
    the_corrupted_gauntlet: 'Corrupted_Hunllef.png',
    alchemical_hydra: 'Alchemical_Hydra_(serpentine).png',
    wintertodt: 'Howling_Snow_Storm.gif',
    thermonuclear_smoke_devil: 'Thermonuclear_smoke_devil.png',
    phantom_muspah: 'Phantom_Muspah_(ranged).png',
    lunar_chests: 'Lunar_Chest_(open).png',
    grotesque_guardians: 'Grotesque_Guardians_model.gif',
    deranged_archaeologist: 'Deranged_archaeologist.png',
    crazy_archaeologist: 'Crazy_archaeologist.png',
    zulrah: 'Zulrah_(serpentine).png',
};

// SOTW Name Map
const SOTW_NAME_MAP = {
    runecrafting: 'Runecraft',
    overall: 'Stats',
    // Add more SOTW metrics here if needed
};

// Helper Functions

/**
 * Determines the type of a metric based on its category.
 * @param {string} metric - The metric name.
 * @returns {'SOTW'|'BOTW'|null} - 'SOTW' for Skills, 'BOTW' for Bosses, null otherwise.
 */
const determineType = (metric) => {
    const bossMetrics = new Set([
        // Boss Metrics
        'abyssal_sire',
        'alchemical_hydra',
        'amoxliatl',
        'araxxor',
        'artio',
        'barrows_chests',
        'bryophyta',
        'callisto',
        'calvarion',
        'cerberus',
        'chambers_of_xeric',
        'chambers_of_xeric_challenge_mode',
        'chaos_elemental',
        'chaos_fanatic',
        'commander_zilyana',
        'corporeal_beast',
        'crazy_archaeologist',
        'dagannoth_prime',
        'dagannoth_rex',
        'dagannoth_supreme',
        'deranged_archaeologist',
        'duke_sucellus',
        'general_graardor',
        'giant_mole',
        'grotesque_guardians',
        'hespori',
        'kalphite_queen',
        'king_black_dragon',
        'kraken',
        'kreearra',
        'kril_tsutsaroth',
        'lunar_chests',
        'mimic',
        'nex',
        'nightmare',
        'phosanis_nightmare',
        'obor',
        'phantom_muspah',
        'sarachnis',
        'scorpia',
        'scurrius',
        'skotizo',
        'sol_heredit',
        'spindel',
        'tempoross',
        'the_gauntlet',
        'the_corrupted_gauntlet',
        'the_hueycoatl',
        'the_leviathan',
        'the_whisperer',
        'theatre_of_blood',
        'theatre_of_blood_hard_mode',
        'thermonuclear_smoke_devil',
        'tombs_of_amascut',
        'tombs_of_amascut_expert',
        'tzkal_zuk',
        'tztok_jad',
        'vardorvis',
        'venenatis',
        'vetion',
        'vorkath',
        'wintertodt',
        'zalcano',
        'zulrah',
    ]);

    if (bossMetrics.has(metric)) {
        return 'BOTW';
    }

    // Assuming all other metrics in the list are Skills
    const skillMetrics = new Set([
        'overall',
        'attack',
        'defence',
        'strength',
        'hitpoints',
        'ranged',
        'prayer',
        'magic',
        'cooking',
        'woodcutting',
        'fletching',
        'fishing',
        'firemaking',
        'crafting',
        'smithing',
        'mining',
        'herblore',
        'agility',
        'thieving',
        'slayer',
        'farming',
        'runecrafting',
        'hunter',
        'construction',
    ]);

    if (skillMetrics.has(metric)) {
        return 'SOTW';
    }

    // Excluded metrics
    return null;
};

/**
 *
 * @param {number} ms
 * @returns
 */
async function sleep(ms) {
    if (typeof ms !== 'number' || ms < 0) {
        throw new TypeError('The "ms" parameter must be a non-negative number.');
    }
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generates the URL metric based on the type and metric name.
 * @param {string} metric - The metric name.
 * @param {'SOTW'|'BOTW'} type - The competition type.
 * @returns {string} - The URL metric string.
 */
const getUrlMetric = (metric, type) => {
    if (type === 'SOTW') {
        const lower = metric.toLowerCase();
        if (SOTW_NAME_MAP[lower]) {
            return SOTW_NAME_MAP[lower];
        }
        // Fallback: Capitalize the first letter
        return metric.charAt(0).toUpperCase() + metric.slice(1);
    }

    if (type === 'BOTW') {
        const lower = metric.toLowerCase();
        if (BOTW_NAME_MAP[lower]) {
            return BOTW_NAME_MAP[lower];
        }
        // Fallback: "phosanis_nightmare" => "Phosanis_Nightmare"
        return metric
            .split('_')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join('_');
    }

    // If type is neither SOTW nor BOTW, return the original metric
    return metric;
};



/**
 * Downloads an image from a given URL and saves it to the cache directory.
 * @param {string} url - The image URL.
 * @param {string} filename - The filename to save as.
 */
const downloadImage = async (url, filename) => {
    try {
        const filePath = path.join(CACHE_DIR, filename);
        // Check if file already exists
        try {
            await fs.access(filePath);
            console.log(`📄 Already cached: ${filename}`);
            return;
        } catch (err) {
            // File does not exist, proceed to download
        }

        console.log(`Attempting to download: ${url}`);
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        await fs.writeFile(filePath, response.data);
        await sleep(2500); // Respect rate limiting
        console.log(`✅ Downloaded: ${filename}`);
    } catch (error) {
        console.error(`❌ Failed to download ${filename}: ${error.message}`);
    }
};

/**
 * Main function to build the image cache.
 */
const buildImageCache = async () => {
    try {
        // Ensure the cache directory exists using fs.mkdir with recursive option
        await fs.mkdir(CACHE_DIR, { recursive: true });
        console.log(`📁 Cache directory ensured at: ${CACHE_DIR}`);

        const limit = pLimit(CONCURRENCY_LIMIT);
        const downloadPromises = [];

        // Initialize a progress bar (optional)
        const cliProgress = require('cli-progress');
        const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
        bar.start(metrics.length, 0);

        metrics.forEach((metric) => {
            const type = determineType(metric);
            if (!type) {
                // Excluded metrics
                console.log(`🚫 Excluded Metric: ${metric}`);
                bar.increment();
                return;
            }

            const urlMetric = getUrlMetric(metric, type);

            // Determine the image URL based on the type
            let thumbnailIMG;
            if (type === 'SOTW') {
                // Handle specific SOTW metrics if necessary
                thumbnailIMG = `https://oldschool.runescape.wiki/images/${encodeURIComponent(urlMetric)}_icon.png`;
            } else if (type === 'BOTW') {
                thumbnailIMG = `https://oldschool.runescape.wiki/images/${encodeURIComponent(urlMetric)}`;
            }

            // Determine the filename for caching
            const imageExtension = path.extname(thumbnailIMG) || '.png'; // Default to .png if no extension
            const imageFilename = `${metric}${imageExtension}`;

            // Queue the download with concurrency control
            const promise = limit(async () => {
                await downloadImage(thumbnailIMG, imageFilename);
                bar.increment();
            });
            downloadPromises.push(promise);
        });

        // Await all downloads
        await Promise.all(downloadPromises);

        bar.stop();
        console.log('📦 Image caching complete.');
    } catch (error) {
        console.error(`⚠️  Unexpected error during image caching: ${error.message}`);
    }
};

// Execute the script
buildImageCache();
