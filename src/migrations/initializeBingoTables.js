const { runQuery } = require('../modules/utils/essentials/dbUtils');
const logger = require('../modules/utils/essentials/logger');
const initializeBingoTables = async () => {
    try {
        logger.info('🔄 Ensuring all necessary guild tables exist...');
        const tables = {
            bingo_events: ` 
      event_id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_name TEXT NOT NULL,
      description TEXT DEFAULT NULL,
      is_active INTEGER DEFAULT 1,
      created_by TEXT DEFAULT 'system',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (event_name, created_at)
      `,
            bingo_tasks: `
      task_id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      parameter TEXT,
      value INTEGER,
      pattern TEXT DEFAULT NULL,
      image_path TEXT DEFAULT NULL,
      is_dynamic INTEGER DEFAULT 1,
      is_repeatable INTEGER DEFAULT 0,
      base_points INTEGER DEFAULT 0,
      extra_points INTEGER DEFAULT 0,
      UNIQUE (category, type, parameter, value)
  `,
            bingo_boards: `
      board_id INTEGER PRIMARY KEY AUTOINCREMENT,
      board_name TEXT NOT NULL,
      grid_size INTEGER DEFAULT 5,
      is_active INTEGER DEFAULT 1,
      event_id INTEGER,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (board_name, event_id)
  `,
            bingo_board_cells: `
      cell_id INTEGER PRIMARY KEY AUTOINCREMENT,
      board_id INTEGER NOT NULL,
      row INTEGER NOT NULL,
      column INTEGER NOT NULL,
      task_id INTEGER NOT NULL,
      is_bonus INTEGER DEFAULT 0,
      image_path TEXT DEFAULT NULL,
      FOREIGN KEY (board_id) REFERENCES bingo_boards(board_id) ON DELETE CASCADE,
      FOREIGN KEY (task_id) REFERENCES bingo_tasks(task_id) ON DELETE CASCADE
  `,
            bingo_event_baseline: `
      baseline_id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      rsn TEXT NOT NULL,
      data_key TEXT NOT NULL,
      data_value INTEGER NOT NULL,
      baseline_type TEXT NOT NULL,
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (event_id, player_id, data_key, baseline_type)
  `,
            bingo_task_progress: `
    progress_id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    team_id INTEGER DEFAULT NULL,
    player_id INTEGER NOT NULL,
    task_id INTEGER NOT NULL,
    progress_value INTEGER DEFAULT 0,
    status TEXT DEFAULT 'incomplete',
    points_awarded INTEGER DEFAULT 0,
    extra_points INTEGER DEFAULT 0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (event_id, player_id, task_id)
`,

            bingo_state: `
      event_id INTEGER PRIMARY KEY,
      board_id INTEGER NOT NULL,
      state TEXT DEFAULT 'upcoming',
      start_time DATETIME,
      end_time DATETIME,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
  `,
            bingo_history: `
      history_id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      board_id INTEGER NOT NULL,
      player_id INTEGER,
      team_id INTEGER,
      task_id INTEGER,
      status TEXT DEFAULT 'completed',
      points_awarded INTEGER DEFAULT 0,
      completed_at DATETIME,
      FOREIGN KEY (event_id) REFERENCES bingo_state(event_id) ON DELETE CASCADE
  `,
            bingo_leaderboard: `
      leaderboard_id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      player_id INTEGER,
      team_id INTEGER,
      total_points INTEGER DEFAULT 0,
      completed_tasks INTEGER DEFAULT 0,
      pattern_bonus INTEGER DEFAULT 0,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
  `,
            bingo_patterns_awarded: `
      awarded_id INTEGER PRIMARY KEY AUTOINCREMENT,
      board_id INTEGER NOT NULL,
      event_id INTEGER NOT NULL,
      player_id INTEGER DEFAULT NULL,
      team_id INTEGER DEFAULT NULL,
      pattern_key TEXT NOT NULL,
      awarded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (board_id, event_id, player_id, team_id, pattern_key)
  `,
            bingo_teams: `
      team_id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      team_name TEXT NOT NULL,
      player_id INTEGER DEFAULT NULL,
      passkey TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (team_name, event_id)
  `,
            bingo_team_members: `
      team_member_id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (team_id, player_id),
      FOREIGN KEY (team_id) REFERENCES bingo_teams(team_id) ON DELETE CASCADE
  `,
            bingo_embeds: ` 
    embed_id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    player_id INTEGER DEFAULT NULL,
    team_id INTEGER DEFAULT NULL,
    task_id INTEGER DEFAULT NULL,
    message_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    embed_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `,
        };
        for (const [table, schema] of Object.entries(tables)) {
            await runQuery(`CREATE TABLE IF NOT EXISTS ${table} (${schema});`);
            logger.info(`✅ Ensured "${table}" table exists.`);
        }
        logger.info('✅ All main bingo tables have been successfully initialized.');
    } catch (error) {
        logger.error(`❌ Error initializing competition tables: ${error.message}`);
    }
};
module.exports = initializeBingoTables;
