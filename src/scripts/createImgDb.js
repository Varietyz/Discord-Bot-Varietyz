const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const logger = require('../modules/utils/essentials/logger'); 

const dbPath = path.join(__dirname, '..', 'data', 'image_cache.db');

function initializeDatabase() {

    if (!fs.existsSync(path.dirname(dbPath))) {
        fs.mkdirSync(path.dirname(dbPath), { recursive: true });
        logger.info('Created database directory.');
    }

    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            logger.error(`Error connecting to SQLite: ${err.message}`);
            throw err; 
        } else {
            logger.info(`Connected to SQLite at: ${dbPath}`);
        }
    });

    return db;
}

function createTables(db) {
    db.run(`
        CREATE TABLE IF NOT EXISTS image_cache (
                idx INTEGER PRIMARY KEY AUTOINCREMENT,
                file_name TEXT NOT NULL,
                file_path TEXT NOT NULL
                );
    `);
}

(function main() {
    try {
        const db = initializeDatabase();

        db.serialize(() => {
            createTables(db);
        });

        db.close((err) => {
            if (err) {
                logger.error(`Error closing the database: ${err.message}`);
            } else {
                logger.info('Database schema created. No data imported. DB closed successfully.');
            }
            process.exit(0);
        });
    } catch (error) {
        logger.error(`Database initialization failed: ${error.message}`);
        throw error; 
    }
})();
