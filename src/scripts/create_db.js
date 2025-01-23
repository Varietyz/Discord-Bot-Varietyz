const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

// 1) Database initialization
const dbPath = path.join(__dirname, "..", "data", "database.sqlite");
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
    console.log("Connected to SQLite at:", dbPath);
  }
});

function createRegisteredRsnTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS registered_rsn (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      rsn TEXT NOT NULL,
      registered_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
  db.run(query, (err) => {
    if (err) {
      console.error("Error creating 'registered_rsn' table:", err.message);
    } else {
      console.log("'registered_rsn' table created (empty).");
    }
  });
}

function createClanMembersTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS clan_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      rank TEXT,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
  db.run(query, (err) => {
    if (err) {
      console.error("Error creating 'clan_members' table:", err.message);
    } else {
      console.log("'clan_members' table created (empty).");
    }
  });
}

function createRecentNameChangesTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS recent_name_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      old_name TEXT NOT NULL,
      new_name TEXT NOT NULL,
      resolved_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
  db.run(query, (err) => {
    if (err) {
      console.error("Error creating 'recent_name_changes' table:", err.message);
    } else {
      console.log("'recent_name_changes' table created (empty).");
    }
  });
}

function createPlayerDataTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS player_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL,
      data_key TEXT NOT NULL,
      data_value TEXT,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
  db.run(query, (err) => {
    if (err) {
      console.error("Error creating 'player_data' table:", err.message);
    } else {
      console.log("'player_data' table created (empty).");
    }
  });
}

// 7) Run all table creation functions, then close the DB
db.serialize(() => {
  createRegisteredRsnTable();
  createClanMembersTable();
  createRecentNameChangesTable();
  createPlayerDataTable();
});

db.close((err) => {
  if (err) {
    console.error("Error closing the database:", err.message);
  } else {
    console.log(
      "Database schema created. No data imported. DB closed successfully.",
    );
  }
});
