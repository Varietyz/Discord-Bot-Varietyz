const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const clanRankData = require('./clanRankData.json');

const jsonData = clanRankData;

// Output Directory
const outputDir = path.join(__dirname, 'cache');

// Ensure Output Directory Exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

// Function to Adjust Transparency
const adjustTransparency = async (inputBuffer) => {
    const image = sharp(inputBuffer);

    // Extract metadata to get image dimensions
    const { width, height } = await image.metadata();

    // Get the raw pixel data
    const raw = await image.raw().toBuffer();

    // Adjust the alpha channel
    for (let i = 3; i < raw.length; i += 4) {
        const alpha = raw[i];
        if (alpha < 255) {
            raw[i] = 0; // Set any transparent pixel (alpha < 255) to fully transparent
        }
    }

    // Return the buffer with adjusted transparency
    return sharp(Buffer.from(raw), {
        // @ts-ignore
        raw: { width, height, channels: 4 },
    })
        .png({ quality: 100, compressionLevel: 9 })
        .toBuffer();
};

// Function to Download and Process Images
const downloadAndProcessImages = async () => {
    const cache = {};

    for (const entry of jsonData) {
        const { name, url } = entry;
        const fileName = `${name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
        const filePath = path.join(outputDir, fileName);

        try {
            // Fetch Image
            const response = await axios({
                url,
                method: 'GET',
                responseType: 'arraybuffer',
            });

            // Process Transparency and Save Image
            const adjustedImage = await adjustTransparency(response.data);

            await sharp(adjustedImage).toFile(filePath);

            console.log(`Saved: ${fileName}`);
            cache[name] = filePath;
        } catch (error) {
            console.error(`Failed to process ${name}:`, error.message);
        }
    }

    // Write Cache JSON
    fs.writeFileSync(path.join(outputDir, 'cache.json'), JSON.stringify(cache, null, 2), 'utf-8');

    console.log('Image processing complete. Cache saved.');
};

// Execute the Function
downloadAndProcessImages().catch((error) => console.error('Error occurred:', error.message));
