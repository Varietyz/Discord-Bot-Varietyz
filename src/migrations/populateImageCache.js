const fs = require('fs');
const path = require('path');
const logger = require('../modules/utils/essentials/logger');
const db = require('../modules/utils/essentials/dbUtils');

/**
 * Path to the resources directory.
 * @constant {string}
 */
const resourcesPath = path.resolve(__dirname, '../resources');

/**
 * Recursively retrieves all files from a directory and its subdirectories along with metadata.
 *
 * @param {string} dir - The directory to scan.
 * @returns {Array<Object>} An array of file metadata objects.
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

    // Recursively process subdirectories.
    const folders = entries.filter((entry) => entry.isDirectory());
    for (const folder of folders) {
        files.push(...getAllFilesWithMetadata(path.resolve(dir, folder.name)));
    }

    return files;
}

/**
 * Populates the image_cache tables in the database with file metadata from the resources directory.
 * In addition to updating/inserting records, it removes any records that correspond to files no longer present.
 *
 * This function performs the following steps:
 * 1. Retrieves all files from the resources directory.
 * 2. Groups files by their subfolder (or under 'resources' for root-level files).
 * 3. For each group:
 * - Ensures a corresponding table exists (table name is sanitized from the folder name).
 * - Attempts to update an existing record with the new file path. If no record is updated, a new record is inserted.
 * - Retrieves existing database records and removes any that no longer have a corresponding file.
 *
 * Error handling is implemented at each critical step to ensure that errors are logged and processing can continue where possible.
 *
 * @async
 * @function populateImageCache
 * @returns {Promise<void>} A promise that resolves when the image cache has been successfully updated.
 */
async function populateImageCache() {
    try {
        // Retrieve file metadata from the resources directory.
        const files = getAllFilesWithMetadata(resourcesPath);

        // Group files by folder using the relative path from the resources directory.
        const groups = {};
        for (const file of files) {
            // Use the relative path computed from the resources folder.
            const relative = file.relativeToResources;
            // If there is no subfolder (i.e., no "/" in the relative path), group it under "resources".
            let folder = relative.includes('/') ? relative.split('/')[0] : 'resources';
            // If the folder name is "src", reassign it to "resources".
            if (folder === 'src') {
                folder = 'resources';
            }
            if (!groups[folder]) {
                groups[folder] = [];
            }
            groups[folder].push(file);
        }

        // Process each group (folder).
        for (const folderName in groups) {
            // Sanitize folder name to create a valid table name.
            const sanitizedFolderName = folderName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const tableName = sanitizedFolderName;

            // Wrap the table creation in a try/catch to handle potential errors.
            try {
                await db.image.runQuery(`
                    CREATE TABLE IF NOT EXISTS ${tableName} (
                        idx INTEGER PRIMARY KEY AUTOINCREMENT,
                        file_name TEXT NOT NULL,
                        file_path TEXT NOT NULL
                    );
                `);
                logger.info(`✅ Ensured table ${tableName} exists.`);
            } catch (tableError) {
                logger.error(`Error ensuring table "${tableName}" exists:`, tableError);
                // Skip this group if table creation fails.
                continue;
            }

            const groupFiles = groups[folderName];

            // Process each file in the group.
            for (const { fileName, filePath } of groupFiles) {
                try {
                    // Attempt to update the record.
                    const updateResult = await db.image.runQuery(
                        `
                        UPDATE ${tableName}
                        SET file_path = ?
                        WHERE file_name = ?
                        `,
                        [filePath, fileName],
                    );

                    // If no record was updated, insert a new record.
                    if (updateResult.changes === 0) {
                        await db.image.runQuery(
                            `
                            INSERT INTO ${tableName} (file_name, file_path)
                            VALUES (?, ?)
                            `,
                            [fileName, filePath],
                        );
                    }
                } catch (fileError) {
                    logger.error(`Error processing file "${fileName}" in table "${tableName}":`, fileError);
                    // Continue with the next file in the group.
                }
            }
            logger.info(`✅ Table ${tableName} updated successfully with ${groupFiles.length} records.`);

            // Remove records for files that no longer exist.
            try {
                // Use imageGetAll for a SELECT query on the image cache database.
                const existingRecords = await db.image.getAll(`SELECT file_name FROM ${tableName}`);

                // Debug: Log the records fetched from the DB.
                logger.debug(`Existing records for table "${tableName}":`, existingRecords);

                // Create a set of current file names (normalized) for quick lookup.
                const currentFileNames = new Set(groupFiles.map((file) => file.fileName.trim().toLowerCase()));

                // Iterate over each record in the DB and delete if it's missing in the current file list.
                for (const record of existingRecords) {
                    const dbFileName = record.file_name.trim().toLowerCase();
                    if (!currentFileNames.has(dbFileName)) {
                        const deleteResult = await db.image.runQuery(`DELETE FROM ${tableName} WHERE file_name = ?`, [dbFileName]);
                        logger.info(`❌ Removed missing file '${dbFileName}' from table ${tableName}.`, deleteResult);
                    }
                }
            } catch (deleteError) {
                logger.error(`Error removing missing files from table "${tableName}":`, deleteError);
            }
        }

        logger.info('✅ Image cache populated.');
    } catch (error) {
        logger.error('Error populating image cache:', error);
        throw error;
    }
}

module.exports = { populateImageCache };
