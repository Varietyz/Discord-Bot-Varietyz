const fs = require('fs');
const path = require('path');
const logger = require('../modules/utils/essentials/logger');
const {
    image: { runQuery },
} = require('../modules/utils/essentials/dbUtils');

/**
 * Path to the resources directory.
 * @constant {string}
 */
const resourcesPath = path.resolve(__dirname, '../resources');

/**
 * Recursively retrieves all files from a directory and its subdirectories along with metadata.
 *
 * @param {string} dir - The directory to scan.
 * @returns FileMetadata[] An array of file metadata objects.
 */
function getAllFilesWithMetadata(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files = entries
        .filter((entry) => !entry.isDirectory())
        .map((entry) => {
            const absolutePath = path.resolve(dir, entry.name);
            // Compute the path relative to the resources directory.
            const relativeToResources = path.relative(resourcesPath, absolutePath).replace(/\\/g, '/');
            return {
                fileName: path.basename(entry.name, path.extname(entry.name)).toLowerCase(),
                filePath: `src/resources/${relativeToResources}`,
                relativeToResources, // Always include this property.
            };
        });

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

    // Group files by folder using the relative path from the resources folder.
    // Group files by folder using the relative path from the resources folder.
    const groups = {};
    for (const file of files) {
        // Use the relative path computed from the resources folder.
        const relative = file.relativeToResources;
        // If there is no subfolder (i.e. no "/" in the relative path), group it under "resources"
        let folder = relative.includes('/') ? relative.split('/')[0] : 'resources';
        // If the folder name is "src", reassign it to "resources"
        if (folder === 'src') {
            folder = 'resources';
        }
        if (!groups[folder]) {
            groups[folder] = [];
        }
        groups[folder].push(file);
    }

    // For each folder, create a table and update/insert file metadata.
    for (const folderName in groups) {
        // Sanitize folder name to create a valid table name.
        const sanitizedFolderName = folderName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const tableName = sanitizedFolderName;

        // Create the table if it doesn't exist.
        await runQuery(`
            CREATE TABLE IF NOT EXISTS ${tableName} (
                idx INTEGER PRIMARY KEY AUTOINCREMENT,
                file_name TEXT NOT NULL,
                file_path TEXT NOT NULL
            );
        `);
        logger.info(`✅ Ensured table ${tableName} exists.`);

        // Process each file in the group.
        const groupFiles = groups[folderName];
        for (const { fileName, filePath } of groupFiles) {
            const updateResult = await runQuery(
                `
                UPDATE ${tableName}
                SET file_path = ?
                WHERE file_name = ?
                `,
                [filePath, fileName],
            );

            if (updateResult.changes === 0) {
                await runQuery(
                    `
                    INSERT INTO ${tableName} (file_name, file_path)
                    VALUES (?, ?)
                    `,
                    [fileName, filePath],
                );
            }
        }
        logger.info(`✅ Table ${tableName} updated successfully with ${groupFiles.length} records.`);
    }
}

populateImageCache();
