## Modules

<dl>
<dt><a href="#module_config/constants">config/constants</a></dt>
<dd><p>Defines and exports all constant values used throughout the Varietyz Bot.
This module includes general bot configurations, channel IDs, WOM API settings, rate limiting configurations,
and role definitions with associated emojis and colors.</p>
<p>Core Features:</p>
<ul>
<li>Provides the bot&#39;s name and command prefix for general configuration.</li>
<li>Defines Discord channel IDs used by the bot for various functionalities.</li>
<li>Defines a rank hierarchy and maps role names to their respective hierarchy index.</li>
<li>Includes detailed role definitions with associated emojis and color codes for Discord roles.</li>
</ul>
<p>External Dependencies:</p>
<ul>
<li><strong>Discord.js</strong>: For handling interactions with Discord, including channel management and role definitions.</li>
<li><strong>Luxon</strong>: For date and time manipulations (used in rate limiting and activity tracking).</li>
</ul>
</dd>
<dt><a href="#module_config/easterEggs">config/easterEggs</a></dt>
<dd><p>Defines Easter egg responses for special RuneScape Names (RSNs).
This module includes predefined titles, descriptions, and colors associated with certain legendary or iconic RSNs.
These RSNs are commonly recognized within the RuneScape community, and special responses are generated when these names are entered.</p>
<p>Core Features:</p>
<ul>
<li>Maps specific RSNs to unique titles, descriptions, and colors.</li>
<li>Provides responses for well-known RSNs such as <strong>Zezima</strong>, <strong>Woox</strong>, and <strong>Durial321</strong>.</li>
<li>Supports various colored responses to match the legendary status of each RSN.</li>
<li>Used for fun or themed responses within the Varietyz Bot.</li>
</ul>
</dd>
<dt><a href="#module_main">main</a></dt>
<dd><p>Main entry point for the Varietyz Bot Discord application.
Initializes the Discord client, dynamically loads commands and functions, registers slash commands,
handles interactions, and schedules periodic tasks. Provides a scalable framework for adding
additional bot functionality through commands, scheduled tasks, and interaction handling.</p>
<p>Key Features:</p>
<ul>
<li><strong>Dynamic Module Loading</strong>: Loads all commands and utility functions from designated directories.</li>
<li><strong>Slash Command Registration</strong>: Registers all slash commands with Discord&#39;s API.</li>
<li><strong>Task Scheduling</strong>: Executes and schedules tasks with configurable intervals, supporting both immediate execution on startup and periodic execution.</li>
<li><strong>Interaction Handling</strong>: Supports slash commands and autocomplete interaction types.</li>
<li><strong>Error Logging</strong>: Comprehensive error handling and logging for all bot processes.</li>
</ul>
<p>External Dependencies:</p>
<ul>
<li><strong>discord.js</strong>: For interacting with the Discord API and managing events.</li>
<li><strong>dotenv</strong>: Loads environment variables from <code>.env</code> file.</li>
<li>Custom modules for utilities (<code>dbUtils</code>, <code>logger</code>) and task processing.</li>
</ul>
</dd>
<dt><a href="#module_modules/commands/admin_assign_rsn">modules/commands/admin_assign_rsn</a></dt>
<dd><p>Defines the <code>/admin_assign_rsn</code> slash command for the Varietyz Bot.
This command allows administrators to assign a new RuneScape Name (RSN)
to a guild member by adding their RSN to the database.
It includes validation, database interactions, and an interactive confirmation feature.</p>
<p>Core Features:</p>
<ul>
<li>Allows administrators to assign an RSN to a guild member.</li>
<li>Validates RSN format and checks for conflicts with existing RSNs.</li>
<li>Verifies the RSN on Wise Old Man API before adding it to the database.</li>
<li>Provides confirmation and cancellation options for the action.</li>
<li>Sends an embed message to the assigned user to notify them of the registration.</li>
<li>Handles rate limiting to prevent abuse of the command.</li>
<li>Updates the database with the new RSN upon confirmation.</li>
</ul>
<p>External Dependencies:</p>
<ul>
<li><strong>Discord.js</strong>: For handling slash commands, creating embeds, and managing interactive buttons.</li>
<li><strong>Wise Old Man API</strong>: For verifying RSNs and fetching player data.</li>
<li><strong>SQLite</strong>: For interacting with the RSN database.</li>
</ul>
</dd>
<dt><a href="#module_modules/commands/admin_remove_rsn">modules/commands/admin_remove_rsn</a></dt>
<dd><p>Defines the <code>/admin_remove_rsn</code> slash command for the Varietyz Bot.
This admin command allows administrators to remove a registered RuneScape Name (RSN) from a specified guild member.
The command includes validation, database interactions, autocomplete functionality, and a confirmation prompt to prevent accidental removals.</p>
<p>Core Features: (Administrator-only command)</p>
<ul>
<li>Removes a registered RSN from a specified guild member&#39;s account.</li>
<li>Validation and conflict checks before removing the RSN.</li>
<li>Provides a confirmation prompt to avoid accidental removals.</li>
<li>Autocomplete functionality for selecting target users and RSNs.</li>
<li>Database updates to ensure the RSN is successfully removed.</li>
</ul>
<p>External Dependencies:</p>
<ul>
<li><strong>Discord.js</strong>: For handling slash commands, creating embeds, and managing interactive buttons.</li>
<li><strong>SQLite</strong>: For interacting with the registered RSN database.</li>
</ul>
</dd>
<dt><a href="#module_modules/commands/admin_rename_rsn">modules/commands/admin_rename_rsn</a></dt>
<dd><p>Defines the <code>/admin_rename_rsn</code> slash command for the Varietyz Bot.
This command allows administrators to rename a registered RuneScape Name (RSN)
of a guild member. It includes validation, database interactions,
and an autocomplete feature for RSN suggestions.</p>
<p>Core Features: (Administrator-only command)</p>
<ul>
<li>Allows administrators to rename a registered RSN for a guild member.</li>
<li>Validates RSN format and checks for conflicts with existing RSNs.</li>
<li>Verifies the RSN on Wise Old Man API before renaming.</li>
<li>Provides confirmation and cancellation options for the renaming action.</li>
<li>Autocomplete support for <code>target</code> and <code>current_rsn</code> fields based on registered RSNs.</li>
<li>Handles rate limiting to prevent abuse of the command.</li>
<li>Updates the database with the new RSN upon confirmation.</li>
</ul>
<p>External Dependencies:</p>
<ul>
<li><strong>Discord.js</strong>: For handling slash commands, creating embeds, and managing interactive buttons.</li>
<li><strong>Wise Old Man API</strong>: For verifying RSNs and fetching player data.</li>
<li><strong>SQLite</strong>: For interacting with the registered RSN database.</li>
</ul>
</dd>
<dt><a href="#module_modules/commands/check_activity">modules/commands/check_activity</a></dt>
<dd><p>Implements the <code>/check_activity</code> command to display active and inactive players.
This command provides insights into player activity by fetching data from the database
and presenting it with pagination support.</p>
<p>Core Features: (Administrator-only command)</p>
<ul>
<li>Displays active or inactive players based on recent progression.</li>
<li>Paginated display of player data with navigation controls.</li>
<li>Includes the last progress timestamp for each player.</li>
<li>Displays total count of active or inactive players.</li>
<li>Supports interactive buttons for page navigation and closing.</li>
</ul>
<p>External Dependencies:</p>
<ul>
<li><strong>Discord.js</strong>: For handling slash commands, creating embeds, and managing interactive buttons.</li>
<li><strong>Luxon</strong>: For date and time manipulation (calculating progression and inactivity).</li>
<li><strong>SQLite</strong>: For retrieving player activity data from the database.</li>
</ul>
</dd>
<dt><a href="#module_modules/commands/remove_rsn">modules/commands/remove_rsn</a></dt>
<dd><p>Defines the <code>/remove_rsn</code> slash command for the Varietyz Bot.
This command allows users to remove up to three registered RuneScape Names (RSNs) from their account.
It includes validation, rate limiting, database interactions, and an autocomplete feature for RSN suggestions.</p>
<p>Core Features:</p>
<ul>
<li>Removes up to three RSNs from the user&#39;s account.</li>
<li>Rate limiting to prevent command abuse.</li>
<li>Confirmation prompt before RSN removal.</li>
<li>Autocomplete for RSN suggestions based on user input.</li>
<li>Database updates to ensure successful removal of RSNs.</li>
</ul>
<p>External Dependencies:</p>
<ul>
<li><strong>Discord.js</strong>: For handling slash commands, creating buttons, and managing interactive components.</li>
<li><strong>SQLite</strong>: For managing registered RSN data in the database.</li>
</ul>
</dd>
<dt><a href="#module_modules/commands/rsn_list">modules/commands/rsn_list</a></dt>
<dd><p>Defines the <code>/rsn_list</code> slash command for the Varietyz Bot.
This command allows users with appropriate permissions to view a comprehensive list of
all registered RuneScape Names (RSNs) and their associated ranks for clan members.
It provides a paginated view, sorted by rank hierarchy, and allows for navigation
through interactive buttons.</p>
<p>Core Features: (Administrator-only command)</p>
<ul>
<li>Displays RSNs grouped by Discord user.</li>
<li>Includes rank emojis and links to Wise Old Man profiles.</li>
<li>Paginated display with navigation controls.</li>
<li>Data is sorted by rank hierarchy, with guests listed last.</li>
</ul>
<p>External Dependencies:</p>
<ul>
<li><strong>Discord.js</strong>: For handling slash commands, creating embeds, and managing interactive components like buttons.</li>
<li><strong>Wise Old Man API</strong>: For fetching player profiles and rank details.</li>
<li><strong>SQLite</strong>: For managing registered RSN data in the database.</li>
</ul>
</dd>
<dt><a href="#module_modules/commands/rsn">modules/commands/rsn</a></dt>
<dd><p>Defines the <code>/rsn</code> slash command for the Varietyz Bot.
This command allows users to register their Old School RuneScape Name (RSN).
It includes the following features:</p>
<ul>
<li><strong>Validation</strong>: Ensures RSNs follow specified format rules.</li>
<li><strong>Rate Limiting</strong>: Prevents abuse by restricting repeated usage within a time window.</li>
<li><strong>Easter Eggs</strong>: Custom responses for predefined special RSNs.</li>
<li><strong>Database Handling</strong>: Manages RSN registrations with conflict resolution, ensuring that RSNs are unique per user.</li>
<li><strong>External API Verification</strong>: Validates RSNs against the Wise Old Man API to ensure the RSN exists and is linked to a player.</li>
</ul>
<p>External Dependencies:</p>
<ul>
<li><strong>Wise Old Man API</strong>: Used to validate RSNs against player profiles.</li>
<li><strong>SQLite</strong>: For managing RSN registrations in the database.</li>
<li><strong>Discord.js</strong>: For handling slash command interactions and sending feedback messages to users.</li>
</ul>
</dd>
<dt><a href="#module_modules/services/active_members">modules/services/active_members</a></dt>
<dd><p>Utility functions for managing active and inactive clan members within the Varietyz Bot.
This module interacts with the WOM API to fetch player data, calculate member activity,
and update Discord voice channel names based on member activity, reflecting the count of active members.</p>
<p>Key Features:</p>
<ul>
<li><strong>Activity Data Update</strong>: Fetches player data from the WOM API and updates the &#39;active_inactive&#39; table in the database.</li>
<li><strong>Activity Calculation</strong>: Calculates the number of active players based on their progress in the last 7 days and inactive players in the last 21 days.</li>
<li><strong>Voice Channel Update</strong>: Dynamically updates the name of a Discord voice channel to reflect the number of active members in the clan.</li>
<li><strong>Retry Mechanism</strong>: Implements a retry mechanism for fetching player data from the WOM API, with exponential backoff for error handling.</li>
<li><strong>Data Integrity</strong>: Ensures accurate and up-to-date tracking of player progress using the Luxon DateTime library and the WOM API.</li>
</ul>
<p>External Dependencies:</p>
<ul>
<li><strong>Wise Old Man (WOM) API</strong>: Used to fetch player data and group details for active and inactive member calculations.</li>
<li><strong>Luxon</strong>: Used for date and time manipulation to calculate activity intervals.</li>
<li><strong>Discord.js</strong>: For interacting with the Discord guild and voice channels, updating channel names based on activity.</li>
<li><strong>dbUtils</strong>: Handles interactions with the SQLite database for storing and querying player activity data.</li>
</ul>
</dd>
<dt><a href="#module_modules/services/auto_roles">modules/services/auto_roles</a></dt>
<dd><p>Utility functions for managing automatic role assignments based on player data in the Varietyz Bot.
This module fetches and processes data from multiple RuneScape Names (RSNs), merges the data for role assignments,
and assigns or removes Discord roles based on hiscores and achievements such as boss kills, activities, and skills.</p>
<p>Key Features:</p>
<ul>
<li><strong>Role Assignment</strong>: Automatically assigns roles based on boss kills, activity scores, and skill levels from RSN data.</li>
<li><strong>Data Merging</strong>: Combines data from multiple RSNs into a single profile for each player, ensuring the highest achievements are retained.</li>
<li><strong>Dynamic Role Updates</strong>: Removes outdated roles and assigns new ones based on the player&#39;s latest achievements.</li>
<li><strong>Discord Notifications</strong>: Sends embed messages in a designated channel to notify players of role assignments and removals.</li>
<li><strong>Custom Mappings</strong>: Maps boss and activity names to corresponding Discord role names for easier management.</li>
</ul>
<p>External Dependencies:</p>
<ul>
<li><strong>Wise Old Man (WOM) API</strong>: Retrieves player data and achievements for role assignment.</li>
<li><strong>Discord.js</strong>: Used for interacting with Discord to assign roles, send notifications, and manage guild data.</li>
<li><strong>dbUtils</strong>: Handles database interactions to fetch and store player data linked to Discord users.</li>
<li><strong>normalizeRsn</strong>: Provides utilities for normalizing RSNs to ensure consistency across data processing.</li>
</ul>
</dd>
<dt><a href="#module_modules/services/member_channel">modules/services/member_channel</a></dt>
<dd><p>Utility functions for managing clan members and updating their data in the Varietyz Bot.
This module interacts with the WOM API to fetch member information, manages role assignments in Discord based on ranks,
and updates the associated Discord channels with the latest clan member data.</p>
<p>Key Features:</p>
<ul>
<li><strong>Role Assignment</strong>: Handles dynamic assignment and removal of roles based on player rank.</li>
<li><strong>Clan Member Updates</strong>: Fetches and processes player data, updating roles and information in the Discord guild.</li>
<li><strong>Database Management</strong>: Updates the <code>clan_members</code> table in the SQLite database and ensures it reflects the latest member data.</li>
<li><strong>Discord Notifications</strong>: Sends notifications to a designated Discord channel about rank updates and member changes.</li>
<li><strong>Data Purging</strong>: Removes outdated information from the <code>clan_members</code> table and purges previous channel messages before sending new data.</li>
</ul>
<p>External Dependencies:</p>
<ul>
<li><strong>Wise Old Man (WOM) API</strong>: Fetches player information and updates from the Wise Old Man API.</li>
<li><strong>Discord.js</strong>: Used for interacting with Discord, including sending messages and managing roles.</li>
<li><strong>dbUtils</strong>: Handles database interactions to update clan member data.</li>
<li><strong>rankUtils</strong>: Provides utilities for formatting and retrieving rank information.</li>
</ul>
</dd>
<dt><a href="#module_modules/services/name_changes">modules/services/name_changes</a></dt>
<dd><p>Utility functions for processing player name changes in the Varietyz Bot.
This module interacts with the Wise Old Man (WOM) API to fetch recent name changes,
updates the database with the new RSNs, and handles conflict resolution between users.
It also manages sending notifications to Discord channels for both successful updates and conflict resolutions.</p>
<p>Key Features:</p>
<ul>
<li><strong>Name Change Fetching</strong>: Retrieves recent name changes from the WOM API.</li>
<li><strong>Database Management</strong>: Saves name change records to the <code>recent_name_changes</code> table and updates the <code>registered_rsn</code> table.</li>
<li><strong>Conflict Resolution</strong>: Handles cases where a new RSN already exists for another user and resolves conflicts.</li>
<li><strong>Discord Notifications</strong>: Sends messages to a specified channel notifying users of successful name updates or conflict resolutions.</li>
<li><strong>Rate-Limiting and Dependencies</strong>: Ensures rate-limited API requests and processes name changes in the correct order.</li>
</ul>
<p>External Dependencies:</p>
<ul>
<li><strong>Wise Old Man (WOM) API</strong>: Fetches player name changes.</li>
<li><strong>Discord.js</strong>: Sends notifications and updates to Discord channels.</li>
<li><strong>dbUtils</strong>: Manages database operations for name change records.</li>
</ul>
</dd>
<dt><a href="#module_modules/services/player_data_extractor">modules/services/player_data_extractor</a></dt>
<dd><p>Utility functions for extracting and managing player data in the Varietyz Bot.
This module facilitates fetching, formatting, saving, and maintaining player data using the Wise Old Man API
and SQLite database. It handles the extraction, transformation, and storage of player data,
ensuring the database is up-to-date and accurate.</p>
<p>Key Features:</p>
<ul>
<li><strong>Data Formatting</strong>: Flattens and renames nested player data into a format suitable for database storage.</li>
<li><strong>Database Management</strong>: Manages the <code>player_data</code> table and ensures player data is saved and updated correctly.</li>
<li><strong>API Integration</strong>: Fetches player data from the Wise Old Man API and integrates it into the database.</li>
<li><strong>Player Synchronization</strong>: Synchronizes player data with registered RSNs and removes stale or outdated records.</li>
<li><strong>Rate-Limiting</strong>: Implements rate-limiting to handle frequent API requests efficiently.</li>
</ul>
<p>External Dependencies:</p>
<ul>
<li><strong>Wise Old Man (WOM) API</strong>: Fetches player data for RSNs.</li>
<li><strong>luxon</strong>: For date manipulation and calculating time intervals.</li>
<li><strong>dbUtils</strong>: To interact with the SQLite database for storing player data.</li>
</ul>
</dd>
<dt><a href="#module_utils/calculateActivity">utils/calculateActivity</a></dt>
<dd><p>Utility functions for managing player activity data in the Varietyz Bot&#39;s SQLite database.
This module provides functions for ensuring the existence of the <code>active_inactive</code> table, as well as calculating
the number of active and inactive players based on their last recorded progress.</p>
<p>Key Features:</p>
<ul>
<li><strong>Table Management</strong>: Ensures the <code>active_inactive</code> table exists, which stores player usernames and their last progress timestamp.</li>
<li><strong>Active Player Count</strong>: Calculates the number of active players based on their progress within the last 7 days.</li>
<li><strong>Inactive Player Count</strong>: Calculates the number of inactive players who have not progressed in the last 21 days.</li>
</ul>
<p>External Dependencies:</p>
<ul>
<li><strong>luxon</strong>: For handling date and time operations, such as calculating 7-day and 21-day intervals.</li>
<li><strong>dbUtils</strong>: For executing SQL queries to interact with the database.</li>
</ul>
</dd>
<dt><a href="#module_utils/dbUtils">utils/dbUtils</a></dt>
<dd><p>Utility functions for interacting with an SQLite database in the Varietyz Bot.
This module provides functions to execute SQL queries, manage database connections, and ensure proper
handling of the database lifecycle, including graceful closure on process termination.</p>
<p>Key Features:</p>
<ul>
<li><strong>SQL Query Execution</strong>: Includes functions for executing INSERT, UPDATE, DELETE, and SELECT queries.</li>
<li><strong>Data Retrieval</strong>: Provides functions to retrieve all matching rows (<code>getAll</code>) or a single row (<code>getOne</code>).</li>
<li><strong>Database Connection Management</strong>: Ensures the SQLite connection is established, and logs its status.</li>
<li><strong>Graceful Shutdown</strong>: Handles the cleanup and closure of the database connection when the process is terminated.</li>
</ul>
<p>External Dependencies:</p>
<ul>
<li><strong>sqlite3</strong>: For interacting with the SQLite database.</li>
<li><strong>logger</strong>: For logging database operations and errors.</li>
</ul>
</dd>
<dt><a href="#module_utils/fetchPlayerData">utils/fetchPlayerData</a></dt>
<dd><p>Utility function for fetching player data from the Wise Old Man (WOM) API.
This module provides a function to retrieve player data for a specified RuneScape Name (RSN),
handling potential errors such as non-existent players, rate limiting, and unexpected issues.</p>
<p>Key Features:</p>
<ul>
<li><strong>Player Data Retrieval</strong>: Fetches player data from the WOM API for a given RSN.</li>
<li><strong>Error Handling</strong>: Manages common API errors including 404 (player not found) and 429 (rate limiting).</li>
<li><strong>Rate Limiting</strong>: Throws an error if the WOM API returns a rate limit response.</li>
</ul>
<p>External Dependencies:</p>
<ul>
<li><strong>axios</strong>: For making HTTP requests to the WOM API.</li>
<li><strong>logger</strong>: For logging warnings and errors during the fetch process.</li>
</ul>
</dd>
<dt><a href="#module_utils/lastFetchedTime">utils/lastFetchedTime</a></dt>
<dd><p>Utility functions for managing player fetch times in a SQLite database.
Provides functions for ensuring the existence of the <code>player_fetch_times</code> table, retrieving the last fetch time,
and updating the fetch timestamp for a specific player&#39;s RuneScape Name (RSN).</p>
<p>Key Features:</p>
<ul>
<li><strong>Table Management</strong>: Ensures the <code>player_fetch_times</code> table exists with a specific schema for tracking player fetch times.</li>
<li><strong>Fetch Time Retrieval</strong>: Retrieves the last fetch timestamp for a given player, returning <code>null</code> if not found.</li>
<li><strong>Fetch Time Update</strong>: Updates or inserts the fetch timestamp for a player, ensuring the table remains up-to-date.</li>
</ul>
<p>External Dependencies:</p>
<ul>
<li><strong>dbUtils</strong>: For executing database queries and interacting with the SQLite database.</li>
</ul>
</dd>
<dt><a href="#module_utils/logger">utils/logger</a></dt>
<dd><p>Winston logger utility for the Varietyz Bot.
Configures and exports a Winston logger instance with daily log rotation and enhanced error handling.
This module provides logging functionality to output messages to the console and log files,
as well as manage log directories, rotate logs daily, and handle uncaught exceptions and unhandled promise rejections.</p>
<p>Key Features:</p>
<ul>
<li><strong>Console Logging</strong>: Colorized console output for easy readability of logs.</li>
<li><strong>Daily Log Rotation</strong>: Logs are written to files with daily rotation and retention, organized by year and month.</li>
<li><strong>Error Handling</strong>: Captures uncaught exceptions and unhandled promise rejections, logging the error and gracefully exiting.</li>
<li><strong>Log Directory Management</strong>: Ensures log directories exist and creates necessary folder structures.</li>
</ul>
<p>External Dependencies:</p>
<ul>
<li><strong>winston</strong>: A powerful logging library for logging to both the console and file systems.</li>
<li><strong>winston-daily-rotate-file</strong>: A winston transport for logging to daily rotating files.</li>
<li><strong>path</strong>: Utility for handling file paths.</li>
<li><strong>fs</strong>: Node&#39;s file system module for checking and creating directories.</li>
</ul>
</dd>
<dt><a href="#module_utils/normalizeRsn">utils/normalizeRsn</a></dt>
<dd><p>Utility function for normalizing RuneScape names (RSNs).
Ensures RSNs are stored in a consistent format for database operations and efficient lookups.
This module helps maintain uniformity in RSN storage and improves search accuracy.</p>
<p>Key Features:</p>
<ul>
<li><strong>RSN Normalization</strong>: Converts RSNs to a standard format by removing unwanted characters, collapsing multiple spaces, and converting the entire string to lowercase.</li>
<li><strong>Error Handling</strong>: Ensures input is a valid string, throwing an error if the input is invalid.</li>
</ul>
<p>External Dependencies:</p>
<ul>
<li>None.</li>
</ul>
</dd>
<dt><a href="#module_utils/purgeChannel">utils/purgeChannel</a></dt>
<dd><p>Utility function for managing Discord channels in the Varietyz Bot.
Provides a function to purge messages from a specified Discord channel while respecting rate limits.
This function is optimized to handle large volumes of messages by processing them in batches.</p>
<p>Key Features:</p>
<ul>
<li><strong>Efficient Message Deletion</strong>: Deletes messages in batches of up to 100 to handle large volumes.</li>
<li><strong>Rate Limit Management</strong>: Introduces delays between deletions to avoid hitting Discord&#39;s rate limits.</li>
<li><strong>Error Handling</strong>: Logs and handles any errors that occur during the message deletion process.</li>
</ul>
<p>External Dependencies:</p>
<ul>
<li><code>sleep</code> function from <code>./sleepUtil</code> to introduce delays between deletions.</li>
<li><code>logger</code> module for logging operations and errors.</li>
</ul>
</dd>
<dt><a href="#module_utils/rankUtils">utils/rankUtils</a></dt>
<dd><p>Utility functions for managing RuneScape clan ranks in the Varietyz Bot.
Provides tools for retrieving rank-specific details, formatting experience points, and normalizing rank strings.
These utilities enhance the presentation and handling of rank-related data in Discord interactions.</p>
<p>Key Features:</p>
<ul>
<li><strong>Rank Emojis</strong>: Retrieves emojis associated with specific ranks for better visualization.</li>
<li><strong>Rank Colors</strong>: Provides hexadecimal color codes for ranks, with a default fallback.</li>
<li><strong>Experience Formatting</strong>: Formats numerical experience points with commas for readability.</li>
<li><strong>Rank String Normalization</strong>: Converts rank identifiers to display-friendly formats.</li>
</ul>
<p>External Dependencies:</p>
<ul>
<li><code>RANKS</code> object from the <code>../../config/constants</code> module, which defines rank metadata (e.g., emojis, colors).</li>
</ul>
</dd>
<dt><a href="#module_utils/sleepUtil">utils/sleepUtil</a></dt>
<dd><p>Utility function for creating delays in execution.
Provides a simple mechanism to pause asynchronous operations for a specified duration.</p>
<p>Key Features:</p>
<ul>
<li><strong>Promise-based Delay</strong>: Returns a promise that resolves after the specified time, enabling pauses in async/await workflows.</li>
<li><strong>Input Validation</strong>: Ensures the delay duration is a non-negative number, throwing an error for invalid input.</li>
<li><strong>Ease of Use</strong>: Simplifies the process of adding delays in scripts or workflows.</li>
</ul>
<p>External Dependencies:</p>
<ul>
<li>None.</li>
</ul>
</dd>
<dt><a href="#module_utils/validateRsn">utils/validateRsn</a></dt>
<dd><p>Utility functions for validating RuneScape names (RSNs).
Ensures RSNs meet specific format criteria for consistent database storage and lookup.</p>
<p>Key Features:</p>
<ul>
<li><strong>Format Validation</strong>: Checks if RSNs are between 1 and 12 characters long, contain only letters, numbers, and single spaces, and exclude forbidden characters like hyphens or underscores.</li>
<li><strong>Forbidden Phrase Detection</strong>: Prevents RSNs containing phrases such as &quot;Java&quot;, &quot;Mod&quot;, or &quot;Jagex&quot;.</li>
<li><strong>Feedback Messages</strong>: Provides clear validation messages for invalid RSNs.</li>
</ul>
<p>External Dependencies:</p>
<ul>
<li>None.</li>
</ul>
</dd>
<dt><a href="#module_scripts/create_db">scripts/create_db</a></dt>
<dd><p>Script to initialize and set up the SQLite database for the Varietyz Bot.
This script creates necessary tables for storing registered RSNs, clan members, recent name changes,
player data, as well as tracking player fetch times and active/inactive status.
The script deletes any existing database file before creating a new one to ensure a clean setup.</p>
<p>Core Features:</p>
<ul>
<li>Deletes any existing database file to ensure a fresh setup.</li>
<li>Creates the &#39;registered_rsn&#39; table to store registered RuneScape names.</li>
<li>Creates the &#39;active_inactive&#39; table to track player progression activity.</li>
<li>Creates the &#39;player_fetch_times&#39; table to store last fetched data timestamps.</li>
<li>Creates the &#39;clan_members&#39; table to store information about clan members.</li>
<li>Creates the &#39;recent_name_changes&#39; table to track name changes for players.</li>
<li>Creates the &#39;player_data&#39; table to store various player-specific data points.</li>
<li>Logs the success or failure of each table creation process.</li>
</ul>
<p>External Dependencies:</p>
<ul>
<li><strong>SQLite3</strong>: For interacting with the SQLite database.</li>
<li><strong>fs</strong>: For file system operations such as deleting existing databases and creating directories.</li>
<li><strong>path</strong>: For constructing the path to the database file.</li>
</ul>
</dd>
<dt><a href="#module_tasks">tasks</a></dt>
<dd><p>Defines and manages scheduled tasks for the Varietyz Bot.
Each task is represented as an object that includes its name, function to execute,
interval for execution, and flags for startup and scheduling behavior. Tasks are
used to handle automated processes such as data updates, member processing, and
player data synchronization.</p>
<p>Key Features:</p>
<ul>
<li>Registers and schedules tasks with customizable intervals and execution behavior.</li>
<li>Includes tasks for updating data, processing name changes, fetching player data, handling hiscores, and updating voice channels.</li>
<li>Integrates with external modules for processing and database operations.</li>
<li>Supports asynchronous execution and error logging for each task.</li>
</ul>
<p>External Dependencies:</p>
<ul>
<li>dotenv: Loads environment variables for configuration.</li>
<li>Various processing modules (e.g., member_channel, name_changes, player_data_extractor).</li>
<li>Database utilities (<code>dbUtils</code>) and logging utilities (<code>logger</code>).</li>
</ul>
</dd>
</dl>

