const fs = require('fs');
const path = require('path');
const db = require('../modules/utils/dbUtils');
const logger = require('../modules/utils/logger');
const { runQuery } = require('../modules/utils/dbUtils');

// Path to the resources directory
const resourcesPath = path.resolve(__dirname, '../resources');

// Base path for the project, specifically starting at "src"
const projectBasePath = path.resolve(__dirname, '../');

/**
 * Recursively get all files from a directory and its subdirectories.
 * @param {string} dir - Directory to scan.
 * @returns {Array<{ fileName: string, filePath: string }>} - Array of file metadata.
 */
function getAllFilesWithMetadata(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files = entries
        .filter((file) => !file.isDirectory())
        .map((file) => ({
            fileName: path.basename(file.name, path.extname(file.name)).toLowerCase(), // File name without extension
            filePath: `src/${path.relative(projectBasePath, path.resolve(dir, file.name)).replace(/\\/g, '/')}`, // Always include "src/"
        }));

    const folders = entries.filter((folder) => folder.isDirectory());
    for (const folder of folders) {
        files.push(...getAllFilesWithMetadata(path.resolve(dir, folder.name)));
    }

    return files;
}

/**
 * Populate the image_cache table with all files in the resources directory.
 */
async function populateImageCache() {
    // Get all files with metadata
    const files = getAllFilesWithMetadata(resourcesPath);

    // Ensure the table exists
    await runQuery(`
        DROP TABLE IF EXISTS image_cache
    `);
    logger.info('Ensured image_cache table exists.');

    // Process each file for updates or inserts
    try {
        for (const { fileName, filePath } of files) {
            // Try updating the existing entry
            const updateResult = await runQuery(
                `
                UPDATE image_cache
                SET file_path = ?
                WHERE file_name = ?
            `,
                [filePath, fileName],
            );

            // If no rows were updated, insert a new entry
            if (updateResult.changes === 0) {
                await runQuery(
                    `
                    INSERT INTO image_cache (file_name, file_path)
                    VALUES (?, ?)
                `,
                    [fileName, filePath],
                );
            }
        }

        logger.info('Image cache updated successfully.');
    } catch (error) {
        logger.error('Error populating image cache:', error.message);
    }
}

// Run the script
populateImageCache();
