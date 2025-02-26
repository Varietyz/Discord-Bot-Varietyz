const { runQuery } = require('../modules/utils/essentials/dbUtils');
const logger = require('../modules/utils/essentials/logger');
const initializeMainTables = async () => {
    try {
        logger.info('🔄 Ensuring all necessary tables exist...');
        const tables = {
            registered_rsn: `
                player_id INTEGER PRIMARY KEY,
                discord_id TEXT NOT NULL,
                rsn TEXT NOT NULL UNIQUE,
                registered_at DATETIME DEFAULT CURRENT_TIMESTAMP
            `,
            clan_members: `
                player_id INTEGER PRIMARY KEY,
                rsn TEXT NOT NULL UNIQUE,
                rank TEXT,
                joined_at DATETIME DEFAULT CURRENT_TIMESTAMP
            `,
            recent_name_changes: `
                idx INTEGER PRIMARY KEY AUTOINCREMENT,
                player_id INTEGER NOT NULL,
                old_rsn TEXT NOT NULL,
                new_rsn TEXT NOT NULL,
                resolved_at DATETIME DEFAULT CURRENT_TIMESTAMP
            `,
            player_data: `
                player_id INTEGER NOT NULL,
                rsn TEXT NOT NULL,
                type TEXT NOT NULL,
                metric TEXT NOT NULL,
                kills INTEGER DEFAULT 0,
                score INTEGER DEFAULT 0,
                level INTEGER DEFAULT 0,
                exp BIGINT DEFAULT 0,
                last_changed DATETIME,
                last_updated DATETIME,
                PRIMARY KEY (player_id, type, metric)
            `,
            player_fetch_times: `
                player_id INTEGER PRIMARY KEY,
                last_fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
            `,
            active_inactive: `
                player_id INTEGER PRIMARY KEY,
                last_progressed DATETIME
            `,
            competitions: `
                competition_id INTEGER PRIMARY KEY,
                title TEXT NOT NULL,
                metric TEXT NOT NULL,
                type TEXT CHECK(type IN ('SOTW', 'BOTW')) NOT NULL,
                starts_at DATETIME NOT NULL,
                ends_at DATETIME NOT NULL,
                verification_code TEXT,
                previous_metric TEXT,
                last_selected_at DATETIME,
                message_id TEXT,
                leaderboard_message_id TEXT,
                rotation_index INTEGER DEFAULT 0,
                final_leaderboard_sent INTEGER DEFAULT 0
            `,
            votes: `
                idx INTEGER PRIMARY KEY AUTOINCREMENT,
                discord_id TEXT NOT NULL,
                competition_id INTEGER NOT NULL,
                vote_choice TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (discord_id) REFERENCES users(player_id) ON DELETE CASCADE,
                FOREIGN KEY (competition_id) REFERENCES competitions(competition_id),
                UNIQUE(discord_id, competition_id)
            `,
            users: `
                idx INTEGER PRIMARY KEY AUTOINCREMENT,
                player_id INTEGER NOT NULL,
                rsn TEXT NOT NULL,
                total_wins INTEGER DEFAULT 0,
                total_metric_gain_sotw INTEGER DEFAULT 0,
                total_metric_gain_botw INTEGER DEFAULT 0,
                total_top10_appearances_sotw INTEGER DEFAULT 0,
                total_top10_appearances_botw INTEGER DEFAULT 0
            `,
            winners: `
                competition_id INTEGER PRIMARY KEY,
                player_id INTEGER NOT NULL,
                rsn TEXT NOT NULL,
                metric_gain INTEGER NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (competition_id) REFERENCES competitions(competition_id)
            `,
            skills_bosses: `
                idx INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT CHECK(type IN ('Skill', 'Boss')) NOT NULL,
                last_selected_at DATETIME
            `,
            hiscores_activities: `        
                idx INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT CHECK(type IN ('Activity')) NOT NULL,
                last_selected_at DATETIME
                `,
            competition_queue: `
                idx INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT CHECK(type IN ('SOTW', 'BOTW')) NOT NULL,
                metric TEXT NOT NULL,
                queued_at DATETIME DEFAULT CURRENT_TIMESTAMP
            `,
            config: `
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            `,
            clanchat_config: `
                clanchat_key TEXT PRIMARY KEY,
                secret_key TEXT NOT NULL UNIQUE,
                clan_name TEXT NOT NULL,
                webhook_url TEXT NOT NULL,
                channel_id TEXT NOT NULL,
                endpoint_url TEXT NOT NULL,
                registered_by TEXT NOT NULL
            `,
            modal_tracking: `
                idx INTEGER PRIMARY KEY AUTOINCREMENT,
                modal_key TEXT NOT NULL,
                registered_by TEXT NOT NULL,
                registered_at DATETIME DEFAULT CURRENT_TIMESTAMP
            `,
            player_points: `
                player_id INTEGER NOT NULL,
                type TEXT NOT NULL,                  
                points INTEGER DEFAULT 0,             
                last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (player_id, type)
            `,
        };

        for (const [table, schema] of Object.entries(tables)) {
            await runQuery(`CREATE TABLE IF NOT EXISTS ${table} (${schema});`);
            logger.info(`✅ Ensured "${table}" table exists.`);
        }
        logger.info('✅ All main competition tables have been successfully initialized.');
    } catch (error) {
        logger.error(`❌ Error initializing competition tables: ${error.message}`);
    }
};
module.exports = initializeMainTables;
