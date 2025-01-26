# **To-Do List for Varietyz Bot**

### **Centralized Code Management**
- **Daily Code Reviews:**
  - Review the codebase daily to maintain consistency, reduce redundancy, and ensure well-organized structure.
  - Refactor outdated or redundant code and improve modularity where necessary.

---

## **Future Features**

### **Competitions**
1. **Boss of the Week & Skill of the Week:**
   - Automatically run time-based competitions using Wise Old Man (WoM) data.
   - Include leaderboards and progress updates posted periodically in Discord.
   - Configure duration, rewards, and participation criteria via a channel message listener.

2. **Scheduled Bingo Competitions:**
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

1. **Server Builder:**
   - **Purpose:** Automate Discord server setup for clans.
   - **Features:**
     - Import roles, emojis, categories, and channels from a pre-defined `.JSON` configuration file.
     - Set permissions for roles and channels automatically.
     - Add default content (e.g., pinned messages, announcements).
   - **Implementation:**
     - Lock behind `GROUP_ID` registration for WoM clans.
     - Include a debug bot for testing changes without affecting live servers.
     - Maintain a resource cache with clan-related images for seamless setup.

2. **Clan Database:**
   - Maintain a database of in-game ranks, clan-specific imagery, and metadata.
   - Use data from WoM and local configurations to keep the database updated.

3. **Automatic Role Management:**
   - Dynamically create and remove roles based on clan data from WoM.
   - Add a 2-day delay before removing roles to avoid accidental triggers due to temporary connectivity issues.
   - Cache roles and permissions for seamless recovery after outages.

---

### **Dynamic Resources**
1. **Dynamic Emoji Tag Collection:**
   - Collect all emojis available in the server and make them accessible for bot use.
   - Categorize emojis for use in:
     - Event messages
     - Role reactions
     - Fun and engagement activities

---

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