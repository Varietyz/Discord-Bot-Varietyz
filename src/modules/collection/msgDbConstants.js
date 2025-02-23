const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
require('dotenv').config();
const dbPromise = open({
    filename: 'src/data/messages.db',
    driver: sqlite3.Database,
});
const emojiCleanupTypes = ['DROP', 'QUESTS', 'COLLECTION_LOG', 'PERSONAL_BEST', 'PVP', 'PET_DROP', 'LEVEL_UP', 'COMBAT_ACHIEVEMENTS', 'CLUE_DROP', 'ATTENDANCE', 'DIARY'];
const systemTables = {
    DROP: 'drops',
    RAID_DROP: 'raid_drops',
    QUESTS: 'quest_completed',
    COLLECTION_LOG: 'collection_log',
    PERSONAL_BEST: 'personal_bests',
    PVP: 'pvp_messages',
    PET_DROP: 'pet_drops',
    LEVEL_UP: 'level_ups',
    COMBAT_ACHIEVEMENTS: 'combat_achievements',
    CLUE_DROP: 'clue_rewards',
    ATTENDANCE: 'clan_traffic',
    DIARY: 'diary_completed',
    TASKS: 'combat_tasks_completed',
    KEYS: 'loot_key_rewards',
};
const SYSTEM_PATTERNS = {
    DROP: ['received a drop\\:'],
    RAID_DROP: ['received special loot from a raid\\:'],
    QUESTS: ['<:Quest:1147703095711764550>'],
    COLLECTION_LOG: ['<:Collectionlog:1147701373455048814>'],
    PERSONAL_BEST: ['<:Speedrunningshopicon:1147703649917751357>'],
    PVP: ['<:BountyHuntertradericon:1147703810110791802>'],
    PET_DROP: ['<:Petshopicon:1147703359227297872>'],
    LEVEL_UP: ['<:Statsicon:1147702829029543996>'],
    COMBAT_ACHIEVEMENTS: ['<:CombatAchievementsicon:1147704502368075786>'],
    CLUE_DROP: ['<:DistractionDiversionmapicon:1147704823500779521>'],
    ATTENDANCE: ['<:AccountManagementCommunityicon:1147704337599041606>'],
    DIARY: ['<:TaskMastericon:1147705076677345322>'],
    TASKS: ['combat task\\:'],
    KEYS: ['has opened a loot key worth'],
};
module.exports = {
    dbPromise,
    systemTables,
    SYSTEM_PATTERNS,
    emojiCleanupTypes,
};