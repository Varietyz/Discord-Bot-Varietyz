/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

// Folder to search for .js files
const baseFolder = path.resolve(__dirname, './src');

/**
 * Recursively search through a folder and replace content in .js files.
 * @param folder
 */
function replaceInFiles(folder) {
    fs.readdir(folder, (err, files) => {
        if (err) {
            console.error(`Error reading folder: ${folder}`, err);
            return;
        }

        files.forEach((file) => {
            const filePath = path.join(folder, file);

            fs.stat(filePath, (err, stats) => {
                if (err) {
                    console.error(`Error reading file: ${filePath}`, err);
                    return;
                }

                if (stats.isDirectory()) {
                    // Recursively process subfolders
                    replaceInFiles(filePath);
                } else if (stats.isFile() && file.endsWith('.js')) {
                    // Read, replace, and write the file
                    fs.readFile(filePath, 'utf8', (err, data) => {
                        if (err) {
                            console.error(`Error reading file: ${filePath}`, err);
                            return;
                        }

                        // Replace 'ephemeral: true' with 'flags: 64'
                        const updatedData = data.replace(/ephemeral: true/g, 'flags: 64');

                        if (data !== updatedData) {
                            fs.writeFile(filePath, updatedData, 'utf8', (err) => {
                                if (err) {
                                    console.error(`Error writing file: ${filePath}`, err);
                                } else {
                                    console.log(`Updated: ${filePath}`);
                                }
                            });
                        }
                    });
                }
            });
        });
    });
}

// Start the replacement process
replaceInFiles(baseFolder);