## Classes

<dl>
<dt><a href="#WOMApiClient">WOMApiClient</a></dt>
<dd><p>A client for interacting with the Wise Old Man (WOM) API.
Manages rate-limited requests, handles retries, and provides access to the WOM API endpoints.</p>
</dd>
<dt><a href="#CompetitionService">CompetitionService</a></dt>
<dd><p>CompetitionService handles creation, management, and conclusion of competitions.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#initializeCompetitionsTables">initializeCompetitionsTables()</a></dt>
<dd><p>Initializes the competitions-related tables in the database.</p>
</dd>
<dt><a href="#determinePropType">determinePropType(prop)</a> ⇒ <code>string</code> | <code>null</code></dt>
<dd><p>Determines the type of a MetricProp based on its properties.</p>
</dd>
<dt><a href="#populateSkillsBosses">populateSkillsBosses()</a></dt>
<dd><p>Populates the skills_bosses table with data from MetricProps,
excluding ActivityProperties and ComputedMetricProperties.</p>
</dd>
<dt><a href="#chunkArray">chunkArray(array, size)</a></dt>
<dd></dd>
<dt><a href="#normalizeString">normalizeString(str)</a> ⇒ <code>string</code></dt>
<dd><p>Normalizes a string for comparison (e.g., trims spaces, converts to lowercase, replaces special characters).</p>
</dd>
<dt><a href="#getImagePath">getImagePath(metric)</a> ⇒ <code>Promise.&lt;string&gt;</code></dt>
<dd><p>Retrieves the file path for a given metric from the database with detailed logging.</p>
</dd>
<dt><a href="#createCompetitionEmbed">createCompetitionEmbed(client, type, metric, startsAt, endsAt)</a> ⇒ <code>Promise.&lt;{embeds: Array.&lt;EmbedBuilder&gt;, files: Array.&lt;AttachmentBuilder&gt;}&gt;</code></dt>
<dd><p>Creates a competition embed with attached images from the local <code>resources</code> folder.</p>
</dd>
<dt><a href="#buildLeaderboardDescription">buildLeaderboardDescription(participations, competitionType, guild)</a></dt>
<dd></dd>
<dt><a href="#createVotingDropdown">createVotingDropdown(options)</a> ⇒ <code>ActionRowBuilder</code></dt>
<dd><p>Creates a voting dropdown menu with provided options.
Expects &quot;options&quot; to include a &quot;voteCount&quot; property if you want to display it.</p>
</dd>
<dt><a href="#tallyVotesAndRecordWinner">tallyVotesAndRecordWinner(client, competition)</a></dt>
<dd><p>Tally votes for a competition and record the winner.</p>
</dd>
<dt><a href="#getAllFilesWithMetadata">getAllFilesWithMetadata(dir)</a> ⇒ <code>Array.&lt;{fileName: string, filePath: string}&gt;</code></dt>
<dd><p>Recursively get all files from a directory and its subdirectories.</p>
</dd>
<dt><a href="#populateImageCache">populateImageCache()</a></dt>
<dd><p>Populate the image_cache table with all files in the resources directory.</p>
</dd>
</dl>

<a name="module_config/constants"></a>

## config/constants
Defines and exports all constant values used throughout the Varietyz Bot.This module includes general bot configurations, channel IDs, WOM API settings, rate limiting configurations,and role definitions with associated emojis and colors.Core Features:- Provides the bot's name and command prefix for general configuration.- Defines Discord channel IDs used by the bot for various functionalities.- Defines a rank hierarchy and maps role names to their respective hierarchy index.- Includes detailed role definitions with associated emojis and color codes for Discord roles.External Dependencies:- **Discord.js**: For handling interactions with Discord, including channel management and role definitions.- **Luxon**: For date and time manipulations (used in rate limiting and activity tracking).


