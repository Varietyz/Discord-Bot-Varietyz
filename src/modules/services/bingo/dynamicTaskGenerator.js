// /modules/services/bingo/dynamicTaskGenerator.js
const logger = require('../../utils/essentials/logger');
const db = require('../../utils/essentials/dbUtils');
const fs = require('fs');
const path = require('path');

/**
 * Clears dynamic tasks from the bingo_tasks table.
 * Ensures that new dynamic tasks are generated for each new event.
 */
async function clearDynamicTasks() {
    try {
        logger.info('[BingoService] clearDynamicTasks() → Starting...');

        const result = await db.runQuery(
            `
            DELETE FROM bingo_tasks
            WHERE is_dynamic = 1
            `,
        );

        if (result.changes > 0) {
            logger.info(`[BingoService] Cleared ${result.changes} dynamic tasks.`);
        } else {
            logger.info('[BingoService] No dynamic tasks found to clear.');
        }
    } catch (err) {
        logger.error(`[BingoService] clearDynamicTasks() error: ${err.message}`);
    }
}

/**
 * Main entry point for generating dynamic Bingo tasks.
 */
async function generateDynamicTasks() {
    logger.info('🔄 [DynamicTaskGenerator] Generating dynamic Bingo tasks...');

    // Check if dynamic tasks already exist.
    const existingCount = await db.getOne('SELECT COUNT(*) AS count FROM bingo_tasks WHERE is_dynamic = 1');
    // If any dynamic tasks already exist, skip generation.
    if (existingCount && existingCount.count > 0) {
        logger.info('Dynamic tasks already exist. Skipping generation to avoid duplicates.');
        return;
    }

    // 1. Generate Skill Tasks (Exp Only)
    await generateSkillTasks();

    // 2. Generate Boss Tasks
    await generateBossTasks();

    // 3. Generate Drop Tasks from item_drops.json
    await generateDropTasks();

    await generateActivityTasks();

    // 4. (Removed) Message-Based Tasks for Clue, Collection & Pet
    //    They are not processed in baseline. Only drops are handled via messages.

    logger.info('🎲 [DynamicTaskGenerator] Successfully generated dynamic Bingo tasks!');
}

/**
 * Centralized Points Configuration
 */
const POINTS_CONFIG = {
    Exp: { multiplier: 4 / 100000, fixed: null },
    Kill: { multiplier: 1.25, fixed: null },
    Score: { multiplier: 1.5, fixed: null },
    Drop: { multiplier: null, fixed: 50 },
    Message: { multiplier: null, fixed: 25 },
    Default: { multiplier: null, fixed: 10 },
};

/**
 *
 * @param type
 * @param value
 */
function calculateBasePoints(type, value) {
    const config = POINTS_CONFIG[type] || POINTS_CONFIG.Default;
    if (config.fixed !== null) return config.fixed;
    if (config.multiplier !== null) return Math.floor(value * config.multiplier);
    return POINTS_CONFIG.Default.fixed;
}

/**
 *
 * @param min
 * @param max
 * @param step
 */
function generateRandomValue(min, max, step) {
    const steps = Math.floor((max - min) / step) + 1;
    const randomStep = Math.floor(Math.random() * steps);
    return min + randomStep * step;
}

/**
 *
 * @param str
 */
