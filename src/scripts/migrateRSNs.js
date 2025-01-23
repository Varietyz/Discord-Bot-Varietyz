const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

// Database initialization
const dbPath = path.join(__dirname, "src", "data", "database.sqlite");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error connecting to SQLite:", err.message);
  } else {
    console.log("Connected to SQLite.");
  }
});

// Helper: Migrate Registered RSNs
const migrateRegisteredRSNs = (filePath) => {
  console.log(`Starting migration for ${filePath} into registered_rsn.`);

  db.serialize(() => {
    db.run(
      `CREATE TABLE IF NOT EXISTS registered_rsn (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        rsn TEXT NOT NULL,
        registered_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      (err) => {
        if (err) {
          console.error("Error creating registered_rsn table:", err.message);
          return;
        }
        console.log("Table registered_rsn created.");
      },
    );

    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const stmt = db.prepare(
      `INSERT INTO registered_rsn (user_id, rsn, registered_at) VALUES (?, ?, ?)`,
    );

    Object.entries(data).forEach(([userId, rsns]) => {
      if (!Array.isArray(rsns)) {
        console.warn(`Skipping invalid RSN entry for user_id ${userId}.`);
        return;
      }

      rsns.forEach((rsn) => {
        stmt.run([userId, rsn, new Date().toISOString()], (err) => {
          if (err)
            console.error(
              `Error inserting RSN for user_id ${userId}: ${err.message}`,
            );
        });
      });
    });

    stmt.finalize(() => {
      console.log(`Migration for ${filePath} to registered_rsn completed.`);
    });
  });
};

migrateRegisteredRSNs(
  path.join(__dirname, "src", "data", "registered_rsn.json"),
);

// Close the database
db.close((err) => {
  if (err) console.error("Error closing database:", err.message);
  else console.log("Database closed successfully.");
});
