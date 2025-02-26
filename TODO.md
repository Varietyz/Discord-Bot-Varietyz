# **To-Do List for Varietyz Bot**

- Guided setup (tutorial, auto-initialisation, slashcommand execution, channel setups)
- Tutorials
- FaQ Command

### **Centralized Code Management**

- **Daily Code Reviews:**
    - Review the codebase daily to maintain consistency, reduce redundancy, and ensure well-organized structure.
    - Refactor outdated or redundant code and improve modularity where necessary.

---

## **Future Features**

### **Competitions**

1. **Scheduled Bingo Competitions:**
    - JSON-based task system to define and manage bingo tasks.
    - User-defined tasks configurable via `/bingo` command with parameters for reoccurrence.
    - Integrate WoM tracking for automatic task completion updates.
    - Maintain a static file listing eligible tasks and parameters for easy reuse.

---

### **Event Scheduling**

1. **Raid Scheduler:**

    - Allow live interaction for scheduling raids using Discord buttons.
    - Lock interaction for other users while a participant schedules or until a timeout occurs.
    - Include configuration options for time, participants, and activity type.

2. **General Event Scheduling:**

    - Add event scheduling commands that synchronize with Discord’s built-in event system and WoM.
    - Eligible event types:
        - Giveaways
        - Drop parties
        - Raids
        - Clan wars
        - Discord voice/stream events
    - Define customizable event parameters through a static file for flexibility.

3. **Clan Vs Clan**
    - allow for clan v clan events (group id vs group id, competitions vs competition, drops vs drops)

---

### **Player Tracking and Analytics**

1. **Auto Loot Tracking:**

    - Develop a loot tracking system with the option to integrate webhooks or create a custom RuneLite plugin for enhanced functionality.
    - Potential features:
        - Personal loot logs
        - Clan-wide lootboards

2. **Advanced Player Analytics:**
    - Introduce detailed analytics for players based on WoM data.
    - Include:
        - Progress tracking over time
        - Skill-specific statistics
        - Activity heatmaps (e.g., hours played, bosses killed)

---

## **Server Management Features**

### **For Normal Members**

1. **/profile**  
   **What It Does:**

    - Displays the member’s registered RSNs, their current rank(s), and some personal statistics (e.g., competition wins, top rankings, recent activity).  
      **Why It’s Useful:**
    - Provides users with quick insight into their standing and activity without having to dig through external websites.  
      **How It Fits:**
    - It leverages the existing RSN registration and activity data without affecting other modules.

2. **/view_competition**  
   **What It Does:**

    - Shows the current active and upcoming competitions, along with details like metric, start/end times, and leaderboard summaries.  
      **Why It’s Useful:**
    - Keeps members informed about clan competitions and upcoming events.  
      **How It Fits:**
    - Builds on the existing competition lifecycle and leaderboard embeds; it’s read-only and doesn’t modify data.

3. **/help**  
   **What It Does:**
    - Provides a list of available commands with brief descriptions (possibly with categorized help for members vs. admins).  
      **Why It’s Useful:**
    - Especially for new members, a comprehensive help command reduces support requests and makes the bot more accessible.  
      **How It Fits:**
    - It’s independent and pulls data from a central help/documentation module, leaving the core functionality untouched.

---

### **For Administrators (Moderation & Maintenance)**

1. **/kick_inactive**  
   **What It Does:**

    - Identifies and optionally removes clan members who have been inactive for a certain period (based on the activity metrics).  
      **Why It’s Useful:**
    - Helps maintain an active, engaged clan and automates a common moderation task.  
      **How It Fits:**
    - Leverages the `calculateActivity` data and integrates with Discord’s member management APIs without interfering with other commands.

2. **/update_roles**  
   **What It Does:**

    - Forces a re-synchronization of user roles based on their current in-game achievements.  
      **Why It’s Useful:**
    - Provides a manual override in case automatic role updates lag or encounter errors.  
      **How It Fits:**
    - Calls the existing role update logic (e.g., from `auto_roles.js` and `member_channel.js`), so it’s an extension rather than a replacement.

3. **/clear_channel**  
   **What It Does:**

    - Clears messages from a specified text channel (similar to the `purgeChannel` utility).  
      **Why It’s Useful:**
    - Helps moderators keep channels tidy, especially in high-traffic areas like competition announcements or voting channels.  
      **How It Fits:**
    - It uses the existing `purgeChannel` functionality, offering a new command interface for moderation.