* [config/constants](#module_config/constants)
    * [~GeneralBotConstants](#module_config/constants..GeneralBotConstants) : <code>object</code>
    * [~ChannelIDs](#module_config/constants..ChannelIDs) : <code>object</code>
    * [~rankHierarchy](#module_config/constants..rankHierarchy) : <code>object</code>
    * [~Ranks](#module_config/constants..Ranks) : <code>object</code>
    * [~roleRange](#module_config/constants..roleRange) : <code>Array.&lt;string&gt;</code>
    * [~rankHierarchy](#module_config/constants..rankHierarchy) : <code>Object.&lt;string, number&gt;</code>
    * [~Rank](#module_config/constants..Rank) : <code>Object</code>

<a name="module_config/constants..GeneralBotConstants"></a>

### config/constants~GeneralBotConstants : <code>object</code>
General configuration constants for the Varietyz Bot.

**Kind**: inner namespace of [<code>config/constants</code>](#module_config/constants)  
<a name="module_config/constants..ChannelIDs"></a>

### config/constants~ChannelIDs : <code>object</code>
Discord channel IDs used by the bot for various functionalities.

**Kind**: inner namespace of [<code>config/constants</code>](#module_config/constants)  
<a name="module_config/constants..rankHierarchy"></a>

### config/constants~rankHierarchy : <code>object</code>
Clan rank hierachy to use for easy sorting.

**Kind**: inner namespace of [<code>config/constants</code>](#module_config/constants)  
<a name="module_config/constants..Ranks"></a>

### config/constants~Ranks : <code>object</code>
Definitions for various roles within the Discord server, including associated emojis and colors.

**Kind**: inner namespace of [<code>config/constants</code>](#module_config/constants)  
<a name="module_config/constants..roleRange"></a>

### config/constants~roleRange : <code>Array.&lt;string&gt;</code>
Represents the hierarchy of roles based on their rank names.Lower index indicates a lower rank.

**Kind**: inner constant of [<code>config/constants</code>](#module_config/constants)  
<a name="module_config/constants..rankHierarchy"></a>

### config/constants~rankHierarchy : <code>Object.&lt;string, number&gt;</code>
Maps each role name to its hierarchy index for quick reference.

**Kind**: inner constant of [<code>config/constants</code>](#module_config/constants)  
<a name="module_config/constants..Rank"></a>

### config/constants~Rank : <code>Object</code>
**Kind**: inner typedef of [<code>config/constants</code>](#module_config/constants)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| emoji | <code>string</code> | The emoji associated with the rank. |
| role | <code>string</code> | The name of the Discord role. |
| color | <code>number</code> | The color code for the role embed (in hexadecimal). |

<a name="module_config/easterEggs"></a>

## config/easterEggs
Defines Easter egg responses for special RuneScape Names (RSNs).
This module includes predefined titles, descriptions, and colors associated with certain legendary or iconic RSNs.
These RSNs are commonly recognized within the RuneScape community, and special responses are generated when these names are entered.

Core Features:
- Maps specific RSNs to unique titles, descriptions, and colors.
- Provides responses for well-known RSNs such as **Zezima**, **Woox**, and **Durial321**.
- Supports various colored responses to match the legendary status of each RSN.
- Used for fun or themed responses within the Varietyz Bot.

<a name="module_main"></a>

## main
Main entry point for the Varietyz Bot Discord application.
Initializes the Discord client, dynamically loads commands and functions, registers slash commands,
handles interactions, and schedules periodic tasks. Provides a scalable framework for adding
additional bot functionality through commands, scheduled tasks, and interaction handling.

Key Features:
- **Dynamic Module Loading**: Loads all commands and utility functions from designated directories.
- **Slash Command Registration**: Registers all slash commands with Discord's API.
- **Task Scheduling**: Executes and schedules tasks with configurable intervals, supporting both immediate execution on startup and periodic execution.
- **Interaction Handling**: Supports slash commands and autocomplete interaction types.
- **Error Logging**: Comprehensive error handling and logging for all bot processes.

External Dependencies:
- **discord.js**: For interacting with the Discord API and managing events.
- **dotenv**: Loads environment variables from `.env` file.
- Custom modules for utilities (`dbUtils`, `logger`) and task processing.


* [main](#module_main)
    * [~client](#module_main..client) : <code>Client</code>
    * [~commands](#module_main..commands) : <code>Array.&lt;Object&gt;</code>
    * [~functions](#module_main..functions) : <code>Array.&lt;Object&gt;</code>
    * [~loadModules(type)](#module_main..loadModules) ⇒ <code>Array.&lt;Object&gt;</code>
    * [~initializeBot()](#module_main..initializeBot) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~handleSlashCommand(interaction)](#module_main..handleSlashCommand) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~handleAutocomplete(interaction)](#module_main..handleAutocomplete) ⇒ <code>Promise.&lt;void&gt;</code>

<a name="module_main..client"></a>

### main~client : <code>Client</code>
Create a new Discord client instance with necessary intents.

**Kind**: inner constant of [<code>main</code>](#module_main)  
<a name="module_main..commands"></a>

### main~commands : <code>Array.&lt;Object&gt;</code>
**Kind**: inner constant of [<code>main</code>](#module_main)  
<a name="module_main..functions"></a>

### main~functions : <code>Array.&lt;Object&gt;</code>
**Kind**: inner constant of [<code>main</code>](#module_main)  
<a name="module_main..loadModules"></a>

### main~loadModules(type) ⇒ <code>Array.&lt;Object&gt;</code>
Dynamically loads all modules of a given type (commands or functions) from the specified directory.

**Kind**: inner method of [<code>main</code>](#module_main)  
**Returns**: <code>Array.&lt;Object&gt;</code> - An array of loaded modules.  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>string</code> | The type of modules to load ('commands' or 'functions'). |

<a name="module_main..initializeBot"></a>

### main~initializeBot() ⇒ <code>Promise.&lt;void&gt;</code>
Initializes the Discord bot by loading modules, registering slash commands, and logging in.

**Kind**: inner method of [<code>main</code>](#module_main)  
<a name="module_main..handleSlashCommand"></a>

### main~handleSlashCommand(interaction) ⇒ <code>Promise.&lt;void&gt;</code>
Executes the appropriate slash command based on the interaction.

**Kind**: inner method of [<code>main</code>](#module_main)  

| Param | Type | Description |
| --- | --- | --- |
| interaction | <code>CommandInteraction</code> | The command interaction to handle. |

<a name="module_main..handleAutocomplete"></a>

### main~handleAutocomplete(interaction) ⇒ <code>Promise.&lt;void&gt;</code>
Handles autocomplete interactions by delegating to the appropriate command's autocomplete handler.

**Kind**: inner method of [<code>main</code>](#module_main)  

| Param | Type | Description |
| --- | --- | --- |
| interaction | <code>AutocompleteInteraction</code> | The autocomplete interaction to handle. |

<a name="module_modules/commands/admin_assign_rsn"></a>

## modules/commands/admin\_assign\_rsn
Defines the `/admin_assign_rsn` slash command for the Varietyz Bot.This command allows administrators to assign a new RuneScape Name (RSN)to a guild member by adding their RSN to the database.It includes validation, database interactions, and an interactive confirmation feature.Core Features:- Allows administrators to assign an RSN to a guild member.- Validates RSN format and checks for conflicts with existing RSNs.- Verifies the RSN on Wise Old Man API before adding it to the database.- Provides confirmation and cancellation options for the action.- Sends an embed message to the assigned user to notify them of the registration.- Handles rate limiting to prevent abuse of the command.- Updates the database with the new RSN upon confirmation.External Dependencies:- **Discord.js**: For handling slash commands, creating embeds, and managing interactive buttons.- **Wise Old Man API**: For verifying RSNs and fetching player data.- **SQLite**: For interacting with the RSN database.

<a name="module_modules/commands/admin_assign_rsn..execute"></a>

### modules/commands/admin_assign_rsn~execute(interaction) ⇒ <code>Promise.&lt;void&gt;</code>
Executes the `/admin_assign_rsn` command.Validates inputs, checks for conflicts, verifies RSN existence on Wise Old Man, and provides a confirmation prompt before assigning.

**Kind**: inner method of [<code>modules/commands/admin\_assign\_rsn</code>](#module_modules/commands/admin_assign_rsn)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the command is fully executed.  

| Param | Type | Description |
| --- | --- | --- |
| interaction | <code>Discord.CommandInteraction</code> | The interaction object representing the command execution. |

<a name="module_modules/commands/admin_remove_rsn"></a>

## modules/commands/admin\_remove\_rsn
Defines the `/admin_remove_rsn` slash command for the Varietyz Bot.
This admin command allows administrators to remove a registered RuneScape Name (RSN) from a specified guild member.
The command includes validation, database interactions, autocomplete functionality, and a confirmation prompt to prevent accidental removals.

Core Features: (Administrator-only command)
- Removes a registered RSN from a specified guild member's account.
- Validation and conflict checks before removing the RSN.
- Provides a confirmation prompt to avoid accidental removals.
- Autocomplete functionality for selecting target users and RSNs.
- Database updates to ensure the RSN is successfully removed.

External Dependencies:
- **Discord.js**: For handling slash commands, creating embeds, and managing interactive buttons.
- **SQLite**: For interacting with the registered RSN database.


* [modules/commands/admin_remove_rsn](#module_modules/commands/admin_remove_rsn)
    * [~execute(interaction)](#module_modules/commands/admin_remove_rsn..execute) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~autocomplete(interaction)](#module_modules/commands/admin_remove_rsn..autocomplete) ⇒ <code>Promise.&lt;void&gt;</code>

<a name="module_modules/commands/admin_remove_rsn..execute"></a>

### modules/commands/admin_remove_rsn~execute(interaction) ⇒ <code>Promise.&lt;void&gt;</code>
Executes the `/admin_remove_rsn` command to remove an RSN from a specified guild member.
Validates inputs, fetches database records, and provides a confirmation prompt before executing the removal.

**Kind**: inner method of [<code>modules/commands/admin\_remove\_rsn</code>](#module_modules/commands/admin_remove_rsn)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the command is fully executed.  

| Param | Type | Description |
| --- | --- | --- |
| interaction | <code>Discord.CommandInteraction</code> | The interaction object representing the command execution. |

<a name="module_modules/commands/admin_remove_rsn..autocomplete"></a>

### modules/commands/admin_remove_rsn~autocomplete(interaction) ⇒ <code>Promise.&lt;void&gt;</code>
Provides autocomplete functionality for the `/admin_remove_rsn` command.

**Kind**: inner method of [<code>modules/commands/admin\_remove\_rsn</code>](#module_modules/commands/admin_remove_rsn)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when autocomplete suggestions are sent.  

| Param | Type | Description |
| --- | --- | --- |
| interaction | <code>Discord.CommandInteraction</code> | The interaction object representing the autocomplete event. |

<a name="module_modules/commands/admin_rename_rsn"></a>

## modules/commands/admin\_rename\_rsn
Defines the `/admin_rename_rsn` slash command for the Varietyz Bot.
This command allows administrators to rename a registered RuneScape Name (RSN)
of a guild member. It includes validation, database interactions,
and an autocomplete feature for RSN suggestions.

Core Features: (Administrator-only command)
- Allows administrators to rename a registered RSN for a guild member.
- Validates RSN format and checks for conflicts with existing RSNs.
- Verifies the RSN on Wise Old Man API before renaming.
- Provides confirmation and cancellation options for the renaming action.
- Autocomplete support for `target` and `current_rsn` fields based on registered RSNs.
- Handles rate limiting to prevent abuse of the command.
- Updates the database with the new RSN upon confirmation.

External Dependencies:
- **Discord.js**: For handling slash commands, creating embeds, and managing interactive buttons.
- **Wise Old Man API**: For verifying RSNs and fetching player data.
- **SQLite**: For interacting with the registered RSN database.


* [modules/commands/admin_rename_rsn](#module_modules/commands/admin_rename_rsn)
    * [~execute(interaction)](#module_modules/commands/admin_rename_rsn..execute) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~autocomplete(interaction)](#module_modules/commands/admin_rename_rsn..autocomplete) ⇒ <code>Promise.&lt;void&gt;</code>

<a name="module_modules/commands/admin_rename_rsn..execute"></a>

### modules/commands/admin_rename_rsn~execute(interaction) ⇒ <code>Promise.&lt;void&gt;</code>
Executes the `/admin_rename_rsn` command.
Validates inputs, checks for conflicts, verifies RSN existence on Wise Old Man, and provides a confirmation prompt before renaming.

**Kind**: inner method of [<code>modules/commands/admin\_rename\_rsn</code>](#module_modules/commands/admin_rename_rsn)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the command is fully executed.  

| Param | Type | Description |
| --- | --- | --- |
| interaction | <code>Discord.CommandInteraction</code> | The interaction object representing the command execution. |

<a name="module_modules/commands/admin_rename_rsn..autocomplete"></a>

### modules/commands/admin_rename_rsn~autocomplete(interaction) ⇒ <code>Promise.&lt;void&gt;</code>
Provides autocomplete suggestions for the `target` and `current_rsn` options.

**Kind**: inner method of [<code>modules/commands/admin\_rename\_rsn</code>](#module_modules/commands/admin_rename_rsn)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when suggestions are sent.  

| Param | Type | Description |
| --- | --- | --- |
| interaction | <code>Discord.AutocompleteInteraction</code> | The interaction object for the autocomplete event. |

<a name="module_modules/commands/check_activity"></a>

## modules/commands/check\_activity
Implements the `/check_activity` command to display active and inactive players.This command provides insights into player activity by fetching data from the databaseand presenting it with pagination support.Core Features: (Administrator-only command)- Displays active or inactive players based on recent progression.- Paginated display of player data with navigation controls.- Includes the last progress timestamp for each player.- Displays total count of active or inactive players.- Supports interactive buttons for page navigation and closing.External Dependencies:- **Discord.js**: For handling slash commands, creating embeds, and managing interactive buttons.- **Luxon**: For date and time manipulation (calculating progression and inactivity).- **SQLite**: For retrieving player activity data from the database.

<a name="module_modules/commands/check_activity..execute"></a>

### modules/commands/check_activity~execute(interaction) ⇒ <code>Promise.&lt;void&gt;</code>
Executes the `/check_activity` command, displaying active or inactive players with pagination.

**Kind**: inner method of [<code>modules/commands/check\_activity</code>](#module_modules/commands/check_activity)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the command is executed successfully.  

| Param | Type | Description |
| --- | --- | --- |
| interaction | <code>Discord.CommandInteraction</code> | The interaction object representing the command. |

<a name="module_modules/commands/remove_rsn"></a>

## modules/commands/remove\_rsn
Defines the `/remove_rsn` slash command for the Varietyz Bot.
This command allows users to remove up to three registered RuneScape Names (RSNs) from their account.
It includes validation, rate limiting, database interactions, and an autocomplete feature for RSN suggestions.

Core Features:
- Removes up to three RSNs from the user's account.
- Rate limiting to prevent command abuse.
- Confirmation prompt before RSN removal.
- Autocomplete for RSN suggestions based on user input.
- Database updates to ensure successful removal of RSNs.

External Dependencies:
- **Discord.js**: For handling slash commands, creating buttons, and managing interactive components.
- **SQLite**: For managing registered RSN data in the database.


* [modules/commands/remove_rsn](#module_modules/commands/remove_rsn)
    * [~execute(interaction)](#module_modules/commands/remove_rsn..execute) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~autocomplete(interaction)](#module_modules/commands/remove_rsn..autocomplete) ⇒ <code>Promise.&lt;void&gt;</code>

<a name="module_modules/commands/remove_rsn..execute"></a>

### modules/commands/remove_rsn~execute(interaction) ⇒ <code>Promise.&lt;void&gt;</code>
Executes the `/remove_rsn` command, allowing users to remove up to three RSNs from their account.
Handles validation, rate limiting, database interactions, and user feedback.

**Kind**: inner method of [<code>modules/commands/remove\_rsn</code>](#module_modules/commands/remove_rsn)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the command has been fully executed.  

| Param | Type | Description |
| --- | --- | --- |
| interaction | <code>Discord.CommandInteraction</code> | The interaction object representing the command execution. |

<a name="module_modules/commands/remove_rsn..autocomplete"></a>

### modules/commands/remove_rsn~autocomplete(interaction) ⇒ <code>Promise.&lt;void&gt;</code>
Handles the autocomplete functionality for RSN options in the `/remove_rsn` command.

**Kind**: inner method of [<code>modules/commands/remove\_rsn</code>](#module_modules/commands/remove_rsn)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when autocomplete suggestions have been sent.  

| Param | Type | Description |
| --- | --- | --- |
| interaction | <code>Discord.AutocompleteInteraction</code> | The interaction object for the autocomplete event. |

<a name="module_modules/commands/rsn_list"></a>

## modules/commands/rsn\_list
Defines the `/rsn_list` slash command for the Varietyz Bot.
This command allows users with appropriate permissions to view a comprehensive list of
all registered RuneScape Names (RSNs) and their associated ranks for clan members.
It provides a paginated view, sorted by rank hierarchy, and allows for navigation
through interactive buttons.

Core Features: (Administrator-only command)
- Displays RSNs grouped by Discord user.
- Includes rank emojis and links to Wise Old Man profiles.
- Paginated display with navigation controls.
- Data is sorted by rank hierarchy, with guests listed last.

External Dependencies:
- **Discord.js**: For handling slash commands, creating embeds, and managing interactive components like buttons.
- **Wise Old Man API**: For fetching player profiles and rank details.
- **SQLite**: For managing registered RSN data in the database.


* [modules/commands/rsn_list](#module_modules/commands/rsn_list)
    * [~getHighestRank(rsns, clanMembers)](#module_modules/commands/rsn_list..getHighestRank) ⇒ <code>Object</code>
    * [~paginateRSNData(rsnData, clanMembers, itemsPerPage)](#module_modules/commands/rsn_list..paginateRSNData) ⇒ <code>Array.&lt;EmbedBuilder&gt;</code>
    * [~prepareUserContent(userId, rsns, clanMembers)](#module_modules/commands/rsn_list..prepareUserContent) ⇒ <code>string</code>
    * [~groupRSNByUser(rsnData)](#module_modules/commands/rsn_list..groupRSNByUser) ⇒ <code>Object</code>

<a name="module_modules/commands/rsn_list..getHighestRank"></a>

### modules/commands/rsn_list~getHighestRank(rsns, clanMembers) ⇒ <code>Object</code>
Gets the highest rank of a user's RSNs.

**Kind**: inner method of [<code>modules/commands/rsn\_list</code>](#module_modules/commands/rsn_list)  
**Returns**: <code>Object</code> - - An object containing the highest rank and the RSN associated with it.  

| Param | Type | Description |
| --- | --- | --- |
| rsns | <code>Array</code> | The user's RSNs. |
| clanMembers | <code>Array</code> | The clan member data. |

<a name="module_modules/commands/rsn_list..paginateRSNData"></a>

### modules/commands/rsn_list~paginateRSNData(rsnData, clanMembers, itemsPerPage) ⇒ <code>Array.&lt;EmbedBuilder&gt;</code>
Paginates the RSN data into an array of EmbedBuilder objects, sorted by rank.

**Kind**: inner method of [<code>modules/commands/rsn\_list</code>](#module_modules/commands/rsn_list)  
**Returns**: <code>Array.&lt;EmbedBuilder&gt;</code> - - An array of EmbedBuilder objects.  

| Param | Type | Description |
| --- | --- | --- |
| rsnData | <code>Array</code> | The RSN data from the database. |
| clanMembers | <code>Array</code> | The clan member data from the database. |
| itemsPerPage | <code>number</code> | The number of items per page. |

<a name="module_modules/commands/rsn_list..prepareUserContent"></a>

### modules/commands/rsn_list~prepareUserContent(userId, rsns, clanMembers) ⇒ <code>string</code>
Prepares the user content for the embed, prioritizing RSNs with rank emojis.

**Kind**: inner method of [<code>modules/commands/rsn\_list</code>](#module_modules/commands/rsn_list)  
**Returns**: <code>string</code> - - A formatted string for the user's RSNs and ranks.  

| Param | Type | Description |
| --- | --- | --- |
| userId | <code>string</code> | The Discord user ID. |
| rsns | <code>Array</code> | An array of RSNs linked to the user. |
| clanMembers | <code>Array</code> | The clan member data. |

<a name="module_modules/commands/rsn_list..groupRSNByUser"></a>

### modules/commands/rsn_list~groupRSNByUser(rsnData) ⇒ <code>Object</code>
Groups RSNs by user ID.

**Kind**: inner method of [<code>modules/commands/rsn\_list</code>](#module_modules/commands/rsn_list)  
**Returns**: <code>Object</code> - - An object where keys are user IDs and values are arrays of RSNs.  

| Param | Type | Description |
| --- | --- | --- |
| rsnData | <code>Array</code> | The RSN data from the database. |

<a name="module_modules/commands/rsn"></a>

## modules/commands/rsn
Defines the `/rsn` slash command for the Varietyz Bot.
This command allows users to register their Old School RuneScape Name (RSN).
It includes the following features:
- **Validation**: Ensures RSNs follow specified format rules.
- **Rate Limiting**: Prevents abuse by restricting repeated usage within a time window.
- **Easter Eggs**: Custom responses for predefined special RSNs.
- **Database Handling**: Manages RSN registrations with conflict resolution, ensuring that RSNs are unique per user.
- **External API Verification**: Validates RSNs against the Wise Old Man API to ensure the RSN exists and is linked to a player.

External Dependencies:
- **Wise Old Man API**: Used to validate RSNs against player profiles.
- **SQLite**: For managing RSN registrations in the database.
- **Discord.js**: For handling slash command interactions and sending feedback messages to users.


* [modules/commands/rsn](#module_modules/commands/rsn)
    * _static_
        * [.data](#module_modules/commands/rsn.data) : <code>SlashCommandBuilder</code>
    * _inner_
        * [~execute(interaction)](#module_modules/commands/rsn..execute) ⇒ <code>Promise.&lt;void&gt;</code>

<a name="module_modules/commands/rsn.data"></a>

### modules/commands/rsn.data : <code>SlashCommandBuilder</code>
Defines the `/rsn` slash command using Discord's SlashCommandBuilder.

**Kind**: static constant of [<code>modules/commands/rsn</code>](#module_modules/commands/rsn)  
**Example**  
```js
// This command can be registered with Discord's API
const rsnCommand = module.exports.data;
```
<a name="module_modules/commands/rsn..execute"></a>

### modules/commands/rsn~execute(interaction) ⇒ <code>Promise.&lt;void&gt;</code>
Executes the `/rsn` command, allowing users to register their RSN.
Handles validation, rate limiting, database interactions, and Easter egg responses.

**Kind**: inner method of [<code>modules/commands/rsn</code>](#module_modules/commands/rsn)  
**Returns**: <code>Promise.&lt;void&gt;</code> - - Resolves when the command has been executed.  

| Param | Type | Description |
| --- | --- | --- |
| interaction | <code>Discord.CommandInteraction</code> | The interaction object representing the command execution. |

**Example**  
```js
// Handler in your bot's command execution logic
if (commandName === 'rsn') {
await commands.rsn.execute(interaction);
}
```
<a name="module_modules/services/active_members"></a>

## modules/services/active\_members
Utility functions for managing active and inactive clan members within the Varietyz Bot.
This module interacts with the WOM API to fetch player data, calculate member activity,
and update Discord voice channel names based on member activity, reflecting the count of active members.

Key Features:
- **Activity Data Update**: Fetches player data from the WOM API and updates the 'active_inactive' table in the database.
- **Activity Calculation**: Calculates the number of active players based on their progress in the last 7 days and inactive players in the last 21 days.
- **Voice Channel Update**: Dynamically updates the name of a Discord voice channel to reflect the number of active members in the clan.
- **Retry Mechanism**: Implements a retry mechanism for fetching player data from the WOM API, with exponential backoff for error handling.
- **Data Integrity**: Ensures accurate and up-to-date tracking of player progress using the Luxon DateTime library and the WOM API.

External Dependencies:
- **Wise Old Man (WOM) API**: Used to fetch player data and group details for active and inactive member calculations.
- **Luxon**: Used for date and time manipulation to calculate activity intervals.
- **Discord.js**: For interacting with the Discord guild and voice channels, updating channel names based on activity.
- **dbUtils**: Handles interactions with the SQLite database for storing and querying player activity data.


* [modules/services/active_members](#module_modules/services/active_members)
    * [~playerProgress](#module_modules/services/active_members..playerProgress) : <code>Object.&lt;string, DateTime&gt;</code>
    * [~updateActivityData([maxRetries], [baseDelay])](#module_modules/services/active_members..updateActivityData) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~updateVoiceChannel(client)](#module_modules/services/active_members..updateVoiceChannel) ⇒ <code>Promise.&lt;void&gt;</code>

<a name="module_modules/services/active_members..playerProgress"></a>

### modules/services/active_members~playerProgress : <code>Object.&lt;string, DateTime&gt;</code>
Object to store player progress data.
Keys are player names (RSNs), and values are Luxon DateTime objects representing the last progression date.

**Kind**: inner constant of [<code>modules/services/active\_members</code>](#module_modules/services/active_members)  
<a name="module_modules/services/active_members..updateActivityData"></a>

### modules/services/active_members~updateActivityData([maxRetries], [baseDelay]) ⇒ <code>Promise.&lt;void&gt;</code>
Fetches player data from the WOM API and updates the 'active_inactive' database table.

**Kind**: inner method of [<code>modules/services/active\_members</code>](#module_modules/services/active_members)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when data is successfully fetched and processed.  
**Throws**:

- <code>Error</code> - Throws an error if all retry attempts fail.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [maxRetries] | <code>number</code> | <code>3</code> | The maximum number of retry attempts in case of failure. |
| [baseDelay] | <code>number</code> | <code>5000</code> | The base delay in milliseconds before retrying after a failure. |

**Example**  
```js
await updateActivityData(5, 10000);
```
<a name="module_modules/services/active_members..updateVoiceChannel"></a>

### modules/services/active_members~updateVoiceChannel(client) ⇒ <code>Promise.&lt;void&gt;</code>
Updates the Discord voice channel name to reflect the current number of active clan members.
It fetches and processes player data, calculates the active member count, and updates the channel name accordingly.

**Kind**: inner method of [<code>modules/services/active\_members</code>](#module_modules/services/active_members)  
**Returns**: <code>Promise.&lt;void&gt;</code> - - Resolves when the voice channel name has been updated.  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>Discord.Client</code> | The Discord client instance. |

**Example**  
```js
await updateVoiceChannel(client);
```
<a name="module_modules/services/auto_roles"></a>

## modules/services/auto\_roles
Utility functions for managing automatic role assignments based on player data in the Varietyz Bot.
This module fetches and processes data from multiple RuneScape Names (RSNs), merges the data for role assignments,
and assigns or removes Discord roles based on hiscores and achievements such as boss kills, activities, and skills.

Key Features:
- **Role Assignment**: Automatically assigns roles based on boss kills, activity scores, and skill levels from RSN data.
- **Data Merging**: Combines data from multiple RSNs into a single profile for each player, ensuring the highest achievements are retained.
- **Dynamic Role Updates**: Removes outdated roles and assigns new ones based on the player's latest achievements.
- **Discord Notifications**: Sends embed messages in a designated channel to notify players of role assignments and removals.
- **Custom Mappings**: Maps boss and activity names to corresponding Discord role names for easier management.

External Dependencies:
- **Wise Old Man (WOM) API**: Retrieves player data and achievements for role assignment.
- **Discord.js**: Used for interacting with Discord to assign roles, send notifications, and manage guild data.
- **dbUtils**: Handles database interactions to fetch and store player data linked to Discord users.
- **normalizeRsn**: Provides utilities for normalizing RSNs to ensure consistency across data processing.


* [modules/services/auto_roles](#module_modules/services/auto_roles)
    * [module.exports](#exp_module_modules/services/auto_roles--module.exports) ⏏
        * [~mapBossToRole(bossName)](#module_modules/services/auto_roles--module.exports..mapBossToRole) ⇒ <code>string</code>
        * [~mapActivityToRole(activityName)](#module_modules/services/auto_roles--module.exports..mapActivityToRole) ⇒ <code>string</code>
        * [~getUserRSNs(userId)](#module_modules/services/auto_roles--module.exports..getUserRSNs) ⇒ <code>Promise.&lt;Array.&lt;string&gt;&gt;</code>
        * [~getPlayerDataForRSN(rsn)](#module_modules/services/auto_roles--module.exports..getPlayerDataForRSN) ⇒ <code>Promise.&lt;Object&gt;</code>
        * [~mergeRsnData(rsns)](#module_modules/services/auto_roles--module.exports..mergeRsnData) ⇒ <code>Promise.&lt;Object&gt;</code>
        * [~fetchAndProcessMember(guild, userId)](#module_modules/services/auto_roles--module.exports..fetchAndProcessMember) ⇒ <code>Promise.&lt;void&gt;</code>
        * [~handleHiscoresData(guild, member, rsns, hiscoresData)](#module_modules/services/auto_roles--module.exports..handleHiscoresData) ⇒ <code>Promise.&lt;void&gt;</code>
        * [~createAchievementRoles(guild, member, hiscoresData, channelUpdate)](#module_modules/services/auto_roles--module.exports..createAchievementRoles) ⇒ <code>Promise.&lt;void&gt;</code>
        * [~maybeAssignBossRole(guild, member, bossName, kills, playerName, channelUpdate)](#module_modules/services/auto_roles--module.exports..maybeAssignBossRole) ⇒ <code>Promise.&lt;void&gt;</code>
        * [~maybeAssignActivityRole(guild, member, activityName, score, playerName, channelUpdate)](#module_modules/services/auto_roles--module.exports..maybeAssignActivityRole) ⇒ <code>Promise.&lt;void&gt;</code>
        * [~createUpdateOsrsRoles(guild, member, hiscoresData, channelUpdate)](#module_modules/services/auto_roles--module.exports..createUpdateOsrsRoles) ⇒ <code>Promise.&lt;void&gt;</code>

<a name="exp_module_modules/services/auto_roles--module.exports"></a>

### module.exports ⏏
Exports the main function responsible for fetching and processing member data.

**Kind**: Exported member  
<a name="module_modules/services/auto_roles--module.exports..mapBossToRole"></a>

#### module.exports~mapBossToRole(bossName) ⇒ <code>string</code>
Maps a boss name to its corresponding Discord role name.

**Kind**: inner method of [<code>module.exports</code>](#exp_module_modules/services/auto_roles--module.exports)  
**Returns**: <code>string</code> - - The corresponding Discord role name.  

| Param | Type | Description |
| --- | --- | --- |
| bossName | <code>string</code> | The name of the boss. |

**Example**  
```js
const roleName = mapBossToRole('K\'ril Tsutsaroth'); // 'K\'ril Tsutsaroth'
```
<a name="module_modules/services/auto_roles--module.exports..mapActivityToRole"></a>

#### module.exports~mapActivityToRole(activityName) ⇒ <code>string</code>
Maps an activity name to its corresponding Discord role name.

**Kind**: inner method of [<code>module.exports</code>](#exp_module_modules/services/auto_roles--module.exports)  
**Returns**: <code>string</code> - - The corresponding Discord role name.  

| Param | Type | Description |
| --- | --- | --- |
| activityName | <code>string</code> | The name of the activity. |

**Example**  
```js
const roleName = mapActivityToRole('Clue Scrolls All'); // 'Clue Solver'
```
<a name="module_modules/services/auto_roles--module.exports..getUserRSNs"></a>

#### module.exports~getUserRSNs(userId) ⇒ <code>Promise.&lt;Array.&lt;string&gt;&gt;</code>
Retrieves all RuneScape Names (RSNs) associated with a given Discord user from the database.

**Kind**: inner method of [<code>module.exports</code>](#exp_module_modules/services/auto_roles--module.exports)  
**Returns**: <code>Promise.&lt;Array.&lt;string&gt;&gt;</code> - - A promise that resolves to an array of RSNs.  

| Param | Type | Description |
| --- | --- | --- |
| userId | <code>string</code> | The Discord user ID. |

**Example**  
```js
const rsns = await getUserRSNs('123456789012345678');
logger.info(rsns); // ['PlayerOne', 'PlayerTwo']
```
<a name="module_modules/services/auto_roles--module.exports..getPlayerDataForRSN"></a>

#### module.exports~getPlayerDataForRSN(rsn) ⇒ <code>Promise.&lt;Object&gt;</code>
Fetches player data for a specific RSN from the database.
It standardizes the RSN before performing the query to ensure accurate retrieval.

**Kind**: inner method of [<code>module.exports</code>](#exp_module_modules/services/auto_roles--module.exports)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - - A promise that resolves to an object mapping data keys to values.  

| Param | Type | Description |
| --- | --- | --- |
| rsn | <code>string</code> | The RuneScape Name to fetch data for. |

**Example**  
```js
const playerData = await getPlayerDataForRSN('PlayerOne');
logger.info(playerData);
```
<a name="module_modules/services/auto_roles--module.exports..mergeRsnData"></a>

#### module.exports~mergeRsnData(rsns) ⇒ <code>Promise.&lt;Object&gt;</code>
Merges hiscores data from multiple RSNs, ensuring that the highest values are retained
for skills, boss kills, and activities. This allows treating multiple RSNs as a single
combined account for role assignments.

**Kind**: inner method of [<code>module.exports</code>](#exp_module_modules/services/auto_roles--module.exports)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - - A promise that resolves to the merged hiscores data.  

| Param | Type | Description |
| --- | --- | --- |
| rsns | <code>Array.&lt;string&gt;</code> | An array of RSNs to merge data from. |

**Example**  
```js
const mergedData = await mergeRsnData(['PlayerOne', 'PlayerTwo']);
logger.info(mergedData);
```
<a name="module_modules/services/auto_roles--module.exports..fetchAndProcessMember"></a>

#### module.exports~fetchAndProcessMember(guild, userId) ⇒ <code>Promise.&lt;void&gt;</code>
Fetches and processes data for a Discord guild member based on their associated RSNs.
It retrieves RSNs from the database, fetches and merges hiscores data, and assigns
appropriate Discord roles based on the merged data.

**Kind**: inner method of [<code>module.exports</code>](#exp_module_modules/services/auto_roles--module.exports)  
**Returns**: <code>Promise.&lt;void&gt;</code> - - Resolves when the member has been processed.  

| Param | Type | Description |
| --- | --- | --- |
| guild | <code>Discord.Guild</code> | The Discord guild (server). |
| userId | <code>string</code> | The Discord user ID. |

**Example**  
```js
await fetchAndProcessMember(guild, '123456789012345678');
```
<a name="module_modules/services/auto_roles--module.exports..handleHiscoresData"></a>

#### module.exports~handleHiscoresData(guild, member, rsns, hiscoresData) ⇒ <code>Promise.&lt;void&gt;</code>
Handles the assignment of roles based on hiscores data. It delegates to specific
functions for OSRS roles and achievement-based roles.

**Kind**: inner method of [<code>module.exports</code>](#exp_module_modules/services/auto_roles--module.exports)  
**Returns**: <code>Promise.&lt;void&gt;</code> - - Resolves when all role assignments are complete.  

| Param | Type | Description |
| --- | --- | --- |
| guild | <code>Discord.Guild</code> | The Discord guild (server). |
| member | <code>Discord.GuildMember</code> | The Discord guild member. |
| rsns | <code>Array.&lt;string&gt;</code> | Array of RSNs linked to the member. |
| hiscoresData | <code>Object</code> | Merged hiscores data. |

**Example**  
```js
await handleHiscoresData(guild, member, ['PlayerOne'], mergedData);
```
<a name="module_modules/services/auto_roles--module.exports..createAchievementRoles"></a>

#### module.exports~createAchievementRoles(guild, member, hiscoresData, channelUpdate) ⇒ <code>Promise.&lt;void&gt;</code>
Assigns or updates boss kill and activity-based roles based on players' achievements.

**Kind**: inner method of [<code>module.exports</code>](#exp_module_modules/services/auto_roles--module.exports)  
**Returns**: <code>Promise.&lt;void&gt;</code> - - Resolves when all achievement roles are processed.  

| Param | Type | Description |
| --- | --- | --- |
| guild | <code>Discord.Guild</code> | The Discord guild (server). |
| member | <code>Discord.GuildMember</code> | The Discord guild member. |
| hiscoresData | <code>Object</code> | Merged hiscores data. |
| channelUpdate | <code>Discord.TextChannel</code> | The channel to send role update messages. |

**Example**  
```js
await createAchievementRoles(guild, member, mergedData, channelUpdate);
```
<a name="module_modules/services/auto_roles--module.exports..maybeAssignBossRole"></a>

#### module.exports~maybeAssignBossRole(guild, member, bossName, kills, playerName, channelUpdate) ⇒ <code>Promise.&lt;void&gt;</code>
Assigns a boss-related Discord role to a member if they meet the kill threshold.
Sends an embed message to the designated channel upon successful role assignment.

**Kind**: inner method of [<code>module.exports</code>](#exp_module_modules/services/auto_roles--module.exports)  
**Returns**: <code>Promise.&lt;void&gt;</code> - - Resolves when the role assignment is complete.  

| Param | Type | Description |
| --- | --- | --- |
| guild | <code>Discord.Guild</code> | The Discord guild (server). |
| member | <code>Discord.GuildMember</code> | The Discord guild member. |
| bossName | <code>string</code> | The name of the boss. |
| kills | <code>number</code> | Number of kills the member has achieved. |
| playerName | <code>string</code> | The RSN of the player. |
| channelUpdate | <code>Discord.TextChannel</code> | The channel to send role update messages. |

**Example**  
```js
await maybeAssignBossRole(guild, member, 'K\'ril Tsutsaroth', 150, 'PlayerOne', channelUpdate);
```
<a name="module_modules/services/auto_roles--module.exports..maybeAssignActivityRole"></a>

#### module.exports~maybeAssignActivityRole(guild, member, activityName, score, playerName, channelUpdate) ⇒ <code>Promise.&lt;void&gt;</code>
Assigns an activity-related Discord role to a member if they meet the score threshold.
Sends an embed message to the designated channel upon successful role assignment.

**Kind**: inner method of [<code>module.exports</code>](#exp_module_modules/services/auto_roles--module.exports)  
**Returns**: <code>Promise.&lt;void&gt;</code> - - Resolves when the role assignment is complete.  

| Param | Type | Description |
| --- | --- | --- |
| guild | <code>Discord.Guild</code> | The Discord guild (server). |
| member | <code>Discord.GuildMember</code> | The Discord guild member. |
| activityName | <code>string</code> | The name of the activity. |
| score | <code>number</code> | The activity score the member has achieved. |
| playerName | <code>string</code> | The RSN of the player. |
| channelUpdate | <code>Discord.TextChannel</code> | The channel to send role update messages. |

**Example**  
```js
await maybeAssignActivityRole(guild, member, 'Clue Scrolls All', 200, 'PlayerOne', channelUpdate);
```
<a name="module_modules/services/auto_roles--module.exports..createUpdateOsrsRoles"></a>

#### module.exports~createUpdateOsrsRoles(guild, member, hiscoresData, channelUpdate) ⇒ <code>Promise.&lt;void&gt;</code>
Assigns or updates OSRS skill-based roles (e.g., 99 Attack, 2277 Total) based on hiscores data.
It also removes any 99 skill roles that the member no longer qualifies for.

**Kind**: inner method of [<code>module.exports</code>](#exp_module_modules/services/auto_roles--module.exports)  
**Returns**: <code>Promise.&lt;void&gt;</code> - - Resolves when all OSRS roles are processed.  

| Param | Type | Description |
| --- | --- | --- |
| guild | <code>Discord.Guild</code> | The Discord guild (server). |
| member | <code>Discord.GuildMember</code> | The Discord guild member. |
| hiscoresData | <code>Object</code> | Merged hiscores data. |
| channelUpdate | <code>Discord.TextChannel</code> | The channel to send role update messages. |

**Example**  
```js
await createUpdateOsrsRoles(guild, member, mergedData, channelUpdate);
```
<a name="module_modules/services/member_channel"></a>

## modules/services/member\_channel
Utility functions for managing clan members and updating their data in the Varietyz Bot.
This module interacts with the WOM API to fetch member information, manages role assignments in Discord based on ranks,
and updates the associated Discord channels with the latest clan member data.

Key Features:
- **Role Assignment**: Handles dynamic assignment and removal of roles based on player rank.
- **Clan Member Updates**: Fetches and processes player data, updating roles and information in the Discord guild.
- **Database Management**: Updates the `clan_members` table in the SQLite database and ensures it reflects the latest member data.
- **Discord Notifications**: Sends notifications to a designated Discord channel about rank updates and member changes.
- **Data Purging**: Removes outdated information from the `clan_members` table and purges previous channel messages before sending new data.

External Dependencies:
- **Wise Old Man (WOM) API**: Fetches player information and updates from the Wise Old Man API.
- **Discord.js**: Used for interacting with Discord, including sending messages and managing roles.
- **dbUtils**: Handles database interactions to update clan member data.
- **rankUtils**: Provides utilities for formatting and retrieving rank information.


* [modules/services/member_channel](#module_modules/services/member_channel)
    * [~handleMemberRoles(member, roleName, guild, player, rank)](#module_modules/services/member_channel..handleMemberRoles) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~updateData(client)](#module_modules/services/member_channel..updateData) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~updateDatabase(newData)](#module_modules/services/member_channel..updateDatabase) ⇒ <code>Promise.&lt;boolean&gt;</code>
    * [~updateClanChannel(client, cachedData)](#module_modules/services/member_channel..updateClanChannel) ⇒ <code>Promise.&lt;void&gt;</code>

<a name="module_modules/services/member_channel..handleMemberRoles"></a>

### modules/services/member_channel~handleMemberRoles(member, roleName, guild, player, rank) ⇒ <code>Promise.&lt;void&gt;</code>
Handles the assignment and removal of roles for a Discord guild member based on their rank.
It removes lower-ranked roles and assigns the appropriate role if not already present.

**Kind**: inner method of [<code>modules/services/member\_channel</code>](#module_modules/services/member_channel)  
**Returns**: <code>Promise.&lt;void&gt;</code> - - Resolves when role updates are complete.  

| Param | Type | Description |
| --- | --- | --- |
| member | <code>Discord.GuildMember</code> | The Discord guild member to update roles for. |
| roleName | <code>string</code> | The name of the role to assign to the member. |
| guild | <code>Discord.Guild</code> | The Discord guild where the member resides. |
| player | <code>string</code> | The player's RuneScape Name (RSN). |
| rank | <code>string</code> | The current rank of the player. |

**Example**  
```js
await handleMemberRoles(member, 'Iron', guild, 'PlayerOne', 'Iron');
```
<a name="module_modules/services/member_channel..updateData"></a>

### modules/services/member_channel~updateData(client) ⇒ <code>Promise.&lt;void&gt;</code>
Updates clan member data by fetching the latest information from the WOM API,
updating roles, and refreshing the clan channel in Discord.

**Kind**: inner method of [<code>modules/services/member\_channel</code>](#module_modules/services/member_channel)  
**Returns**: <code>Promise.&lt;void&gt;</code> - - Resolves when the update process is complete.  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>Discord.Client</code> | The Discord client instance. |

**Example**  
```js
await updateData(client);
```
<a name="module_modules/services/member_channel..updateDatabase"></a>

### modules/services/member_channel~updateDatabase(newData) ⇒ <code>Promise.&lt;boolean&gt;</code>
Updates the 'clan_members' table in the database with new clan member data.
It compares the current data with the new data and updates the database if changes are detected.

**Kind**: inner method of [<code>modules/services/member\_channel</code>](#module_modules/services/member_channel)  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - - Returns `true` if changes were detected and the database was updated, `false` otherwise.  

| Param | Type | Description |
| --- | --- | --- |
| newData | <code>Array.&lt;Object&gt;</code> | An array of objects containing player names and their ranks. |

**Example**  
```js
const changes = await updateDatabase(newData);
if (changes) {
logger.info('Database updated.');
}
```
<a name="module_modules/services/member_channel..updateClanChannel"></a>

### modules/services/member_channel~updateClanChannel(client, cachedData) ⇒ <code>Promise.&lt;void&gt;</code>
Updates the Discord clan channel with the latest clan member data.
It purges existing messages and sends updated information as embeds.

**Kind**: inner method of [<code>modules/services/member\_channel</code>](#module_modules/services/member_channel)  
**Returns**: <code>Promise.&lt;void&gt;</code> - - Resolves when the clan channel is updated.  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>Discord.Client</code> | The Discord client instance. |
| cachedData | <code>Array.&lt;Object&gt;</code> | An array of objects containing player data for the embeds. |

**Example**  
```js
await updateClanChannel(client, cachedData);
```
<a name="module_modules/services/name_changes"></a>

## modules/services/name\_changes
Utility functions for processing player name changes in the Varietyz Bot.
This module interacts with the Wise Old Man (WOM) API to fetch recent name changes,
updates the database with the new RSNs, and handles conflict resolution between users.
It also manages sending notifications to Discord channels for both successful updates and conflict resolutions.

Key Features:
- **Name Change Fetching**: Retrieves recent name changes from the WOM API.
- **Database Management**: Saves name change records to the `recent_name_changes` table and updates the `registered_rsn` table.
- **Conflict Resolution**: Handles cases where a new RSN already exists for another user and resolves conflicts.
- **Discord Notifications**: Sends messages to a specified channel notifying users of successful name updates or conflict resolutions.
- **Rate-Limiting and Dependencies**: Ensures rate-limited API requests and processes name changes in the correct order.

External Dependencies:
- **Wise Old Man (WOM) API**: Fetches player name changes.
- **Discord.js**: Sends notifications and updates to Discord channels.
- **dbUtils**: Manages database operations for name change records.


* [modules/services/name_changes](#module_modules/services/name_changes)
    * [~fetchNameChanges()](#module_modules/services/name_changes..fetchNameChanges) ⇒ <code>Promise.&lt;Array.&lt;NameChange&gt;&gt;</code>
    * [~saveToDatabase(nameChanges)](#module_modules/services/name_changes..saveToDatabase) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~updateRegisteredRSN(oldName, newName, channelManager)](#module_modules/services/name_changes..updateRegisteredRSN) ⇒ <code>Promise.&lt;boolean&gt;</code>
    * [~processNameChanges(client)](#module_modules/services/name_changes..processNameChanges) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~NameChange](#module_modules/services/name_changes..NameChange) : <code>Object</code>

<a name="module_modules/services/name_changes..fetchNameChanges"></a>

### modules/services/name_changes~fetchNameChanges() ⇒ <code>Promise.&lt;Array.&lt;NameChange&gt;&gt;</code>
Fetches recent name changes from the WOM API for a specific group.

**Kind**: inner method of [<code>modules/services/name\_changes</code>](#module_modules/services/name_changes)  
**Returns**: <code>Promise.&lt;Array.&lt;NameChange&gt;&gt;</code> - - A promise that resolves to an array of name change records.  
**Example**  
```js
const nameChanges = await fetchNameChanges();
logger.info(nameChanges);
```
<a name="module_modules/services/name_changes..saveToDatabase"></a>

### modules/services/name_changes~saveToDatabase(nameChanges) ⇒ <code>Promise.&lt;void&gt;</code>
Saves an array of name changes to the 'recent_name_changes' table in the database.
Clears existing entries before inserting new ones to maintain the latest state.

**Kind**: inner method of [<code>modules/services/name\_changes</code>](#module_modules/services/name_changes)  
**Returns**: <code>Promise.&lt;void&gt;</code> - - Resolves when the operation is complete.  

| Param | Type | Description |
| --- | --- | --- |
| nameChanges | <code>Array.&lt;NameChange&gt;</code> | Array of name change objects to be saved. |

**Example**  
```js
await saveToDatabase(nameChanges);
```
<a name="module_modules/services/name_changes..updateRegisteredRSN"></a>

### modules/services/name_changes~updateRegisteredRSN(oldName, newName, channelManager) ⇒ <code>Promise.&lt;boolean&gt;</code>
Updates the 'registered_rsn' table with new RSN mappings based on name changes.
Handles conflicts where the new RSN might already exist for the same or different users.
Sends Discord notifications for successful updates and conflict resolutions.

**Kind**: inner method of [<code>modules/services/name\_changes</code>](#module_modules/services/name_changes)  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - - Resolves to `true` if the RSN was updated, `false` otherwise.  

| Param | Type | Description |
| --- | --- | --- |
| oldName | <code>string</code> | The old RuneScape Name (RSN) to be updated. |
| newName | <code>string</code> | The new RSN to replace the old one. |
| channelManager | <code>Discord.GuildChannelManager</code> | Discord channel manager for sending messages. |

**Example**  
```js
const updated = await updateRegisteredRSN('OldName', 'NewName', client.channels);
if (updated) {
logger.info('RSN updated successfully.');
}
```
<a name="module_modules/services/name_changes..processNameChanges"></a>

### modules/services/name_changes~processNameChanges(client) ⇒ <code>Promise.&lt;void&gt;</code>
Processes name changes by fetching recent changes from the WOM API,
saving them to the database, and updating the registered RSNs accordingly.
Also handles dependencies and conflict resolutions based on the timestamp of changes.

**Kind**: inner method of [<code>modules/services/name\_changes</code>](#module_modules/services/name_changes)  
**Returns**: <code>Promise.&lt;void&gt;</code> - - Resolves when the name changes have been processed.  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>Discord.Client</code> | Discord client instance. |

**Example**  
```js
await processNameChanges(client);
```
<a name="module_modules/services/name_changes..NameChange"></a>

### modules/services/name_changes~NameChange : <code>Object</code>
Represents a name change record.

**Kind**: inner typedef of [<code>modules/services/name\_changes</code>](#module_modules/services/name_changes)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| oldName | <code>string</code> | The original RuneScape Name (RSN) before the change. |
| newName | <code>string</code> | The new RSN after the change. |
| resolvedAt | <code>number</code> | The timestamp when the name change was resolved. |

<a name="module_modules/services/player_data_extractor"></a>

## modules/services/player\_data\_extractor
Utility functions for extracting and managing player data in the Varietyz Bot.
This module facilitates fetching, formatting, saving, and maintaining player data using the Wise Old Man API
and SQLite database. It handles the extraction, transformation, and storage of player data,
ensuring the database is up-to-date and accurate.

Key Features:
- **Data Formatting**: Flattens and renames nested player data into a format suitable for database storage.
- **Database Management**: Manages the `player_data` table and ensures player data is saved and updated correctly.
- **API Integration**: Fetches player data from the Wise Old Man API and integrates it into the database.
- **Player Synchronization**: Synchronizes player data with registered RSNs and removes stale or outdated records.
- **Rate-Limiting**: Implements rate-limiting to handle frequent API requests efficiently.

External Dependencies:
- **Wise Old Man (WOM) API**: Fetches player data for RSNs.
- **luxon**: For date manipulation and calculating time intervals.
- **dbUtils**: To interact with the SQLite database for storing player data.


* [modules/services/player_data_extractor](#module_modules/services/player_data_extractor)
    * [~formatDataForSql(data)](#module_modules/services/player_data_extractor..formatDataForSql) ⇒ <code>Object</code>
        * [~flattenDict(d, [parentKey], [sep])](#module_modules/services/player_data_extractor..formatDataForSql..flattenDict) ⇒ <code>Object</code>
    * [~ensurePlayerDataTable()](#module_modules/services/player_data_extractor..ensurePlayerDataTable) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~savePlayerDataToDb(playerName, rawData)](#module_modules/services/player_data_extractor..savePlayerDataToDb) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~loadRegisteredRsnData()](#module_modules/services/player_data_extractor..loadRegisteredRsnData) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [~fetchAndSaveRegisteredPlayerData()](#module_modules/services/player_data_extractor..fetchAndSaveRegisteredPlayerData) ⇒ <code>Promise.&lt;{data: Array.&lt;Object&gt;, fetchFailed: boolean}&gt;</code>
    * [~removeNonMatchingPlayers(currentClanUsers)](#module_modules/services/player_data_extractor..removeNonMatchingPlayers) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~fetchAndUpdatePlayerData()](#module_modules/services/player_data_extractor..fetchAndUpdatePlayerData) ⇒ <code>Promise.&lt;void&gt;</code>

<a name="module_modules/services/player_data_extractor..formatDataForSql"></a>

### modules/services/player_data_extractor~formatDataForSql(data) ⇒ <code>Object</code>
Flattens a nested object into a single-level object with concatenated keys.
Filters out undesired fields and renames keys for database insertion.

This function replicates the old 'formatDataForCsv' but returns an object
suitable for database storage rather than CSV lines.

**Kind**: inner method of [<code>modules/services/player\_data\_extractor</code>](#module_modules/services/player_data_extractor)  
**Returns**: <code>Object</code> - - The formatted and flattened data object.  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Object</code> | The nested data object to format. |

**Example**  
```js
const rawData = {
player: {
stats: {
attack: 99,
strength: 99
},
info: {
username: 'PlayerOne',
country: 'US'
}
}
};
const formattedData = formatDataForSql(rawData);
// formattedData = { 'Stats_Attack': 99, 'Stats_Strength': 99 }
```
<a name="module_modules/services/player_data_extractor..formatDataForSql..flattenDict"></a>

#### formatDataForSql~flattenDict(d, [parentKey], [sep]) ⇒ <code>Object</code>
Recursively flattens a nested object.

**Kind**: inner method of [<code>formatDataForSql</code>](#module_modules/services/player_data_extractor..formatDataForSql)  
**Returns**: <code>Object</code> - - The flattened object.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| d | <code>Object</code> |  | The object to flatten. |
| [parentKey] | <code>string</code> | <code>&quot;&#x27;&#x27;&quot;</code> | The base key to prepend to each key. |
| [sep] | <code>string</code> | <code>&quot;&#x27;_&#x27;&quot;</code> | The separator between keys. |

<a name="module_modules/services/player_data_extractor..ensurePlayerDataTable"></a>

### modules/services/player_data_extractor~ensurePlayerDataTable() ⇒ <code>Promise.&lt;void&gt;</code>
Ensures the 'player_data' table exists in the SQLite database.
If the table does not exist, it creates one with the specified schema.

**Kind**: inner method of [<code>modules/services/player\_data\_extractor</code>](#module_modules/services/player_data_extractor)  
**Returns**: <code>Promise.&lt;void&gt;</code> - - Resolves when the table is ensured.  
**Example**  
```js
await ensurePlayerDataTable();
```
<a name="module_modules/services/player_data_extractor..savePlayerDataToDb"></a>

### modules/services/player_data_extractor~savePlayerDataToDb(playerName, rawData) ⇒ <code>Promise.&lt;void&gt;</code>
Saves formatted player data to the SQLite database.
It overwrites existing entries for the player to ensure data integrity.

**Kind**: inner method of [<code>modules/services/player\_data\_extractor</code>](#module_modules/services/player_data_extractor)  
**Returns**: <code>Promise.&lt;void&gt;</code> - - Resolves when the data is saved.  
**Throws**:

- <code>Error</code> - Throws an error if database operations fail.


| Param | Type | Description |
| --- | --- | --- |
| playerName | <code>string</code> | The name of the player. |
| rawData | <code>Object</code> | The raw data object fetched from the API. |

**Example**  
```js
await savePlayerDataToDb('PlayerOne', rawData);
```
<a name="module_modules/services/player_data_extractor..loadRegisteredRsnData"></a>

### modules/services/player_data_extractor~loadRegisteredRsnData() ⇒ <code>Promise.&lt;Object&gt;</code>
Loads all registered RSNs from the database.
Returns a mapping of user IDs to their associated RSNs.

**Kind**: inner method of [<code>modules/services/player\_data\_extractor</code>](#module_modules/services/player_data_extractor)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - - A mapping of user IDs to arrays of RSNs.  
**Throws**:

- <code>Error</code> - Throws an error if the database query fails.

**Example**  
```js
const rsnData = await loadRegisteredRsnData();
// rsnData = { 'user1': ['RSN1', 'RSN2'], 'user2': ['RSN3'] }
```
<a name="module_modules/services/player_data_extractor..fetchAndSaveRegisteredPlayerData"></a>

### modules/services/player_data_extractor~fetchAndSaveRegisteredPlayerData() ⇒ <code>Promise.&lt;{data: Array.&lt;Object&gt;, fetchFailed: boolean}&gt;</code>
Fetches and saves registered player data by retrieving data from the WOM API
and storing it in the SQLite database. Decides which API endpoint to call
based on the last fetched time.

**Kind**: inner method of [<code>modules/services/player\_data\_extractor</code>](#module_modules/services/player_data_extractor)  
<a name="module_modules/services/player_data_extractor..removeNonMatchingPlayers"></a>

### modules/services/player_data_extractor~removeNonMatchingPlayers(currentClanUsers) ⇒ <code>Promise.&lt;void&gt;</code>
Removes players from the 'player_data' table who are no longer part of the current clan.
This ensures that the database remains clean and only contains relevant player data.

**Kind**: inner method of [<code>modules/services/player\_data\_extractor</code>](#module_modules/services/player_data_extractor)  
**Returns**: <code>Promise.&lt;void&gt;</code> - - Resolves when non-matching players are removed.  

| Param | Type | Description |
| --- | --- | --- |
| currentClanUsers | <code>Set.&lt;string&gt;</code> | A set of current clan user IDs. |

**Example**  
```js
const currentUsers = new Set(['player1', 'player2']);
await removeNonMatchingPlayers(currentUsers);
```
<a name="module_modules/services/player_data_extractor..fetchAndUpdatePlayerData"></a>

### modules/services/player_data_extractor~fetchAndUpdatePlayerData() ⇒ <code>Promise.&lt;void&gt;</code>
Orchestrates the entire player data update process:
1. Fetches data from WOM for each registered RSN.
2. Saves the fetched data to the database.
3. Removes any leftover data that no longer corresponds to registered RSNs.

**Kind**: inner method of [<code>modules/services/player\_data\_extractor</code>](#module_modules/services/player_data_extractor)  
**Returns**: <code>Promise.&lt;void&gt;</code> - - Resolves when the update process is complete.  
**Example**  
```js
await fetchAndUpdatePlayerData();
```
<a name="module_utils/calculateActivity"></a>

## utils/calculateActivity
Utility functions for managing player activity data in the Varietyz Bot's SQLite database.
This module provides functions for ensuring the existence of the `active_inactive` table, as well as calculating
the number of active and inactive players based on their last recorded progress.

Key Features:
- **Table Management**: Ensures the `active_inactive` table exists, which stores player usernames and their last progress timestamp.
- **Active Player Count**: Calculates the number of active players based on their progress within the last 7 days.
- **Inactive Player Count**: Calculates the number of inactive players who have not progressed in the last 21 days.

External Dependencies:
- **luxon**: For handling date and time operations, such as calculating 7-day and 21-day intervals.
- **dbUtils**: For executing SQL queries to interact with the database.


* [utils/calculateActivity](#module_utils/calculateActivity)
    * [~ensureActiveInactiveTable()](#module_utils/calculateActivity..ensureActiveInactiveTable) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~calculateProgressCount()](#module_utils/calculateActivity..calculateProgressCount) ⇒ <code>Promise.&lt;number&gt;</code>
    * [~calculateInactivity()](#module_utils/calculateActivity..calculateInactivity) ⇒ <code>Promise.&lt;number&gt;</code>

<a name="module_utils/calculateActivity..ensureActiveInactiveTable"></a>

### utils/calculateActivity~ensureActiveInactiveTable() ⇒ <code>Promise.&lt;void&gt;</code>
Ensures the `active_inactive` table exists in the SQLite database.

If the table does not exist, this function creates it with the following schema:
- `username` (TEXT): The player's username, serving as the primary key.
- `last_progressed` (DATETIME): The timestamp of the player's last recorded progress.

**Kind**: inner method of [<code>utils/calculateActivity</code>](#module_utils/calculateActivity)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the table has been ensured to exist.  
**Example**  
```js
// Ensure the table exists before performing operations
await ensureActiveInactiveTable();
```
<a name="module_utils/calculateActivity..calculateProgressCount"></a>

### utils/calculateActivity~calculateProgressCount() ⇒ <code>Promise.&lt;number&gt;</code>
Calculates the number of active players who have progressed in the last 7 days.

This function queries the `active_inactive` table to count players whose
`last_progressed` timestamp is within the past 7 days.

**Kind**: inner method of [<code>utils/calculateActivity</code>](#module_utils/calculateActivity)  
**Returns**: <code>Promise.&lt;number&gt;</code> - The count of active players.  
**Example**  
```js
// Get the count of active players
const activeCount = await calculateProgressCount();
console.log(`Active players: ${activeCount}`);
```
<a name="module_utils/calculateActivity..calculateInactivity"></a>

### utils/calculateActivity~calculateInactivity() ⇒ <code>Promise.&lt;number&gt;</code>
Calculates the number of inactive players who have not progressed in the last 21 days.

This function queries the `active_inactive` table to count players whose
`last_progressed` timestamp is more than 21 days old.

**Kind**: inner method of [<code>utils/calculateActivity</code>](#module_utils/calculateActivity)  
**Returns**: <code>Promise.&lt;number&gt;</code> - The count of inactive players.  
**Example**  
```js
// Get the count of inactive players
const inactiveCount = await calculateInactivity();
console.log(`Inactive players: ${inactiveCount}`);
```
<a name="module_utils/dbUtils"></a>

## utils/dbUtils
Utility functions for interacting with an SQLite database in the Varietyz Bot.
This module provides functions to execute SQL queries, manage database connections, and ensure proper
handling of the database lifecycle, including graceful closure on process termination.

Key Features:
- **SQL Query Execution**: Includes functions for executing INSERT, UPDATE, DELETE, and SELECT queries.
- **Data Retrieval**: Provides functions to retrieve all matching rows (`getAll`) or a single row (`getOne`).
- **Database Connection Management**: Ensures the SQLite connection is established, and logs its status.
- **Graceful Shutdown**: Handles the cleanup and closure of the database connection when the process is terminated.

External Dependencies:
- **sqlite3**: For interacting with the SQLite database.
- **logger**: For logging database operations and errors.


* [utils/dbUtils](#module_utils/dbUtils)
    * [~dbPath](#module_utils/dbUtils..dbPath) : <code>string</code>
    * [~db](#module_utils/dbUtils..db) : <code>sqlite3.Database</code>
    * [~runQuery(query, [params])](#module_utils/dbUtils..runQuery) ⇒ <code>Promise.&lt;sqlite3.RunResult&gt;</code>
    * [~getAll(query, [params])](#module_utils/dbUtils..getAll) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
    * [~getOne(query, [params])](#module_utils/dbUtils..getOne) ⇒ <code>Promise.&lt;(Object\|null)&gt;</code>
    * [~runTransaction(queries)](#module_utils/dbUtils..runTransaction) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~getConfigValue(key, defaultValue)](#module_utils/dbUtils..getConfigValue)
    * [~setConfigValue(key, value)](#module_utils/dbUtils..setConfigValue)

<a name="module_utils/dbUtils..dbPath"></a>

### utils/dbUtils~dbPath : <code>string</code>
Path to the SQLite database file.

**Kind**: inner constant of [<code>utils/dbUtils</code>](#module_utils/dbUtils)  
<a name="module_utils/dbUtils..db"></a>

### utils/dbUtils~db : <code>sqlite3.Database</code>
Initializes and maintains the SQLite database connection.
Logs the connection status using the logger.

**Kind**: inner constant of [<code>utils/dbUtils</code>](#module_utils/dbUtils)  
<a name="module_utils/dbUtils..runQuery"></a>

### utils/dbUtils~runQuery(query, [params]) ⇒ <code>Promise.&lt;sqlite3.RunResult&gt;</code>
Executes a SQL query that modifies data (e.g., INSERT, UPDATE, DELETE).
Returns the result object containing metadata about the operation.

**Kind**: inner method of [<code>utils/dbUtils</code>](#module_utils/dbUtils)  
**Returns**: <code>Promise.&lt;sqlite3.RunResult&gt;</code> - A promise that resolves to the result of the query.  
**Throws**:

- <code>Error</code> If the query execution fails.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| query | <code>string</code> |  | The SQL query to execute. |
| [params] | <code>Array.&lt;any&gt;</code> | <code>[]</code> | The parameters to bind to the SQL query. |

**Example**  
```js
// Example usage:
runQuery('INSERT INTO users (name, age) VALUES (?, ?)', ['Alice', 30])
.then(result => {
    logger.info(`Rows affected: ${result.changes}`);
})
.catch(err => {
    logger.error(err);
});
```
<a name="module_utils/dbUtils..getAll"></a>

### utils/dbUtils~getAll(query, [params]) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
Executes a SQL SELECT query and retrieves all matching rows.

**Kind**: inner method of [<code>utils/dbUtils</code>](#module_utils/dbUtils)  
**Returns**: <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code> - A promise that resolves to an array of rows.  
**Throws**:

- <code>Error</code> If the query execution fails.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| query | <code>string</code> |  | The SQL SELECT query to execute. |
| [params] | <code>Array.&lt;any&gt;</code> | <code>[]</code> | The parameters to bind to the SQL query. |

**Example**  
```js
// Example usage:
getAll('SELECT * FROM users WHERE age > ?', [25])
.then(rows => {
    logger.info(rows);
})
.catch(err => {
    logger.error(err);
});
```
<a name="module_utils/dbUtils..getOne"></a>

### utils/dbUtils~getOne(query, [params]) ⇒ <code>Promise.&lt;(Object\|null)&gt;</code>
Executes a SQL SELECT query and retrieves a single matching row.

**Kind**: inner method of [<code>utils/dbUtils</code>](#module_utils/dbUtils)  
**Returns**: <code>Promise.&lt;(Object\|null)&gt;</code> - A promise that resolves to a single row object or `null` if no row matches.  
**Throws**:

- <code>Error</code> If the query execution fails.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| query | <code>string</code> |  | The SQL SELECT query to execute. |
| [params] | <code>Array.&lt;any&gt;</code> | <code>[]</code> | The parameters to bind to the SQL query. |

**Example**  
```js
// Example usage:
getOne('SELECT * FROM users WHERE id = ?', [1])
.then(row => {
    logger.info(row);
})
.catch(err => {
    logger.error(err);
});
```
<a name="module_utils/dbUtils..runTransaction"></a>

### utils/dbUtils~runTransaction(queries) ⇒ <code>Promise.&lt;void&gt;</code>
Executes a SQL transaction with multiple queries.

**Kind**: inner method of [<code>utils/dbUtils</code>](#module_utils/dbUtils)  

| Param | Type | Description |
| --- | --- | --- |
| queries | <code>Array.&lt;{query: string, params: Array}&gt;</code> | An array of queries with their parameters. |

<a name="module_utils/dbUtils..getConfigValue"></a>

### utils/dbUtils~getConfigValue(key, defaultValue)
Fetch a config key from the database (or return a default if not found).

**Kind**: inner method of [<code>utils/dbUtils</code>](#module_utils/dbUtils)  

| Param | Type | Default |
| --- | --- | --- |
| key | <code>string</code> |  | 
| defaultValue | <code>any</code> | <code></code> | 

<a name="module_utils/dbUtils..setConfigValue"></a>

### utils/dbUtils~setConfigValue(key, value)
Set a config key's value in the database.
If the key does not exist, insert it. Otherwise, update it.

**Kind**: inner method of [<code>utils/dbUtils</code>](#module_utils/dbUtils)  

| Param | Type |
| --- | --- |
| key | <code>string</code> | 
| value | <code>any</code> | 

<a name="module_utils/fetchPlayerData"></a>

## utils/fetchPlayerData
Utility function for fetching player data from the Wise Old Man (WOM) API.
This module provides a function to retrieve player data for a specified RuneScape Name (RSN),
handling potential errors such as non-existent players, rate limiting, and unexpected issues.

Key Features:
- **Player Data Retrieval**: Fetches player data from the WOM API for a given RSN.
- **Error Handling**: Manages common API errors including 404 (player not found) and 429 (rate limiting).
- **Rate Limiting**: Throws an error if the WOM API returns a rate limit response.

External Dependencies:
- **axios**: For making HTTP requests to the WOM API.
- **logger**: For logging warnings and errors during the fetch process.

<a name="module_utils/fetchPlayerData..fetchPlayerData"></a>

### utils/fetchPlayerData~fetchPlayerData(rsn) ⇒ <code>Promise.&lt;(Object\|null)&gt;</code>
Fetches player data from the Wise Old Man (WOM) API.

This function retrieves data for a given RuneScape Name (RSN) from the Wise Old Man API.
Handles common scenarios such as non-existent players, rate limiting, and unexpected errors.

**Kind**: inner method of [<code>utils/fetchPlayerData</code>](#module_utils/fetchPlayerData)  
**Returns**: <code>Promise.&lt;(Object\|null)&gt;</code> - Player data from the WOM API as an object, or `null` if the player is not found.  
**Throws**:

- <code>Error</code> Throws an error if rate limited or an unexpected issue occurs.


| Param | Type | Description |
| --- | --- | --- |
| rsn | <code>string</code> | The RuneScape Name (RSN) to fetch data for. |

**Example**  
```js
// Example usage:
const playerData = await fetchPlayerData('PlayerOne');
if (playerData) {
    logger.info(playerData);
}
```
<a name="module_utils/lastFetchedTime"></a>

## utils/lastFetchedTime
Utility functions for managing player fetch times in a SQLite database.
Provides functions for ensuring the existence of the `player_fetch_times` table, retrieving the last fetch time,
and updating the fetch timestamp for a specific player's RuneScape Name (RSN).

Key Features:
- **Table Management**: Ensures the `player_fetch_times` table exists with a specific schema for tracking player fetch times.
- **Fetch Time Retrieval**: Retrieves the last fetch timestamp for a given player, returning `null` if not found.
- **Fetch Time Update**: Updates or inserts the fetch timestamp for a player, ensuring the table remains up-to-date.

External Dependencies:
- **dbUtils**: For executing database queries and interacting with the SQLite database.


* [utils/lastFetchedTime](#module_utils/lastFetchedTime)
    * [~ensurePlayerFetchTimesTable()](#module_utils/lastFetchedTime..ensurePlayerFetchTimesTable) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~getLastFetchedTime(rsn)](#module_utils/lastFetchedTime..getLastFetchedTime) ⇒ <code>Promise.&lt;(Date\|null)&gt;</code>
    * [~resetPlayerFetchTimesTable()](#module_utils/lastFetchedTime..resetPlayerFetchTimesTable) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~setLastFetchedTime(rsn)](#module_utils/lastFetchedTime..setLastFetchedTime) ⇒ <code>Promise.&lt;void&gt;</code>

<a name="module_utils/lastFetchedTime..ensurePlayerFetchTimesTable"></a>

### utils/lastFetchedTime~ensurePlayerFetchTimesTable() ⇒ <code>Promise.&lt;void&gt;</code>
Ensures the `player_fetch_times` table exists in the SQLite database.

If the table does not exist, this function creates it with the following schema:
- `rsn` (TEXT): Primary key representing the RuneScape Name (RSN) of the player.
- `last_fetched_at` (DATETIME): The timestamp of the last fetch, defaulting to the current time.

**Kind**: inner method of [<code>utils/lastFetchedTime</code>](#module_utils/lastFetchedTime)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the table is ensured to exist.  
**Example**  
```js
// Ensure the table exists before using fetch time functions
await ensurePlayerFetchTimesTable();
```
<a name="module_utils/lastFetchedTime..getLastFetchedTime"></a>

### utils/lastFetchedTime~getLastFetchedTime(rsn) ⇒ <code>Promise.&lt;(Date\|null)&gt;</code>
Retrieves the last fetched timestamp for a given player.

This function queries the `player_fetch_times` table for the last fetched time of the specified player.
If the player does not exist in the table, it returns `null`.

**Kind**: inner method of [<code>utils/lastFetchedTime</code>](#module_utils/lastFetchedTime)  
**Returns**: <code>Promise.&lt;(Date\|null)&gt;</code> - A `Date` object representing the last fetched time, or `null` if not found.  

| Param | Type | Description |
| --- | --- | --- |
| rsn | <code>string</code> | The RuneScape Name (RSN) of the player. |

**Example**  
```js
// Retrieve the last fetched timestamp for a player
const lastFetched = await getLastFetchedTime('playerone');
console.log(lastFetched); // Outputs: Date object or null
```
<a name="module_utils/lastFetchedTime..resetPlayerFetchTimesTable"></a>

### utils/lastFetchedTime~resetPlayerFetchTimesTable() ⇒ <code>Promise.&lt;void&gt;</code>
Ensures the `player_fetch_times` table gets removed from the SQLite database.

If the table exists, this function deletes it.

**Kind**: inner method of [<code>utils/lastFetchedTime</code>](#module_utils/lastFetchedTime)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the table is ensured to exist.  
**Example**  
```js
await resetPlayerFetchTimesTable();
```
<a name="module_utils/lastFetchedTime..setLastFetchedTime"></a>

### utils/lastFetchedTime~setLastFetchedTime(rsn) ⇒ <code>Promise.&lt;void&gt;</code>
Updates the last fetched timestamp for a given player to the current time.

This function inserts or updates the `player_fetch_times` table with the current timestamp for the specified player.
If the player already exists in the table, their `last_fetched_at` value is updated.

**Kind**: inner method of [<code>utils/lastFetchedTime</code>](#module_utils/lastFetchedTime)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the timestamp is successfully updated.  

| Param | Type | Description |
| --- | --- | --- |
| rsn | <code>string</code> | The RuneScape Name (RSN) of the player. |

**Example**  
```js
// Update the last fetched timestamp for a player
await setLastFetchedTime('playerone');
```
<a name="module_utils/logger"></a>

## utils/logger
Winston logger utility for the Varietyz Bot.
Configures and exports a Winston logger instance with daily log rotation and enhanced error handling.
This module provides logging functionality to output messages to the console and log files,
as well as manage log directories, rotate logs daily, and handle uncaught exceptions and unhandled promise rejections.

Key Features:
- **Console Logging**: Colorized console output for easy readability of logs.
- **Daily Log Rotation**: Logs are written to files with daily rotation and retention, organized by year and month.
- **Error Handling**: Captures uncaught exceptions and unhandled promise rejections, logging the error and gracefully exiting.
- **Log Directory Management**: Ensures log directories exist and creates necessary folder structures.

External Dependencies:
- **winston**: A powerful logging library for logging to both the console and file systems.
- **winston-daily-rotate-file**: A winston transport for logging to daily rotating files.
- **path**: Utility for handling file paths.
- **fs**: Node's file system module for checking and creating directories.


* [utils/logger](#module_utils/logger)
    * [~logFormat](#module_utils/logger..logFormat) : <code>winston.Format</code>
    * [~logger](#module_utils/logger..logger) : <code>winston.Logger</code>
    * [~getYearMonthPath()](#module_utils/logger..getYearMonthPath) ⇒ <code>string</code>
    * [~createLogDirectories()](#module_utils/logger..createLogDirectories) ⇒ <code>void</code>
    * [~initializeLogger()](#module_utils/logger..initializeLogger) ⇒ <code>void</code>
    * ["uncaughtException" (error)](#event_uncaughtException) ⇒ <code>void</code>
    * ["unhandledRejection" (reason, promise)](#event_unhandledRejection) ⇒ <code>void</code>

<a name="module_utils/logger..logFormat"></a>

### utils/logger~logFormat : <code>winston.Format</code>
Custom log format combining a timestamp, log level, and message.

**Kind**: inner constant of [<code>utils/logger</code>](#module_utils/logger)  
<a name="module_utils/logger..logger"></a>

### utils/logger~logger : <code>winston.Logger</code>
Creates and configures the Winston logger instance.
The logger writes logs to the console and daily rotated log files.

**Kind**: inner constant of [<code>utils/logger</code>](#module_utils/logger)  
**Example**  
```js
logger.info('This is an info message');
logger.error('This is an error message');
```
<a name="module_utils/logger..getYearMonthPath"></a>

### utils/logger~getYearMonthPath() ⇒ <code>string</code>
Generates the directory path for logs based on the current year and month.

**Kind**: inner method of [<code>utils/logger</code>](#module_utils/logger)  
**Returns**: <code>string</code> - The path to the log directory for the current year and month.  
**Example**  
```js
const logPath = getYearMonthPath();
// Example: 'logs/2025/january'
```
<a name="module_utils/logger..createLogDirectories"></a>

### utils/logger~createLogDirectories() ⇒ <code>void</code>
Ensures that the necessary log directories exist.
Creates year/month folders and a dedicated handler directory for audit files if they don't exist.

**Kind**: inner method of [<code>utils/logger</code>](#module_utils/logger)  
**Example**  
```js
createLogDirectories();
```
<a name="module_utils/logger..initializeLogger"></a>

### utils/logger~initializeLogger() ⇒ <code>void</code>
Initializes the logging system by ensuring necessary directories exist.
Must be called before any logging occurs.

**Kind**: inner method of [<code>utils/logger</code>](#module_utils/logger)  
**Example**  
```js
initializeLogger();
```
<a name="event_uncaughtException"></a>

### "uncaughtException" (error) ⇒ <code>void</code>
Handles uncaught exceptions by logging the error and exiting the process.

**Kind**: event emitted by [<code>utils/logger</code>](#module_utils/logger)  

| Param | Type | Description |
| --- | --- | --- |
| error | <code>Error</code> | The uncaught exception. |

<a name="event_unhandledRejection"></a>

### "unhandledRejection" (reason, promise) ⇒ <code>void</code>
Handles unhandled promise rejections by logging the reason and the promise.

**Kind**: event emitted by [<code>utils/logger</code>](#module_utils/logger)  

| Param | Type | Description |
| --- | --- | --- |
| reason | <code>any</code> | The reason for the rejection. |
| promise | <code>Promise</code> | The promise that was rejected. |

<a name="module_utils/normalizeRsn"></a>

## utils/normalizeRsn
Utility function for normalizing RuneScape names (RSNs).
Ensures RSNs are stored in a consistent format for database operations and efficient lookups.
This module helps maintain uniformity in RSN storage and improves search accuracy.

Key Features:
- **RSN Normalization**: Converts RSNs to a standard format by removing unwanted characters, collapsing multiple spaces, and converting the entire string to lowercase.
- **Error Handling**: Ensures input is a valid string, throwing an error if the input is invalid.

External Dependencies:
- None.

<a name="module_utils/normalizeRsn..normalizeRsn"></a>

### utils/normalizeRsn~normalizeRsn(rsn) ⇒ <code>string</code>
Normalizes a RuneScape Name (RSN) for consistent database storage and lookup.

The normalization process ensures RSNs are stored in a uniform format by:
- Replacing consecutive '-' or '_' characters with a single space.
- Collapsing multiple spaces into a single space.
- Trimming leading and trailing spaces.
- Converting all characters to lowercase.

**Kind**: inner method of [<code>utils/normalizeRsn</code>](#module_utils/normalizeRsn)  
**Returns**: <code>string</code> - The normalized RSN in lowercase with standardized spacing.  
**Throws**:

- <code>TypeError</code> If the provided `rsn` is not a string.


| Param | Type | Description |
| --- | --- | --- |
| rsn | <code>string</code> | The RuneScape name to normalize. Must be a non-empty string. |

**Example**  
```js
// Example of normalizing an RSN
const normalized = normalizeRsn('  John_Doe-- ');
console.log(normalized); // 'john doe'
```
<a name="module_utils/purgeChannel"></a>

## utils/purgeChannel
Utility function for managing Discord channels in the Varietyz Bot.
Provides a function to purge messages from a specified Discord channel while respecting rate limits.
This function is optimized to handle large volumes of messages by processing them in batches.

Key Features:
- **Efficient Message Deletion**: Deletes messages in batches of up to 100 to handle large volumes.
- **Rate Limit Management**: Introduces delays between deletions to avoid hitting Discord's rate limits.
- **Error Handling**: Logs and handles any errors that occur during the message deletion process.

External Dependencies:
- `sleep` function from `./sleepUtil` to introduce delays between deletions.
- `logger` module for logging operations and errors.

<a name="module_utils/purgeChannel..purgeChannel"></a>

### utils/purgeChannel~purgeChannel(channel) ⇒ <code>Promise.&lt;void&gt;</code>
Deletes all messages in a specified Discord text channel.

This function fetches and deletes messages in batches of up to 100 to efficiently
handle large volumes of messages. It also introduces delays between deletions to
prevent hitting Discord's rate limits.

**Kind**: inner method of [<code>utils/purgeChannel</code>](#module_utils/purgeChannel)  
**Returns**: <code>Promise.&lt;void&gt;</code> - A promise that resolves when all messages in the channel are deleted.  
**Throws**:

- <code>Error</code> Logs and handles any errors that occur during the purge process.


| Param | Type | Description |
| --- | --- | --- |
| channel | <code>Discord.TextChannel</code> | The Discord channel to purge. |

**Example**  
```js
// Purge all messages in a specified channel
const channel = client.channels.cache.get('CHANNEL_ID');
if (channel) {
    await purgeChannel(channel);
}
```
<a name="module_utils/rankUtils"></a>

## utils/rankUtils
Utility functions for managing RuneScape clan ranks in the Varietyz Bot.
Provides tools for retrieving rank-specific details, formatting experience points, and normalizing rank strings.
These utilities enhance the presentation and handling of rank-related data in Discord interactions.

Key Features:
- **Rank Emojis**: Retrieves emojis associated with specific ranks for better visualization.
- **Rank Colors**: Provides hexadecimal color codes for ranks, with a default fallback.
- **Experience Formatting**: Formats numerical experience points with commas for readability.
- **Rank String Normalization**: Converts rank identifiers to display-friendly formats.

External Dependencies:
- `RANKS` object from the `../../config/constants` module, which defines rank metadata (e.g., emojis, colors).


* [utils/rankUtils](#module_utils/rankUtils)
    * [~getRankEmoji(rank)](#module_utils/rankUtils..getRankEmoji) ⇒ <code>string</code>
    * [~getRankColor(rank)](#module_utils/rankUtils..getRankColor) ⇒ <code>number</code>
    * [~formatExp(experience)](#module_utils/rankUtils..formatExp) ⇒ <code>string</code>
    * [~formatRank(rank)](#module_utils/rankUtils..formatRank) ⇒ <code>string</code>

<a name="module_utils/rankUtils..getRankEmoji"></a>

### utils/rankUtils~getRankEmoji(rank) ⇒ <code>string</code>
Retrieves the emoji representation for a given rank.

**Kind**: inner method of [<code>utils/rankUtils</code>](#module_utils/rankUtils)  
**Returns**: <code>string</code> - The corresponding rank emoji, or an empty string if no emoji is associated with the rank.  

| Param | Type | Description |
| --- | --- | --- |
| rank | <code>string</code> | The rank of the clan member. Expected to be case-insensitive. |

**Example**  
```js
// Example: Leader rank
const emoji = getRankEmoji('Leader');
console.log(emoji); // '👑'
```
<a name="module_utils/rankUtils..getRankColor"></a>

### utils/rankUtils~getRankColor(rank) ⇒ <code>number</code>
Retrieves the color associated with a given rank.

**Kind**: inner method of [<code>utils/rankUtils</code>](#module_utils/rankUtils)  
**Returns**: <code>number</code> - The corresponding rank color in hexadecimal format (e.g., `0xff0000`),
or a default yellow color (`0xffff00`) if the rank is not found.  

| Param | Type | Description |
| --- | --- | --- |
| rank | <code>string</code> | The rank of the clan member. Expected to be case-insensitive. |

**Example**  
```js
// Example: Officer rank
const color = getRankColor('Officer');
console.log(color); // 0xff0000
```
<a name="module_utils/rankUtils..formatExp"></a>

### utils/rankUtils~formatExp(experience) ⇒ <code>string</code>
Formats experience points by converting them to an integer and adding commas for readability.

**Kind**: inner method of [<code>utils/rankUtils</code>](#module_utils/rankUtils)  
**Returns**: <code>string</code> - The formatted experience points with commas.  
**Throws**:

- <code>TypeError</code> If the input cannot be parsed as a number.


| Param | Type | Description |
| --- | --- | --- |
| experience | <code>number</code> \| <code>string</code> | The experience points to format. Can be a number or a string representation of a number. |

**Example**  
```js
// Example: Formatting experience
const formattedExp = formatExp(1234567);
console.log(formattedExp); // '1,234,567'
```
<a name="module_utils/rankUtils..formatRank"></a>

### utils/rankUtils~formatRank(rank) ⇒ <code>string</code>
Formats a rank string by replacing underscores with spaces and capitalizing each word.

This function is useful for normalizing rank strings from storage formats to display formats.

**Kind**: inner method of [<code>utils/rankUtils</code>](#module_utils/rankUtils)  
**Returns**: <code>string</code> - The formatted rank string with spaces and proper capitalization.  

| Param | Type | Description |
| --- | --- | --- |
| rank | <code>string</code> | The rank string to format. For example, 'clan_leader' will be formatted as 'Clan Leader'. |

**Example**  
```js
// Example: Formatting a rank string
const formattedRank = formatRank('clan_leader');
console.log(formattedRank); // 'Clan Leader'
```
<a name="module_utils/sleepUtil"></a>

## utils/sleepUtil
Utility function for creating delays in execution.
Provides a simple mechanism to pause asynchronous operations for a specified duration.

Key Features:
- **Promise-based Delay**: Returns a promise that resolves after the specified time, enabling pauses in async/await workflows.
- **Input Validation**: Ensures the delay duration is a non-negative number, throwing an error for invalid input.
- **Ease of Use**: Simplifies the process of adding delays in scripts or workflows.

External Dependencies:
- None.

<a name="module_utils/sleepUtil..sleep"></a>

### utils/sleepUtil~sleep(ms) ⇒ <code>Promise.&lt;void&gt;</code>
Pauses execution for a specified number of milliseconds.

This function creates a delay by returning a promise that resolves after the specified time.
It can be used in asynchronous functions with `await` to pause execution temporarily.

**Kind**: inner method of [<code>utils/sleepUtil</code>](#module_utils/sleepUtil)  
**Returns**: <code>Promise.&lt;void&gt;</code> - A promise that resolves after the specified duration.  
**Throws**:

- <code>TypeError</code> If the provided `ms` is not a number or is negative.


| Param | Type | Description |
| --- | --- | --- |
| ms | <code>number</code> | The number of milliseconds to sleep. Must be a non-negative number. |

**Example**  
```js
// Example of pausing execution for 2 seconds
async function example() {
    console.log('Start');
    await sleep(2000);
    console.log('End'); // Logs "End" after 2 seconds
}
```
<a name="module_utils/validateRsn"></a>

## utils/validateRsn
Utility functions for validating RuneScape names (RSNs).
Ensures RSNs meet specific format criteria for consistent database storage and lookup.

Key Features:
- **Format Validation**: Checks if RSNs are between 1 and 12 characters long, contain only letters, numbers, and single spaces, and exclude forbidden characters like hyphens or underscores.
- **Forbidden Phrase Detection**: Prevents RSNs containing phrases such as "Java", "Mod", or "Jagex".
- **Feedback Messages**: Provides clear validation messages for invalid RSNs.

External Dependencies:
- None.

<a name="module_utils/validateRsn..validateRsn"></a>

### utils/validateRsn~validateRsn(rsn) ⇒ <code>Object</code>
Validates the format of an RSN (RuneScape Name).

**Kind**: inner method of [<code>utils/validateRsn</code>](#module_utils/validateRsn)  
**Returns**: <code>Object</code> - - An object containing validation result and message.  

| Param | Type | Description |
| --- | --- | --- |
| rsn | <code>string</code> | RSN to validate. |

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| valid | <code>boolean</code> | Indicates whether the RSN is valid. |
| message | <code>string</code> | Provides feedback on the validation result. |

**Example**  
```js
const validation = validateRsn('PlayerOne');
logger.info(validation); // { valid: true, message: '' }
```
<a name="module_scripts/create_db"></a>

## scripts/create\_db
Script to initialize and set up the SQLite database for the Varietyz Bot.
This script creates necessary tables for storing registered RSNs, clan members, recent name changes,
player data, as well as tracking player fetch times and active/inactive status.
The script deletes any existing database file before creating a new one to ensure a clean setup.

Core Features:
- Deletes any existing database file to ensure a fresh setup.
- Creates the 'registered_rsn' table to store registered RuneScape names.
- Creates the 'active_inactive' table to track player progression activity.
- Creates the 'player_fetch_times' table to store last fetched data timestamps.
- Creates the 'clan_members' table to store information about clan members.
- Creates the 'recent_name_changes' table to track name changes for players.
- Creates the 'player_data' table to store various player-specific data points.
- Logs the success or failure of each table creation process.

External Dependencies:
- **SQLite3**: For interacting with the SQLite database.
- **fs**: For file system operations such as deleting existing databases and creating directories.
- **path**: For constructing the path to the database file.


* [scripts/create_db](#module_scripts/create_db)
    * [~dbPath](#module_scripts/create_db..dbPath) : <code>string</code>
    * [~initializeDatabase()](#module_scripts/create_db..initializeDatabase)
    * [~createRegisteredRsnTable(db)](#module_scripts/create_db..createRegisteredRsnTable)
    * [~createActiveInactiveTable(db)](#module_scripts/create_db..createActiveInactiveTable)
    * [~createFetchTimeTable(db)](#module_scripts/create_db..createFetchTimeTable)
    * [~createClanMembersTable(db)](#module_scripts/create_db..createClanMembersTable)
    * [~createRecentNameChangesTable(db)](#module_scripts/create_db..createRecentNameChangesTable)
    * [~createPlayerDataTable(db)](#module_scripts/create_db..createPlayerDataTable)

<a name="module_scripts/create_db..dbPath"></a>

### scripts/create_db~dbPath : <code>string</code>
Path to the SQLite database file.

**Kind**: inner constant of [<code>scripts/create\_db</code>](#module_scripts/create_db)  
<a name="module_scripts/create_db..initializeDatabase"></a>

### scripts/create_db~initializeDatabase()
Initializes the SQLite database by deleting any existing database file,
creating the necessary directories, and establishing a new database connection.

**Kind**: inner method of [<code>scripts/create\_db</code>](#module_scripts/create_db)  
<a name="module_scripts/create_db..createRegisteredRsnTable"></a>

### scripts/create_db~createRegisteredRsnTable(db)
Creates the 'registered_rsn' table in the SQLite database.
This table stores the RuneScape names registered by users.

**Kind**: inner method of [<code>scripts/create\_db</code>](#module_scripts/create_db)  

| Param | Type | Description |
| --- | --- | --- |
| db | <code>sqlite3.Database</code> | The SQLite database instance. |

<a name="module_scripts/create_db..createActiveInactiveTable"></a>

### scripts/create_db~createActiveInactiveTable(db)
Creates the 'active_inactive' table in the SQLite database.
This table stores information about members last active progression state.

**Kind**: inner method of [<code>scripts/create\_db</code>](#module_scripts/create_db)  

| Param | Type | Description |
| --- | --- | --- |
| db | <code>sqlite3.Database</code> | The SQLite database instance. |

<a name="module_scripts/create_db..createFetchTimeTable"></a>

### scripts/create_db~createFetchTimeTable(db)
Creates the 'player_fetch_times' table in the SQLite database.
This table stores information about members last update state.

**Kind**: inner method of [<code>scripts/create\_db</code>](#module_scripts/create_db)  

| Param | Type | Description |
| --- | --- | --- |
| db | <code>sqlite3.Database</code> | The SQLite database instance. |

<a name="module_scripts/create_db..createClanMembersTable"></a>

### scripts/create_db~createClanMembersTable(db)
Creates the 'clan_members' table in the SQLite database.
This table stores information about clan members.

**Kind**: inner method of [<code>scripts/create\_db</code>](#module_scripts/create_db)  

| Param | Type | Description |
| --- | --- | --- |
| db | <code>sqlite3.Database</code> | The SQLite database instance. |

<a name="module_scripts/create_db..createRecentNameChangesTable"></a>

### scripts/create_db~createRecentNameChangesTable(db)
Creates the 'recent_name_changes' table in the SQLite database.
This table records recent name changes of players.

**Kind**: inner method of [<code>scripts/create\_db</code>](#module_scripts/create_db)  

| Param | Type | Description |
| --- | --- | --- |
| db | <code>sqlite3.Database</code> | The SQLite database instance. |

<a name="module_scripts/create_db..createPlayerDataTable"></a>

### scripts/create_db~createPlayerDataTable(db)
Creates the 'player_data' table in the SQLite database.
This table stores various data points related to players.

**Kind**: inner method of [<code>scripts/create\_db</code>](#module_scripts/create_db)  

| Param | Type | Description |
| --- | --- | --- |
| db | <code>sqlite3.Database</code> | The SQLite database instance. |

<a name="module_tasks"></a>

## tasks
Defines and manages scheduled tasks for the Varietyz Bot.Each task is represented as an object that includes its name, function to execute,interval for execution, and flags for startup and scheduling behavior. Tasks areused to handle automated processes such as data updates, member processing, andplayer data synchronization.Key Features:- Registers and schedules tasks with customizable intervals and execution behavior.- Includes tasks for updating data, processing name changes, fetching player data, handling hiscores, and updating voice channels.- Integrates with external modules for processing and database operations.- Supports asynchronous execution and error logging for each task.External Dependencies:- dotenv: Loads environment variables for configuration.- Various processing modules (e.g., member_channel, name_changes, player_data_extractor).- Database utilities (`dbUtils`) and logging utilities (`logger`).


* [tasks](#module_tasks)
    * [module.exports](#exp_module_tasks--module.exports) : <code>Array.&lt;Task&gt;</code> ⏏
        * [~Task](#module_tasks--module.exports..Task) : <code>Object</code>

<a name="exp_module_tasks--module.exports"></a>

### module.exports : <code>Array.&lt;Task&gt;</code> ⏏
An array of scheduled tasks for the Varietyz Bot.Each task is an object adhering to the [Task](Task) typedef.

**Kind**: Exported member  
<a name="module_tasks--module.exports..Task"></a>

#### module.exports~Task : <code>Object</code>
Represents a scheduled task.

**Kind**: inner typedef of [<code>module.exports</code>](#exp_module_tasks--module.exports)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | The unique name of the task. |
| func | <code>function</code> | The asynchronous function to execute for the task. |
| interval | <code>number</code> | The interval in seconds at which the task should run. |
| runOnStart | <code>boolean</code> | Indicates whether the task should run immediately upon bot startup. |
| runAsTask | <code>boolean</code> | Indicates whether the task should be scheduled to run at regular intervals. |

<a name="WOMApiClient"></a>

## WOMApiClient
A client for interacting with the Wise Old Man (WOM) API.
Manages rate-limited requests, handles retries, and provides access to the WOM API endpoints.

**Kind**: global class  

* [WOMApiClient](#WOMApiClient)
    * [new WOMApiClient()](#new_WOMApiClient_new)
    * [.handleWOMRateLimit()](#WOMApiClient+handleWOMRateLimit) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.retryRequest(endpoint, methodName, params, [retries])](#WOMApiClient+retryRequest) ⇒ <code>Promise.&lt;any&gt;</code>
    * [.request(endpoint, methodName, [params])](#WOMApiClient+request) ⇒ <code>Promise.&lt;any&gt;</code>

<a name="new_WOMApiClient_new"></a>

### new WOMApiClient()
Initializes the WOM API client with an API key and user agent.
Sets rate limits based on the presence of an API key and validates the WOM group ID.

**Throws**:

- <code>Error</code> Throws an error if the `WOM_GROUP_ID` is invalid.

<a name="WOMApiClient+handleWOMRateLimit"></a>

### womApiClient.handleWOMRateLimit() ⇒ <code>Promise.&lt;void&gt;</code>
Ensures that the WOM API rate limit is not exceeded.
Throws an error if the request limit is reached within the current 60-second window.

**Kind**: instance method of [<code>WOMApiClient</code>](#WOMApiClient)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves if the rate limit has not been exceeded.  
**Throws**:

- <code>Error</code> If the rate limit is exceeded.

<a name="WOMApiClient+retryRequest"></a>

### womApiClient.retryRequest(endpoint, methodName, params, [retries]) ⇒ <code>Promise.&lt;any&gt;</code>
Retries a failed API request with exponential backoff.

**Kind**: instance method of [<code>WOMApiClient</code>](#WOMApiClient)  
**Returns**: <code>Promise.&lt;any&gt;</code> - The result of the API call, or `null` if a non-critical error occurs.  
**Throws**:

- <code>Error</code> Throws an error if all retries fail and the error is critical.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| endpoint | <code>string</code> |  | The WOM API endpoint (e.g., 'players', 'groups'). |
| methodName | <code>string</code> |  | The method name to call on the endpoint. |
| params | <code>string</code> \| <code>Object</code> |  | The parameters to pass to the API method. |
| [retries] | <code>number</code> | <code>5</code> | The number of retry attempts before throwing an error. |

<a name="WOMApiClient+request"></a>

### womApiClient.request(endpoint, methodName, [params]) ⇒ <code>Promise.&lt;any&gt;</code>
Makes a request to the WOM API with rate limiting and retries.

**Kind**: instance method of [<code>WOMApiClient</code>](#WOMApiClient)  
**Returns**: <code>Promise.&lt;any&gt;</code> - The result of the API call.  
**Throws**:

- <code>Error</code> Throws an error if the request fails after all retries.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| endpoint | <code>string</code> |  | The WOM API endpoint (e.g., 'players', 'groups'). |
| methodName | <code>string</code> |  | The method name to call on the endpoint. |
| [params] | <code>string</code> \| <code>Object</code> | <code>&quot;{}&quot;</code> | The parameters to pass to the API method. |

<a name="CompetitionService"></a>

## CompetitionService
CompetitionService handles creation, management, and conclusion of competitions.

**Kind**: global class  

* [CompetitionService](#CompetitionService)
    * [new CompetitionService(client)](#new_CompetitionService_new)
    * [.startNextCompetitionCycle()](#CompetitionService+startNextCompetitionCycle)
    * [.updateCompetitionData()](#CompetitionService+updateCompetitionData)
    * [.scheduleRotation(endTime)](#CompetitionService+scheduleRotation)
    * [.scheduleRotationsOnStartup()](#CompetitionService+scheduleRotationsOnStartup)
    * [.removeInvalidCompetitions()](#CompetitionService+removeInvalidCompetitions)
    * [.createDefaultCompetitions()](#CompetitionService+createDefaultCompetitions)
    * [.createCompetitionFromQueue(competition)](#CompetitionService+createCompetitionFromQueue)
    * [.createCompetition(type, metric, startsAt, endsAt)](#CompetitionService+createCompetition)
    * [.updateActiveCompetitionEmbed(competitionType, [forceRefresh])](#CompetitionService+updateActiveCompetitionEmbed)
    * [.buildPollDropdown(compType)](#CompetitionService+buildPollDropdown)
    * [.getRandomMetric(type)](#CompetitionService+getRandomMetric)
    * [.handleVote(interaction)](#CompetitionService+handleVote)
    * [.updateLeaderboard(competitionType)](#CompetitionService+updateLeaderboard)
    * [.getActiveCompetition(competitionType)](#CompetitionService+getActiveCompetition) ⇒ <code>Object</code> \| <code>null</code>
    * [.getSortedParticipants(competitionId)](#CompetitionService+getSortedParticipants) ⇒ <code>Array</code>
    * [.formatLeaderboardDescription(participants)](#CompetitionService+formatLeaderboardDescription) ⇒ <code>string</code>
    * [.buildLeaderboardEmbed(competitionType, description)](#CompetitionService+buildLeaderboardEmbed) ⇒ <code>EmbedBuilder</code>
    * [.sendOrUpdateEmbed(channel, competition, embed)](#CompetitionService+sendOrUpdateEmbed)

<a name="new_CompetitionService_new"></a>

### new CompetitionService(client)

| Param |
| --- |
| client | 

<a name="CompetitionService+startNextCompetitionCycle"></a>

### competitionService.startNextCompetitionCycle()
Starts the next competition cycle and schedules the subsequent rotation.

**Kind**: instance method of [<code>CompetitionService</code>](#CompetitionService)  
<a name="CompetitionService+updateCompetitionData"></a>

### competitionService.updateCompetitionData()
**Kind**: instance method of [<code>CompetitionService</code>](#CompetitionService)  
<a name="CompetitionService+scheduleRotation"></a>

### competitionService.scheduleRotation(endTime)
Schedules the rotation using node-schedule.

**Kind**: instance method of [<code>CompetitionService</code>](#CompetitionService)  

| Param | Type | Description |
| --- | --- | --- |
| endTime | <code>Date</code> | The time when the competition ends. |

<a name="CompetitionService+scheduleRotationsOnStartup"></a>

### competitionService.scheduleRotationsOnStartup()
On bot startup, schedule rotations based on active competitions.

**Kind**: instance method of [<code>CompetitionService</code>](#CompetitionService)  
<a name="CompetitionService+removeInvalidCompetitions"></a>

### competitionService.removeInvalidCompetitions()
Removes any competitions from the DB that do not exist on WOM(i.e., WOM returns a 404 or otherwise invalid data).

**Kind**: instance method of [<code>CompetitionService</code>](#CompetitionService)  
<a name="CompetitionService+createDefaultCompetitions"></a>

### competitionService.createDefaultCompetitions()
**Kind**: instance method of [<code>CompetitionService</code>](#CompetitionService)  
<a name="CompetitionService+createCompetitionFromQueue"></a>

### competitionService.createCompetitionFromQueue(competition)
**Kind**: instance method of [<code>CompetitionService</code>](#CompetitionService)  

| Param |
| --- |
| competition | 

<a name="CompetitionService+createCompetition"></a>

### competitionService.createCompetition(type, metric, startsAt, endsAt)
Creates a new competition on WOM, inserts in DB, and posts an embed + dropdown poll

**Kind**: instance method of [<code>CompetitionService</code>](#CompetitionService)  

| Param |
| --- |
| type | 
| metric | 
| startsAt | 
| endsAt | 

<a name="CompetitionService+updateActiveCompetitionEmbed"></a>

### competitionService.updateActiveCompetitionEmbed(competitionType, [forceRefresh])
Attempts to ensure there's a single "Active Competition" embed in the channelthat matches the current competition's metric/times.If the existing embed is missing or outdated, it is replaced or edited.

**Kind**: instance method of [<code>CompetitionService</code>](#CompetitionService)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| competitionType | <code>string</code> |  | 'SOTW' or 'BOTW' |
| [forceRefresh] | <code>boolean</code> | <code>false</code> | If true, always edit or replace the embed even if it matches |

<a name="CompetitionService+buildPollDropdown"></a>

### competitionService.buildPollDropdown(compType)
Builds a dropdown of all skill/boss options, plus their current vote counts (if any)for an active competition of the given type (SOTW/BOTW).

**Kind**: instance method of [<code>CompetitionService</code>](#CompetitionService)  

| Param |
| --- |
| compType | 

<a name="CompetitionService+getRandomMetric"></a>

### competitionService.getRandomMetric(type)
Returns a random skill or boss name

**Kind**: instance method of [<code>CompetitionService</code>](#CompetitionService)  

| Param |
| --- |
| type | 

<a name="CompetitionService+handleVote"></a>

### competitionService.handleVote(interaction)
The main vote handler for the dropdown menu

**Kind**: instance method of [<code>CompetitionService</code>](#CompetitionService)  

| Param |
| --- |
| interaction | 

<a name="CompetitionService+updateLeaderboard"></a>

### competitionService.updateLeaderboard(competitionType)
Update the WOM-based leaderboard

**Kind**: instance method of [<code>CompetitionService</code>](#CompetitionService)  

| Param | Type | Description |
| --- | --- | --- |
| competitionType | <code>string</code> | 'SOTW' or 'BOTW' |

<a name="CompetitionService+getActiveCompetition"></a>

### competitionService.getActiveCompetition(competitionType) ⇒ <code>Object</code> \| <code>null</code>
Fetch the active competition from the database

**Kind**: instance method of [<code>CompetitionService</code>](#CompetitionService)  

| Param | Type |
| --- | --- |
| competitionType | <code>string</code> | 

<a name="CompetitionService+getSortedParticipants"></a>

### competitionService.getSortedParticipants(competitionId) ⇒ <code>Array</code>
Fetch and sort participants based on progress gained

**Kind**: instance method of [<code>CompetitionService</code>](#CompetitionService)  

| Param | Type |
| --- | --- |
| competitionId | <code>string</code> | 

<a name="CompetitionService+formatLeaderboardDescription"></a>

### competitionService.formatLeaderboardDescription(participants) ⇒ <code>string</code>
Format the leaderboard description

**Kind**: instance method of [<code>CompetitionService</code>](#CompetitionService)  

| Param | Type |
| --- | --- |
| participants | <code>Array</code> | 

<a name="CompetitionService+buildLeaderboardEmbed"></a>

### competitionService.buildLeaderboardEmbed(competitionType, description) ⇒ <code>EmbedBuilder</code>
Build the leaderboard embed

**Kind**: instance method of [<code>CompetitionService</code>](#CompetitionService)  

| Param | Type |
| --- | --- |
| competitionType | <code>string</code> | 
| description | <code>string</code> | 

<a name="CompetitionService+sendOrUpdateEmbed"></a>

### competitionService.sendOrUpdateEmbed(channel, competition, embed)
Send a new embed or update the existing one

**Kind**: instance method of [<code>CompetitionService</code>](#CompetitionService)  

| Param | Type |
| --- | --- |
| channel | <code>Channel</code> | 
| competition | <code>Object</code> | 
| embed | <code>EmbedBuilder</code> | 

<a name="initializeCompetitionsTables"></a>

## initializeCompetitionsTables()
Initializes the competitions-related tables in the database.

**Kind**: global function  
<a name="determinePropType"></a>

## determinePropType(prop) ⇒ <code>string</code> \| <code>null</code>
Determines the type of a MetricProp based on its properties.

**Kind**: global function  
**Returns**: <code>string</code> \| <code>null</code> - - Returns 'Skill' or 'Boss' if identified, otherwise null.  

| Param | Type | Description |
| --- | --- | --- |
| prop | <code>object</code> | The property object from MetricProps. |

<a name="populateSkillsBosses"></a>

## populateSkillsBosses()
Populates the skills_bosses table with data from MetricProps,excluding ActivityProperties and ComputedMetricProperties.

**Kind**: global function  
<a name="chunkArray"></a>

## chunkArray(array, size)
**Kind**: global function  

| Param | Default |
| --- | --- |
| array |  | 
| size | <code>25</code> | 

<a name="normalizeString"></a>

## normalizeString(str) ⇒ <code>string</code>
Normalizes a string for comparison (e.g., trims spaces, converts to lowercase, replaces special characters).

**Kind**: global function  
**Returns**: <code>string</code> - - The normalized string.  

| Param | Type | Description |
| --- | --- | --- |
| str | <code>string</code> | The string to normalize. |

<a name="getImagePath"></a>

## getImagePath(metric) ⇒ <code>Promise.&lt;string&gt;</code>
Retrieves the file path for a given metric from the database with detailed logging.

**Kind**: global function  
**Returns**: <code>Promise.&lt;string&gt;</code> - - The file path associated with the metric.  
**Throws**:

- <code>Error</code> - Throws an error if the metric is not found.


| Param | Type | Description |
| --- | --- | --- |
| metric | <code>string</code> | The metric name to look up. |

<a name="createCompetitionEmbed"></a>

## createCompetitionEmbed(client, type, metric, startsAt, endsAt) ⇒ <code>Promise.&lt;{embeds: Array.&lt;EmbedBuilder&gt;, files: Array.&lt;AttachmentBuilder&gt;}&gt;</code>
Creates a competition embed with attached images from the local `resources` folder.

**Kind**: global function  
**Returns**: <code>Promise.&lt;{embeds: Array.&lt;EmbedBuilder&gt;, files: Array.&lt;AttachmentBuilder&gt;}&gt;</code> - - The embed and its attachments.  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>Client</code> | The Discord.js client. |
| type | <code>string</code> | Competition type: 'SOTW' or 'BOTW'. |
| metric | <code>string</code> | The metric name. |
| startsAt | <code>string</code> | ISO start date of the competition. |
| endsAt | <code>string</code> | ISO end date of the competition. |

<a name="createCompetitionEmbed..formatMetricName"></a>

### createCompetitionEmbed~formatMetricName(metric)
**Kind**: inner method of [<code>createCompetitionEmbed</code>](#createCompetitionEmbed)  

| Param |
| --- |
| metric | 

<a name="buildLeaderboardDescription"></a>

## buildLeaderboardDescription(participations, competitionType, guild)
**Kind**: global function  

| Param |
| --- |
| participations | 
| competitionType | 
| guild | 

<a name="createVotingDropdown"></a>

## createVotingDropdown(options) ⇒ <code>ActionRowBuilder</code>
Creates a voting dropdown menu with provided options.Expects "options" to include a "voteCount" property if you want to display it.

**Kind**: global function  
**Returns**: <code>ActionRowBuilder</code> - - The action row containing the select menu.  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>Array.&lt;Object&gt;</code> | Array of option objects with shape { label, description, value, voteCount? }. |

<a name="tallyVotesAndRecordWinner"></a>

## tallyVotesAndRecordWinner(client, competition)
Tally votes for a competition and record the winner.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>Client</code> | Discord client instance. |
| competition | <code>Object</code> | Competition object. |

<a name="getAllFilesWithMetadata"></a>

## getAllFilesWithMetadata(dir) ⇒ <code>Array.&lt;{fileName: string, filePath: string}&gt;</code>
Recursively get all files from a directory and its subdirectories.

**Kind**: global function  
**Returns**: <code>Array.&lt;{fileName: string, filePath: string}&gt;</code> - - Array of file metadata.  

| Param | Type | Description |
| --- | --- | --- |
| dir | <code>string</code> | Directory to scan. |

<a name="populateImageCache"></a>

## populateImageCache()
Populate the image_cache table with all files in the resources directory.

**Kind**: global function  
