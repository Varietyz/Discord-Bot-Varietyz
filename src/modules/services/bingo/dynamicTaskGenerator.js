// /modules/services/bingo/dynamicTaskGenerator.js
const logger = require('../../utils/essentials/logger');
const db = require('../../utils/essentials/dbUtils');
const fs = require('fs');
const path = require('path');

// Boss arrays for specialized task handling
const RAID_BOSSES = ['chambers_of_xeric', 'chambers_of_xeric_challenge_mode', 'tombs_of_amascut', 'tombs_of_amascut_expert', 'theatre_of_blood', 'theatre_of_blood_hard_mode'];
const LOOT_BOSSES = ['lunar_chests', 'barrows_chests'];
const SPECIAL_BOSSES = ['hespori', 'skotizo'];
const HARD_BOSSES = ['corporeal_beast'];
const MINIGAME_BOSSES = ['tztok_jad', 'tzkal_zuk', 'sol_heredit'];
const HARD_SKILLS = ['slayer', 'runecrafting', 'hunter'];
const RARE_BOSSES = ['mimic'];

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
 */
async function generateBossTasks() {
    const bosses = await db.getAll(`
        SELECT name 
        FROM skills_bosses
        WHERE type = 'Boss'
        ORDER BY last_selected_at ASC
    `);

    for (const boss of bosses) {
        let actionText, value, basePoints;

        if (RAID_BOSSES.includes(boss.name)) {
            actionText = 'Complete';
            value = generateRandomValue(5, 35, 5);
        } else if (LOOT_BOSSES.includes(boss.name)) {
            actionText = 'Loot';
            value = generateRandomValue(1, 40, 1);
        } else if (HARD_BOSSES.includes(boss.name)) {
            actionText = 'Defeat';
            value = generateRandomValue(5, 20, 10);
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

        const description = `${actionText} ${value} ${boss.name.replace(/_/g, ' ')}`;
        const existing = await db.getOne('SELECT COUNT(*) AS count FROM bingo_tasks WHERE description = ?', [description]);
        if (existing.count > 0) {
            logger.warn(`⚠️ [DynamicTaskGenerator] Duplicate task detected: ${description}`);
            continue;
        }

        basePoints = calculateBasePoints('Kill', value);
        if (actionText === 'Complete') {
            basePoints *= 5;
        } else if (LOOT_BOSSES.includes(boss.name)) {
            basePoints = calculateBasePoints('Drop', 1);
        } else if (HARD_BOSSES.includes(boss.name)) {
            basePoints *= 6;
        }

        if (MINIGAME_BOSSES.includes(boss.name)) {
            basePoints *= 50;
        }
        if (SPECIAL_BOSSES.includes(boss.name)) {
            basePoints *= 20;
        }
        if (RARE_BOSSES.includes(boss.name)) {
            basePoints *= 500;
        }
        await db.runQuery(
            `
                INSERT INTO bingo_tasks 
                (category, type, description, parameter, value, is_dynamic, base_points)
                VALUES ('Boss', 'Kill', ?, ?, ?, 1, ?)
            `,
            [description, boss.name, value, basePoints],
        );

        await db.runQuery(
            `
                UPDATE skills_bosses
                SET last_selected_at = CURRENT_TIMESTAMP
                WHERE name = ?
            `,
            [boss.name],
        );
    }
}

/**
 *
 */
async function generateSkillTasks() {
    const skills = await db.getAll(`
        SELECT name 
        FROM skills_bosses
        WHERE type = 'Skill'
        ORDER BY last_selected_at ASC
    `);

    for (const skill of skills) {
        const value = Math.floor((Math.random() * 3400000) / 2) * 2 + 100000;
        const description = `Gain ${value.toLocaleString()} XP in ${skill.name}`;
        const existing = await db.getOne('SELECT COUNT(*) AS count FROM bingo_tasks WHERE description = ?', [description]);
        if (existing.count > 0) {
            logger.warn(`⚠️ [DynamicTaskGenerator] Duplicate task detected: ${description}`);
            continue;
        }

        let basePoints = calculateBasePoints('Exp', value);
        if (HARD_SKILLS.includes(skill.name.toLowerCase())) {
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

        await db.runQuery(
            `
                UPDATE skills_bosses
                SET last_selected_at = CURRENT_TIMESTAMP
                WHERE name = ?
            `,
            [skill.name],
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
module.exports = generateDynamicTasks;
