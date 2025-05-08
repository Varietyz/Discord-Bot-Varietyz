const fs      = require('fs');
const path    = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH   = path.join(__dirname, '..', 'data', 'database.sqlite');
const JSON_PATH = path.join(__dirname, '..', 'data', 'varietyz_list.json');

const MONTHS = {
    Jan:'01', Feb:'02', Mar:'03', Apr:'04',
    May:'05', Jun:'06', Jul:'07', Aug:'08',
    Sep:'09', Oct:'10', Nov:'11', Dec:'12'
};

function toIsoDate(joinedDate) {
    const [d, mon, y] = joinedDate.split('-');
    const dd = d.trim().padStart(2, '0');
    const mm = MONTHS[mon];
    if (!mm) throw new Error(`Unknown month "${mon}"`);
    return `${y}-${mm}-${dd}`;
}

function normalize(str) {
    return str
        .trim()
        .toLowerCase()
        .replace(/[-_]/g, ' ');
}

let records;
try {
    records = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
} catch (err) {
    console.error(`❌ Failed to load or parse JSON: ${err.message}`);
    process.exit(1);
}

const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE, err => {
    if (err) {
        console.error(`❌ Could not open database at ${DB_PATH}: ${err.message}`);
        process.exit(1);
    }
    console.log(`✅ Opened DB at ${DB_PATH}`);
});

db.serialize(() => {
    console.log(`🔄 Updating joined_at for ${records.length} entries…`);
    db.run('BEGIN TRANSACTION');

    const stmt = db.prepare(`
    UPDATE clan_members
       SET joined_at = ?
     WHERE LOWER(REPLACE(REPLACE(rsn, '-', ' '), '_', ' ')) = ?
  `);

    for (const { rsn, joinedDate } of records) {
        const cleanRsn = rsn.trim();
        const key       = normalize(cleanRsn);
        let iso;
        try {
            iso = toIsoDate(joinedDate);
        } catch (e) {
            console.warn(`⚠️  Skipping "${cleanRsn}": ${e.message}`);
            continue;
        }

        stmt.run(iso, key, function(err) {
            if (err) {
                console.error(`   ❌ ${cleanRsn}: ${err.message}`);
            } else if (this.changes === 0) {
                console.warn(`   ⚠️  No match for "${cleanRsn}" (normalized="${key}")`);
            } else {
                console.log(`   ✅ ${cleanRsn} → joined_at=${iso}`);
            }
        });
    }

    stmt.finalize();
    db.run('COMMIT', () => {
        console.log('🎉 All updates complete.');
        db.close();
    });
});
