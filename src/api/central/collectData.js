const db = require('../../modules/utils/essentials/dbUtils'); 

async function collectData(data) {
    try {
        await db.runQuery('INSERT INTO collected_data (data) VALUES (?)', [
            JSON.stringify(data),
        ]);
    } catch (err) {
        throw new Error(`Failed to collect data: ${err.message}`);
    }
}

module.exports = {
    collectData,
};
