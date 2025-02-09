const fs = require('fs');
const path = require('path');
const logger = require('../modules/utils/logger');
const {
    image: { runQuery },
} = require('../modules/utils/dbUtils');

/**
 * Path to the resources directory.
 * @constant {string}
 */
const resourcesPath = path.resolve(__dirname, '../resources');

/**
 * Base path for the project, starting at "src".
 * @constant {string}
 */
const projectBasePath = path.resolve(__dirname, '../');

/**
 * Recursively retrieves all files from a directory and its subdirectories along with metadata.
 *
 * This function scans the specified directory and all nested subdirectories to produce an array
 * of objects. Each object contains:
 * - `fileName`: The lowercase file name without its extension.
 * - `filePath`: The relative path starting with "src/" to the file, with forward slashes as separators.
 *
 * @function getAllFilesWithMetadata
 * @param {string} dir - The directory to scan.
 * @returns {Array<{ fileName: string, filePath: string }>} An array of file metadata objects.
 *
 * @example
 * const files = getAllFilesWithMetadata(resourcesPath);
 * console.log(files);
 */
function getAllFilesWithMetadata(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files = entries
        .filter((entry) => !entry.isDirectory())
        .map((entry) => ({
            fileName: path.basename(entry.name, path.extname(entry.name)).toLowerCase(),
            filePath: `src/${path.relative(projectBasePath, path.resolve(dir, entry.name)).replace(/\\/g, '/')}`,
        }));

    const folders = entries.filter((entry) => entry.isDirectory());
    for (const folder of folders) {
        files.push(...getAllFilesWithMetadata(path.resolve(dir, folder.name)));
    }

    return files;
}

/**
 * Populates the image_cache table in the database with file metadata from the resources directory.
 *
 * This function performs the following steps:
 * 1. Retrieves all files from the resources directory using `getAllFilesWithMetadata`.
 * 2. Drops the existing image_cache table (if it exists) to ensure a fresh setup.
 * 3. Iterates over each file's metadata and attempts to update an existing database entry.
 * If no existing entry is updated, it inserts a new record.
 *
 * @async
 * @function populateImageCache
 * @returns {Promise<void>} A promise that resolves when the image cache has been successfully updated.
 *
 * @example
 * // Run the script to populate the image cache.
 * populateImageCache()
 * .then(() => logger.info('Image cache populated.'))
 * .catch(err => logger.error(err));
 */
async function populateImageCache() {
    const files = getAllFilesWithMetadata(resourcesPath);

    await runQuery(`
        CREATE TABLE IF NOT EXISTS image_cache (
                idx INTEGER PRIMARY KEY AUTOINCREMENT,
                file_name TEXT NOT NULL,
                file_path TEXT NOT NULL
                );
    `);

    logger.info('✅ Ensured image_cache table exists.');

    try {
        for (const { fileName, filePath } of files) {
            const updateResult = await runQuery(
                `
                UPDATE image_cache
                SET file_path = ?
                WHERE file_name = ?
                `,
                [filePath, fileName],
            );

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

        logger.info('✅ Image cache updated successfully.');
    } catch (error) {
        logger.error('❌ Error populating image cache:', error.message);
    }
}

populateImageCache();
