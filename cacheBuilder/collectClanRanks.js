const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const clanRankData = require('./clanRankData.json');

const jsonData = clanRankData;

const outputDir = path.join(__dirname, 'cache');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

const adjustTransparencyAndResize = async (inputBuffer, width, height) => {
    const image = sharp(inputBuffer);

    const { width: originalWidth, height: originalHeight, channels } = await image.metadata();

    let rgbaImage = image;
    if (channels !== 4) {
        rgbaImage = image.ensureAlpha(); 
    }

    const raw = await rgbaImage.raw().toBuffer();

    for (let i = 3; i < raw.length; i += 4) {
        const alpha = raw[i];
        if (alpha < 255) {
            raw[i] = 0; 
        }
    }

    const normalizedImage = sharp(Buffer.from(raw), {

        raw: { width: originalWidth, height: originalHeight, channels: 4 },
    });

    return normalizedImage
        .resize(width, height, { fit: 'contain', kernel: 'lanczos3' }) 
        .png({ quality: 100, compressionLevel: 9 }) 
        .toBuffer();
};

const downloadAndProcessImages = async () => {
    const cache = {};

    for (const entry of jsonData) {
        const { name, url } = entry;
        const fileName = `${name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
        const filePath = path.join(outputDir, fileName);

        try {
            console.log(`Processing: ${name}`);

            const response = await axios({
                url,
                method: 'GET',
                responseType: 'arraybuffer',
            });

            const adjustedImage = await adjustTransparencyAndResize(response.data, 20, 20);

            await sharp(adjustedImage).toFile(filePath);

            console.log(`Saved: ${fileName}`);
            cache[name] = filePath;
        } catch (error) {
            console.error(`Failed to process ${name}:`, error.message);
        }
    }

    fs.writeFileSync(path.join(outputDir, 'cache.json'), JSON.stringify(cache, null, 2), 'utf-8');

    console.log('Image processing complete. Cache saved.');
};

downloadAndProcessImages().catch((error) => console.error('Error occurred:', error.message));