function capitalizeName(str) {
    return str
        .replace(/_/g, ' ')
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 *
 */
async function generateBossTasks() {
    const RAID_BOSSES = ['chambers_of_xeric', 'tombs_of_amascut', 'theatre_of_blood'];
    const HARD_RAID_BOSSES = ['chambers_of_xeric_challenge_mode', 'tombs_of_amascut_expert', 'theatre_of_blood_hard_mode'];
    const LOOT_BOSSES = ['lunar_chests', 'barrows_chests'];
    const SPECIAL_BOSSES = ['hespori', 'skotizo', 'bryophyta', 'obor'];
    const HARD_BOSSES = ['corporeal_beast'];
    const RARE_BOSSES = ['mimic'];
    const MINIGAME_BOSSES = ['tztok_jad', 'tzkal_zuk', 'sol_heredit', 'the_corrupted_gauntlet', 'the_gauntlet'];
    const WILDERNESS_BOSSES = ['chaos_fanatic', 'crazy_archaeologist', 'scorpia', 'king_black_dragon', 'chaos_elemental', 'calvarion', 'vetion', 'spindel', 'venenatis', 'artio', 'callisto'];
    const SLAYER_BOSSES = ['grotesque_guardians', 'abyssal_sire', 'kraken', 'cerberus', 'araxxor', 'thermonuclear_smoke_devil', 'alchemical_hydra'];

    const bosses = await db.getAll(`
        SELECT name 
        FROM skills_bosses
        WHERE type = 'Boss'
        ORDER BY last_selected_at ASC
    `);

    for (const boss of bosses) {
        const formattedName = capitalizeName(boss.name);
        let actionText, value, basePoints;

        if (RAID_BOSSES.includes(boss.name)) {
            actionText = 'Complete';
            value = generateRandomValue(5, 35, 5);
        } else if (HARD_RAID_BOSSES.includes(boss.name)) {
            actionText = 'Complete';
            value = generateRandomValue(1, 10, 1);
        } else if (WILDERNESS_BOSSES.includes(boss.name)) {
            actionText = 'Kill';
            value = generateRandomValue(10, 80, 5);
        } else if (SLAYER_BOSSES.includes(boss.name)) {
            actionText = 'Slay';
            value = generateRandomValue(10, 150, 5);
        } else if (LOOT_BOSSES.includes(boss.name)) {
            actionText = 'Loot';
            value = generateRandomValue(1, 40, 1);
        } else if (HARD_BOSSES.includes(boss.name)) {
            actionText = 'Defeat';
            value = generateRandomValue(2, 20, 2);
        } else if (MINIGAME_BOSSES.includes(boss.name)) {
            actionText = 'Defeat';
            value = generateRandomValue(1, 5, 1);
        } else if (SPECIAL_BOSSES.includes(boss.name)) {
            actionText = 'Kill';
            value = generateRandomValue(1, 15, 2);
        } else if (RARE_BOSSES.includes(boss.name)) {
            actionText = 'Kill';
            value = generateRandomValue(1, 1, 1);
        } else {
            actionText = 'Kill';
            value = generateRandomValue(10, 150, 5);
        }

        const description = `${actionText} ${value} ${formattedName}`;
        const existing = await db.getOne('SELECT COUNT(*) AS count FROM bingo_tasks WHERE description = ?', [description]);
        if (existing.count > 0) {
            logger.warn(`⚠️ [DynamicTaskGenerator] Duplicate task detected: ${description}`);
            continue;
        }

        basePoints = calculateBasePoints('Kill', value);
        if (RAID_BOSSES.includes(boss.name)) {
            basePoints *= 4;
        }

        if (HARD_RAID_BOSSES.includes(boss.name)) {
            basePoints *= 20;
        }

        if (WILDERNESS_BOSSES.includes(boss.name)) {
            basePoints *= 2;
        }

        if (SLAYER_BOSSES.includes(boss.name)) {
            basePoints *= 5;
        }

        if (LOOT_BOSSES.includes(boss.name)) {
            basePoints *= 3;
        }

        if (HARD_BOSSES.includes(boss.name)) {
            basePoints *= 7;
        }

        if (MINIGAME_BOSSES.includes(boss.name)) {
            basePoints *= 20;
        }

        if (SPECIAL_BOSSES.includes(boss.name)) {
            basePoints *= 10;
        }

        if (RARE_BOSSES.includes(boss.name)) {
            basePoints *= 300;
        }

        await db.runQuery(
            `
                INSERT INTO bingo_tasks 
                (category, type, description, parameter, value, is_dynamic, base_points)
                VALUES ('Boss', 'Kill', ?, ?, ?, 1, ?)
            `,
            [description, boss.name, value, basePoints],
        );
    }
}

/**
 * Rounds the XP value according to its magnitude.
 * - For XP values below THRESHOLD (1,000,000), round down to the nearest ROUND_STEP_BELOW (5,000).
 * - For XP values equal to or above THRESHOLD, round down to the nearest ROUND_STEP_ABOVE (10,000).
 *
 * @param {number} xp - The raw XP value.
 * @returns {number} - The rounded XP value.
 */
function roundXP(xp) {
    const THRESHOLD = 1000000;
    const ROUND_STEP_BELOW = 5000;
    const ROUND_STEP_ABOVE = 10000;
    const roundStep = xp < THRESHOLD ? ROUND_STEP_BELOW : ROUND_STEP_ABOVE;
    return Math.floor(xp / roundStep) * roundStep;
}

/**
 * Generates dynamic skill tasks with rounded XP values.
 * For each skill, this function generates a random XP value,
 * rounds it using the `roundXP` function, and creates a new task.
 */
async function generateSkillTasks() {
    const SLOW_SKILLS = ['slayer', 'runecrafting', 'hunter', 'agility', 'farming'];
    const EXPENSIVE_SKILLS = ['prayer', 'construction', 'herblore'];
    // Configurable constants for XP generation.
    let MIN_XP = 250000;
    let MAX_RANDOM_XP = 2500000;

    const skills = await db.getAll(`
        SELECT name 
        FROM skills_bosses
        WHERE type = 'Skill'
        ORDER BY last_selected_at ASC
    `);

    for (const skill of skills) {
        if (SLOW_SKILLS.includes(skill.name.toLowerCase())) {
            MIN_XP = 100000;
            MAX_RANDOM_XP = 1000000;
        }
        if (EXPENSIVE_SKILLS.includes(skill.name.toLowerCase())) {
            MIN_XP = 100000;
            MAX_RANDOM_XP = 1500000;
        }
        const formattedName = capitalizeName(skill.name);
        // Generate a raw XP value.
        const rawXP = Math.floor((Math.random() * MAX_RANDOM_XP) / 2) * 2 + MIN_XP;
        // Round the XP value using the new function.
        const value = roundXP(rawXP);
        const description = `Gain ${value.toLocaleString()} XP in ${formattedName}`;

        const existing = await db.getOne('SELECT COUNT(*) AS count FROM bingo_tasks WHERE description = ?', [description]);
        if (existing.count > 0) {
            logger.warn(`⚠️ [DynamicTaskGenerator] Duplicate task detected: ${description}`);
            continue;
        }

        let basePoints = calculateBasePoints('Exp', value);
        if (SLOW_SKILLS.includes(skill.name.toLowerCase())) {
            basePoints *= 3;
        }
        if (EXPENSIVE_SKILLS.includes(skill.name.toLowerCase())) {
            basePoints *= 4;
        } else {
            basePoints *= 2;
        }

        await db.runQuery(
            `
                INSERT INTO bingo_tasks 
                (category, type, description, parameter, value, is_dynamic, base_points)
                VALUES ('Skill', 'Exp', ?, ?, ?, 1, ?)
            `,
            [description, skill.name, value, basePoints],
        );
    }
}

/**
 *
 */
async function generateActivityTasks() {
    const MINIGAMES = ['guardians_of_the_rift'];
    const EASY_CLUES = ['clue_scrolls_beginner', 'clue_scrolls_easy'];
    const MED_CLUES = ['clue_scrolls_medium'];
    const HARD_CLUES = ['clue_scrolls_hard'];
    const ELITE_CLUES = ['clue_scrolls_elite'];
    const MASTER_CLUES = ['clue_scrolls_master'];

    const activities = await db.getAll(`
        SELECT name 
        FROM hiscores_activities
        WHERE type = 'Activity'
        ORDER BY last_selected_at ASC
    `);

    for (const activity of activities) {
        const formattedName = capitalizeName(activity.name);
        const actionText = 'Complete';
        let value, basePoints;
        let taskName = activity.name;

        if (MINIGAMES.includes(taskName)) {
            value = generateRandomValue(20, 75, 5);
        } else if (EASY_CLUES.includes(taskName)) {
            value = generateRandomValue(10, 60, 5);
        } else if (MED_CLUES.includes(taskName)) {
            value = generateRandomValue(10, 40, 1);
        } else if (HARD_CLUES.includes(taskName)) {
            value = generateRandomValue(5, 20, 1);
        } else if (ELITE_CLUES.includes(taskName)) {
            value = generateRandomValue(1, 5, 1);
        } else if (MASTER_CLUES.includes(taskName)) {
            value = generateRandomValue(1, 1, 1);
        }

        // Only generate a task if the activity is defined in one of the arrays.
        if (value === undefined) {
            continue;
        }

        if (taskName === 'guardians_of_the_rift') {
            taskName = 'Guardians Of The Rift Games';
        } else if (taskName === 'clue_scrolls_beginner') {
            taskName = 'Beginner Clue Scrolls';
        } else if (taskName === 'clue_scrolls_easy') {
            taskName = 'Easy Clue Scrolls';
        } else if (taskName === 'clue_scrolls_medium') {
            taskName = 'Medium Clue Scrolls';
        } else if (taskName === 'clue_scrolls_hard') {
            taskName = 'Hard Clue Scrolls';
        } else if (taskName === 'clue_scrolls_elite') {
            taskName = 'Elite Clue Scrolls';
        } else if (taskName === 'clue_scrolls_master') {
            taskName = 'Master Clue Scroll';
        } else {
            taskName = formattedName;
        }

        const description = `${actionText} ${value} ${taskName}`;
        const existing = await db.getOne('SELECT COUNT(*) AS count FROM bingo_tasks WHERE description = ?', [description]);

        if (existing.count > 0) {
            logger.warn(`⚠️ [DynamicTaskGenerator] Duplicate task detected: ${description}`);
            continue;
        }

        basePoints = calculateBasePoints('Score', value);
        if (HARD_CLUES.includes(activity.name)) {
            basePoints *= 6;
        }
        if (ELITE_CLUES.includes(activity.name)) {
            basePoints *= 12;
        }
        if (MASTER_CLUES.includes(activity.name)) {
            basePoints *= 300;
        }

        await db.runQuery(
            `
                INSERT INTO bingo_tasks 
                (category, type, description, parameter, value, is_dynamic, base_points)
                VALUES ('Activity', 'Score', ?, ?, ?, 1, ?)
            `,
            [description, activity.name, value, basePoints],
        );
    }
}

/**
 *
 */
async function generateDropTasks() {
    const filePath = path.join(__dirname, '../../../data/bingo/item_drops.json');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const dropList = data.droptask_list[0];
    const drops = dropList.sort(() => 0.5 - Math.random()).slice(0, 5);

    for (const drop of drops) {
        const description = `Receive a drop: ${drop.replace(/_/g, ' ')}`;
        const existing = await db.getOne('SELECT COUNT(*) AS count FROM bingo_tasks WHERE description = ?', [description]);
        if (existing.count > 0) {
            logger.warn(`⚠️ [DynamicTaskGenerator] Duplicate task detected: ${description}`);
            continue;
        }
        const basePoints = calculateBasePoints('Drop', 1);
        await db.runQuery(
            `
                INSERT INTO bingo_tasks 
                (category, type, description, parameter, value, is_dynamic, base_points)
                VALUES ('Drop', 'Drop', ?, ?, 1, 1, ?)
            `,
            [description, drop, basePoints],
        );
    }
}

// Note: We are now not generating any additional message-based tasks for Clue, Collection, or Pet.
module.exports = { generateDynamicTasks, clearDynamicTasks };
