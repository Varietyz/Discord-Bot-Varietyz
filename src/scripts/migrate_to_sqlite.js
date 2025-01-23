const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

// Database initialization
const dbPath = path.join(__dirname, "src", "data", "database.sqlite");
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log("Existing database file deleted.");
}
if (!fs.existsSync(path.dirname(dbPath))) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  console.log("Created database directory.");
}
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error connecting to SQLite:", err.message);
  } else {
    console.log("Connected to SQLite.");
  }
});

// Create the master table to track player tables
const createMasterTable = () => {
  const query = `
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT UNIQUE NOT NULL,
      table_name TEXT NOT NULL,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
  db.run(query, (err) => {
    if (err) {
      console.error("Error creating master table:", err.message);
    } else {
      console.log("Master table created.");
    }
  });
};

// Migrate CSV data
const migrateCSV = (dirPath) => {
  console.log(`Starting CSV migration for files in ${dirPath}.`);
  createMasterTable();

  const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".csv"));

  files.forEach((file) => {
    // Sanitize player name to create valid table names
    const playerName = file
      .replace(".csv", "")
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_"); // Replace invalid characters with "_"
    const tableName = `player_${playerName}`;
    const filePath = path.join(dirPath, file);

    // Create or clear a dedicated table for the player
    const schema = `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL,
        value TEXT
      );
      DELETE FROM ${tableName}; -- Clear table for fresh data
    `;
    db.serialize(() => {
      db.run(schema, (err) => {
        if (err) {
          console.error(`Error creating table ${tableName}: ${err.message}`);
          return;
        }
        console.log(`Table ${tableName} created.`);
      });

      // Read and insert data into the player's table
      const data = fs.readFileSync(filePath, "utf-8").split("\n");
      const [header, ...rows] = data.map((line) => line.split(","));

      const insertQuery = `INSERT INTO ${tableName} (key, value) VALUES (?, ?)`;
      const stmt = db.prepare(insertQuery);

      rows.forEach((row) => {
        if (row.length === 2) {
          stmt.run(row, (err) => {
            if (err) {
              console.error(
                `Error inserting into ${tableName}: ${err.message}`,
              );
            }
          });
        }
      });

      stmt.finalize(() => {
        console.log(`Data migrated for player: ${playerName}`);
      });

      // Add or update entry in the master table
      const masterQuery = `
        INSERT INTO players (player_id, table_name, last_updated)
        VALUES (?, ?, ?)
        ON CONFLICT(player_id) DO UPDATE SET last_updated = excluded.last_updated;
      `;
      db.run(
        masterQuery,
        [playerName, tableName, new Date().toISOString()],
        (err) => {
          if (err) {
            console.error(
              `Error adding player ${playerName} to master table: ${err.message}`,
            );
          } else {
            console.log(`Player ${playerName} added to master table.`);
          }
        },
      );
    });
  });
};

// Migrate JSON data
const migrateJSON = (filePath, tableName, schema, insertQuery) => {
  console.log(`Starting migration for ${filePath} into ${tableName}.`);

  db.serialize(() => {
    db.run(schema, (err) => {
      if (err) {
        console.error(`Error creating table ${tableName}: ${err.message}`);
        return;
      }
      console.log(`Table ${tableName} created.`);
    });

    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const dataArray = Array.isArray(data) ? data : Object.values(data);
    const stmt = db.prepare(insertQuery);

    dataArray.forEach((item) => {
      stmt.run(Object.values(item), (err) => {
        if (err)
          console.error(`Error inserting into ${tableName}: ${err.message}`);
      });
    });

    stmt.finalize(() => {
      console.log(`Migration for ${filePath} to ${tableName} completed.`);
    });
  });
};

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

// Execute migrations
migrateJSON(
  path.join(__dirname, "src", "data", "clan_members.json"),
  "clan_members",
  `CREATE TABLE IF NOT EXISTS clan_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    rank TEXT,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `INSERT INTO clan_members (name, rank, joined_at) VALUES (?, ?, ?)`,
);

migrateJSON(
  path.join(__dirname, "src", "data", "recent_name_changes.json"),
  "recent_name_changes",
  `CREATE TABLE IF NOT EXISTS recent_name_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    old_name TEXT NOT NULL,
    new_name TEXT NOT NULL,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `INSERT INTO recent_name_changes (old_name, new_name, changed_at) VALUES (?, ?, ?)`,
);

migrateRegisteredRSNs(
  path.join(__dirname, "src", "data", "registered_rsn.json"),
);

migrateCSV(path.join(__dirname, "src", "data", "members"));

// Close the database
db.close((err) => {
  if (err) console.error("Error closing database:", err.message);
  else console.log("Database closed successfully.");
});
