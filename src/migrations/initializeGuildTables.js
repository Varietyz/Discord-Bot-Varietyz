/**
 * @fileoverview
 * **Initialize Main Tables Migration** ⚙️
 *
 * This script initializes the main competition tables in the database.
 * It ensures that all necessary tables exist by creating them if they do not.
 *
 * @module src/migrations/initializeTables
 */

const {
    guild: { runQuery },
} = require('../modules/utils/dbUtils');

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
const initializeGuildTables = async () => {
    try {
        logger.info('🔄 Ensuring all necessary guild tables exist...');

        const tables = {
            log_channels: `
                log_key TEXT PRIMARY KEY,
                channel_id TEXT NOT NULL UNIQUE
            `,
            comp_channels: `
                comp_key TEXT PRIMARY KEY,
                channel_id TEXT NOT NULL UNIQUE
            `,
            setup_channels: `
                setup_key TEXT PRIMARY KEY,
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
                webhook_name TEXT DEFAULT 'Unnamed Webhook',
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
            await runQuery(`CREATE TABLE IF NOT EXISTS ${table} (${schema});`);
            logger.info(`✅ Ensured "${table}" table exists.`);
        }

        logger.info('✅ All main competition tables have been successfully initialized.');
    } catch (error) {
        logger.error(`❌ Error initializing competition tables: ${error.message}`);
    }
};

module.exports = initializeGuildTables;