4. **/sync_members**  
   **What It Does:**

    - Triggers a manual synchronization of clan member data with the WOM API and the database.  
      **Why It’s Useful:**
    - Provides an admin tool for quickly resolving data inconsistencies or for troubleshooting sync issues.  
      **How It Fits:**
    - It wraps existing functionality (e.g., parts of `active_members.js` and `player_data_extractor.js`) in an admin command.

5. **/backup_db**  
   **What It Does:**

    - Initiates a backup of the SQLite database, perhaps by copying the file to a backup directory or uploading it to a remote storage service.  
      **Why It’s Useful:**
    - Regular backups are critical for data integrity and disaster recovery.  
      **How It Fits:**
    - This command is independent and can be implemented as a utility that uses Node’s file system APIs without interfering with the current modules.

6. **/migrate_competitions**  
   **What It Does:**

    - Manually triggers the migration process for ended competitions (i.e., moving them from the active table to the ended table).  
      **Why It’s Useful:**
    - Allows admins to force migrations in case of errors or delays in the automatic process.  
      **How It Fits:**
    - Wraps the existing `migrateEndedCompetitions` script in a command interface, offering manual control.

7. **/view_logs**  
   **What It Does:**
    - Retrieves recent log entries from the logging system, potentially filtered by level (e.g., errors, warnings).  
      **Why It’s Useful:**
    - Provides a quick way for admins to monitor the bot’s health and troubleshoot issues without having direct access to the server logs.  
      **How It Fits:**
    - This can be implemented as a lightweight command that reads from a log file or a logging API, separate from the core bot functionality.

---

### **Why These Commands Work Well**

- **Centralization and Modularity:**  
  Each suggested command leverages existing functionality or utilities within the project (like the database utilities, rate limiting, or API calls) without altering the core business logic. They are independent and can be integrated into the command framework seamlessly.

- **Separation of Concerns:**  
  Maintenance and moderation commands focus on administrative tasks (syncing data, cleaning channels, backing up the database) while member commands focus on information retrieval (viewing profiles and competitions). This clear separation makes the bot easier to use and manage.

- **Enhancing Functionality:**  
  The suggested commands fill gaps in manual control—for example, forcing a sync or updating roles—allowing admins to intervene if automated processes encounter issues.

- **Ease of Integration:**  
  Because my project already uses Discord.js, SQLite, and various utilities, these commands can be implemented using similar patterns to the existing ones. They follow the same async/await and error-handling conventions, ensuring consistency throughout the codebase.

## **Background and Maintenance Tasks**

1. **Scheduled Maintenance:**

    - Daily automated cleanup of:
        - Inactive RSNs
        - Outdated event data
    - Optimize the SQLite database periodically to improve performance.

2. **Error Handling Improvements:**
    - Add enhanced error logging for:
        - WoM API request failures
        - Discord rate-limit handling
    - Notify admins in Discord of critical bot issues.

something seems to be wrong with the code for cleanup.

we should refactor it entirely to:

Check all player_ids in registered_rsn and the discord_ids against the discord server members.
table:
player_id discord_id rsn registered_at
206963 130449849735839744 MrDiesALot 2025-01-22T22:18:43.268Z
206966 218544532302725120 DankGoldList 2025-01-22T22:18:43.268Z
256416 748433954234826853 Adrime 2025-01-22T22:18:43.268Z
362451 415031271413121025 Monotony503 2025-01-22T22:18:43.268Z
503949 337304920401248266 Shadows2250 2025-01-22T22:18:43.268Z

if a discord_id in registered_rsn does not match a discord guild member (not in the server anymore) cleanup the row from registered_rsn and all associated table rows with that player id in the database (excluding clan_members table) we must handle the database tables dynamically, there are alot of tables and more are subjected to be added overtime.

then we should check clan_members and registered_rsn for the player_ids, if a player_id in registered_rsn is not inside clan_members,

For the table bingo_teams instead of just removing, replace the player_id with a player_id from bingo_team_members that matches the team_id from the player_id set to be replaced. team_id is in both tables to determine the members, a member takes over the team. if player_id to be replaced has no replacement because only member, remove the row

we should also check the following tables only instead of the whole db which rows to remove (no replacement, just removal):

- bingo_event_baseline
- bingo_history
- bingo_leaderboard
- bingo_patterns_awarded
- bingo_task_progress
- bingo_team_members
- bingo_teams
- users
- votes (discord_id instead of player_id)
- winners
