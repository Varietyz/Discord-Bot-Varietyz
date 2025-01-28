const fs = require('fs');
const path = require('path');
const db = require('../modules/utils/dbUtils');
const logger = require('../modules/utils/logger');
// Path to the resources directory
const resourcesPath = path.resolve(__dirname, '../resources');

/**
 * Recursively get all files from a directory and its subdirectories.
 * @param {string} dir - Directory to scan.
 * @returns {Array<string>} - Array of absolute file paths.
 */
function getAllFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files = entries.filter((file) => !file.isDirectory()).map((file) => path.resolve(dir, file.name));
    const folders = entries.filter((folder) => folder.isDirectory());

    // Recursively get files in subdirectories
    for (const folder of folders) {
        files.push(...getAllFiles(path.resolve(dir, folder.name)));
    }

    return files;
}

/**
 * Populate the image cache table with all files in the resources directory.
 */
async function populateImageCache() {
    const files = getAllFiles(resourcesPath);
    await db.runQuery(`
            CREATE TABLE IF NOT EXISTS image_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name TEXT UNIQUE NOT NULL,
    file_path TEXT NOT NULL
);
        `);
    logger.info('Ensured skills_bosses table.');

    // Start a transaction for better performance
    const queries = files.map((file) => {
        const fileName = path.basename(file, path.extname(file)).toLowerCase(); // Lowercase filename without extension
        return {
            query: `
                INSERT OR REPLACE INTO image_cache (file_name, file_path)
                VALUES (?, ?)
            `,
            params: [fileName, file], // Insert or update the file name and path
        };
    });

    try {
        await db.runTransaction(queries);
        console.log('Image cache populated successfully.');
    } catch (error) {
        console.error('Error populating image cache:', error.message);
    }
}

// Run the script
populateImageCache();
