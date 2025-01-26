const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
// eslint-disable-next-line node/no-unpublished-require
const clanRankData = require('./clanRankData.json');

const jsonData = clanRankData;

// Output Directory
const outputDir = path.join(__dirname, 'cache');

// Ensure Output Directory Exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

// Function to Adjust Transparency and Resize
const adjustTransparencyAndResize = async (inputBuffer, width, height) => {
    const image = sharp(inputBuffer);

    // Extract metadata to get image dimensions
    const { width: originalWidth, height: originalHeight, channels } = await image.metadata();

    // Ensure the image has an alpha channel
    let rgbaImage = image;
    if (channels !== 4) {
        rgbaImage = image.ensureAlpha(); // Add a fully opaque alpha channel if missing
    }

    // Get the raw pixel data
    const raw = await rgbaImage.raw().toBuffer();

    // Normalize the alpha channel
    for (let i = 3; i < raw.length; i += 4) {
        const alpha = raw[i];
        if (alpha < 255) {
            raw[i] = 0; // Set any semi-transparent pixel (alpha < 255) to fully transparent
        }
    }

    // Create a normalized RGBA image with the raw data
    const normalizedImage = sharp(Buffer.from(raw), {
        // @ts-ignore
        raw: { width: originalWidth, height: originalHeight, channels: 4 },
    });

    // Resize the normalized image to the desired dimensions
    return normalizedImage
        .resize(width, height, { fit: 'contain', kernel: 'lanczos3' }) // High-quality resizing
        .png({ quality: 100, compressionLevel: 9 }) // Save as PNG with high quality
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
            console.log(`Processing: ${name}`);

            // Fetch Image
            const response = await axios({
                url,
                method: 'GET',
                responseType: 'arraybuffer',
            });

            // Process Transparency, Resize, and Save Image
            const adjustedImage = await adjustTransparencyAndResize(response.data, 20, 20);

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
