/**
 * @fileoverview
 * **Initialize Main Tables Migration** ⚙️
 *
 * This script initializes the main competition tables in the database.
 * It ensures that all necessary tables exist by creating them if they do not.
 *
 * @module src/migrations/initializeTables
 */

const db = require('../modules/utils/dbUtils');
const logger = require('../modules/utils/logger');

/**
 * 🎯 **Initializes Main Competition Tables**
 *
 * This asynchronous function ensures that all required tables for competitions are present in the database.
 * It iterates over a predefined set of table schemas and creates each table if it does not already exist.
 *
 * @async
 * @function initializeTables
 *
 * @example
 * // Initialize all main tables:
 * initializeTables().then(() => console.log('Tables are ready!'));
 */
const initializeTables = async () => {
    try {
        logger.info('🔄 Ensuring all necessary competition tables exist...');

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
                idx INTEGER PRIMARY KEY AUTOINCREMENT,
                player_id INTEGER NOT NULL,
                rsn TEXT NOT NULL,
                data_key TEXT NOT NULL,
                data_value TEXT,
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
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
            log_channels: `
                log_key TEXT PRIMARY KEY,
                channel_id TEXT NOT NULL UNIQUE
            `,

            guild_channels: `
                channel_id TEXT PRIMARY KEY,
                channel_key TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                type INTEGER NOT NULL,
                category TEXT DEFAULT 'general',
                permissions INTEGER DEFAULT 0
            `,

            guild_roles: `
                role_key TEXT PRIMARY KEY,
                role_id TEXT NOT NULL UNIQUE,
                permissions INTEGER DEFAULT 0
            `,

            guild_webhooks: `
                webhook_key TEXT PRIMARY KEY,
                webhook_url TEXT NOT NULL UNIQUE,
                channel_id TEXT DEFAULT NULL,
                FOREIGN KEY (channel_id) REFERENCES guild_channels(channel_id) ON DELETE SET NULL
            `,

            guild_emojis: `
                emoji_id TEXT PRIMARY KEY,
                emoji_name TEXT NOT NULL,
                emoji_format TEXT NOT NULL,
                animated INTEGER DEFAULT 0
            `,

            guild_members: `
                user_id TEXT PRIMARY KEY,
                username TEXT NOT NULL
            `,
            guild_events: `
                event_id TEXT PRIMARY KEY,
                guild_id TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT DEFAULT 'No description',
                creator_id TEXT DEFAULT 'Unknown',
                event_type INTEGER NOT NULL,
                privacy INTEGER NOT NULL,
                start_time INTEGER NOT NULL,
                channel_id TEXT DEFAULT NULL,
                banner_url TEXT DEFAULT NULL
            `,
        };

        for (const [table, schema] of Object.entries(tables)) {
            await db.runQuery(`CREATE TABLE IF NOT EXISTS ${table} (${schema});`);
            logger.info(`✅ Ensured "${table}" table exists.`);
        }

        logger.info('✅ All main competition tables have been successfully initialized.');
    } catch (error) {
        logger.error(`❌ Error initializing competition tables: ${error.message}`);
    }
};

module.exports = initializeTables;
