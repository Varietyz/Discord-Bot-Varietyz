const fs = require('fs');
const path = require('path');

const baseFolder = path.resolve(__dirname, '../../src');

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

                    replaceInFiles(filePath);
                } else if (stats.isFile() && file.endsWith('.js')) {

                    fs.readFile(filePath, 'utf8', (err, data) => {
                        if (err) {
                            console.error(`Error reading file: ${filePath}`, err);
                            return;
                        }

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

replaceInFiles(baseFolder);
