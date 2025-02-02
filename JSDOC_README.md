## Modules

<dl>
<dt><a href="#module_WOMApiClient">WOMApiClient</a></dt>
<dd><p>🌍 <strong>Wise Old Man API Client</strong></p>
<p>This module provides an interface for interacting with the <strong>Wise Old Man (WOM) API</strong>.</p>
<ul>
<li>Implements <strong>rate limiting</strong> to manage API requests efficiently.</li>
<li>Handles <strong>automatic retries</strong> using <strong>exponential backoff</strong> for resilience.</li>
<li>Provides easy access to <strong>WOM API endpoints</strong> for retrieving RuneScape player and competition data.</li>
</ul>
<p>🔹 <strong>Core Features:</strong></p>
<ul>
<li>🚀 <strong>Rate-Limited API Requests</strong> (100/min for active API keys, 20/min for inactive keys).</li>
<li>🔄 <strong>Automatic Retries</strong> with <strong>Exponential Backoff</strong> on failures.</li>
<li>⚡ <strong>Efficient Data Fetching</strong> for <code>players</code>, <code>groups</code>, and <code>competitions</code>.</li>
</ul>
<p>📌 <strong>Usage Example:</strong></p>
<pre><code class="language-javascript">const WOMApiClient = require(&#39;./apiClient&#39;);
const playerData = await WOMApiClient.request(&#39;players&#39;, &#39;getPlayer&#39;, &#39;Zezima&#39;);
console.log(playerData);
</code></pre>
</dd>
<dt><a href="#module_config/constants">config/constants</a></dt>
<dd><p><strong>Constants for Varietyz Bot</strong> ⚙️</p>
<p>Defines and exports all constant values used throughout the Varietyz Bot.
This module includes general bot configurations, Discord channel IDs, WOM API settings,
rate limiting configurations, and role definitions with associated emojis and colors.</p>
<p><strong>Core Features:</strong></p>
<ul>
<li>Provides the bot&#39;s name and command prefix.</li>
<li>Defines Discord channel IDs for various functionalities.</li>
<li>Establishes a rank hierarchy and maps role names to their respective hierarchy indices.</li>
<li>Specifies detailed role definitions with associated emojis and hexadecimal color codes.</li>
</ul>
<p><strong>External Dependencies:</strong></p>
<ul>
<li><strong>Discord.js</strong>: For managing interactions with Discord.</li>
<li><strong>Luxon</strong>: For date and time manipulations.</li>
</ul>
</dd>
<dt><a href="#module_config/easterEggs">config/easterEggs</a></dt>
<dd><p><strong>Easter Egg Responses for RSNs</strong> 🎉</p>
<p>This module defines a set of Easter egg responses for special RuneScape Names (RSNs).
For each key (RSN in lowercase), it provides a unique title, description, and color.
These responses are used to generate fun or themed messages when a user registers or queries one of these legendary RSNs.</p>
<p><strong>Core Features:</strong></p>
<ul>
<li>Maps specific RSNs to unique titles, descriptions, and colors.</li>
<li>Provides responses for well-known RSNs such as <strong>Zezima</strong>, <strong>Woox</strong>, and <strong>Durial321</strong>.</li>
<li>Supports various colored responses to match the iconic status of each RSN.</li>
</ul>
</dd>
<dt><a href="#module_main">main</a></dt>
<dd><p>🚀 <strong>Main Entry Point for the Varietyz Bot</strong> 🤖</p>
<p>This script initializes the Varietyz Bot Discord application. It creates a new Discord client,
dynamically loads command and service modules, registers slash commands with Discord&#39;s API,
handles interactions (slash commands, autocomplete, and select menus), and schedules periodic tasks.</p>
<p><strong>Key Features:</strong></p>
<ul>
<li><strong>Dynamic Module Loading</strong>: Loads all commands and service modules from designated directories.</li>
<li><strong>Slash Command Registration</strong>: Registers all slash commands with Discord&#39;s API.</li>
<li><strong>Task Scheduling</strong>: Executes and schedules tasks with configurable intervals, supporting both immediate execution on startup and periodic execution.</li>
<li><strong>Interaction Handling</strong>: Supports slash commands, autocomplete interactions, and select menu interactions.</li>
<li><strong>Error Logging</strong>: Comprehensive error handling and logging for all bot processes.</li>
</ul>
<p><strong>External Dependencies:</strong></p>
<ul>
<li><strong>discord.js</strong>: For interacting with the Discord API and managing events.</li>
<li><strong>dotenv</strong>: Loads environment variables from a <code>.env</code> file.</li>
<li>Custom modules for utilities (e.g., <code>dbUtils</code>, <code>logger</code>) and task processing.</li>
</ul>
</dd>
<dt><a href="#module_src/migrations/initializeCompetitionsTables">src/migrations/initializeCompetitionsTables</a></dt>
<dd><p><strong>Initialize Competitions Tables Migration</strong> ⚙️</p>
<p>This module initializes or updates the competitions-related tables in the database.
It ensures that all required tables (competitions, votes, users, winners, skills_bosses,
competition_queue, and config) exist with the appropriate schema. It also checks for and
adds any missing columns dynamically.</p>
<p><strong>External Dependencies:</strong></p>
<ul>
<li><strong>SQLite</strong> via the dbUtils module for executing SQL queries.</li>
<li><strong>Logger</strong> for logging migration progress and errors.</li>
</ul>
</dd>
<dt><a href="#module_src/migrations/migrateEndedCompetitions">src/migrations/migrateEndedCompetitions</a></dt>
<dd><p><strong>Migrate Ended Competitions Script</strong> ⏳</p>
<p>This script migrates competitions that have ended from the active competitions table
to the ended_competitions table in the database. It ensures the ended_competitions table exists,
selects competitions whose end time has passed, inserts them into the ended_competitions table,
and then deletes them from the active competitions table.</p>
<p><strong>External Dependencies:</strong></p>
<ul>
<li><strong>SQLite</strong>: For executing SQL queries via the dbUtils module.</li>
<li><strong>Logger</strong>: For logging migration progress and errors.</li>
</ul>
</dd>
<dt><a href="#module_src/migrations/populateSkillsBosses">src/migrations/populateSkillsBosses</a></dt>
<dd><p><strong>Populate Skills &amp; Bosses Migration</strong> ⚙️</p>
<p>This script populates the <code>skills_bosses</code> table in the database using data from
the <code>MetricProps</code> object provided by the <code>@wise-old-man/utils</code> package.
It extracts only Skill and Boss properties (excluding ActivityProperties and ComputedMetricProperties)
and inserts them into the table if they do not already exist.</p>
<p><strong>Core Features:</strong></p>
<ul>
<li>Determines whether a MetricProp is a Skill or a Boss.</li>
<li>Inserts new entries into the <code>skills_bosses</code> table within a transaction for atomicity.</li>
<li>Prevents duplicate entries by checking existing records.</li>
</ul>
<p><strong>External Dependencies:</strong></p>
<ul>
<li><strong>SQLite</strong>: For executing SQL queries.</li>
<li><strong>Logger</strong>: For logging migration progress and errors.</li>
<li><strong>@wise-old-man/utils</strong>: Provides the <code>MetricProps</code> object.</li>
</ul>
</dd>
<dt><a href="#module_modules/commands/adminAssignRsn">modules/commands/adminAssignRsn</a></dt>
<dd><p><strong>Admin_assign_rsn Command</strong> 🔄</p>
<p>Defines the <code>/admin_assign_rsn</code> slash command for the Varietyz Bot.
This command allows administrators to assign a new RuneScape Name (RSN) to a guild member
by adding the RSN to the database. It performs input validation, conflict checking, and verifies the RSN
against the Wise Old Man API before prompting for confirmation to complete the assignment.</p>
<p><strong>Core Features:</strong></p>
<ul>
<li>Assigns an RSN to a specified guild member.</li>
<li>Validates the new RSN format and checks for conflicts with existing RSNs.</li>
<li>Verifies the RSN on the Wise Old Man API.</li>
<li>Provides an interactive confirmation prompt to avoid accidental assignments.</li>
<li>Notifies the target user via a DM once the RSN is registered.</li>
</ul>
<p><strong>External Dependencies:</strong></p>
<ul>
<li><strong>Discord.js</strong>: For handling slash commands, creating embeds, and managing interactive buttons.</li>
<li><strong>Wise Old Man API</strong>: For verifying RSNs and fetching player data.</li>
<li><strong>SQLite</strong>: For interacting with the RSN database.</li>
</ul>
</dd>
<dt><a href="#module_modules/commands/adminCheckActivity">modules/commands/adminCheckActivity</a></dt>
<dd><p><strong>Check_activity Command</strong> ⏱️</p>
<p>Implements the <code>/check_activity</code> command to display active and inactive players.
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
<dt><a href="#module_modules/commands/adminQueueCompetition">modules/commands/adminQueueCompetition</a></dt>
<dd><p><strong>Queue_competition Command</strong> ⏳</p>
<p>This module defines the <code>/queue_competition</code> slash command for the Varietyz Bot.
It allows administrators to queue a new competition to be created in the next rotation.
The command validates the provided competition type and metric against the database,
ensures that the competition is not already queued, and then inserts the new competition into the queue.</p>
<p><strong>Core Features:</strong></p>
<ul>
<li><strong>Validation:</strong> Checks if the provided metric exists in the database.</li>
<li><strong>Conflict Prevention:</strong> Prevents queuing the same competition twice.</li>
<li><strong>Database Interaction:</strong> Inserts the new competition into the competition queue.</li>
<li><strong>Autocomplete Support:</strong> Provides autocomplete suggestions for both the &quot;type&quot; and &quot;metric&quot; options.</li>
</ul>
<p><strong>External Dependencies:</strong></p>
<ul>
<li><strong>Discord.js</strong> for handling slash command interactions and autocompletion.</li>
<li><strong>SQLite</strong> for managing competition and metric data.</li>
</ul>
</dd>
<dt><a href="#module_modules/commands/adminRemoveRsn">modules/commands/adminRemoveRsn</a></dt>
<dd><p><strong>Admin_remove_rsn Command</strong> 🔥</p>
<p>Defines the <code>/admin_remove_rsn</code> slash command for the Varietyz Bot.
This administrator-only command allows administrators to remove a registered RuneScape Name (RSN)
from a specified guild member&#39;s account. The command validates inputs, checks for the RSN&#39;s existence,
and provides a confirmation prompt before executing the removal. It also supports autocomplete for the
<code>target</code> and <code>rsn</code> options.</p>
<p><strong>External Dependencies:</strong></p>
<ul>
<li><strong>Discord.js</strong>: For handling slash commands, creating embeds, and managing interactive buttons.</li>
<li><strong>SQLite</strong>: For interacting with the registered RSN database.</li>
</ul>
</dd>
<dt><a href="#module_modules/commands/adminRenameRsn">modules/commands/adminRenameRsn</a></dt>
<dd><p><strong>Admin_rename_rsn Command</strong> 🔄</p>
<p>Defines the <code>/admin_rename_rsn</code> slash command for the Varietyz Bot.
This command allows administrators to rename a registered RuneScape Name (RSN) of a guild member.
It handles input validation, database interactions, and verifies RSNs against the Wise Old Man API.
It also provides a confirmation prompt for the renaming action and supports autocomplete for the target and current RSN fields.</p>
<p><strong>External Dependencies:</strong></p>
<ul>
<li><strong>Discord.js</strong>: For handling slash commands, creating embeds, and managing interactive buttons.</li>
<li><strong>Wise Old Man API</strong>: For verifying RSNs and fetching player data.</li>
<li><strong>SQLite</strong>: For interacting with the registered RSN database.</li>
</ul>
</dd>
<dt><a href="#module_modules/commands/adminRsnList">modules/commands/adminRsnList</a></dt>
<dd><p><strong>RSN List Command</strong> 📜</p>
<p>Defines the <code>/rsn_list</code> slash command for the Varietyz Bot.
This command allows users to view all registered RuneScape Names (RSNs) along with their associated ranks for clan members.
The command displays the data in a paginated embed with interactive navigation buttons.</p>
<p><strong>Core Features:</strong></p>
<ul>
<li>Displays RSNs grouped by Discord user.</li>
<li>Shows rank emojis and provides links to Wise Old Man profiles.</li>
<li>Supports paginated navigation via buttons.</li>
</ul>
<p><strong>External Dependencies:</strong></p>
<ul>
<li>discord.js for embeds, actions rows, buttons.</li>
<li>SQLite for retrieving RSN and clan member data.</li>
</ul>
</dd>
<dt><a href="#module_src/modules/commands/adminSetRotationPeriod">src/modules/commands/adminSetRotationPeriod</a></dt>
<dd><p><strong>Set Rotation Period Command</strong> ⏱️</p>
<p>This module defines the <code>/set_rotation_period</code> slash command for the Varietyz Bot.
It allows administrators to set the rotation period (in weeks) for competitions.
The command updates the configuration in the database and informs the user upon success or failure.</p>
<p><strong>Key Features:</strong></p>
<ul>
<li><strong>Command Registration</strong>: Defines a slash command with a required integer option for the number of weeks.</li>
<li><strong>Permission Management</strong>: Restricted to administrators.</li>
<li><strong>Database Update</strong>: Updates the rotation period in the configuration table using an upsert query.</li>
</ul>
</dd>
<dt><a href="#module_modules/commands/adminSyncMembers">modules/commands/adminSyncMembers</a></dt>
<dd><p><strong>Sync_members Command</strong> 📋</p>
<p>Defines the <code>/sync_members</code> slash command for the Varietyz Bot.
This command allows administrators to manually synchronize clan members with the Wise Old Man (WOM) API,
updating their data and roles. It fetches all distinct user IDs from the <code>registered_rsn</code> table,
processes each user by calling the <code>fetchAndProcessMember</code> function, and returns a summary of the results.</p>
<p><strong>External Dependencies:</strong></p>
<ul>
<li><strong>Discord.js</strong>: For handling slash command interactions.</li>
<li><strong>SQLite</strong>: For querying registered RSN data.</li>
<li><strong>Wise Old Man API</strong>: For fetching the latest member data.</li>
<li><strong>Logger</strong>: For logging command activity and errors.</li>
</ul>
</dd>
<dt><a href="#module_modules/commands/adminUpdateClannieChannel">modules/commands/adminUpdateClannieChannel</a></dt>
<dd><p><strong>Admin_update_channel Command</strong> 🔄</p>
<p>Defines the <code>/admin_update_channel</code> slash command for the Varietyz Bot.
This command allows administrators to manually trigger an update of the clan channel with the latest member data.
It calls the <code>updateData</code> function, which handles data retrieval from the WOM API, role management,
database updates, and refreshing the Discord channel.</p>
<p><strong>External Dependencies:</strong></p>
<ul>
<li><strong>Discord.js</strong>: For handling slash commands and interactions.</li>
<li><strong>updateData</strong>: The function responsible for updating clan member data and refreshing the clan channel.</li>
</ul>
</dd>
<dt><a href="#module_modules/commands/list_competitions">modules/commands/list_competitions</a></dt>
<dd><p><strong>List Competitions Command</strong> 📅</p>
<p>This module defines the <code>/list_competitions</code> slash command for the Varietyz Bot.
It retrieves all upcoming, ongoing, and queued competitions from the database, categorizes them,
and displays the results in an embed. The command uses a union query to fetch competitions from both
the <code>competitions</code> and <code>competition_queue</code> tables.</p>
<p><strong>External Dependencies:</strong></p>
<ul>
<li><strong>Discord.js</strong>: For creating and sending slash command replies.</li>
<li><strong>SQLite</strong>: For querying competition data.</li>
<li><strong>Logger</strong>: For logging operations and errors.</li>
</ul>
</dd>
<dt><a href="#module_src/modules/commands/profile">src/modules/commands/profile</a></dt>
<dd><p><strong>Profile Command</strong> 📜</p>
<p>Defines the <code>/profile</code> slash command for the Varietyz Bot.
This command allows users to view a player profile by RSN. If no RSN is provided,
the command defaults to the user&#39;s own registered RSN.
The command gathers live data from the Wise Old Man API along with stored data from the database,
then builds and displays an embed with account information, experience data, skill and boss achievements,
registration dates, competition stats, and clan details.</p>
<p><strong>External Dependencies:</strong></p>
<ul>
<li><strong>Discord.js</strong>: For building embeds and handling interactions.</li>
<li><strong>SQLite</strong>: For retrieving registered RSN, clan member, and user data.</li>
<li><strong>Wise Old Man API</strong>: For fetching live player data.</li>
<li>Utility functions for string normalization, truncation, and formatting.</li>
</ul>
</dd>
<dt><a href="#module_modules/commands/removeRsn">modules/commands/removeRsn</a></dt>
<dd><p><strong>Remove_rsn Command</strong> 🗑️</p>
<p>Defines the <code>/remove_rsn</code> slash command for the Varietyz Bot. This command allows users to remove up to three
registered RuneScape Names (RSNs) from their account. It handles validation, rate limiting, database interactions,
and provides an autocomplete feature for RSN suggestions.</p>
<p><strong>Core Features:</strong></p>
<ul>
<li>Removes up to three RSNs from the user&#39;s account.</li>
<li>Implements rate limiting to prevent abuse.</li>
<li>Presents a confirmation prompt before RSN removal.</li>
<li>Provides autocomplete suggestions for RSN options.</li>
<li>Updates the database to ensure successful RSN removal.</li>
</ul>
<p><strong>External Dependencies:</strong></p>
<ul>
<li><strong>Discord.js</strong>: For handling slash commands, creating buttons, and managing interactive components.</li>
<li><strong>SQLite</strong>: For managing registered RSN data.</li>
</ul>
</dd>
<dt><a href="#module_modules/commands/rsn">modules/commands/rsn</a></dt>
<dd><p><strong>Rsn Command</strong> 📝</p>
<p>Defines the <code>/rsn</code> slash command for the Varietyz Bot. This command allows users to register their Old School RuneScape Name (RSN).
It handles:</p>
<ul>
<li><strong>Validation:</strong> Ensuring RSNs follow specific format rules.</li>
<li><strong>Rate Limiting:</strong> Prevents abuse by limiting repeated usage within a given time window.</li>
<li><strong>Easter Eggs:</strong> Provides custom responses for special RSNs.</li>
<li><strong>Database Handling:</strong> Manages RSN registrations with conflict resolution.</li>
<li><strong>External API Verification:</strong> Validates RSNs against the Wise Old Man API to ensure the RSN exists.</li>
</ul>
<p><strong>External Dependencies:</strong></p>
<ul>
<li><strong>Wise Old Man API</strong> for player profile verification.</li>
<li><strong>SQLite</strong> for managing RSN registrations.</li>
<li><strong>Discord.js</strong> for command interactions and sending feedback.</li>
</ul>
</dd>
<dt><a href="#module_modules/services/activeMembers">modules/services/activeMembers</a></dt>
<dd><p><strong>Active/Inactive Clan Member Activity Utilities</strong> ⚡</p>
<p>This module provides utility functions for managing active and inactive clan members within the Varietyz Bot.
It interacts with the WOM API to fetch player data, calculates member activity based on progress within specified
intervals, and dynamically updates a Discord voice channel name to reflect the number of active clan members.</p>
<p><strong>Key Features:</strong></p>
<ul>
<li><strong>Activity Data Update</strong>: Fetches player data from the WOM API and updates the <code>active_inactive</code> table in the database.</li>
<li><strong>Activity Calculation</strong>: Determines the number of active players (last 7 days) and inactive players (last 21 days) using Luxon.</li>
<li><strong>Voice Channel Update</strong>: Dynamically updates the Discord voice channel name with the current active member count.</li>
<li><strong>Retry Mechanism</strong>: Implements exponential backoff for retrying failed data fetch attempts from the WOM API.</li>
</ul>
<p><strong>External Dependencies:</strong></p>
<ul>
<li><strong>Luxon</strong>: For date and time manipulation.</li>
<li><strong>Wise Old Man (WOM) API</strong>: To fetch player and group details.</li>
<li><strong>Discord.js</strong>: For interacting with the Discord guild and channels.</li>
<li><strong>dbUtils</strong>: For database interactions.</li>
</ul>
</dd>
<dt><a href="#module_modules/services/autoRoles">modules/services/autoRoles</a></dt>
<dd><p><strong>Auto Roles Service Utilities</strong> 🤖</p>
<p>This module contains utility functions for managing automatic role assignments based on player data in the Varietyz Bot.
It fetches and processes data from multiple RuneScape Names (RSNs), merges the data for role assignments,
and assigns or removes Discord roles based on hiscores and achievements (such as boss kills, activities, and skills).</p>
<p><strong>Key Features:</strong></p>
<ul>
<li><strong>Role Assignment</strong>: Automatically assigns roles based on boss kills, activity scores, and skill levels from RSN data.</li>
<li><strong>Data Merging</strong>: Combines data from multiple RSNs into a single profile for each player, ensuring the highest achievements are retained.</li>
<li><strong>Dynamic Role Updates</strong>: Removes outdated roles and assigns new ones based on the player&#39;s latest achievements.</li>
<li><strong>Discord Notifications</strong>: Sends embed messages in a designated channel to notify players of role assignments and removals.</li>
<li><strong>Custom Mappings</strong>: Maps boss and activity names to corresponding Discord role names for easier management.</li>
</ul>
<p><strong>External Dependencies:</strong></p>
<ul>
<li><strong>Wise Old Man (WOM) API</strong>: Retrieves player data and achievements.</li>
<li><strong>Discord.js</strong>: For interacting with Discord (assigning roles, sending notifications, managing guild data).</li>
<li><strong>dbUtils</strong>: Handles database interactions.</li>
<li><strong>normalizeRsn</strong>: Provides utilities for normalizing RSNs.</li>
</ul>
</dd>
<dt><a href="#module_competitionService/updateAllTimeLeaderboard">competitionService/updateAllTimeLeaderboard</a></dt>
<dd><p><strong>All-Time Leaderboard Updater</strong> 🏆</p>
<p>This module exports a function that updates the all-time leaderboard for SOTW &amp; BOTW competitions.
It fetches top players and gain data from the database, formats the leaderboard with clickable
player links, and then either updates an existing pinned message or creates a new pinned message
in the designated leaderboard channel.</p>
<p>The leaderboard displays:</p>
<ul>
<li>Top 10 SOTW (XP Gained)</li>
<li>Top 10 BOTW (Boss Kills)</li>
<li>The Biggest Overall Gainer (combined XP/KC)</li>
<li>The Highest Single Competition Gain</li>
</ul>
</dd>
<dt><a href="#module_CompetitionService">CompetitionService</a></dt>
<dd><p><strong>CompetitionService.js</strong> handles the creation, management, and conclusion of competitions.
It orchestrates the lifecycle of competitions including processing ended competitions,
handling votes, creating new competitions, and scheduling rotations. 🚀</p>
<p><strong>Key Exports:</strong></p>
<ul>
<li><code>CompetitionService</code>: Main class that encapsulates all competition-related functionalities.</li>
</ul>
</dd>
<dt><a href="#module_competitionService/competitionValidator">competitionService/competitionValidator</a></dt>
<dd><p><strong>Competition Validator</strong> 🛠️</p>
<p>This module contains functions to validate and update competition data
by cross-referencing with the WOM API. It helps ensure that the database
only contains valid competitions by removing those that no longer exist or
updating details that have changed on the WOM platform.</p>
<p><strong>Key Features:</strong></p>
<ul>
<li>Checks each competition entry in the database against the WOM API.</li>
<li>Removes competitions (and associated votes) that are not found on WOM.</li>
<li>Updates competition details (title, metric, start/end times) if discrepancies are found.</li>
</ul>
</dd>
<dt><a href="#module_competitionService/helpers">competitionService/helpers</a></dt>
<dd><p><strong>Helper Functions for Competition Service</strong> 🛠️</p>
<p>This module provides utility functions to assist with data manipulation tasks
in the competition service, such as splitting an array into smaller chunks.</p>
</dd>
<dt><a href="#module_modules/services/memberChannel">modules/services/memberChannel</a></dt>
<dd><p><strong>Member Channel Service Utilities</strong> 🛠️</p>
<p>This module provides utility functions for managing clan members and updating their data in the Varietyz Bot.
It interacts with the WOM API to fetch member information, manages role assignments in Discord based on ranks,
updates the SQLite database (<code>clan_members</code> table) with the latest member data, and refreshes the designated Discord
channels with up-to-date clan member information.</p>
<p><strong>Key Features:</strong></p>
<ul>
<li><strong>Role Assignment</strong>: Dynamically assigns or removes roles based on player rank.</li>
<li><strong>Clan Member Updates</strong>: Fetches and processes player data, updating roles and channel messages.</li>
<li><strong>Database Management</strong>: Ensures the <code>clan_members</code> table reflects the latest clan member data.</li>
<li><strong>Discord Notifications</strong>: Notifies a designated channel about rank updates and member changes.</li>
<li><strong>Data Purging</strong>: Clears outdated channel messages before posting new information.</li>
</ul>
<p><strong>External Dependencies:</strong></p>
<ul>
<li><strong>Wise Old Man (WOM) API</strong>: Fetches player data.</li>
<li><strong>Discord.js</strong>: Manages interactions with Discord (sending messages, role management).</li>
<li><strong>dbUtils</strong>: Handles database operations.</li>
<li><strong>rankUtils</strong>: Provides utilities for rank formatting and color/emoji retrieval.</li>
</ul>
</dd>
<dt><a href="#module_modules/services/nameChanges">modules/services/nameChanges</a></dt>
<dd><p><strong>Name Change Processor Utilities</strong> 🔄</p>
<p>This module provides utility functions for processing player name changes in the Varietyz Bot.
It interacts with the Wise Old Man (WOM) API to fetch recent name changes, updates the database
with the new RSNs, and handles conflict resolution between users. It also manages sending
notifications to Discord channels for both successful updates and conflict resolutions.</p>
<p><strong>Key Features:</strong></p>
<ul>
<li><strong>Name Change Fetching</strong>: Retrieves recent name changes from the WOM API.</li>
<li><strong>Database Management</strong>: Saves name change records to the <code>recent_name_changes</code> table and updates the <code>registered_rsn</code> table.</li>
<li><strong>Conflict Resolution</strong>: Handles cases where a new RSN already exists for another user and resolves conflicts.</li>
<li><strong>Discord Notifications</strong>: Sends messages to a specified channel notifying users of successful name updates or conflict resolutions.</li>
<li><strong>Rate-Limiting and Dependencies</strong>: Ensures rate-limited API requests and processes name changes in the correct order.</li>
</ul>
<p><strong>External Dependencies:</strong></p>
<ul>
<li><strong>Wise Old Man (WOM) API</strong>: Fetches player name changes.</li>
<li><strong>Discord.js</strong>: Sends notifications and updates to Discord channels.</li>
<li><strong>dbUtils</strong>: Manages database operations for name change records.</li>
</ul>
</dd>
<dt><a href="#module_modules/services/playerDataExtractor">modules/services/playerDataExtractor</a></dt>
<dd><p><strong>Player Data Extractor Utilities</strong> 📊</p>
<p>This module facilitates fetching, formatting, saving, and maintaining player data in the Varietyz Bot.
It integrates with the Wise Old Man (WOM) API to fetch player data and uses an SQLite database for storage.
Key operations include:</p>
<ul>
<li><strong>Data Formatting</strong>: Flattening and renaming nested player data into a format suitable for database insertion.</li>
<li><strong>Database Management</strong>: Managing the <code>player_data</code> table to ensure player data is saved and updated correctly.</li>
<li><strong>API Integration</strong>: Fetching player data from the WOM API.</li>
<li><strong>Player Synchronization</strong>: Synchronizing player data with registered RSNs and removing stale records.</li>
<li><strong>Rate-Limiting</strong>: Handling frequent API requests efficiently.</li>
</ul>
<p><strong>External Dependencies:</strong></p>
<ul>
<li><strong>Wise Old Man (WOM) API</strong>: For fetching player data.</li>
<li><strong>luxon</strong>: For date manipulation and calculating time intervals.</li>
<li><strong>dbUtils</strong>: For interacting with the SQLite database.</li>
</ul>
</dd>
<dt><a href="#module_utils/calculateActivity">utils/calculateActivity</a></dt>
<dd><p><strong>Player Activity Data Utilities</strong> ⏱️</p>
<p>This module provides functions for managing player activity data in the Varietyz Bot&#39;s SQLite database.
It ensures the existence of the <code>active_inactive</code> table and calculates the number of active and inactive players
based on their last recorded progress.</p>
<p><strong>Key Features:</strong></p>
<ul>
<li><strong>Table Management</strong>: Ensures the <code>active_inactive</code> table exists, which stores player usernames and their last progress timestamp.</li>
<li><strong>Active Player Count</strong>: Calculates the number of players who have progressed in the last 7 days.</li>
<li><strong>Inactive Player Count</strong>: Calculates the number of players who have not progressed in the last 21 days.</li>
</ul>
<p><strong>External Dependencies:</strong></p>
<ul>
<li><strong>luxon</strong>: For handling date and time operations (e.g., calculating 7-day and 21-day intervals).</li>
<li><strong>dbUtils</strong>: For executing SQL queries to interact with the SQLite database.</li>
</ul>
</dd>
<dt><a href="#module_utils/dbUtils">utils/dbUtils</a></dt>
<dd><p><strong>SQLite Database Utility Functions</strong> 💾</p>
<p>This module provides utility functions for interacting with the SQLite database in the Varietyz Bot.
It includes functions to execute SQL queries, retrieve data, run transactions, and manage configuration values.
Additionally, it handles graceful database closure on process termination.</p>
<p><strong>Key Features:</strong></p>
<ul>
<li><strong>SQL Query Execution</strong>: Execute INSERT, UPDATE, DELETE, and SELECT queries.</li>
<li><strong>Data Retrieval</strong>: Retrieve all matching rows (<code>getAll</code>) or a single row (<code>getOne</code>).</li>
<li><strong>Transaction Support</strong>: Run multiple queries in a transaction.</li>
<li><strong>Configuration Management</strong>: Get and set configuration values in the database.</li>
<li><strong>Graceful Shutdown</strong>: Closes the database connection on SIGINT.</li>
</ul>
<p><strong>External Dependencies:</strong></p>
<ul>
<li><strong>sqlite3</strong>: For interacting with the SQLite database.</li>
<li><strong>logger</strong>: For logging database operations and errors.</li>
</ul>
</dd>
<dt><a href="#module_utils/fetchPlayerData">utils/fetchPlayerData</a></dt>
<dd><p><strong>Player Data Fetcher</strong> 🔍</p>
<p>This module provides a function to retrieve player data for a specified RuneScape Name (RSN) from the Wise Old Man (WOM) API.
It handles common error scenarios such as non-existent players (404), rate limiting (429), and unexpected issues.</p>
<p><strong>Key Features:</strong></p>
<ul>
<li><strong>Player Data Retrieval</strong>: Fetches player data from the WOM API for a given RSN.</li>
<li><strong>Error Handling</strong>: Manages common API errors including 404 (player not found) and 429 (rate limiting).</li>
<li><strong>Rate Limiting</strong>: Throws an error if the WOM API returns a rate limit response.</li>
</ul>
<p><strong>External Dependencies:</strong></p>
<ul>
<li><strong>axios</strong>: For making HTTP requests to the WOM API.</li>
<li><strong>logger</strong>: For logging warnings and errors during the fetch process.</li>
</ul>
</dd>
<dt><a href="#module_utils/lastFetchedTime">utils/lastFetchedTime</a></dt>
<dd><p><strong>Player Fetch Times Utilities</strong> ⏰</p>
<p>This module provides utility functions for managing player fetch times in the Varietyz Bot&#39;s SQLite database.
It ensures the existence of the <code>player_fetch_times</code> table, retrieves the last fetch time for a player,
and updates the fetch timestamp when player data is refreshed.</p>
<p><strong>Key Features:</strong></p>
<ul>
<li><strong>Table Management</strong>: Ensures the <code>player_fetch_times</code> table exists with the appropriate schema.</li>
<li><strong>Fetch Time Retrieval</strong>: Retrieves the last fetch timestamp for a specified RuneScape Name (RSN), returning <code>null</code> if not found.</li>
<li><strong>Fetch Time Update</strong>: Inserts or updates the fetch timestamp for a player.</li>
<li><strong>Table Reset</strong>: Provides a function to drop the <code>player_fetch_times</code> table, if necessary.</li>
</ul>
<p><strong>External Dependencies:</strong></p>
<ul>
<li><strong>dbUtils</strong>: For executing SQL queries and interacting with the SQLite database.</li>
</ul>
</dd>
<dt><a href="#module_utils/logger">utils/logger</a></dt>
<dd><p><strong>Winston Logger Utility</strong> 📝</p>
<p>This module configures and exports a Winston logger instance with daily log rotation and enhanced error handling.
It writes log messages to both the console and log files, organizes logs by year and month, and gracefully handles
uncaught exceptions and unhandled promise rejections.</p>
<p><strong>Key Features:</strong></p>
<ul>
<li><strong>Console Logging</strong>: Provides colorized output for easy readability.</li>
<li><strong>Daily Log Rotation</strong>: Organizes log files into directories by year and month, rotates files daily, limits file size, and retains logs for 7 days.</li>
<li><strong>Error Handling</strong>: Captures uncaught exceptions and unhandled promise rejections, logs them, and exits the process.</li>
<li><strong>Log Directory Management</strong>: Ensures required directories exist for storing log files and audit information.</li>
</ul>
<p><strong>External Dependencies:</strong></p>
<ul>
<li><strong>winston</strong>: Core logging library.</li>
<li><strong>winston-daily-rotate-file</strong>: Transport for daily rotating log files.</li>
<li><strong>path</strong>: For handling file paths.</li>
<li><strong>fs</strong>: For file system operations.</li>
</ul>
</dd>
<dt><a href="#module_utils/normalizeRsn">utils/normalizeRsn</a></dt>
<dd><p><strong>RuneScape Name (RSN) Normalizer</strong> 🔄</p>
<p>This module provides a utility function for normalizing RuneScape names (RSNs).
It ensures that RSNs are stored in a consistent format for database operations and efficient lookups.</p>
<p><strong>Key Features:</strong></p>
<ul>
<li><strong>RSN Normalization</strong>: Converts RSNs to a standard format by removing unwanted characters, collapsing multiple spaces, and converting the entire string to lowercase.</li>
<li><strong>Error Handling</strong>: Validates that the input is a string, throwing an error if not.</li>
</ul>
</dd>
<dt><a href="#module_utils/purgeChannel">utils/purgeChannel</a></dt>
<dd><p><strong>Discord Channel Purger</strong> 🧹</p>
<p>This module provides a utility function to purge messages from a specified Discord text channel while respecting rate limits.
It is optimized to handle large volumes of messages by processing them in batches, ensuring efficient deletion without
triggering Discord&#39;s rate limits.</p>
<p><strong>Key Features:</strong></p>
<ul>
<li><strong>Efficient Message Deletion</strong>: Deletes messages in batches of up to 100.</li>
<li><strong>Rate Limit Management</strong>: Introduces delays between deletions to prevent hitting Discord&#39;s rate limits.</li>
<li><strong>Error Handling</strong>: Logs and handles errors that occur during the deletion process.</li>
</ul>
<p><strong>External Dependencies:</strong></p>
<ul>
<li><code>sleep</code> from <code>./sleepUtil</code>: Introduces delays between deletion batches.</li>
<li><code>logger</code>: Logs information, warnings, and errors.</li>
</ul>
</dd>
<dt><a href="#module_utils/rankUtils">utils/rankUtils</a></dt>
<dd><p><strong>RuneScape Clan Rank Utilities</strong> 🎖️</p>
<p>This module provides utility functions for managing RuneScape clan ranks in the Varietyz Bot.
It offers tools for retrieving rank-specific details (such as emojis and colors), formatting experience
points, and normalizing rank strings. These utilities enhance the presentation and handling of rank-related
data in Discord interactions.</p>
<p><strong>Key Features:</strong></p>
<ul>
<li><strong>Rank Emojis</strong>: Retrieves emojis associated with specific ranks.</li>
<li><strong>Rank Colors</strong>: Provides hexadecimal color codes for ranks, with a default fallback.</li>
<li><strong>Experience Formatting</strong>: Formats numerical experience points with commas for readability.</li>
<li><strong>Rank String Normalization</strong>: Converts rank identifiers to display-friendly formats.</li>
</ul>
<p><strong>External Dependencies:</strong></p>
<ul>
<li>The <code>RANKS</code> object from the <code>../../config/constants</code> module, which defines rank metadata (e.g., emojis, colors).</li>
</ul>
</dd>
<dt><a href="#module_utils/sleepUtil">utils/sleepUtil</a></dt>
<dd><p><strong>Sleep Utility</strong> ⏳</p>
<p>This module provides a utility function for creating delays in execution.
It offers a simple, promise-based mechanism to pause asynchronous operations
for a specified duration. This is especially useful in async/await workflows to
introduce delays without blocking the event loop.</p>
<p><strong>Key Features:</strong></p>
<ul>
<li><strong>Promise-based Delay</strong>: Returns a promise that resolves after the specified time.</li>
<li><strong>Input Validation</strong>: Validates that the delay duration is a non-negative number.</li>
<li><strong>Ease of Use</strong>: Simplifies adding delays in asynchronous operations.</li>
</ul>
<p><strong>External Dependencies:</strong></p>
<ul>
<li>None.</li>
</ul>
</dd>
<dt><a href="#module_utils/validateRsn">utils/validateRsn</a></dt>
<dd><p><strong>RSN Validator Utilities</strong> 🔍</p>
<p>This module provides utility functions for validating RuneScape names (RSNs) to ensure they meet specific format criteria.
This helps guarantee that RSNs are stored consistently in the database and can be reliably looked up.</p>
<p><strong>Key Features:</strong></p>
<ul>
<li><strong>Format Validation</strong>: Ensures RSNs are between 1 and 12 characters long and contain only letters, numbers, and single spaces (no hyphens or underscores).</li>
<li><strong>Forbidden Phrase Detection</strong>: Rejects RSNs containing prohibited phrases like &quot;Java&quot;, &quot;Mod&quot;, or &quot;Jagex&quot;.</li>
<li><strong>Feedback Messages</strong>: Returns detailed validation messages indicating any issues with the RSN.</li>
</ul>
<p>External Dependencies:</p>
<ul>
<li>None.</li>
</ul>
</dd>
<dt><a href="#module_scripts/create_db">scripts/create_db</a></dt>
<dd><p><strong>Database Initialization Script</strong> 🛠️</p>
<p>This script initializes and sets up the SQLite database for the Varietyz Bot.
It deletes any existing database file to ensure a clean setup and then creates all necessary tables:</p>
<ul>
<li><code>registered_rsn</code>: Stores registered RuneScape names.</li>
<li><code>clan_members</code>: Stores information about clan members.</li>
<li><code>recent_name_changes</code>: Tracks recent name changes.</li>
<li><code>player_data</code>: Stores various player-specific data points.</li>
<li><code>player_fetch_times</code>: Tracks the last time player data was fetched.</li>
<li><code>active_inactive</code>: Tracks active and inactive player progression.</li>
</ul>
<p>The script logs the success or failure of each table creation process and closes the database connection
gracefully upon completion.</p>
<p><strong>External Dependencies:</strong></p>
<ul>
<li><strong>SQLite3</strong>: For interacting with the SQLite database.</li>
<li><strong>fs</strong>: For file system operations (deleting existing database, creating directories).</li>
<li><strong>path</strong>: For constructing file paths.</li>
<li><strong>logger</strong>: For logging operations and errors.</li>
</ul>
</dd>
<dt><a href="#module_tasks">tasks</a></dt>
<dd><p><strong>Scheduled Tasks for the Varietyz Bot</strong> ⏰</p>
<p>This module defines and manages scheduled tasks for the Varietyz Bot. Each task is represented as an object that includes
its name, the asynchronous function to execute, the interval (in seconds) at which it should run, and flags indicating
whether the task should run on startup and be scheduled for periodic execution.</p>
<p><strong>Key Features:</strong></p>
<ul>
<li><strong>Task Registration &amp; Scheduling</strong>: Registers tasks with customizable intervals and startup behavior.</li>
<li><strong>Data Updates &amp; Synchronization</strong>: Includes tasks for updating data, processing name changes, fetching player data,
handling hiscores, and updating voice channels.</li>
<li><strong>Integration with External Modules</strong>: Utilizes external modules for database operations, logging, and data processing.</li>
<li><strong>Asynchronous Execution</strong>: Supports asynchronous task execution with proper error logging.</li>
</ul>
<p><strong>External Dependencies:</strong></p>
<ul>
<li><strong>dotenv</strong>: Loads environment variables for configuration.</li>
<li>Various processing modules (e.g., <code>member_channel</code>, <code>name_changes</code>, <code>player_data_extractor</code>).</li>
<li>Database utilities (<code>dbUtils</code>) and logging utilities (<code>logger</code>).</li>
</ul>
</dd>
</dl>

## Classes

<dl>
<dt><a href="#CompetitionService">CompetitionService</a></dt>
<dd><p>CompetitionService handles creation, management, and conclusion of competitions.</p>
</dd>
</dl>

## Constants

<dl>
<dt><a href="#resourcesPath">resourcesPath</a> : <code>string</code></dt>
<dd><p>Path to the resources directory.</p>
</dd>
<dt><a href="#projectBasePath">projectBasePath</a> : <code>string</code></dt>
<dd><p>Base path for the project, starting at &quot;src&quot;.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#execute">execute(interaction)</a> ⇒ <code>Promise.&lt;void&gt;</code></dt>
<dd><p>🎯 Executes the <code>/help</code> command.</p>
</dd>
<dt><a href="#autocomplete">autocomplete(interaction)</a> ⇒ <code>Promise.&lt;void&gt;</code></dt>
<dd><p>🎯 Handles Autocomplete for <code>/help</code> command options.</p>
<ul>
<li>Suggests valid command names for <code>command</code> option.</li>
</ul>
</dd>
<dt><a href="#createCommandEmbed">createCommandEmbed(command)</a> ⇒ <code>EmbedBuilder</code></dt>
<dd><p>🎯 Creates a JSDoc-styled embed for a specific command.</p>
</dd>
<dt><a href="#formatCommandUsage">formatCommandUsage(command)</a> ⇒ <code>string</code></dt>
<dd><p>🎯 Formats the command usage by listing all options.</p>
</dd>
<dt><a href="#generateExample">generateExample(command)</a> ⇒ <code>string</code></dt>
<dd><p>🎯 Generates an example usage for the command.</p>
</dd>
<dt><a href="#loadAndCategorizeCommands">loadAndCategorizeCommands()</a> ⇒ <code>Object</code></dt>
<dd><p>🎯 Loads all commands dynamically and categorizes them.</p>
</dd>
<dt><a href="#determineCategory">determineCategory(filename)</a> ⇒ <code>string</code></dt>
<dd><p>🎯 Determines the category of a command based on its filename.</p>
</dd>
<dt><a href="#checkAdminPermissions">checkAdminPermissions(interaction)</a> ⇒ <code>boolean</code></dt>
<dd><p>🎯 Checks if a user has administrator permissions.</p>
</dd>
<dt><a href="#createCompetition">createCompetition(womclient, db, type, metric, startsAt, endsAt, constants)</a> ⇒ <code>Promise.&lt;Object&gt;</code></dt>
<dd><p>🎯 <strong>Creates a New Competition on WOM and Inserts it into the Database</strong></p>
<p>This function creates a new competition via the WOM API using the provided parameters.
It then inserts the new competition details into the database. For BOTW competitions,
a rotation index is calculated based on the most recent BOTW competition.</p>
</dd>
<dt><a href="#chunkArray">chunkArray(array, size)</a></dt>
<dd></dd>
<dt><a href="#recordCompetitionWinner">recordCompetitionWinner(competition)</a></dt>
<dd><p>🎯 <strong>Records the Competition Winner</strong></p>
<p>Determines the real winner of a competition based on in-game performance (not votes)
by retrieving competition details from the WOM API. If a valid winner is found,
the function records the winner in the <code>winners</code> table and updates the cumulative stats
for the user in the <code>users</code> table. Each win increments <code>total_wins</code> and adds the metric gain
to the respective total for either SOTW or BOTW.</p>
</dd>
<dt><a href="#updateFinalLeaderboard">updateFinalLeaderboard(competition, client)</a></dt>
<dd><p>🎯 <strong>Updates the Final Competition Leaderboard</strong></p>
<p>Retrieves the final standings for an ended competition from the WOM API, formats the top 10 leaderboard
and the &quot;Biggest Gainer&quot; field with clickable player links, and sends an embed to the designated
Hall of Fame channel in Discord. The embed title is clickable and links to the competition page on WOM.</p>
</dd>
<dt><a href="#updateActiveCompetitionEmbed">updateActiveCompetitionEmbed(competitionType, db, client, constants)</a> ⇒ <code>Promise.&lt;void&gt;</code></dt>
<dd><p>🎯 <strong>Updates the Active Competition Embed in Discord</strong></p>
<p>Retrieves all active competitions of the specified type, updates the leaderboard,
builds new competition embeds and voting dropdowns, and then either edits existing
messages or posts new ones in the designated Discord channel.</p>
</dd>
<dt><a href="#buildPollDropdown">buildPollDropdown(compType, db)</a> ⇒ <code>Promise.&lt;Object&gt;</code></dt>
<dd><p>🎯 <strong>Builds the Voting Dropdown for Competitions</strong></p>
<p>Constructs a dropdown menu component for competition voting.
For BOTW competitions, the available options are chunked if necessary, using the current rotation index.
Vote counts for each option are fetched from the database to display current tallies.</p>
</dd>
<dt><a href="#updateLeaderboard">updateLeaderboard(competitionType, db, client, constants)</a> ⇒ <code>Promise.&lt;void&gt;</code></dt>
<dd><p>🎯 <strong>Updates the Competition Leaderboard</strong></p>
<p>Retrieves active competition details, fetches competition data from the WOM API,
sorts participants by progress gained, formats the leaderboard, and sends or updates
the leaderboard embed in the corresponding Discord channel.</p>
</dd>
<dt><a href="#getActiveCompetition">getActiveCompetition(competitionType, db)</a> ⇒ <code>Promise.&lt;(Object|null)&gt;</code></dt>
<dd><p>🎯 <strong>Fetches the Active Competition</strong></p>
<p>Retrieves the active competition from the database based on the current timestamp.</p>
</dd>
<dt><a href="#formatLeaderboardDescription">formatLeaderboardDescription(participants, competitionType, metric, guild)</a> ⇒ <code>string</code></dt>
<dd><p>🎯 <strong>Formats the Leaderboard Description</strong></p>
<p>Constructs a formatted description string for the leaderboard embed, including player names,
progress, and dynamically fetched metric emojis.</p>
</dd>
<dt><a href="#buildLeaderboardEmbed">buildLeaderboardEmbed(competitionType, description, competitionId)</a> ⇒ <code>EmbedBuilder</code></dt>
<dd><p>🎯 <strong>Builds the Leaderboard Embed</strong></p>
<p>Creates a Discord embed for the leaderboard with a clickable title linking to the Wise Old Man website.</p>
</dd>
<dt><a href="#sendOrUpdateEmbed">sendOrUpdateEmbed(channel, competition, embed, db)</a> ⇒ <code>Promise.&lt;void&gt;</code></dt>
<dd><p>🎯 <strong>Sends or Updates the Leaderboard Embed</strong></p>
<p>If the competition already has a leaderboard message, this function attempts to fetch and edit it.
If it fails (e.g., message not found), a new message is sent and the competition record is updated.</p>
</dd>
<dt><a href="#scheduleRotation">scheduleRotation(endTime, rotationCallback, scheduledJobs)</a></dt>
<dd><p>🎯 <strong>Schedules a Competition Rotation</strong></p>
<p>Cancels any existing rotation job and schedules a new rotation job using the <code>node-schedule</code> package.
When the scheduled time (<code>endTime</code>) is reached, the provided <code>rotationCallback</code> is invoked.</p>
</dd>
<dt><a href="#scheduleRotationsOnStartup">scheduleRotationsOnStartup(db, rotationCallback, constants, scheduledJobs)</a></dt>
<dd><p>🎯 <strong>Schedules Rotations on Bot Startup</strong></p>
<p>On bot startup, this function checks for active competitions and schedules a rotation based on the nearest
competition end time. If no active competitions are found, it triggers an immediate rotation.</p>
</dd>
<dt><a href="#calculateEndDate">calculateEndDate(rotationWeeks)</a> ⇒ <code>Date</code></dt>
<dd><p>Calculates the end date for a competition based on the number of rotation weeks.
The end date is set to the upcoming Sunday at 23:59 UTC, with additional weeks added as specified.</p>
<ul>
<li>The competition start time is considered as one minute from the current time.</li>
<li>If today is Sunday, the competition will end on the next Sunday.</li>
</ul>
</dd>
<dt><a href="#normalizeString">normalizeString(str)</a> ⇒ <code>string</code></dt>
<dd><p>🎯 <strong>Normalizes a String for Comparison</strong></p>
<p>Trims the input string, converts it to lowercase, and replaces spaces, dashes, and underscores
with a single underscore. Useful for standardizing metric names and other identifiers.</p>
</dd>
<dt><a href="#getImagePath">getImagePath(metric)</a> ⇒ <code>Promise.&lt;string&gt;</code></dt>
<dd><p>🎯 <strong>Retrieves the Image Path for a Given Metric</strong></p>
<p>Looks up the file path for the provided metric name in the image cache database.
Uses normalization to improve matching and logs details for debugging.</p>
</dd>
<dt><a href="#createCompetitionEmbed">createCompetitionEmbed(client, type, metric, startsAt, endsAt, competitionId)</a> ⇒ <code>Promise.&lt;{embeds: Array.&lt;EmbedBuilder&gt;, files: Array.&lt;AttachmentBuilder&gt;}&gt;</code></dt>
<dd><p>🎯 <strong>Creates a Competition Embed with Images and Voting Options</strong></p>
<p>Builds an embed for a competition, complete with a thumbnail image, title, description,
time fields, and additional styling. The embed includes a clickable title linking to the competition page.</p>
</dd>
<dt><a href="#formatTimestamp">formatTimestamp(dateString)</a> ⇒ <code>Object</code></dt>
<dd><p>🎯 <strong>Formats a Timestamp for Display</strong></p>
<p>Converts an ISO date string into a human-readable object containing the day of the week,
formatted time, and formatted date in UTC.</p>
</dd>
<dt><a href="#buildLeaderboardDescription">buildLeaderboardDescription(participations, competitionType, guild)</a> ⇒ <code>string</code></dt>
<dd><p>🎯 <strong>Builds a Leaderboard Description</strong></p>
<p>Constructs a text description for a competition leaderboard by listing the top 10 participants,
including their display names and progress values.</p>
</dd>
<dt><a href="#createVotingDropdown">createVotingDropdown(options, type)</a> ⇒ <code>ActionRowBuilder</code></dt>
<dd><p>🎯 <strong>Creates a Voting Dropdown Menu</strong></p>
<p>Generates an ActionRow containing a StringSelectMenu for voting.
If no options are provided, returns a disabled menu with a placeholder message.</p>
</dd>
<dt><a href="#tallyVotesAndRecordWinner">tallyVotesAndRecordWinner(competition)</a> ⇒ <code>Promise.&lt;(string|null)&gt;</code></dt>
<dd><p>🎯 <strong>Tallies Votes and Determines the Winning Metric for a Competition</strong></p>
<p>This function tallies votes for a completed competition by querying the database for votes
associated with the competition&#39;s ID. It groups the votes by the selected metric and counts
the number of votes per metric. If there is a tie between metrics with the highest vote count,
it randomly selects one of them as the winner.</p>
</dd>
<dt><a href="#getAllFilesWithMetadata">getAllFilesWithMetadata(dir)</a> ⇒ <code>Array.&lt;{fileName: string, filePath: string}&gt;</code></dt>
<dd><p>Recursively retrieves all files from a directory and its subdirectories along with metadata.</p>
<p>This function scans the specified directory and all nested subdirectories to produce an array
of objects. Each object contains:</p>
<ul>
<li><code>fileName</code>: The lowercase file name without its extension.</li>
<li><code>filePath</code>: The relative path starting with &quot;src/&quot; to the file, with forward slashes as separators.</li>
</ul>
</dd>
<dt><a href="#populateImageCache">populateImageCache()</a> ⇒ <code>Promise.&lt;void&gt;</code></dt>
<dd><p>Populates the image_cache table in the database with file metadata from the resources directory.</p>
<p>This function performs the following steps:</p>
<ol>
<li>Retrieves all files from the resources directory using <code>getAllFilesWithMetadata</code>.</li>
<li>Drops the existing image_cache table (if it exists) to ensure a fresh setup.</li>
<li>Iterates over each file&#39;s metadata and attempts to update an existing database entry.
If no existing entry is updated, it inserts a new record.</li>
</ol>
</dd>
</dl>

<a name="module_WOMApiClient"></a>

## WOMApiClient
🌍 **Wise Old Man API Client**

This module provides an interface for interacting with the **Wise Old Man (WOM) API**.
- Implements **rate limiting** to manage API requests efficiently.
- Handles **automatic retries** using **exponential backoff** for resilience.
- Provides easy access to **WOM API endpoints** for retrieving RuneScape player and competition data.

🔹 **Core Features:**
- 🚀 **Rate-Limited API Requests** (100/min for active API keys, 20/min for inactive keys).
- 🔄 **Automatic Retries** with **Exponential Backoff** on failures.
- ⚡ **Efficient Data Fetching** for `players`, `groups`, and `competitions`.

📌 **Usage Example:**
```javascript
const WOMApiClient = require('./apiClient');
const playerData = await WOMApiClient.request('players', 'getPlayer', 'Zezima');
console.log(playerData);
```


* [WOMApiClient](#module_WOMApiClient)
    * [module.exports](#exp_module_WOMApiClient--module.exports) ⏏
        * [~WOMApiClient](#module_WOMApiClient--module.exports..WOMApiClient)
            * [new WOMApiClient()](#new_module_WOMApiClient--module.exports..WOMApiClient_new)
            * [.handleWOMRateLimit()](#module_WOMApiClient--module.exports..WOMApiClient+handleWOMRateLimit) ⇒ <code>Promise.&lt;void&gt;</code>
            * [.retryRequest(endpoint, methodName, params, [retries])](#module_WOMApiClient--module.exports..WOMApiClient+retryRequest) ⇒ <code>Promise.&lt;any&gt;</code>
            * [.request(endpoint, methodName, [params])](#module_WOMApiClient--module.exports..WOMApiClient+request) ⇒ <code>Promise.&lt;any&gt;</code>

<a name="exp_module_WOMApiClient--module.exports"></a>

### module.exports ⏏
📦 **Exports an instance of WOMApiClient**

Provides a singleton API client for interacting with **Wise Old Man**.

**Kind**: Exported member  
<a name="module_WOMApiClient--module.exports..WOMApiClient"></a>

#### module.exports~WOMApiClient
🎯 **Wise Old Man API Client**

Manages interactions with the WOM API, enforcing rate limits and handling retries.

**Kind**: inner class of [<code>module.exports</code>](#exp_module_WOMApiClient--module.exports)  

* [~WOMApiClient](#module_WOMApiClient--module.exports..WOMApiClient)
    * [new WOMApiClient()](#new_module_WOMApiClient--module.exports..WOMApiClient_new)
    * [.handleWOMRateLimit()](#module_WOMApiClient--module.exports..WOMApiClient+handleWOMRateLimit) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.retryRequest(endpoint, methodName, params, [retries])](#module_WOMApiClient--module.exports..WOMApiClient+retryRequest) ⇒ <code>Promise.&lt;any&gt;</code>
    * [.request(endpoint, methodName, [params])](#module_WOMApiClient--module.exports..WOMApiClient+request) ⇒ <code>Promise.&lt;any&gt;</code>

<a name="new_module_WOMApiClient--module.exports..WOMApiClient_new"></a>

##### new WOMApiClient()
🛠️ **Constructor**

Initializes the WOM API client, sets up rate limits, and validates the WOM group ID.

**Throws**:

- <code>Error</code> If the `WOM_GROUP_ID` is missing or invalid.

<a name="module_WOMApiClient--module.exports..WOMApiClient+handleWOMRateLimit"></a>

##### womApiClient.handleWOMRateLimit() ⇒ <code>Promise.&lt;void&gt;</code>
⏳ **Enforces Rate Limiting**

Ensures that API requests do not exceed the allowed **rate limit**.
If the request limit is reached, throws an error.

**Kind**: instance method of [<code>WOMApiClient</code>](#module_WOMApiClient--module.exports..WOMApiClient)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves if the rate limit allows the request.  
**Throws**:

- <code>Error</code> If the **rate limit** is exceeded.

<a name="module_WOMApiClient--module.exports..WOMApiClient+retryRequest"></a>

##### womApiClient.retryRequest(endpoint, methodName, params, [retries]) ⇒ <code>Promise.&lt;any&gt;</code>
🔄 **Retries API Requests with Exponential Backoff**

Retries failed API requests using **exponential backoff** for resilience.

**Kind**: instance method of [<code>WOMApiClient</code>](#module_WOMApiClient--module.exports..WOMApiClient)  
**Returns**: <code>Promise.&lt;any&gt;</code> - The API response or `null` if the error is non-critical.  
**Throws**:

- <code>Error</code> If all retries fail for a **critical** error.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| endpoint | <code>string</code> |  | The WOM API endpoint (e.g., `'players'`, `'groups'`). |
| methodName | <code>string</code> |  | The method to invoke on the API endpoint. |
| params | <code>string</code> \| <code>Object</code> |  | The parameters for the API request. |
| [retries] | <code>number</code> | <code>15</code> | Maximum retry attempts. |

<a name="module_WOMApiClient--module.exports..WOMApiClient+request"></a>

##### womApiClient.request(endpoint, methodName, [params]) ⇒ <code>Promise.&lt;any&gt;</code>
⚡ **Executes an API Request with Retries**

Handles **rate limiting**, **error handling**, and **automatic retries** for API requests.

**Kind**: instance method of [<code>WOMApiClient</code>](#module_WOMApiClient--module.exports..WOMApiClient)  
**Returns**: <code>Promise.&lt;any&gt;</code> - The API response.  
**Throws**:

- <code>Error</code> If the request fails after **all retries**.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| endpoint | <code>string</code> |  | The WOM API endpoint (e.g., `'players'`, `'groups'`). |
| methodName | <code>string</code> |  | The method to call on the endpoint. |
| [params] | <code>string</code> \| <code>Object</code> | <code>&quot;{}&quot;</code> | The parameters for the API call. |

<a name="module_config/constants"></a>

## config/constants
**Constants for Varietyz Bot** ⚙️Defines and exports all constant values used throughout the Varietyz Bot.This module includes general bot configurations, Discord channel IDs, WOM API settings,rate limiting configurations, and role definitions with associated emojis and colors.**Core Features:**- Provides the bot's name and command prefix.- Defines Discord channel IDs for various functionalities.- Establishes a rank hierarchy and maps role names to their respective hierarchy indices.- Specifies detailed role definitions with associated emojis and hexadecimal color codes.**External Dependencies:**- **Discord.js**: For managing interactions with Discord.- **Luxon**: For date and time manipulations.


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
Clan rank hierarchy for easy sorting.

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
| color | <code>number</code> | The hexadecimal color code for the role. |

<a name="module_config/easterEggs"></a>

## config/easterEggs
**Easter Egg Responses for RSNs** 🎉

This module defines a set of Easter egg responses for special RuneScape Names (RSNs).
For each key (RSN in lowercase), it provides a unique title, description, and color.
These responses are used to generate fun or themed messages when a user registers or queries one of these legendary RSNs.

**Core Features:**
- Maps specific RSNs to unique titles, descriptions, and colors.
- Provides responses for well-known RSNs such as **Zezima**, **Woox**, and **Durial321**.
- Supports various colored responses to match the iconic status of each RSN.


* [config/easterEggs](#module_config/easterEggs)
    * [module.exports](#exp_module_config/easterEggs--module.exports) : <code>Object.&lt;string, EasterEgg&gt;</code> ⏏
        * [~EasterEgg](#module_config/easterEggs--module.exports..EasterEgg) : <code>Object</code>

<a name="exp_module_config/easterEggs--module.exports"></a>

### module.exports : <code>Object.&lt;string, EasterEgg&gt;</code> ⏏
An object mapping special RSNs (in lowercase) to their Easter egg responses.

**Kind**: Exported member  
<a name="module_config/easterEggs--module.exports..EasterEgg"></a>

#### module.exports~EasterEgg : <code>Object</code>
**Kind**: inner typedef of [<code>module.exports</code>](#exp_module_config/easterEggs--module.exports)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| title | <code>string</code> | The title to display for the RSN. |
| description | <code>string</code> | The description or message associated with the RSN. |
| color | <code>number</code> | The color code (in hexadecimal) used for styling responses. |

<a name="module_main"></a>

## main
🚀 **Main Entry Point for the Varietyz Bot** 🤖

This script initializes the Varietyz Bot Discord application. It creates a new Discord client,
dynamically loads command and service modules, registers slash commands with Discord's API,
handles interactions (slash commands, autocomplete, and select menus), and schedules periodic tasks.

**Key Features:**
- **Dynamic Module Loading**: Loads all commands and service modules from designated directories.
- **Slash Command Registration**: Registers all slash commands with Discord's API.
- **Task Scheduling**: Executes and schedules tasks with configurable intervals, supporting both immediate execution on startup and periodic execution.
- **Interaction Handling**: Supports slash commands, autocomplete interactions, and select menu interactions.
- **Error Logging**: Comprehensive error handling and logging for all bot processes.

**External Dependencies:**
- **discord.js**: For interacting with the Discord API and managing events.
- **dotenv**: Loads environment variables from a `.env` file.
- Custom modules for utilities (e.g., `dbUtils`, `logger`) and task processing.


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
Creates a new Discord client instance with the necessary intents.

**Kind**: inner constant of [<code>main</code>](#module_main)  
**Example**  
```js
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});
```
<a name="module_main..commands"></a>

### main~commands : <code>Array.&lt;Object&gt;</code>
**Kind**: inner constant of [<code>main</code>](#module_main)  
<a name="module_main..functions"></a>

### main~functions : <code>Array.&lt;Object&gt;</code>
**Kind**: inner constant of [<code>main</code>](#module_main)  
<a name="module_main..loadModules"></a>

### main~loadModules(type) ⇒ <code>Array.&lt;Object&gt;</code>
Dynamically loads all modules of a given type from the specified directory.

For `commands`, the module must export a `data` object with a description and an `execute` function.
For `services`, the module is simply loaded.

**Kind**: inner method of [<code>main</code>](#module_main)  
**Returns**: <code>Array.&lt;Object&gt;</code> - An array of loaded modules.  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>string</code> | The type of modules to load ('commands' or 'services'). |

**Example**  
```js
loadModules('commands');
```
<a name="module_main..initializeBot"></a>

### main~initializeBot() ⇒ <code>Promise.&lt;void&gt;</code>
Initializes the Discord bot by loading modules, registering slash commands, and logging in.

This function performs the following steps:
1. Initializes competitions-related tables.
2. Populates the skills_bosses table.
3. Dynamically loads command and service modules.
4. Registers slash commands with Discord's API.
5. Logs the bot into Discord.

**Kind**: inner method of [<code>main</code>](#module_main)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the bot is fully initialized.  
**Example**  
```js
await initializeBot();
```
<a name="module_main..handleSlashCommand"></a>

### main~handleSlashCommand(interaction) ⇒ <code>Promise.&lt;void&gt;</code>
Executes the appropriate slash command based on the interaction.

**Kind**: inner method of [<code>main</code>](#module_main)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the command has been executed.  

| Param | Type | Description |
| --- | --- | --- |
| interaction | <code>CommandInteraction</code> | The command interaction to handle. |

**Example**  
```js
// This function is invoked internally when a slash command is triggered.
```
<a name="module_main..handleAutocomplete"></a>

### main~handleAutocomplete(interaction) ⇒ <code>Promise.&lt;void&gt;</code>
Handles autocomplete interactions by delegating to the appropriate command's autocomplete handler.

**Kind**: inner method of [<code>main</code>](#module_main)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the autocomplete interaction is processed.  

| Param | Type | Description |
| --- | --- | --- |
| interaction | <code>AutocompleteInteraction</code> | The autocomplete interaction to handle. |

**Example**  
```js
// This function is invoked internally when an autocomplete interaction is triggered.
```
<a name="module_src/migrations/initializeCompetitionsTables"></a>

## src/migrations/initializeCompetitionsTables
**Initialize Competitions Tables Migration** ⚙️This module initializes or updates the competitions-related tables in the database.It ensures that all required tables (competitions, votes, users, winners, skills_bosses,competition_queue, and config) exist with the appropriate schema. It also checks for andadds any missing columns dynamically.**External Dependencies:**- **SQLite** via the dbUtils module for executing SQL queries.- **Logger** for logging migration progress and errors.


* [src/migrations/initializeCompetitionsTables](#module_src/migrations/initializeCompetitionsTables)
    * [~initializeCompetitionsTables()](#module_src/migrations/initializeCompetitionsTables..initializeCompetitionsTables) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~addMissingColumns(tables)](#module_src/migrations/initializeCompetitionsTables..addMissingColumns) ⇒ <code>Promise.&lt;void&gt;</code>

<a name="module_src/migrations/initializeCompetitionsTables..initializeCompetitionsTables"></a>

### src/migrations/initializeCompetitionsTables~initializeCompetitionsTables() ⇒ <code>Promise.&lt;void&gt;</code>
Initializes or updates the competitions-related tables in the database.This function ensures that all necessary tables exist by iterating over a set of table schemas.It then calls `addMissingColumns` to check for and add any missing columns dynamically.

**Kind**: inner method of [<code>src/migrations/initializeCompetitionsTables</code>](#module_src/migrations/initializeCompetitionsTables)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the tables are ensured to exist and updated.  
**Example**  
```js
await initializeCompetitionsTables();
```
<a name="module_src/migrations/initializeCompetitionsTables..addMissingColumns"></a>

### src/migrations/initializeCompetitionsTables~addMissingColumns(tables) ⇒ <code>Promise.&lt;void&gt;</code>
Checks for missing columns in the specified tables and adds them dynamically.Iterates over each table's schema, fetches the existing columns using a PRAGMA query,and compares the defined columns with the existing ones. Missing columns that do not containcomplex constraints (like CHECK clauses) are added to the table.

**Kind**: inner method of [<code>src/migrations/initializeCompetitionsTables</code>](#module_src/migrations/initializeCompetitionsTables)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when missing columns have been checked and added.  

| Param | Type | Description |
| --- | --- | --- |
| tables | <code>Object</code> | An object where keys are table names and values are their column schema definitions. |

**Example**  
```js
await addMissingColumns(tables);
```
<a name="module_src/migrations/migrateEndedCompetitions"></a>

## src/migrations/migrateEndedCompetitions
**Migrate Ended Competitions Script** ⏳This script migrates competitions that have ended from the active competitions tableto the ended_competitions table in the database. It ensures the ended_competitions table exists,selects competitions whose end time has passed, inserts them into the ended_competitions table,and then deletes them from the active competitions table.**External Dependencies:**- **SQLite**: For executing SQL queries via the dbUtils module.- **Logger**: For logging migration progress and errors.

<a name="module_src/migrations/migrateEndedCompetitions..migrateEndedCompetitions"></a>

### src/migrations/migrateEndedCompetitions~migrateEndedCompetitions() ⇒ <code>Promise.&lt;void&gt;</code>
🎯 Migrates Ended CompetitionsThis asynchronous function migrates competitions that have ended (i.e., where the end time is in the past)from the active competitions table to the ended_competitions table. The process includes:- Ensuring the ended_competitions table exists.- Selecting competitions that have ended based on the current time.- Inserting each ended competition into the ended_competitions table.- Deleting the migrated competition from the active competitions table.

**Kind**: inner method of [<code>src/migrations/migrateEndedCompetitions</code>](#module_src/migrations/migrateEndedCompetitions)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the migration process is complete.  
**Example**  
```js
// Run the migration process:await migrateEndedCompetitions();
```
<a name="module_src/migrations/populateSkillsBosses"></a>

## src/migrations/populateSkillsBosses
**Populate Skills & Bosses Migration** ⚙️This script populates the `skills_bosses` table in the database using data fromthe `MetricProps` object provided by the `@wise-old-man/utils` package.It extracts only Skill and Boss properties (excluding ActivityProperties and ComputedMetricProperties)and inserts them into the table if they do not already exist.**Core Features:**- Determines whether a MetricProp is a Skill or a Boss.- Inserts new entries into the `skills_bosses` table within a transaction for atomicity.- Prevents duplicate entries by checking existing records.**External Dependencies:**- **SQLite**: For executing SQL queries.- **Logger**: For logging migration progress and errors.- **@wise-old-man/utils**: Provides the `MetricProps` object.


* [src/migrations/populateSkillsBosses](#module_src/migrations/populateSkillsBosses)
    * [~determinePropType(prop)](#module_src/migrations/populateSkillsBosses..determinePropType) ⇒ <code>string</code> \| <code>null</code>
    * [~populateSkillsBosses()](#module_src/migrations/populateSkillsBosses..populateSkillsBosses) ⇒ <code>Promise.&lt;void&gt;</code>

<a name="module_src/migrations/populateSkillsBosses..determinePropType"></a>

### src/migrations/populateSkillsBosses~determinePropType(prop) ⇒ <code>string</code> \| <code>null</code>
Determines the type of a MetricProp based on its properties.Checks if the given property object has the characteristic keys that identify it as a Skill or a Boss.

**Kind**: inner method of [<code>src/migrations/populateSkillsBosses</code>](#module_src/migrations/populateSkillsBosses)  
**Returns**: <code>string</code> \| <code>null</code> - Returns `'Skill'` if the property has an `isCombat` key, `'Boss'` if it has both `minimumValue` and `isMembers` keys, otherwise returns `null`.  

| Param | Type | Description |
| --- | --- | --- |
| prop | <code>Object</code> | The property object from MetricProps. |

**Example**  
```js
const propType = determinePropType(MetricProps.Attack);// propType might be 'Skill'
```
<a name="module_src/migrations/populateSkillsBosses..populateSkillsBosses"></a>

### src/migrations/populateSkillsBosses~populateSkillsBosses() ⇒ <code>Promise.&lt;void&gt;</code>
Populates the `skills_bosses` table with data from MetricProps.Iterates over all properties in the MetricProps object to extract Skills and Bosses.It skips ActivityProperties and ComputedMetricProperties, and inserts new entriesinto the database if they do not already exist. The insertion is performed within a transactionto ensure atomicity.

**Kind**: inner method of [<code>src/migrations/populateSkillsBosses</code>](#module_src/migrations/populateSkillsBosses)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the migration completes successfully.  
**Example**  
```js
// Run this migration script to update the skills_bosses table:await populateSkillsBosses();
```
<a name="module_modules/commands/adminAssignRsn"></a>

## modules/commands/adminAssignRsn
**Admin_assign_rsn Command** 🔄Defines the `/admin_assign_rsn` slash command for the Varietyz Bot.This command allows administrators to assign a new RuneScape Name (RSN) to a guild memberby adding the RSN to the database. It performs input validation, conflict checking, and verifies the RSNagainst the Wise Old Man API before prompting for confirmation to complete the assignment.**Core Features:**- Assigns an RSN to a specified guild member.- Validates the new RSN format and checks for conflicts with existing RSNs.- Verifies the RSN on the Wise Old Man API.- Provides an interactive confirmation prompt to avoid accidental assignments.- Notifies the target user via a DM once the RSN is registered.**External Dependencies:**- **Discord.js**: For handling slash commands, creating embeds, and managing interactive buttons.- **Wise Old Man API**: For verifying RSNs and fetching player data.- **SQLite**: For interacting with the RSN database.

<a name="module_modules/commands/adminAssignRsn..execute"></a>

### modules/commands/adminAssignRsn~execute(interaction) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 Executes the `/admin_assign_rsn` command.This function handles the RSN assignment process by:1. Retrieving the target user and the RSN to assign from the command options.2. Validating the RSN format using `validateRsn` and normalizing the RSN.3. Verifying the existence of the RSN on the Wise Old Man API via `fetchPlayerData`.4. Checking for conflicts in the database to ensure the RSN is not already registered.5. Sending a confirmation prompt with interactive buttons for the admin to confirm or cancel the action.6. Upon confirmation, inserting the RSN into the database and notifying the target user via DM.

**Kind**: inner method of [<code>modules/commands/adminAssignRsn</code>](#module_modules/commands/adminAssignRsn)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the command execution is complete.  

| Param | Type | Description |
| --- | --- | --- |
| interaction | <code>Discord.CommandInteraction</code> | The interaction object representing the command execution. |

**Example**  
```js
// Invoked when an admin runs /admin_assign_rsn with the required options:await execute(interaction);
```
<a name="module_modules/commands/adminCheckActivity"></a>

## modules/commands/adminCheckActivity
**Check_activity Command** ⏱️Implements the `/check_activity` command to display active and inactive players.This command provides insights into player activity by fetching data from the databaseand presenting it with pagination support.Core Features: (Administrator-only command)- Displays active or inactive players based on recent progression.- Paginated display of player data with navigation controls.- Includes the last progress timestamp for each player.- Displays total count of active or inactive players.- Supports interactive buttons for page navigation and closing.External Dependencies:- **Discord.js**: For handling slash commands, creating embeds, and managing interactive buttons.- **Luxon**: For date and time manipulation (calculating progression and inactivity).- **SQLite**: For retrieving player activity data from the database.

<a name="module_modules/commands/adminCheckActivity..execute"></a>

### modules/commands/adminCheckActivity~execute(interaction) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 Executes the `/check_activity` command.Retrieves active or inactive players based on their last progress and displays the resultsin a paginated embed with navigation buttons.The command:- Defers the reply.- Updates the activity data from the database.- Retrieves and calculates the total count of active/inactive players.- Fetches the corresponding player records.- Paginates the data and sends an embed with interactive navigation.

**Kind**: inner method of [<code>modules/commands/adminCheckActivity</code>](#module_modules/commands/adminCheckActivity)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the command execution is complete.  

| Param | Type | Description |
| --- | --- | --- |
| interaction | <code>Discord.CommandInteraction</code> | The command interaction object. |

**Example**  
```js
// Executed when an admin runs /check_activity status:activeawait execute(interaction);
```
<a name="module_modules/commands/adminQueueCompetition"></a>

## modules/commands/adminQueueCompetition
**Queue_competition Command** ⏳This module defines the `/queue_competition` slash command for the Varietyz Bot.It allows administrators to queue a new competition to be created in the next rotation.The command validates the provided competition type and metric against the database,ensures that the competition is not already queued, and then inserts the new competition into the queue.**Core Features:**- **Validation:** Checks if the provided metric exists in the database.- **Conflict Prevention:** Prevents queuing the same competition twice.- **Database Interaction:** Inserts the new competition into the competition queue.- **Autocomplete Support:** Provides autocomplete suggestions for both the "type" and "metric" options.**External Dependencies:**- **Discord.js** for handling slash command interactions and autocompletion.- **SQLite** for managing competition and metric data.


* [modules/commands/adminQueueCompetition](#module_modules/commands/adminQueueCompetition)
    * [~execute(interaction)](#module_modules/commands/adminQueueCompetition..execute) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~autocomplete(interaction)](#module_modules/commands/adminQueueCompetition..autocomplete) ⇒ <code>Promise.&lt;void&gt;</code>

<a name="module_modules/commands/adminQueueCompetition..execute"></a>

### modules/commands/adminQueueCompetition~execute(interaction) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Executes the /queue_competition Command**This function handles the execution of the `/queue_competition` command. It:- Retrieves the "type" and "metric" options from the interaction.- Validates the provided metric by querying the database.- Checks if a competition with the same type and metric is already queued.- Inserts a new competition into the queue if validations pass.

**Kind**: inner method of [<code>modules/commands/adminQueueCompetition</code>](#module_modules/commands/adminQueueCompetition)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the command has been fully executed.  

| Param | Type | Description |
| --- | --- | --- |
| interaction | <code>Discord.CommandInteraction</code> | The interaction object representing the command execution. |

**Example**  
```js
// This command is used by administrators to queue a new competition:await execute(interaction);
```
<a name="module_modules/commands/adminQueueCompetition..autocomplete"></a>

### modules/commands/adminQueueCompetition~autocomplete(interaction) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Handles Autocomplete for the /queue_competition Command**Provides autocomplete suggestions for the "type" and "metric" options.- For the "type" option, it suggests "SOTW" and "BOTW".- For the "metric" option, it queries the database for matching metrics based on the user's input.

**Kind**: inner method of [<code>modules/commands/adminQueueCompetition</code>](#module_modules/commands/adminQueueCompetition)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when autocomplete suggestions have been sent.  

| Param | Type | Description |
| --- | --- | --- |
| interaction | <code>Discord.AutocompleteInteraction</code> | The autocomplete interaction object. |

**Example**  
```js
// This function is invoked when a user types in the command option field.await autocomplete(interaction);
```
<a name="module_modules/commands/adminRemoveRsn"></a>

## modules/commands/adminRemoveRsn
**Admin_remove_rsn Command** 🔥

Defines the `/admin_remove_rsn` slash command for the Varietyz Bot.
This administrator-only command allows administrators to remove a registered RuneScape Name (RSN)
from a specified guild member's account. The command validates inputs, checks for the RSN's existence,
and provides a confirmation prompt before executing the removal. It also supports autocomplete for the
`target` and `rsn` options.

**External Dependencies:**
- **Discord.js**: For handling slash commands, creating embeds, and managing interactive buttons.
- **SQLite**: For interacting with the registered RSN database.


* [modules/commands/adminRemoveRsn](#module_modules/commands/adminRemoveRsn)
    * [~execute(interaction)](#module_modules/commands/adminRemoveRsn..execute) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~autocomplete(interaction)](#module_modules/commands/adminRemoveRsn..autocomplete) ⇒ <code>Promise.&lt;void&gt;</code>

<a name="module_modules/commands/adminRemoveRsn..execute"></a>

### modules/commands/adminRemoveRsn~execute(interaction) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 Executes the `/admin_remove_rsn` command.

This function handles the removal of a registered RSN from a specified guild member.
It performs the following steps:
1. Retrieves the target user and the RSN to remove from the command options.
2. Validates that the command is used in a guild and that the target user exists.
3. Fetches the target user's registered RSNs and normalizes them.
4. Checks whether the provided RSN exists in the target user's registered RSNs.
5. Sends a confirmation prompt with interactive buttons (Confirm/Cancel).
6. If confirmed, removes the RSN from the database and sends a DM to the target user.

**Kind**: inner method of [<code>modules/commands/adminRemoveRsn</code>](#module_modules/commands/adminRemoveRsn)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the command execution is complete.  

| Param | Type | Description |
| --- | --- | --- |
| interaction | <code>Discord.CommandInteraction</code> | The interaction object representing the command. |

**Example**  
```js
// When an administrator runs /admin_remove_rsn, this function is invoked.
await execute(interaction);
```
<a name="module_modules/commands/adminRemoveRsn..autocomplete"></a>

### modules/commands/adminRemoveRsn~autocomplete(interaction) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 Provides autocomplete suggestions for the `/admin_remove_rsn` command.

For the `target` option, it retrieves a list of unique user IDs from the registered RSNs,
fetches the corresponding guild members, and returns suggestions based on the input.

For the `rsn` option, it filters the target user's registered RSNs based on the input.

**Kind**: inner method of [<code>modules/commands/adminRemoveRsn</code>](#module_modules/commands/adminRemoveRsn)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when autocomplete suggestions have been sent.  

| Param | Type | Description |
| --- | --- | --- |
| interaction | <code>Discord.AutocompleteInteraction</code> | The autocomplete interaction object. |

**Example**  
```js
// Invoked when a user types in the `target` or `rsn` field.
await autocomplete(interaction);
```
<a name="module_modules/commands/adminRenameRsn"></a>

## modules/commands/adminRenameRsn
**Admin_rename_rsn Command** 🔄

Defines the `/admin_rename_rsn` slash command for the Varietyz Bot.
This command allows administrators to rename a registered RuneScape Name (RSN) of a guild member.
It handles input validation, database interactions, and verifies RSNs against the Wise Old Man API.
It also provides a confirmation prompt for the renaming action and supports autocomplete for the target and current RSN fields.

**External Dependencies:**
- **Discord.js**: For handling slash commands, creating embeds, and managing interactive buttons.
- **Wise Old Man API**: For verifying RSNs and fetching player data.
- **SQLite**: For interacting with the registered RSN database.


* [modules/commands/adminRenameRsn](#module_modules/commands/adminRenameRsn)
    * [~execute(interaction)](#module_modules/commands/adminRenameRsn..execute) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~autocomplete(interaction)](#module_modules/commands/adminRenameRsn..autocomplete) ⇒ <code>Promise.&lt;void&gt;</code>

<a name="module_modules/commands/adminRenameRsn..execute"></a>

### modules/commands/adminRenameRsn~execute(interaction) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 Executes the `/admin_rename_rsn` command.

This function performs the following steps:
1. Retrieves the target user ID, current RSN, and new RSN from the command options.
2. Validates that the command is executed in a guild and that the target user exists.
3. Validates the new RSN format using `validateRsn` and normalizes the RSNs.
4. Fetches player data from the Wise Old Man API to verify the new RSN.
5. Checks for conflicts to ensure the new RSN is not already registered by another user.
6. Verifies that the current RSN exists in the target user's registered RSNs.
7. Sends a confirmation prompt with interactive buttons (Confirm/Cancel) to proceed with renaming.
8. Upon confirmation, updates the RSN in the database and notifies the target user via DM.

**Kind**: inner method of [<code>modules/commands/adminRenameRsn</code>](#module_modules/commands/adminRenameRsn)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the command execution is complete.  

| Param | Type | Description |
| --- | --- | --- |
| interaction | <code>Discord.CommandInteraction</code> | The interaction object representing the command execution. |

**Example**  
```js
// Invoked when an admin runs /admin_rename_rsn with the required options.
await execute(interaction);
```
<a name="module_modules/commands/adminRenameRsn..autocomplete"></a>

### modules/commands/adminRenameRsn~autocomplete(interaction) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 Provides autocomplete suggestions for the `target` and `current_rsn` options.

For the `target` option, it retrieves a list of user IDs from the registered RSNs,
fetches the corresponding guild members, and returns suggestions based on the input.

For the `current_rsn` option, it filters the target user's registered RSNs based on the input.

**Kind**: inner method of [<code>modules/commands/adminRenameRsn</code>](#module_modules/commands/adminRenameRsn)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when autocomplete suggestions are sent.  

| Param | Type | Description |
| --- | --- | --- |
| interaction | <code>Discord.AutocompleteInteraction</code> | The autocomplete interaction object. |

**Example**  
```js
// Invoked when a user types in the `target` or `current_rsn` field.
await autocomplete(interaction);
```
<a name="module_modules/commands/adminRsnList"></a>

## modules/commands/adminRsnList
**RSN List Command** 📜

Defines the `/rsn_list` slash command for the Varietyz Bot.
This command allows users to view all registered RuneScape Names (RSNs) along with their associated ranks for clan members.
The command displays the data in a paginated embed with interactive navigation buttons.

**Core Features:**
- Displays RSNs grouped by Discord user.
- Shows rank emojis and provides links to Wise Old Man profiles.
- Supports paginated navigation via buttons.

**External Dependencies:**
- discord.js for embeds, actions rows, buttons.
- SQLite for retrieving RSN and clan member data.


* [modules/commands/adminRsnList](#module_modules/commands/adminRsnList)
    * [~execute(interaction)](#module_modules/commands/adminRsnList..execute) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~getHighestRank(rsns, clanMembers)](#module_modules/commands/adminRsnList..getHighestRank) ⇒ <code>Object</code>
    * [~paginateRSNData(rsnData, clanMembers, itemsPerPage)](#module_modules/commands/adminRsnList..paginateRSNData) ⇒ <code>Array.&lt;EmbedBuilder&gt;</code>
    * [~prepareUserContent(userId, rsns, clanMembers)](#module_modules/commands/adminRsnList..prepareUserContent) ⇒ <code>string</code>
    * [~groupRSNByUser(rsnData)](#module_modules/commands/adminRsnList..groupRSNByUser) ⇒ <code>Object</code>

<a name="module_modules/commands/adminRsnList..execute"></a>

### modules/commands/adminRsnList~execute(interaction) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Executes the /rsn_list Command**

Fetches RSN data from the database and clan member data, then paginates and displays the RSNs in an embed.
The embed includes interactive navigation buttons for paging through the results.

**Kind**: inner method of [<code>modules/commands/adminRsnList</code>](#module_modules/commands/adminRsnList)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the command execution is complete.  

| Param | Type | Description |
| --- | --- | --- |
| interaction | <code>Discord.CommandInteraction</code> | The command interaction object. |

**Example**  
```js
// Invoked when a user runs /rsn_list.
await execute(interaction);
```
<a name="module_modules/commands/adminRsnList..getHighestRank"></a>

### modules/commands/adminRsnList~getHighestRank(rsns, clanMembers) ⇒ <code>Object</code>
🎯 **Determines the Highest Rank Among RSNs for a User**

For a given array of RSNs and clan member data, this function determines which RSN corresponds to the highest rank
based on a predefined rank hierarchy. If no clan member data is found, the rank defaults to 'guest'.

**Kind**: inner method of [<code>modules/commands/adminRsnList</code>](#module_modules/commands/adminRsnList)  
**Returns**: <code>Object</code> - An object containing the highest rank and its associated RSN.  

| Param | Type | Description |
| --- | --- | --- |
| rsns | <code>Array.&lt;string&gt;</code> | The user's RSNs. |
| clanMembers | <code>Array.&lt;Object&gt;</code> | The clan member data. |

**Example**  
```js
const highest = getHighestRank(['PlayerOne', 'PlayerTwo'], clanMembers);
console.log(highest); // { rsn: 'PlayerOne', rank: 'Leader' }
```
<a name="module_modules/commands/adminRsnList..paginateRSNData"></a>

### modules/commands/adminRsnList~paginateRSNData(rsnData, clanMembers, itemsPerPage) ⇒ <code>Array.&lt;EmbedBuilder&gt;</code>
🎯 **Paginates RSN Data into Embed Pages**

Splits the RSN data (grouped by user) into multiple pages for display.
Each page is represented by an EmbedBuilder object containing RSN information and pagination details.

**Kind**: inner method of [<code>modules/commands/adminRsnList</code>](#module_modules/commands/adminRsnList)  
**Returns**: <code>Array.&lt;EmbedBuilder&gt;</code> - An array of embeds, each representing a page.  

| Param | Type | Description |
| --- | --- | --- |
| rsnData | <code>Array.&lt;Object&gt;</code> | The RSN data from the database. |
| clanMembers | <code>Array.&lt;Object&gt;</code> | The clan member data from the database. |
| itemsPerPage | <code>number</code> | The maximum number of users per page. |

**Example**  
```js
const pages = paginateRSNData(rsnData, clanMembers, 10);
console.log(`Generated ${pages.length} pages.`);
```
<a name="module_modules/commands/adminRsnList..prepareUserContent"></a>

### modules/commands/adminRsnList~prepareUserContent(userId, rsns, clanMembers) ⇒ <code>string</code>
🎯 **Prepares Formatted Content for a User's RSN List**

Generates a formatted string for a user's RSNs, including a Discord mention,
rank emojis, and clickable links to Wise Old Man profiles.

**Kind**: inner method of [<code>modules/commands/adminRsnList</code>](#module_modules/commands/adminRsnList)  
**Returns**: <code>string</code> - A formatted string containing the user's mention and their RSNs.  

| Param | Type | Description |
| --- | --- | --- |
| userId | <code>string</code> | The Discord user ID. |
| rsns | <code>Array.&lt;string&gt;</code> | The RSNs associated with the user. |
| clanMembers | <code>Array.&lt;Object&gt;</code> | The clan member data. |

**Example**  
```js
const content = prepareUserContent('123456789012345678', ['PlayerOne'], clanMembers);
console.log(content);
```
<a name="module_modules/commands/adminRsnList..groupRSNByUser"></a>

### modules/commands/adminRsnList~groupRSNByUser(rsnData) ⇒ <code>Object</code>
🎯 **Groups RSNs by Discord User**

Organizes RSN data into an object where each key is a user ID and each value is an array of RSNs for that user.

**Kind**: inner method of [<code>modules/commands/adminRsnList</code>](#module_modules/commands/adminRsnList)  
**Returns**: <code>Object</code> - An object mapping user IDs to arrays of RSNs.  

| Param | Type | Description |
| --- | --- | --- |
| rsnData | <code>Array.&lt;Object&gt;</code> | An array of objects containing `user_id` and `rsn` properties. |

**Example**  
```js
const grouped = groupRSNByUser(rsnData);
console.log(grouped); // { 'user1': ['RSN1', 'RSN2'], 'user2': ['RSN3'] }
```
<a name="module_src/modules/commands/adminSetRotationPeriod"></a>

## src/modules/commands/adminSetRotationPeriod
**Set Rotation Period Command** ⏱️This module defines the `/set_rotation_period` slash command for the Varietyz Bot.It allows administrators to set the rotation period (in weeks) for competitions.The command updates the configuration in the database and informs the user upon success or failure.**Key Features:**- **Command Registration**: Defines a slash command with a required integer option for the number of weeks.- **Permission Management**: Restricted to administrators.- **Database Update**: Updates the rotation period in the configuration table using an upsert query.

<a name="module_src/modules/commands/adminSetRotationPeriod..execute"></a>

### src/modules/commands/adminSetRotationPeriod~execute(interaction) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Executes the /set_rotation_period Command**This command allows administrators to set the rotation period for competitions.It retrieves the number of weeks from the command options, validates that it is at least 1,and updates the configuration in the database accordingly.

**Kind**: inner method of [<code>src/modules/commands/adminSetRotationPeriod</code>](#module_src/modules/commands/adminSetRotationPeriod)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the command execution is complete.  

| Param | Type | Description |
| --- | --- | --- |
| interaction | <code>Discord.CommandInteraction</code> | The command interaction object. |

**Example**  
```js
// When an administrator runs:// /set_rotation_period weeks:2// The rotation period is set to 2 weeks.
```
<a name="module_modules/commands/adminSyncMembers"></a>

## modules/commands/adminSyncMembers
**Sync_members Command** 📋Defines the `/sync_members` slash command for the Varietyz Bot.This command allows administrators to manually synchronize clan members with the Wise Old Man (WOM) API,updating their data and roles. It fetches all distinct user IDs from the `registered_rsn` table,processes each user by calling the `fetchAndProcessMember` function, and returns a summary of the results.**External Dependencies:**- **Discord.js**: For handling slash command interactions.- **SQLite**: For querying registered RSN data.- **Wise Old Man API**: For fetching the latest member data.- **Logger**: For logging command activity and errors.

<a name="module_modules/commands/adminSyncMembers..execute"></a>

### modules/commands/adminSyncMembers~execute(interaction) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Executes the /sync_members Command**This function performs the following steps:1. Defers the reply to allow sufficient processing time.2. Fetches all distinct user IDs from the `registered_rsn` table.3. Iterates through each user ID and calls `fetchAndProcessMember` to update their data and roles.4. Returns a summary message indicating the number of processed and failed members.

**Kind**: inner method of [<code>modules/commands/adminSyncMembers</code>](#module_modules/commands/adminSyncMembers)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the command execution is complete.  

| Param | Type | Description |
| --- | --- | --- |
| interaction | <code>Discord.CommandInteraction</code> | The interaction object representing the command. |

**Example**  
```js
// When an administrator runs /sync_members:await execute(interaction);
```
<a name="module_modules/commands/adminUpdateClannieChannel"></a>

## modules/commands/adminUpdateClannieChannel
**Admin_update_channel Command** 🔄Defines the `/admin_update_channel` slash command for the Varietyz Bot.This command allows administrators to manually trigger an update of the clan channel with the latest member data.It calls the `updateData` function, which handles data retrieval from the WOM API, role management,database updates, and refreshing the Discord channel.**External Dependencies:**- **Discord.js**: For handling slash commands and interactions.- **updateData**: The function responsible for updating clan member data and refreshing the clan channel.

<a name="module_modules/commands/adminUpdateClannieChannel..execute"></a>

### modules/commands/adminUpdateClannieChannel~execute(interaction) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 Executes the `/admin_update_channel` command.This command allows administrators to manually update the clan channel by triggering the`updateData` function with the `forceChannelUpdate` flag set to `true`. It first checks thatthe command is used within a guild, then defers the reply, logs the action, and attempts the update.On success, a success embed is sent; on failure, an error message is returned.

**Kind**: inner method of [<code>modules/commands/adminUpdateClannieChannel</code>](#module_modules/commands/adminUpdateClannieChannel)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the command execution is complete.  

| Param | Type | Description |
| --- | --- | --- |
| interaction | <code>Discord.CommandInteraction</code> | The interaction object representing the command execution. |

**Example**  
```js
// When an administrator runs /update_clanchannel:await execute(interaction);
```
<a name="module_modules/commands/list_competitions"></a>

## modules/commands/list\_competitions
**List Competitions Command** 📅This module defines the `/list_competitions` slash command for the Varietyz Bot.It retrieves all upcoming, ongoing, and queued competitions from the database, categorizes them,and displays the results in an embed. The command uses a union query to fetch competitions from boththe `competitions` and `competition_queue` tables.**External Dependencies:**- **Discord.js**: For creating and sending slash command replies.- **SQLite**: For querying competition data.- **Logger**: For logging operations and errors.

<a name="module_modules/commands/list_competitions..execute"></a>

### modules/commands/list_competitions~execute(interaction) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Executes the /list_competitions Command**Retrieves competitions from the database (both scheduled and queued), categorizes them into ongoing,upcoming, and queued groups, and sends an embed with the competition details.

**Kind**: inner method of [<code>modules/commands/list\_competitions</code>](#module_modules/commands/list_competitions)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the command execution is complete.  

| Param | Type | Description |
| --- | --- | --- |
| interaction | <code>Discord.CommandInteraction</code> | The command interaction object. |

**Example**  
```js
// Invoked when a user runs /list_competitions:await execute(interaction);
```
<a name="module_src/modules/commands/profile"></a>

## src/modules/commands/profile
**Profile Command** 📜Defines the `/profile` slash command for the Varietyz Bot.This command allows users to view a player profile by RSN. If no RSN is provided,the command defaults to the user's own registered RSN.The command gathers live data from the Wise Old Man API along with stored data from the database,then builds and displays an embed with account information, experience data, skill and boss achievements,registration dates, competition stats, and clan details.**External Dependencies:**- **Discord.js**: For building embeds and handling interactions.- **SQLite**: For retrieving registered RSN, clan member, and user data.- **Wise Old Man API**: For fetching live player data.- Utility functions for string normalization, truncation, and formatting.


* [src/modules/commands/profile](#module_src/modules/commands/profile)
    * [~safeTruncate(text, maxLength)](#module_src/modules/commands/profile..safeTruncate) ⇒ <code>string</code>
    * [~getCompetitionStats(playerUsername)](#module_src/modules/commands/profile..getCompetitionStats) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [~getLocalRegDate(clanMemberProfile, regRsns, liveRegisteredAt)](#module_src/modules/commands/profile..getLocalRegDate) ⇒ <code>string</code>
    * [~getGuildEmoji(name, guild, [fallbackEmoji])](#module_src/modules/commands/profile..getGuildEmoji) ⇒ <code>string</code>
    * [~buildAccountEmbed(liveData, accountInfo, experienceInfo, leftSkillsStr, rightSkillsStr, leftBossesStr, rightBossesStr, dateInfo, compInfo, clanInfo)](#module_src/modules/commands/profile..buildAccountEmbed) ⇒ <code>EmbedBuilder</code>
    * [~buildRSNEmbed(regRsns)](#module_src/modules/commands/profile..buildRSNEmbed) ⇒ <code>EmbedBuilder</code>
    * [~getCountryDisplay(countryCode)](#module_src/modules/commands/profile..getCountryDisplay) ⇒ <code>string</code>
    * [~capitalizeWords(str)](#module_src/modules/commands/profile..capitalizeWords) ⇒ <code>string</code>
    * [~execute(interaction)](#module_src/modules/commands/profile..execute) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~autocomplete(interaction)](#module_src/modules/commands/profile..autocomplete) ⇒ <code>Promise.&lt;void&gt;</code>

<a name="module_src/modules/commands/profile..safeTruncate"></a>

### src/modules/commands/profile~safeTruncate(text, maxLength) ⇒ <code>string</code>
Safely truncates a string to a specified maximum length.If the input text exceeds the maximum length, it truncates the text and appends an ellipsis ("...").

**Kind**: inner method of [<code>src/modules/commands/profile</code>](#module_src/modules/commands/profile)  
**Returns**: <code>string</code> - The truncated string, or the original string if it is within the limit.  

| Param | Type | Description |
| --- | --- | --- |
| text | <code>string</code> | The text to truncate. |
| maxLength | <code>number</code> | The maximum allowed length. |

**Example**  
```js
const truncated = safeTruncate("This is a very long text", 10);// truncated => "This is..."
```
<a name="module_src/modules/commands/profile..getCompetitionStats"></a>

### src/modules/commands/profile~getCompetitionStats(playerUsername) ⇒ <code>Promise.&lt;Object&gt;</code>
Retrieves competition statistics for a given username from the users table.Fetches total wins, SOTW total experience gain, and BOTW total kills for the specified player.If no statistics are found, returns default placeholder values.

**Kind**: inner method of [<code>src/modules/commands/profile</code>](#module_src/modules/commands/profile)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - An object containing:- `total_wins`- `total_metric_gain_sotw`- `total_metric_gain_botw`  

| Param | Type | Description |
| --- | --- | --- |
| playerUsername | <code>string</code> | The player's username. |

**Example**  
```js
const stats = await getCompetitionStats('playerone');
```
<a name="module_src/modules/commands/profile..getLocalRegDate"></a>

### src/modules/commands/profile~getLocalRegDate(clanMemberProfile, regRsns, liveRegisteredAt) ⇒ <code>string</code>
Determines the local registration date based on available data.The function prioritizes the registration date from the `registered_rsn` table. If not available,it falls back to the clan member's joined date. If neither is available, "Determining.." is returned.If a live registration timestamp from the WOM API is provided, it is used instead.

**Kind**: inner method of [<code>src/modules/commands/profile</code>](#module_src/modules/commands/profile)  
**Returns**: <code>string</code> - The registration date to display.  

| Param | Type | Description |
| --- | --- | --- |
| clanMemberProfile | <code>Object</code> \| <code>null</code> | The clan member record. |
| regRsns | <code>Array.&lt;Object&gt;</code> | Array of registered RSN records. |
| liveRegisteredAt | <code>string</code> \| <code>undefined</code> | Live registration timestamp from the WOM API. |

**Example**  
```js
const regDate = getLocalRegDate(clanMemberProfile, regRsns, liveRegisteredAt);
```
<a name="module_src/modules/commands/profile..getGuildEmoji"></a>

### src/modules/commands/profile~getGuildEmoji(name, guild, [fallbackEmoji]) ⇒ <code>string</code>
Fetches a guild emoji by name, with a fallback if the emoji is not found or unavailable.

**Kind**: inner method of [<code>src/modules/commands/profile</code>](#module_src/modules/commands/profile)  
**Returns**: <code>string</code> - The emoji string if found; otherwise, the fallback emoji.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | The name of the emoji to search for. |
| guild | <code>Guild</code> |  | The guild to search in. |
| [fallbackEmoji] | <code>string</code> | <code>&quot;&#x27;⚔️&#x27;&quot;</code> | The fallback emoji to use if not found. |

**Example**  
```js
const emoji = getGuildEmoji('slayer', guild);
```
<a name="module_src/modules/commands/profile..buildAccountEmbed"></a>

### src/modules/commands/profile~buildAccountEmbed(liveData, accountInfo, experienceInfo, leftSkillsStr, rightSkillsStr, leftBossesStr, rightBossesStr, dateInfo, compInfo, clanInfo) ⇒ <code>EmbedBuilder</code>
Builds the main account embed using live data and formatted strings.Constructs an embed with the player's profile information, including account details,experience, skills, bosses, competition stats, and date information. Conditionally adds fieldsbased on available data.

**Kind**: inner method of [<code>src/modules/commands/profile</code>](#module_src/modules/commands/profile)  
**Returns**: <code>EmbedBuilder</code> - The constructed account embed.  

| Param | Type | Description |
| --- | --- | --- |
| liveData | <code>Object</code> | Live player data from the WOM API. |
| accountInfo | <code>string</code> | Formatted account information. |
| experienceInfo | <code>string</code> | Formatted experience data. |
| leftSkillsStr | <code>string</code> | Formatted string for left column skills. |
| rightSkillsStr | <code>string</code> | Formatted string for right column skills. |
| leftBossesStr | <code>string</code> | Formatted string for left column bosses. |
| rightBossesStr | <code>string</code> | Formatted string for right column bosses. |
| dateInfo | <code>string</code> | Formatted date information. |
| compInfo | <code>string</code> | Formatted competition statistics. |
| clanInfo | <code>string</code> | Formatted clan information. |

**Example**  
```js
const embed = buildAccountEmbed(liveData, accountInfo, expInfo, leftSkills, rightSkills, leftBosses, rightBosses, dateInfo, compInfo, clanInfo);
```
<a name="module_src/modules/commands/profile..buildRSNEmbed"></a>

### src/modules/commands/profile~buildRSNEmbed(regRsns) ⇒ <code>EmbedBuilder</code>
Builds an embed displaying registered RSNs.Constructs an embed that lists registered RSNs along with their registration dates.

**Kind**: inner method of [<code>src/modules/commands/profile</code>](#module_src/modules/commands/profile)  
**Returns**: <code>EmbedBuilder</code> - The RSN embed.  

| Param | Type | Description |
| --- | --- | --- |
| regRsns | <code>Array.&lt;Object&gt;</code> | Array of registered RSN records. |

**Example**  
```js
const rsnEmbed = buildRSNEmbed(regRsns);
```
<a name="module_src/modules/commands/profile..getCountryDisplay"></a>

### src/modules/commands/profile~getCountryDisplay(countryCode) ⇒ <code>string</code>
Returns a string that combines a Discord flag emoji shortcode with the full country code.For example, for the input "AUS", it returns ":flag_au: AUS".

**Kind**: inner method of [<code>src/modules/commands/profile</code>](#module_src/modules/commands/profile)  
**Returns**: <code>string</code> - The formatted country display string.  

| Param | Type | Description |
| --- | --- | --- |
| countryCode | <code>string</code> | A country code (can be more than 2 letters). |

**Example**  
```js
const display = getCountryDisplay('AUS');// display => ":flag_au: AUS"
```
<a name="module_src/modules/commands/profile..capitalizeWords"></a>

### src/modules/commands/profile~capitalizeWords(str) ⇒ <code>string</code>
Capitalizes the first letter of each word in the provided string.

**Kind**: inner method of [<code>src/modules/commands/profile</code>](#module_src/modules/commands/profile)  
**Returns**: <code>string</code> - The string with each word capitalized.  

| Param | Type | Description |
| --- | --- | --- |
| str | <code>string</code> | The string to capitalize. |

**Example**  
```js
const result = capitalizeWords('hello world');// result => "Hello World"
```
<a name="module_src/modules/commands/profile..execute"></a>

### src/modules/commands/profile~execute(interaction) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Executes the /profile Command**Fetches a player's profile based on a provided RSN or the user's own registered RSN if none is provided.The command:1. Retrieves the RSN from the interaction options or defaults to the user's first registered RSN.2. Normalizes the RSN for consistency.3. Queries the database for clan member and user profiles.4. Fetches live data from the Wise Old Man API.5. Gathers additional data such as competition statistics and registration dates.6. Builds an account embed and, if applicable, an RSN embed.

**Kind**: inner method of [<code>src/modules/commands/profile</code>](#module_src/modules/commands/profile)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the command execution is complete.  

| Param | Type | Description |
| --- | --- | --- |
| interaction | <code>Discord.CommandInteraction</code> | The command interaction object. |

**Example**  
```js
// Invoked when a user runs /profile.await execute(interaction);
```
<a name="module_src/modules/commands/profile..autocomplete"></a>

### src/modules/commands/profile~autocomplete(interaction) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Handles Autocomplete for the /profile Command**Provides autocomplete suggestions for RSN input by combining data from users,registered RSNs, and clan members. It ensures up to 25 unique suggestions are sent.

**Kind**: inner method of [<code>src/modules/commands/profile</code>](#module_src/modules/commands/profile)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when autocomplete suggestions are sent.  

| Param | Type | Description |
| --- | --- | --- |
| interaction | <code>Discord.AutocompleteInteraction</code> | The autocomplete interaction object. |

**Example**  
```js
// Invoked when a user types in the RSN option field.await autocomplete(interaction);
```
<a name="module_modules/commands/removeRsn"></a>

## modules/commands/removeRsn
**Remove_rsn Command** 🗑️

Defines the `/remove_rsn` slash command for the Varietyz Bot. This command allows users to remove up to three
registered RuneScape Names (RSNs) from their account. It handles validation, rate limiting, database interactions,
and provides an autocomplete feature for RSN suggestions.

**Core Features:**
- Removes up to three RSNs from the user's account.
- Implements rate limiting to prevent abuse.
- Presents a confirmation prompt before RSN removal.
- Provides autocomplete suggestions for RSN options.
- Updates the database to ensure successful RSN removal.

**External Dependencies:**
- **Discord.js**: For handling slash commands, creating buttons, and managing interactive components.
- **SQLite**: For managing registered RSN data.


* [modules/commands/removeRsn](#module_modules/commands/removeRsn)
    * [~execute(interaction)](#module_modules/commands/removeRsn..execute) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~autocomplete(interaction)](#module_modules/commands/removeRsn..autocomplete) ⇒ <code>Promise.&lt;void&gt;</code>

<a name="module_modules/commands/removeRsn..execute"></a>

### modules/commands/removeRsn~execute(interaction) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Executes the /remove_rsn Command**

This command allows users to remove up to three RSNs from their account. It performs the following steps:
1. Retrieves RSN options from the command and filters out null values.
2. Applies rate limiting to prevent command abuse.
3. Checks if the user has any registered RSNs.
4. Validates the provided RSNs against the user's registered RSNs.
5. Presents a confirmation prompt with interactive buttons (Confirm/Cancel).
6. Upon confirmation, deletes the specified RSNs from the database.

**Kind**: inner method of [<code>modules/commands/removeRsn</code>](#module_modules/commands/removeRsn)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the command execution is complete.  

| Param | Type | Description |
| --- | --- | --- |
| interaction | <code>Discord.CommandInteraction</code> | The interaction object representing the command execution. |

**Example**  
```js
// Internally invoked when a user runs /remove_rsn with their RSN selections.
await execute(interaction);
```
<a name="module_modules/commands/removeRsn..autocomplete"></a>

### modules/commands/removeRsn~autocomplete(interaction) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Handles Autocomplete for RSN Options**

Provides autocomplete suggestions for RSN options in the `/remove_rsn` command based on the user's input.
It filters the registered RSNs for the user to match the normalized input and returns up to 25 suggestions.

**Kind**: inner method of [<code>modules/commands/removeRsn</code>](#module_modules/commands/removeRsn)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when autocomplete suggestions have been sent.  

| Param | Type | Description |
| --- | --- | --- |
| interaction | <code>Discord.AutocompleteInteraction</code> | The autocomplete interaction object. |

**Example**  
```js
// Invoked internally when a user types in the RSN field.
await autocomplete(interaction);
```
<a name="module_modules/commands/rsn"></a>

## modules/commands/rsn
**Rsn Command** 📝

Defines the `/rsn` slash command for the Varietyz Bot. This command allows users to register their Old School RuneScape Name (RSN).
It handles:
- **Validation:** Ensuring RSNs follow specific format rules.
- **Rate Limiting:** Prevents abuse by limiting repeated usage within a given time window.
- **Easter Eggs:** Provides custom responses for special RSNs.
- **Database Handling:** Manages RSN registrations with conflict resolution.
- **External API Verification:** Validates RSNs against the Wise Old Man API to ensure the RSN exists.

**External Dependencies:**
- **Wise Old Man API** for player profile verification.
- **SQLite** for managing RSN registrations.
- **Discord.js** for command interactions and sending feedback.


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
// This command is registered with Discord's API as `/rsn`
const rsnCommand = module.exports.data;
```
<a name="module_modules/commands/rsn..execute"></a>

### modules/commands/rsn~execute(interaction) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Executes the /rsn Command**

This command allows users to register their RSN. It performs the following steps:
1. Retrieves the RSN input from the command.
2. Checks for special Easter egg RSNs and returns custom responses if applicable.
3. Validates the RSN format.
4. Implements rate limiting to prevent abuse.
5. Fetches player data from the Wise Old Man API to verify the RSN.
6. Checks for conflicts in the database.
7. Registers the RSN in the database if it passes all checks.

**Kind**: inner method of [<code>modules/commands/rsn</code>](#module_modules/commands/rsn)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the command execution is complete.  

| Param | Type | Description |
| --- | --- | --- |
| interaction | <code>Discord.CommandInteraction</code> | The command interaction object. |

**Example**  
```js
// When a user executes /rsn name:"PlayerOne", this function is invoked.
await module.exports.execute(interaction);
```
<a name="module_modules/services/activeMembers"></a>

## modules/services/activeMembers
**Active/Inactive Clan Member Activity Utilities** ⚡

This module provides utility functions for managing active and inactive clan members within the Varietyz Bot.
It interacts with the WOM API to fetch player data, calculates member activity based on progress within specified
intervals, and dynamically updates a Discord voice channel name to reflect the number of active clan members.

**Key Features:**
- **Activity Data Update**: Fetches player data from the WOM API and updates the `active_inactive` table in the database.
- **Activity Calculation**: Determines the number of active players (last 7 days) and inactive players (last 21 days) using Luxon.
- **Voice Channel Update**: Dynamically updates the Discord voice channel name with the current active member count.
- **Retry Mechanism**: Implements exponential backoff for retrying failed data fetch attempts from the WOM API.

**External Dependencies:**
- **Luxon**: For date and time manipulation.
- **Wise Old Man (WOM) API**: To fetch player and group details.
- **Discord.js**: For interacting with the Discord guild and channels.
- **dbUtils**: For database interactions.


* [modules/services/activeMembers](#module_modules/services/activeMembers)
    * [~playerProgress](#module_modules/services/activeMembers..playerProgress) : <code>Object.&lt;string, DateTime&gt;</code>
    * [~updateActivityData([maxRetries], [baseDelay])](#module_modules/services/activeMembers..updateActivityData) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~updateVoiceChannel(client)](#module_modules/services/activeMembers..updateVoiceChannel) ⇒ <code>Promise.&lt;void&gt;</code>

<a name="module_modules/services/activeMembers..playerProgress"></a>

### modules/services/activeMembers~playerProgress : <code>Object.&lt;string, DateTime&gt;</code>
Object to store player progress data.
Keys are player names (RSNs), and values are Luxon DateTime objects representing the last progression date.

**Kind**: inner constant of [<code>modules/services/activeMembers</code>](#module_modules/services/activeMembers)  
<a name="module_modules/services/activeMembers..updateActivityData"></a>

### modules/services/activeMembers~updateActivityData([maxRetries], [baseDelay]) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Fetches and Updates Player Activity Data**

Retrieves player data from the WOM API and updates the `active_inactive` database table with each player's last progress date.
The function implements a retry mechanism with exponential backoff to handle intermittent failures.

**Kind**: inner method of [<code>modules/services/activeMembers</code>](#module_modules/services/activeMembers)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the activity data has been successfully fetched and processed.  
**Throws**:

- <code>Error</code> Throws an error if all retry attempts fail.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [maxRetries] | <code>number</code> | <code>3</code> | The maximum number of retry attempts if fetching data fails. |
| [baseDelay] | <code>number</code> | <code>5000</code> | The base delay (in milliseconds) before retrying. |

**Example**  
```js
// Update activity data with up to 5 retries and a 10-second base delay:
await updateActivityData(5, 10000);
```
<a name="module_modules/services/activeMembers..updateVoiceChannel"></a>

### modules/services/activeMembers~updateVoiceChannel(client) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Updates the Discord Voice Channel Name Based on Active Members**

Retrieves the current active member count (calculated from player progress data),
and updates the name of the designated Discord voice channel to display the number of active clan members.

**Kind**: inner method of [<code>modules/services/activeMembers</code>](#module_modules/services/activeMembers)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the voice channel name has been updated.  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>Discord.Client</code> | The Discord client instance. |

**Example**  
```js
// Update the voice channel with the current active member count:
await updateVoiceChannel(client);
```
<a name="module_modules/services/autoRoles"></a>

## modules/services/autoRoles
**Auto Roles Service Utilities** 🤖

This module contains utility functions for managing automatic role assignments based on player data in the Varietyz Bot.
It fetches and processes data from multiple RuneScape Names (RSNs), merges the data for role assignments,
and assigns or removes Discord roles based on hiscores and achievements (such as boss kills, activities, and skills).

**Key Features:**
- **Role Assignment**: Automatically assigns roles based on boss kills, activity scores, and skill levels from RSN data.
- **Data Merging**: Combines data from multiple RSNs into a single profile for each player, ensuring the highest achievements are retained.
- **Dynamic Role Updates**: Removes outdated roles and assigns new ones based on the player's latest achievements.
- **Discord Notifications**: Sends embed messages in a designated channel to notify players of role assignments and removals.
- **Custom Mappings**: Maps boss and activity names to corresponding Discord role names for easier management.

**External Dependencies:**
- **Wise Old Man (WOM) API**: Retrieves player data and achievements.
- **Discord.js**: For interacting with Discord (assigning roles, sending notifications, managing guild data).
- **dbUtils**: Handles database interactions.
- **normalizeRsn**: Provides utilities for normalizing RSNs.


* [modules/services/autoRoles](#module_modules/services/autoRoles)
    * [~mapBossToRole(bossName)](#module_modules/services/autoRoles..mapBossToRole) ⇒ <code>string</code>
    * [~mapActivityToRole(activityName)](#module_modules/services/autoRoles..mapActivityToRole) ⇒ <code>string</code>
    * [~getUserRSNs(userId)](#module_modules/services/autoRoles..getUserRSNs) ⇒ <code>Promise.&lt;Array.&lt;string&gt;&gt;</code>
    * [~getPlayerDataForRSN(rsn)](#module_modules/services/autoRoles..getPlayerDataForRSN) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [~mergeRsnData(rsns)](#module_modules/services/autoRoles..mergeRsnData) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [~fetchAndProcessMember(guild, userId)](#module_modules/services/autoRoles..fetchAndProcessMember) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~handleHiscoresData(guild, member, rsns, hiscoresData)](#module_modules/services/autoRoles..handleHiscoresData) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~createAchievementRoles(guild, member, hiscoresData, channelUpdate)](#module_modules/services/autoRoles..createAchievementRoles) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~maybeAssignBossRole(guild, member, bossName, kills, playerName, channelUpdate)](#module_modules/services/autoRoles..maybeAssignBossRole) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~maybeAssignActivityRole(guild, member, activityName, score, playerName, channelUpdate)](#module_modules/services/autoRoles..maybeAssignActivityRole) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~createUpdateOsrsRoles(guild, member, hiscoresData, channelUpdate)](#module_modules/services/autoRoles..createUpdateOsrsRoles) ⇒ <code>Promise.&lt;void&gt;</code>

<a name="module_modules/services/autoRoles..mapBossToRole"></a>

### modules/services/autoRoles~mapBossToRole(bossName) ⇒ <code>string</code>
🎯 **Maps a Boss Name to Its Corresponding Discord Role Name**

Returns a custom-mapped role name for a given boss. If no mapping exists, it returns the original boss name.

**Kind**: inner method of [<code>modules/services/autoRoles</code>](#module_modules/services/autoRoles)  
**Returns**: <code>string</code> - The corresponding Discord role name.  

| Param | Type | Description |
| --- | --- | --- |
| bossName | <code>string</code> | The name of the boss. |

**Example**  
```js
const roleName = mapBossToRole("K'ril Tsutsaroth"); // Returns "K'ril Tsutsaroth"
```
<a name="module_modules/services/autoRoles..mapActivityToRole"></a>

### modules/services/autoRoles~mapActivityToRole(activityName) ⇒ <code>string</code>
🎯 **Maps an Activity Name to Its Corresponding Discord Role Name**

Returns a custom-mapped role name for a given activity. If no mapping exists, it returns the original activity name.

**Kind**: inner method of [<code>modules/services/autoRoles</code>](#module_modules/services/autoRoles)  
**Returns**: <code>string</code> - The corresponding Discord role name.  

| Param | Type | Description |
| --- | --- | --- |
| activityName | <code>string</code> | The name of the activity. |

**Example**  
```js
const roleName = mapActivityToRole('Clue Scrolls All'); // Returns "Clue Solver"
```
<a name="module_modules/services/autoRoles..getUserRSNs"></a>

### modules/services/autoRoles~getUserRSNs(userId) ⇒ <code>Promise.&lt;Array.&lt;string&gt;&gt;</code>
🎯 **Retrieves All RSNs for a Discord User**

Queries the database for all RuneScape Names (RSNs) linked to a given Discord user ID.

**Kind**: inner method of [<code>modules/services/autoRoles</code>](#module_modules/services/autoRoles)  
**Returns**: <code>Promise.&lt;Array.&lt;string&gt;&gt;</code> - A promise that resolves to an array of RSNs.  

| Param | Type | Description |
| --- | --- | --- |
| userId | <code>string</code> | The Discord user ID. |

**Example**  
```js
const rsns = await getUserRSNs('123456789012345678');
// Might log: ['PlayerOne', 'PlayerTwo']
```
<a name="module_modules/services/autoRoles..getPlayerDataForRSN"></a>

### modules/services/autoRoles~getPlayerDataForRSN(rsn) ⇒ <code>Promise.&lt;Object&gt;</code>
🎯 **Fetches Player Data for a Given RSN**

Normalizes the provided RSN and queries the database for associated player data.
Returns an object mapping data keys to their values.

**Kind**: inner method of [<code>modules/services/autoRoles</code>](#module_modules/services/autoRoles)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - A promise that resolves to an object with player data.  

| Param | Type | Description |
| --- | --- | --- |
| rsn | <code>string</code> | The RuneScape Name to fetch data for. |

**Example**  
```js
const playerData = await getPlayerDataForRSN('PlayerOne');
logger.info(playerData);
```
<a name="module_modules/services/autoRoles..mergeRsnData"></a>

### modules/services/autoRoles~mergeRsnData(rsns) ⇒ <code>Promise.&lt;Object&gt;</code>
🎯 **Merges Hiscores Data from Multiple RSNs**

Combines hiscores data from an array of RSNs so that the highest values are retained for skills,
boss kills, and activities. This effectively treats multiple RSNs as a single combined account.

**Kind**: inner method of [<code>modules/services/autoRoles</code>](#module_modules/services/autoRoles)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - A promise that resolves to an object containing the merged hiscores data.  

| Param | Type | Description |
| --- | --- | --- |
| rsns | <code>Array.&lt;string&gt;</code> | An array of RSNs to merge data from. |

**Example**  
```js
const mergedData = await mergeRsnData(['PlayerOne', 'PlayerTwo']);
logger.info(mergedData);
```
<a name="module_modules/services/autoRoles..fetchAndProcessMember"></a>

### modules/services/autoRoles~fetchAndProcessMember(guild, userId) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Fetches and Processes Member Data for Auto Role Assignment**

Retrieves RSNs linked to a Discord user, merges hiscores data from those RSNs,
and then assigns or updates Discord roles based on the merged data.

**Kind**: inner method of [<code>modules/services/autoRoles</code>](#module_modules/services/autoRoles)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the member has been processed.  

| Param | Type | Description |
| --- | --- | --- |
| guild | <code>Discord.Guild</code> | The Discord guild (server). |
| userId | <code>string</code> | The Discord user ID. |

**Example**  
```js
await fetchAndProcessMember(guild, '123456789012345678');
```
<a name="module_modules/services/autoRoles..handleHiscoresData"></a>

### modules/services/autoRoles~handleHiscoresData(guild, member, rsns, hiscoresData) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Handles Role Assignments Based on Hiscores Data**

Delegates to specific functions to assign OSRS roles (skill-based) and achievement-based roles.

**Kind**: inner method of [<code>modules/services/autoRoles</code>](#module_modules/services/autoRoles)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when role assignments are complete.  

| Param | Type | Description |
| --- | --- | --- |
| guild | <code>Discord.Guild</code> | The Discord guild. |
| member | <code>Discord.GuildMember</code> | The Discord guild member. |
| rsns | <code>Array.&lt;string&gt;</code> | Array of RSNs linked to the member. |
| hiscoresData | <code>Object</code> | Merged hiscores data. |

**Example**  
```js
await handleHiscoresData(guild, member, ['PlayerOne'], mergedData);
```
<a name="module_modules/services/autoRoles..createAchievementRoles"></a>

### modules/services/autoRoles~createAchievementRoles(guild, member, hiscoresData, channelUpdate) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Assigns Achievement-Based Roles**

Processes hiscores data to assign or update roles based on boss kills and activity scores.

**Kind**: inner method of [<code>modules/services/autoRoles</code>](#module_modules/services/autoRoles)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when all achievement roles are processed.  

| Param | Type | Description |
| --- | --- | --- |
| guild | <code>Discord.Guild</code> | The Discord guild. |
| member | <code>Discord.GuildMember</code> | The Discord guild member. |
| hiscoresData | <code>Object</code> | Merged hiscores data. |
| channelUpdate | <code>Discord.TextChannel</code> | The channel to send role update messages. |

**Example**  
```js
await createAchievementRoles(guild, member, mergedData, channelUpdate);
```
<a name="module_modules/services/autoRoles..maybeAssignBossRole"></a>

### modules/services/autoRoles~maybeAssignBossRole(guild, member, bossName, kills, playerName, channelUpdate) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Assigns a Boss-Related Role if Criteria Are Met**

Checks if the member has not yet been assigned the role corresponding to the given boss.
If the member's boss kill count meets or exceeds the threshold (>= 100), the role is assigned,
and a notification embed is sent to the designated channel.

**Kind**: inner method of [<code>modules/services/autoRoles</code>](#module_modules/services/autoRoles)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the role assignment is complete.  

| Param | Type | Description |
| --- | --- | --- |
| guild | <code>Discord.Guild</code> | The Discord guild. |
| member | <code>Discord.GuildMember</code> | The guild member. |
| bossName | <code>string</code> | The boss name. |
| kills | <code>number</code> | The number of kills achieved. |
| playerName | <code>string</code> | The RSN of the player. |
| channelUpdate | <code>Discord.TextChannel</code> | The channel to send role update messages. |

**Example**  
```js
await maybeAssignBossRole(guild, member, "K'ril Tsutsaroth", 150, 'PlayerOne', channelUpdate);
```
<a name="module_modules/services/autoRoles..maybeAssignActivityRole"></a>

### modules/services/autoRoles~maybeAssignActivityRole(guild, member, activityName, score, playerName, channelUpdate) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Assigns an Activity-Related Role if Criteria Are Met**

Checks if the member's activity score for a specific activity meets the threshold.
If so, the corresponding role is assigned and a notification embed is sent.

**Kind**: inner method of [<code>modules/services/autoRoles</code>](#module_modules/services/autoRoles)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the role assignment is complete.  

| Param | Type | Description |
| --- | --- | --- |
| guild | <code>Discord.Guild</code> | The Discord guild. |
| member | <code>Discord.GuildMember</code> | The guild member. |
| activityName | <code>string</code> | The name of the activity. |
| score | <code>number</code> | The achieved score. |
| playerName | <code>string</code> | The RSN of the player. |
| channelUpdate | <code>Discord.TextChannel</code> | The channel to send role update messages. |

**Example**  
```js
await maybeAssignActivityRole(guild, member, 'Clue Scrolls All', 200, 'PlayerOne', channelUpdate);
```
<a name="module_modules/services/autoRoles..createUpdateOsrsRoles"></a>

### modules/services/autoRoles~createUpdateOsrsRoles(guild, member, hiscoresData, channelUpdate) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Assigns or Updates OSRS Skill-Based Roles**

Evaluates hiscores data for each skill to assign "99" roles when applicable,
and removes any "99" roles that the member should no longer have.

**Kind**: inner method of [<code>modules/services/autoRoles</code>](#module_modules/services/autoRoles)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when all OSRS roles have been processed.  

| Param | Type | Description |
| --- | --- | --- |
| guild | <code>Discord.Guild</code> | The Discord guild. |
| member | <code>Discord.GuildMember</code> | The guild member. |
| hiscoresData | <code>Object</code> | Merged hiscores data. |
| channelUpdate | <code>Discord.TextChannel</code> | The channel to send role update messages. |

**Example**  
```js
await createUpdateOsrsRoles(guild, member, mergedData, channelUpdate);
```
<a name="module_competitionService/updateAllTimeLeaderboard"></a>

## competitionService/updateAllTimeLeaderboard
**All-Time Leaderboard Updater** 🏆This module exports a function that updates the all-time leaderboard for SOTW & BOTW competitions.It fetches top players and gain data from the database, formats the leaderboard with clickableplayer links, and then either updates an existing pinned message or creates a new pinned messagein the designated leaderboard channel.The leaderboard displays:- Top 10 SOTW (XP Gained)- Top 10 BOTW (Boss Kills)- The Biggest Overall Gainer (combined XP/KC)- The Highest Single Competition Gain


* [competitionService/updateAllTimeLeaderboard](#module_competitionService/updateAllTimeLeaderboard)
    * [~updateAllTimeLeaderboard(client)](#module_competitionService/updateAllTimeLeaderboard..updateAllTimeLeaderboard) ⇒ <code>Promise.&lt;void&gt;</code>
        * [~formatLeaderboard(data, metricEmoji)](#module_competitionService/updateAllTimeLeaderboard..updateAllTimeLeaderboard..formatLeaderboard) ⇒ <code>string</code>

<a name="module_competitionService/updateAllTimeLeaderboard..updateAllTimeLeaderboard"></a>

### competitionService/updateAllTimeLeaderboard~updateAllTimeLeaderboard(client) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Updates the All-Time Leaderboard**Fetches all-time competition data from the database, formats it with clickable player links,and sends or updates a pinned embed in the designated leaderboard channel.

**Kind**: inner method of [<code>competitionService/updateAllTimeLeaderboard</code>](#module_competitionService/updateAllTimeLeaderboard)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the leaderboard has been successfully updated.  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>Discord.Client</code> | The Discord client instance. |

**Example**  
```js
// Update the all-time leaderboard:await updateAllTimeLeaderboard(client);
```
<a name="module_competitionService/updateAllTimeLeaderboard..updateAllTimeLeaderboard..formatLeaderboard"></a>

#### updateAllTimeLeaderboard~formatLeaderboard(data, metricEmoji) ⇒ <code>string</code>
Formats leaderboard entries with clickable player links.

**Kind**: inner method of [<code>updateAllTimeLeaderboard</code>](#module_competitionService/updateAllTimeLeaderboard..updateAllTimeLeaderboard)  
**Returns**: <code>string</code> - A formatted string for the leaderboard.  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Array.&lt;Object&gt;</code> | Array of player data objects. |
| metricEmoji | <code>string</code> | Emoji representing the metric. |

<a name="module_CompetitionService"></a>

## CompetitionService
**CompetitionService.js** handles the creation, management, and conclusion of competitions.It orchestrates the lifecycle of competitions including processing ended competitions,handling votes, creating new competitions, and scheduling rotations. 🚀**Key Exports:**- `CompetitionService`: Main class that encapsulates all competition-related functionalities.


* [CompetitionService](#module_CompetitionService)
    * [~CompetitionService](#module_CompetitionService..CompetitionService)
        * [new CompetitionService(client)](#new_module_CompetitionService..CompetitionService_new)
        * [.scheduledJobs](#module_CompetitionService..CompetitionService+scheduledJobs) : <code>Map.&lt;string, any&gt;</code>
        * [.initialize()](#module_CompetitionService..CompetitionService+initialize) ⇒ <code>Promise.&lt;void&gt;</code>
        * [.startNextCompetitionCycle()](#module_CompetitionService..CompetitionService+startNextCompetitionCycle) ⇒ <code>Promise.&lt;void&gt;</code>
        * [.checkIfVotesExist(competitionId)](#module_CompetitionService..CompetitionService+checkIfVotesExist) ⇒ <code>Promise.&lt;boolean&gt;</code>
        * [.createNewCompetitions(type, lastCompetition, votesExist, pauseForRotationUpdate)](#module_CompetitionService..CompetitionService+createNewCompetitions) ⇒ <code>Promise.&lt;boolean&gt;</code>
        * [.checkOngoingCompetitions(type, now)](#module_CompetitionService..CompetitionService+checkOngoingCompetitions) ⇒ <code>Promise.&lt;(Date\|null)&gt;</code>
        * [.processEndedCompetitions(type)](#module_CompetitionService..CompetitionService+processEndedCompetitions) ⇒ <code>Promise.&lt;void&gt;</code>
        * [.processLastCompetition(type, lastCompetition)](#module_CompetitionService..CompetitionService+processLastCompetition) ⇒ <code>Promise.&lt;void&gt;</code>
        * [.getNearestFutureCompetition(type, overallNearestEndTime)](#module_CompetitionService..CompetitionService+getNearestFutureCompetition) ⇒ <code>Promise.&lt;(Date\|null)&gt;</code>
        * [.updateNearestEndTime(currentNearest, newEndDate)](#module_CompetitionService..CompetitionService+updateNearestEndTime) ⇒ <code>Date</code>
        * [.finalizeRotation(overallNearestEndTime, pauseForRotationUpdate)](#module_CompetitionService..CompetitionService+finalizeRotation) ⇒ <code>Promise.&lt;void&gt;</code>
        * [.updateCompetitionData()](#module_CompetitionService..CompetitionService+updateCompetitionData) ⇒ <code>Promise.&lt;void&gt;</code>
        * [.createDefaultCompetitions(type)](#module_CompetitionService..CompetitionService+createDefaultCompetitions) ⇒ <code>Promise.&lt;void&gt;</code>
        * [.createCompetitionFromQueue(competition)](#module_CompetitionService..CompetitionService+createCompetitionFromQueue) ⇒ <code>Promise.&lt;void&gt;</code>
        * [.scheduleRotationsOnStartup()](#module_CompetitionService..CompetitionService+scheduleRotationsOnStartup) ⇒ <code>Promise.&lt;void&gt;</code>
        * [.createCompetitionFromVote(competition)](#module_CompetitionService..CompetitionService+createCompetitionFromVote) ⇒ <code>Promise.&lt;void&gt;</code>
        * [.getRandomMetric(type)](#module_CompetitionService..CompetitionService+getRandomMetric) ⇒ <code>Promise.&lt;string&gt;</code>
        * [.handleVote(interaction)](#module_CompetitionService..CompetitionService+handleVote) ⇒ <code>Promise.&lt;void&gt;</code>

<a name="module_CompetitionService..CompetitionService"></a>

### CompetitionService~CompetitionService
🚀 **CompetitionService**This class is responsible for handling the lifecycle of competitions, including:- Initializing competition rotations on startup.- Processing ended competitions, updating leaderboards, and handling vote outcomes.- Creating new competitions from queues, votes, or as defaults.- Scheduling the next competition cycle.

**Kind**: inner class of [<code>CompetitionService</code>](#module_CompetitionService)  

* [~CompetitionService](#module_CompetitionService..CompetitionService)
    * [new CompetitionService(client)](#new_module_CompetitionService..CompetitionService_new)
    * [.scheduledJobs](#module_CompetitionService..CompetitionService+scheduledJobs) : <code>Map.&lt;string, any&gt;</code>
    * [.initialize()](#module_CompetitionService..CompetitionService+initialize) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.startNextCompetitionCycle()](#module_CompetitionService..CompetitionService+startNextCompetitionCycle) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.checkIfVotesExist(competitionId)](#module_CompetitionService..CompetitionService+checkIfVotesExist) ⇒ <code>Promise.&lt;boolean&gt;</code>
    * [.createNewCompetitions(type, lastCompetition, votesExist, pauseForRotationUpdate)](#module_CompetitionService..CompetitionService+createNewCompetitions) ⇒ <code>Promise.&lt;boolean&gt;</code>
    * [.checkOngoingCompetitions(type, now)](#module_CompetitionService..CompetitionService+checkOngoingCompetitions) ⇒ <code>Promise.&lt;(Date\|null)&gt;</code>
    * [.processEndedCompetitions(type)](#module_CompetitionService..CompetitionService+processEndedCompetitions) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.processLastCompetition(type, lastCompetition)](#module_CompetitionService..CompetitionService+processLastCompetition) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.getNearestFutureCompetition(type, overallNearestEndTime)](#module_CompetitionService..CompetitionService+getNearestFutureCompetition) ⇒ <code>Promise.&lt;(Date\|null)&gt;</code>
    * [.updateNearestEndTime(currentNearest, newEndDate)](#module_CompetitionService..CompetitionService+updateNearestEndTime) ⇒ <code>Date</code>
    * [.finalizeRotation(overallNearestEndTime, pauseForRotationUpdate)](#module_CompetitionService..CompetitionService+finalizeRotation) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.updateCompetitionData()](#module_CompetitionService..CompetitionService+updateCompetitionData) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.createDefaultCompetitions(type)](#module_CompetitionService..CompetitionService+createDefaultCompetitions) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.createCompetitionFromQueue(competition)](#module_CompetitionService..CompetitionService+createCompetitionFromQueue) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.scheduleRotationsOnStartup()](#module_CompetitionService..CompetitionService+scheduleRotationsOnStartup) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.createCompetitionFromVote(competition)](#module_CompetitionService..CompetitionService+createCompetitionFromVote) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.getRandomMetric(type)](#module_CompetitionService..CompetitionService+getRandomMetric) ⇒ <code>Promise.&lt;string&gt;</code>
    * [.handleVote(interaction)](#module_CompetitionService..CompetitionService+handleVote) ⇒ <code>Promise.&lt;void&gt;</code>

<a name="new_module_CompetitionService..CompetitionService_new"></a>

#### new CompetitionService(client)
🛠️ **Constructor: Initializes a new CompetitionService instance.**


| Param | Type | Description |
| --- | --- | --- |
| client | <code>Discord.Client</code> | The Discord client instance used for fetching channels and messages. |

<a name="module_CompetitionService..CompetitionService+scheduledJobs"></a>

#### competitionService.scheduledJobs : <code>Map.&lt;string, any&gt;</code>
Map of scheduled jobs for competition rotations.

**Kind**: instance property of [<code>CompetitionService</code>](#module_CompetitionService..CompetitionService)  
<a name="module_CompetitionService..CompetitionService+initialize"></a>

#### competitionService.initialize() ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Initializes the Competition Service.**Schedules competition rotations on bot startup.

**Kind**: instance method of [<code>CompetitionService</code>](#module_CompetitionService..CompetitionService)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when initialization is complete.  
<a name="module_CompetitionService..CompetitionService+startNextCompetitionCycle"></a>

#### competitionService.startNextCompetitionCycle() ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Starts the Next Competition Cycle.**Executes the entire cycle for processing competitions:1. Processes completed competitions.2. Checks for ongoing competitions.3. Processes votes for the last competition if available.4. Creates new competitions (queued or default).5. Determines and schedules the next rotation.

**Kind**: instance method of [<code>CompetitionService</code>](#module_CompetitionService..CompetitionService)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the cycle is complete.  
<a name="module_CompetitionService..CompetitionService+checkIfVotesExist"></a>

#### competitionService.checkIfVotesExist(competitionId) ⇒ <code>Promise.&lt;boolean&gt;</code>
🎯 **Checks if Votes Exist for a Competition.**Queries the database to determine if any votes have been recorded for the specified competition.

**Kind**: instance method of [<code>CompetitionService</code>](#module_CompetitionService..CompetitionService)  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - `true` if votes exist, otherwise `false`.  

| Param | Type | Description |
| --- | --- | --- |
| competitionId | <code>number</code> \| <code>string</code> | The unique identifier for the competition. |

<a name="module_CompetitionService..CompetitionService+createNewCompetitions"></a>

#### competitionService.createNewCompetitions(type, lastCompetition, votesExist, pauseForRotationUpdate) ⇒ <code>Promise.&lt;boolean&gt;</code>
🎯 **Creates New Competitions.**Checks for queued competitions and creates a new competition accordingly. If no votes and no queue exist,it creates a default competition.

**Kind**: instance method of [<code>CompetitionService</code>](#module_CompetitionService..CompetitionService)  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - Updated `pauseForRotationUpdate` flag.  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>string</code> | Competition type (`SOTW` or `BOTW`). |
| lastCompetition | <code>Object</code> | The most recent competition record. *TODO:* Clarify structure. |
| votesExist | <code>boolean</code> | Indicates if votes exist for the last competition. |
| pauseForRotationUpdate | <code>boolean</code> | Flag to determine if rotation update should be paused. |

<a name="module_CompetitionService..CompetitionService+checkOngoingCompetitions"></a>

#### competitionService.checkOngoingCompetitions(type, now) ⇒ <code>Promise.&lt;(Date\|null)&gt;</code>
🎯 **Checks for Ongoing Competitions.**Determines if there are any active competitions of the given type that have not yet ended.

**Kind**: instance method of [<code>CompetitionService</code>](#module_CompetitionService..CompetitionService)  
**Returns**: <code>Promise.&lt;(Date\|null)&gt;</code> - The end date of the nearest active competition, or `null` if none exist.  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>string</code> | Competition type (`SOTW` or `BOTW`). |
| now | <code>string</code> | Current timestamp in ISO format. |

<a name="module_CompetitionService..CompetitionService+processEndedCompetitions"></a>

#### competitionService.processEndedCompetitions(type) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Processes Ended Competitions.**For competitions that have ended and not yet had their final leaderboard sent, this method:- Records the competition winner.- Updates both final and all-time leaderboards.- Marks the competition as processed.

**Kind**: instance method of [<code>CompetitionService</code>](#module_CompetitionService..CompetitionService)  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>string</code> | Competition type (`SOTW` or `BOTW`). |

<a name="module_CompetitionService..CompetitionService+processLastCompetition"></a>

#### competitionService.processLastCompetition(type, lastCompetition) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Processes the Last Competition Based on Vote Outcome.**Fetches the appropriate Discord channel, purges its contents, and creates a new competition based on the vote results.

**Kind**: instance method of [<code>CompetitionService</code>](#module_CompetitionService..CompetitionService)  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>string</code> | Competition type (`SOTW` or `BOTW`). |
| lastCompetition | <code>Object</code> | The most recent competition record from which votes are processed. |

<a name="module_CompetitionService..CompetitionService+getNearestFutureCompetition"></a>

#### competitionService.getNearestFutureCompetition(type, overallNearestEndTime) ⇒ <code>Promise.&lt;(Date\|null)&gt;</code>
🎯 **Determines the Nearest Future Competition End Time.**Checks active competitions for the given type and updates the overall nearest end time.

**Kind**: instance method of [<code>CompetitionService</code>](#module_CompetitionService..CompetitionService)  
**Returns**: <code>Promise.&lt;(Date\|null)&gt;</code> - The updated overall nearest end time.  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>string</code> | Competition type (`SOTW` or `BOTW`). |
| overallNearestEndTime | <code>Date</code> \| <code>null</code> | The current overall nearest end time. |

<a name="module_CompetitionService..CompetitionService+updateNearestEndTime"></a>

#### competitionService.updateNearestEndTime(currentNearest, newEndDate) ⇒ <code>Date</code>
🎯 **Updates the Nearest End Time.**Compares the current nearest end time with a new candidate and returns the earlier of the two.

**Kind**: instance method of [<code>CompetitionService</code>](#module_CompetitionService..CompetitionService)  
**Returns**: <code>Date</code> - The updated nearest end time.  

| Param | Type | Description |
| --- | --- | --- |
| currentNearest | <code>Date</code> \| <code>null</code> | The current nearest end time. |
| newEndDate | <code>Date</code> | The new candidate end time. |

<a name="module_CompetitionService..CompetitionService+finalizeRotation"></a>

#### competitionService.finalizeRotation(overallNearestEndTime, pauseForRotationUpdate) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Finalizes the Rotation Setup.**Completes the competition cycle by:- Optionally pausing the rotation update.- Updating competition-related data (leaderboards, embeds).- Scheduling the next rotation based on the nearest end time.- Migrating ended competitions.

**Kind**: instance method of [<code>CompetitionService</code>](#module_CompetitionService..CompetitionService)  

| Param | Type | Description |
| --- | --- | --- |
| overallNearestEndTime | <code>Date</code> \| <code>null</code> | The determined next rotation time. |
| pauseForRotationUpdate | <code>boolean</code> | Whether to pause before updating competition data. |

<a name="module_CompetitionService..CompetitionService+updateCompetitionData"></a>

#### competitionService.updateCompetitionData() ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Updates Competition Data.**Refreshes the active competition embeds for both `SOTW` and `BOTW` competitions.

**Kind**: instance method of [<code>CompetitionService</code>](#module_CompetitionService..CompetitionService)  
<a name="module_CompetitionService..CompetitionService+createDefaultCompetitions"></a>

#### competitionService.createDefaultCompetitions(type) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Creates Default Competitions.**When no queued competitions exist, this method creates a default competition for the given typeby randomly selecting a metric and scheduling the competition based on the configured rotation period.

**Kind**: instance method of [<code>CompetitionService</code>](#module_CompetitionService..CompetitionService)  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>string</code> | Competition type (`SOTW` or `BOTW`). |

<a name="module_CompetitionService..CompetitionService+createCompetitionFromQueue"></a>

#### competitionService.createCompetitionFromQueue(competition) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Creates a Competition from Queue Data.**Uses the provided queued competition data to schedule a new competition.

**Kind**: instance method of [<code>CompetitionService</code>](#module_CompetitionService..CompetitionService)  

| Param | Type | Description |
| --- | --- | --- |
| competition | <code>Object</code> | Competition data retrieved from the queue. |

<a name="module_CompetitionService..CompetitionService+scheduleRotationsOnStartup"></a>

#### competitionService.scheduleRotationsOnStartup() ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Schedules Rotations on Bot Startup.**On startup, this method schedules future competition rotations based on active competitions.

**Kind**: instance method of [<code>CompetitionService</code>](#module_CompetitionService..CompetitionService)  
<a name="module_CompetitionService..CompetitionService+createCompetitionFromVote"></a>

#### competitionService.createCompetitionFromVote(competition) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Creates a Competition Based on Voting Results.**This method creates a new competition based on the results of a completed competition.If no winning metric is determined from votes, it falls back to queued competitions or selects a random metric.

**Kind**: instance method of [<code>CompetitionService</code>](#module_CompetitionService..CompetitionService)  

| Param | Type | Description |
| --- | --- | --- |
| competition | <code>Object</code> | The completed competition whose votes are being processed. |

<a name="module_CompetitionService..CompetitionService+getRandomMetric"></a>

#### competitionService.getRandomMetric(type) ⇒ <code>Promise.&lt;string&gt;</code>
🎯 **Returns a Random Metric.**Retrieves a random metric (skill or boss name) ensuring that it does not match the metricused in the most recent competition.

**Kind**: instance method of [<code>CompetitionService</code>](#module_CompetitionService..CompetitionService)  
**Returns**: <code>Promise.&lt;string&gt;</code> - A promise that resolves to the selected metric name.  
**Throws**:

- <code>Error</code> If no available metrics are found.


| Param | Type | Description |
| --- | --- | --- |
| type | <code>string</code> | The type of metric to retrieve (`Skill` or `Boss`). |

<a name="module_CompetitionService..CompetitionService+handleVote"></a>

#### competitionService.handleVote(interaction) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Handles a User Vote Interaction.**Processes a user's vote by verifying eligibility, recording the vote, and updating the poll embed.Responds to the interaction with appropriate success or error messages.

**Kind**: instance method of [<code>CompetitionService</code>](#module_CompetitionService..CompetitionService)  

| Param | Type | Description |
| --- | --- | --- |
| interaction | <code>Object</code> | The Discord interaction object containing user vote data. |

<a name="module_competitionService/competitionValidator"></a>

## competitionService/competitionValidator
**Competition Validator** 🛠️This module contains functions to validate and update competition databy cross-referencing with the WOM API. It helps ensure that the databaseonly contains valid competitions by removing those that no longer exist orupdating details that have changed on the WOM platform.**Key Features:**- Checks each competition entry in the database against the WOM API.- Removes competitions (and associated votes) that are not found on WOM.- Updates competition details (title, metric, start/end times) if discrepancies are found.

<a name="module_competitionService/competitionValidator..removeInvalidCompetitions"></a>

### competitionService/competitionValidator~removeInvalidCompetitions(db)
🎯 **Removes Invalid Competitions**Iterates over all competitions in the database and validates each against the WOM API.If a competition is not found (or returns null), it deletes the competition and itsassociated votes from the database. Additionally, if there are discrepancies in thecompetition details (e.g., title, metric, start/end times), the function updates thedatabase with the latest data from WOM.

**Kind**: inner method of [<code>competitionService/competitionValidator</code>](#module_competitionService/competitionValidator)  

| Param | Type | Description |
| --- | --- | --- |
| db | <code>Object</code> | The database utility object used for querying and updating competitions. |

**Example**  
```js
// Remove competitions that are no longer valid:await removeInvalidCompetitions(db);
```
<a name="module_competitionService/helpers"></a>

## competitionService/helpers
**Helper Functions for Competition Service** 🛠️This module provides utility functions to assist with data manipulation tasksin the competition service, such as splitting an array into smaller chunks.

<a name="module_competitionService/helpers..chunkArray"></a>

### competitionService/helpers~chunkArray(array, [size]) ⇒ <code>Array.&lt;Array&gt;</code>
🎯 **Divides an Array into Chunks**Splits the provided array into smaller arrays (chunks) of a specified maximum size.This is useful for batching data when processing large datasets or sending messageswith rate limits.

**Kind**: inner method of [<code>competitionService/helpers</code>](#module_competitionService/helpers)  
**Returns**: <code>Array.&lt;Array&gt;</code> - An array of chunked arrays.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| array | <code>Array</code> |  | The array to be divided into chunks. |
| [size] | <code>number</code> | <code>25</code> | The maximum number of elements per chunk. |

**Example**  
```js
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];const chunks = chunkArray(numbers, 3);// Result: [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]]
```
<a name="module_modules/services/memberChannel"></a>

## modules/services/memberChannel
**Member Channel Service Utilities** 🛠️

This module provides utility functions for managing clan members and updating their data in the Varietyz Bot.
It interacts with the WOM API to fetch member information, manages role assignments in Discord based on ranks,
updates the SQLite database (`clan_members` table) with the latest member data, and refreshes the designated Discord
channels with up-to-date clan member information.

**Key Features:**
- **Role Assignment**: Dynamically assigns or removes roles based on player rank.
- **Clan Member Updates**: Fetches and processes player data, updating roles and channel messages.
- **Database Management**: Ensures the `clan_members` table reflects the latest clan member data.
- **Discord Notifications**: Notifies a designated channel about rank updates and member changes.
- **Data Purging**: Clears outdated channel messages before posting new information.

**External Dependencies:**
- **Wise Old Man (WOM) API**: Fetches player data.
- **Discord.js**: Manages interactions with Discord (sending messages, role management).
- **dbUtils**: Handles database operations.
- **rankUtils**: Provides utilities for rank formatting and color/emoji retrieval.


* [modules/services/memberChannel](#module_modules/services/memberChannel)
    * [~handleMemberRoles(member, roleName, guild, player, rank)](#module_modules/services/memberChannel..handleMemberRoles) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~updateData(client, [options])](#module_modules/services/memberChannel..updateData) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~updateDatabase(newData)](#module_modules/services/memberChannel..updateDatabase) ⇒ <code>Promise.&lt;boolean&gt;</code>
    * [~chunkArray(array, chunkSize)](#module_modules/services/memberChannel..chunkArray) ⇒ <code>Array.&lt;Array&gt;</code>
    * [~sendEmbedsInBatches(channel, embeds)](#module_modules/services/memberChannel..sendEmbedsInBatches) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~updateClanChannel(client, cachedData)](#module_modules/services/memberChannel..updateClanChannel) ⇒ <code>Promise.&lt;void&gt;</code>

<a name="module_modules/services/memberChannel..handleMemberRoles"></a>

### modules/services/memberChannel~handleMemberRoles(member, roleName, guild, player, rank) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Handles Role Assignment for a Guild Member**

Assigns the appropriate role to the given Discord guild member based on their rank. It also removes any lower-ranked roles
to ensure that the member has only the most relevant role.

**Kind**: inner method of [<code>modules/services/memberChannel</code>](#module_modules/services/memberChannel)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when role updates are complete.  

| Param | Type | Description |
| --- | --- | --- |
| member | <code>Discord.GuildMember</code> | The guild member whose roles are to be updated. |
| roleName | <code>string</code> | The name of the role to assign (e.g., `Iron`). |
| guild | <code>Discord.Guild</code> | The Discord guild where the member resides. |
| player | <code>string</code> | The player's RuneScape name (RSN). |
| rank | <code>string</code> | The current rank of the player. |

**Example**  
```js
// Update roles for a member:
await handleMemberRoles(member, 'Iron', guild, 'PlayerOne', 'Iron');
```
<a name="module_modules/services/memberChannel..updateData"></a>

### modules/services/memberChannel~updateData(client, [options]) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Updates Clan Member Data**

Fetches the latest clan member data from the WOM API, processes the data to update roles in the Discord guild,
and refreshes the clan channel with updated information. Optionally forces a channel update.

**Kind**: inner method of [<code>modules/services/memberChannel</code>](#module_modules/services/memberChannel)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the update process is complete.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| client | <code>Discord.Client</code> |  | The Discord client instance. |
| [options] | <code>Object</code> |  | Optional configuration. |
| [options.forceChannelUpdate] | <code>boolean</code> | <code>false</code> | If `true`, forces the clan channel to update even if no changes are detected. |

**Example**  
```js
// Update data and force a channel update:
await updateData(client, { forceChannelUpdate: true });
```
<a name="module_modules/services/memberChannel..updateDatabase"></a>

### modules/services/memberChannel~updateDatabase(newData) ⇒ <code>Promise.&lt;boolean&gt;</code>
🎯 **Updates the Clan Members Database**

Compares new clan member data with the current data in the `clan_members` table.
If differences are detected, it updates the table accordingly.

**Kind**: inner method of [<code>modules/services/memberChannel</code>](#module_modules/services/memberChannel)  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - Returns `true` if changes were detected and the database was updated; otherwise `false`.  

| Param | Type | Description |
| --- | --- | --- |
| newData | <code>Array.&lt;Object&gt;</code> | Array of objects each containing `player` (name) and `rank` properties. |

**Example**  
```js
const changes = await updateDatabase(newData);
if (changes) {
  logger.info('Database updated.');
}
```
<a name="module_modules/services/memberChannel..chunkArray"></a>

### modules/services/memberChannel~chunkArray(array, chunkSize) ⇒ <code>Array.&lt;Array&gt;</code>
🎯 **Splits an Array into Chunks**

Divides a given array into smaller arrays (chunks) of a specified maximum size.

**Kind**: inner method of [<code>modules/services/memberChannel</code>](#module_modules/services/memberChannel)  
**Returns**: <code>Array.&lt;Array&gt;</code> - An array containing the chunked arrays.  

| Param | Type | Description |
| --- | --- | --- |
| array | <code>Array</code> | The array to split. |
| chunkSize | <code>number</code> | The maximum number of elements per chunk. |

**Example**  
```js
const chunks = chunkArray([1, 2, 3, 4, 5], 2);
// Result: [[1, 2], [3, 4], [5]]
```
<a name="module_modules/services/memberChannel..sendEmbedsInBatches"></a>

### modules/services/memberChannel~sendEmbedsInBatches(channel, embeds) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Sends Embeds in Batches to a Discord Channel**

Discord allows a maximum of 10 embeds per message. This function splits the embeds into batches
and sends each batch to the specified channel sequentially to avoid rate limits.

**Kind**: inner method of [<code>modules/services/memberChannel</code>](#module_modules/services/memberChannel)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when all embed batches have been sent.  

| Param | Type | Description |
| --- | --- | --- |
| channel | <code>Discord.TextBasedChannel</code> | The channel where embeds should be sent. |
| embeds | <code>Array.&lt;EmbedBuilder&gt;</code> | An array of embed objects to be sent. |

**Example**  
```js
await sendEmbedsInBatches(channel, embeds);
```
<a name="module_modules/services/memberChannel..updateClanChannel"></a>

### modules/services/memberChannel~updateClanChannel(client, cachedData) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Updates the Discord Clan Channel**

Purges existing messages from the designated clan channel and sends updated clan member data
as formatted embeds.

**Kind**: inner method of [<code>modules/services/memberChannel</code>](#module_modules/services/memberChannel)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the clan channel has been successfully updated.  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>Discord.Client</code> | The Discord client instance. |
| cachedData | <code>Array.&lt;Object&gt;</code> | Array of objects containing player data including `player`, `rank`, `experience`, and `lastProgressed` values. |

**Example**  
```js
await updateClanChannel(client, cachedData);
```
<a name="module_modules/services/nameChanges"></a>

## modules/services/nameChanges
**Name Change Processor Utilities** 🔄

This module provides utility functions for processing player name changes in the Varietyz Bot.
It interacts with the Wise Old Man (WOM) API to fetch recent name changes, updates the database
with the new RSNs, and handles conflict resolution between users. It also manages sending
notifications to Discord channels for both successful updates and conflict resolutions.

**Key Features:**
- **Name Change Fetching**: Retrieves recent name changes from the WOM API.
- **Database Management**: Saves name change records to the `recent_name_changes` table and updates the `registered_rsn` table.
- **Conflict Resolution**: Handles cases where a new RSN already exists for another user and resolves conflicts.
- **Discord Notifications**: Sends messages to a specified channel notifying users of successful name updates or conflict resolutions.
- **Rate-Limiting and Dependencies**: Ensures rate-limited API requests and processes name changes in the correct order.

**External Dependencies:**
- **Wise Old Man (WOM) API**: Fetches player name changes.
- **Discord.js**: Sends notifications and updates to Discord channels.
- **dbUtils**: Manages database operations for name change records.


* [modules/services/nameChanges](#module_modules/services/nameChanges)
    * [~fetchNameChanges()](#module_modules/services/nameChanges..fetchNameChanges) ⇒ <code>Promise.&lt;Array.&lt;NameChange&gt;&gt;</code>
    * [~saveToDatabase(nameChanges)](#module_modules/services/nameChanges..saveToDatabase) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~updateRegisteredRSN(oldName, newName, channelManager)](#module_modules/services/nameChanges..updateRegisteredRSN) ⇒ <code>Promise.&lt;boolean&gt;</code>
    * [~processNameChanges(client)](#module_modules/services/nameChanges..processNameChanges) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~NameChange](#module_modules/services/nameChanges..NameChange) : <code>Object</code>

<a name="module_modules/services/nameChanges..fetchNameChanges"></a>

### modules/services/nameChanges~fetchNameChanges() ⇒ <code>Promise.&lt;Array.&lt;NameChange&gt;&gt;</code>
🎯 **Fetches Recent Name Changes from the WOM API**

Retrieves recent name changes from the WOM API for a specific group.

**Kind**: inner method of [<code>modules/services/nameChanges</code>](#module_modules/services/nameChanges)  
**Returns**: <code>Promise.&lt;Array.&lt;NameChange&gt;&gt;</code> - A promise that resolves to an array of name change records.  
**Example**  
```js
const nameChanges = await fetchNameChanges();
logger.info(nameChanges);
```
<a name="module_modules/services/nameChanges..saveToDatabase"></a>

### modules/services/nameChanges~saveToDatabase(nameChanges) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Saves Name Changes to the Database**

Clears the `recent_name_changes` table and inserts new name change records.

**Kind**: inner method of [<code>modules/services/nameChanges</code>](#module_modules/services/nameChanges)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the operation is complete.  

| Param | Type | Description |
| --- | --- | --- |
| nameChanges | <code>Array.&lt;NameChange&gt;</code> | Array of name change objects to be saved. |

**Example**  
```js
await saveToDatabase(nameChanges);
```
<a name="module_modules/services/nameChanges..updateRegisteredRSN"></a>

### modules/services/nameChanges~updateRegisteredRSN(oldName, newName, channelManager) ⇒ <code>Promise.&lt;boolean&gt;</code>
🎯 **Updates the Registered RSN Based on Name Changes**

Updates the `registered_rsn` table with new RSN mappings based on a name change.
Handles conflicts where the new RSN already exists for the same or a different user,
and sends Discord notifications for successful updates and conflict resolutions.

**Kind**: inner method of [<code>modules/services/nameChanges</code>](#module_modules/services/nameChanges)  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - Resolves to true if the RSN was updated, false otherwise.  

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
<a name="module_modules/services/nameChanges..processNameChanges"></a>

### modules/services/nameChanges~processNameChanges(client) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Processes Recent Name Changes**

Retrieves recent name changes from the WOM API, saves them to the database, and updates the registered RSNs accordingly.
Handles dependency ordering and conflict resolution based on the timestamp of changes.

**Kind**: inner method of [<code>modules/services/nameChanges</code>](#module_modules/services/nameChanges)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when all name changes have been processed.  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>Discord.Client</code> | The Discord client instance. |

**Example**  
```js
await processNameChanges(client);
```
<a name="module_modules/services/nameChanges..NameChange"></a>

### modules/services/nameChanges~NameChange : <code>Object</code>
Represents a name change record.

**Kind**: inner typedef of [<code>modules/services/nameChanges</code>](#module_modules/services/nameChanges)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| oldName | <code>string</code> | The original RuneScape Name (RSN) before the change. |
| newName | <code>string</code> | The new RSN after the change. |
| resolvedAt | <code>number</code> | The timestamp when the name change was resolved. |

<a name="module_modules/services/playerDataExtractor"></a>

## modules/services/playerDataExtractor
**Player Data Extractor Utilities** 📊

This module facilitates fetching, formatting, saving, and maintaining player data in the Varietyz Bot.
It integrates with the Wise Old Man (WOM) API to fetch player data and uses an SQLite database for storage.
Key operations include:
- **Data Formatting**: Flattening and renaming nested player data into a format suitable for database insertion.
- **Database Management**: Managing the `player_data` table to ensure player data is saved and updated correctly.
- **API Integration**: Fetching player data from the WOM API.
- **Player Synchronization**: Synchronizing player data with registered RSNs and removing stale records.
- **Rate-Limiting**: Handling frequent API requests efficiently.

**External Dependencies:**
- **Wise Old Man (WOM) API**: For fetching player data.
- **luxon**: For date manipulation and calculating time intervals.
- **dbUtils**: For interacting with the SQLite database.


* [modules/services/playerDataExtractor](#module_modules/services/playerDataExtractor)
    * [~formatDataForSql(data)](#module_modules/services/playerDataExtractor..formatDataForSql) ⇒ <code>Object</code>
        * [~flattenDict(d, [parentKey], [sep])](#module_modules/services/playerDataExtractor..formatDataForSql..flattenDict) ⇒ <code>Object</code>
    * [~ensurePlayerDataTable()](#module_modules/services/playerDataExtractor..ensurePlayerDataTable) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~savePlayerDataToDb(playerName, rawData)](#module_modules/services/playerDataExtractor..savePlayerDataToDb) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~loadRegisteredRsnData()](#module_modules/services/playerDataExtractor..loadRegisteredRsnData) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [~fetchAndSaveRegisteredPlayerData()](#module_modules/services/playerDataExtractor..fetchAndSaveRegisteredPlayerData) ⇒ <code>Promise.&lt;{data: Array.&lt;Object&gt;, fetchFailed: boolean}&gt;</code>
    * [~removeNonMatchingPlayers(currentClanUsers)](#module_modules/services/playerDataExtractor..removeNonMatchingPlayers) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~fetchAndUpdatePlayerData()](#module_modules/services/playerDataExtractor..fetchAndUpdatePlayerData) ⇒ <code>Promise.&lt;void&gt;</code>

<a name="module_modules/services/playerDataExtractor..formatDataForSql"></a>

### modules/services/playerDataExtractor~formatDataForSql(data) ⇒ <code>Object</code>
🎯 **Formats and Flattens Player Data for SQL Storage**

Flattens a nested data object into a single-level object with concatenated keys,
filters out undesired fields, and renames keys for database insertion.

**Kind**: inner method of [<code>modules/services/playerDataExtractor</code>](#module_modules/services/playerDataExtractor)  
**Returns**: <code>Object</code> - The formatted and flattened data object.  

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
// formattedData = { 'Stats Attack': 99, 'Stats Strength': 99 }
```
<a name="module_modules/services/playerDataExtractor..formatDataForSql..flattenDict"></a>

#### formatDataForSql~flattenDict(d, [parentKey], [sep]) ⇒ <code>Object</code>
Recursively flattens a nested object.

**Kind**: inner method of [<code>formatDataForSql</code>](#module_modules/services/playerDataExtractor..formatDataForSql)  
**Returns**: <code>Object</code> - The flattened object.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| d | <code>Object</code> |  | The object to flatten. |
| [parentKey] | <code>string</code> | <code>&quot;&#x27;&#x27;&quot;</code> | The base key to prepend. |
| [sep] | <code>string</code> | <code>&quot;&#x27;_&#x27;&quot;</code> | The separator between keys. |

<a name="module_modules/services/playerDataExtractor..ensurePlayerDataTable"></a>

### modules/services/playerDataExtractor~ensurePlayerDataTable() ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Ensures the Player Data Table Exists**

Checks if the `player_data` table exists in the SQLite database; if not, creates it with the specified schema.

**Kind**: inner method of [<code>modules/services/playerDataExtractor</code>](#module_modules/services/playerDataExtractor)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the table is ensured.  
**Example**  
```js
await ensurePlayerDataTable();
```
<a name="module_modules/services/playerDataExtractor..savePlayerDataToDb"></a>

### modules/services/playerDataExtractor~savePlayerDataToDb(playerName, rawData) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Saves Player Data to the Database**

Formats the raw player data using `formatDataForSql`, deletes any existing data for the player,
and inserts the formatted data into the `player_data` table.

**Kind**: inner method of [<code>modules/services/playerDataExtractor</code>](#module_modules/services/playerDataExtractor)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the data is saved.  
**Throws**:

- <code>Error</code> Throws an error if database operations fail.


| Param | Type | Description |
| --- | --- | --- |
| playerName | <code>string</code> | The name of the player. |
| rawData | <code>Object</code> | The raw data object fetched from the API. |

**Example**  
```js
await savePlayerDataToDb('PlayerOne', rawData);
```
<a name="module_modules/services/playerDataExtractor..loadRegisteredRsnData"></a>

### modules/services/playerDataExtractor~loadRegisteredRsnData() ⇒ <code>Promise.&lt;Object&gt;</code>
🎯 **Loads Registered RSN Data**

Retrieves all registered RSNs from the database and returns a mapping of user IDs to arrays of RSNs.

**Kind**: inner method of [<code>modules/services/playerDataExtractor</code>](#module_modules/services/playerDataExtractor)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - A mapping of user IDs to arrays of RSNs.  
**Example**  
```js
const rsnData = await loadRegisteredRsnData();
// rsnData = { 'user1': ['RSN1', 'RSN2'], 'user2': ['RSN3'] }
```
<a name="module_modules/services/playerDataExtractor..fetchAndSaveRegisteredPlayerData"></a>

### modules/services/playerDataExtractor~fetchAndSaveRegisteredPlayerData() ⇒ <code>Promise.&lt;{data: Array.&lt;Object&gt;, fetchFailed: boolean}&gt;</code>
🎯 **Fetches and Saves Registered Player Data**

Retrieves registered RSNs from the database, fetches the corresponding player data from the WOM API
based on the last fetched time, and saves the data to the database. Implements rate-limiting between requests.

**Kind**: inner method of [<code>modules/services/playerDataExtractor</code>](#module_modules/services/playerDataExtractor)  
**Returns**: <code>Promise.&lt;{data: Array.&lt;Object&gt;, fetchFailed: boolean}&gt;</code> - An object containing the fetched data and a flag indicating if any fetch failed.  
**Example**  
```js
const result = await fetchAndSaveRegisteredPlayerData();
if (!result.fetchFailed) {
  logger.info('Player data fetched successfully.');
}
```
<a name="module_modules/services/playerDataExtractor..removeNonMatchingPlayers"></a>

### modules/services/playerDataExtractor~removeNonMatchingPlayers(currentClanUsers) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Removes Non-Matching Player Data**

Deletes player data from the `player_data` table for players whose IDs are not in the current clan.

**Kind**: inner method of [<code>modules/services/playerDataExtractor</code>](#module_modules/services/playerDataExtractor)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when non-matching records are removed.  

| Param | Type | Description |
| --- | --- | --- |
| currentClanUsers | <code>Set.&lt;string&gt;</code> | A set of current clan player IDs. |

**Example**  
```js
const currentUsers = new Set(['player1', 'player2']);
await removeNonMatchingPlayers(currentUsers);
```
<a name="module_modules/services/playerDataExtractor..fetchAndUpdatePlayerData"></a>

### modules/services/playerDataExtractor~fetchAndUpdatePlayerData() ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Fetches and Updates Player Data**

Orchestrates the entire player data update process:
1. Ensures necessary tables exist.
2. Fetches data for all registered RSNs from the WOM API and saves it to the database.
3. Removes stale data for players no longer registered.

**Kind**: inner method of [<code>modules/services/playerDataExtractor</code>](#module_modules/services/playerDataExtractor)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the update process is complete.  
**Example**  
```js
await fetchAndUpdatePlayerData();
```
<a name="module_utils/calculateActivity"></a>

## utils/calculateActivity
**Player Activity Data Utilities** ⏱️

This module provides functions for managing player activity data in the Varietyz Bot's SQLite database.
It ensures the existence of the `active_inactive` table and calculates the number of active and inactive players
based on their last recorded progress.

**Key Features:**
- **Table Management**: Ensures the `active_inactive` table exists, which stores player usernames and their last progress timestamp.
- **Active Player Count**: Calculates the number of players who have progressed in the last 7 days.
- **Inactive Player Count**: Calculates the number of players who have not progressed in the last 21 days.

**External Dependencies:**
- **luxon**: For handling date and time operations (e.g., calculating 7-day and 21-day intervals).
- **dbUtils**: For executing SQL queries to interact with the SQLite database.


* [utils/calculateActivity](#module_utils/calculateActivity)
    * [~ensureActiveInactiveTable()](#module_utils/calculateActivity..ensureActiveInactiveTable) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~calculateProgressCount()](#module_utils/calculateActivity..calculateProgressCount) ⇒ <code>Promise.&lt;number&gt;</code>
    * [~calculateInactivity()](#module_utils/calculateActivity..calculateInactivity) ⇒ <code>Promise.&lt;number&gt;</code>

<a name="module_utils/calculateActivity..ensureActiveInactiveTable"></a>

### utils/calculateActivity~ensureActiveInactiveTable() ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Ensures the Active_Inactive Table Exists**

Checks if the `active_inactive` table exists in the SQLite database. If the table does not exist, it creates one
with the following schema:
- `username` (TEXT): The player's username (primary key).
- `last_progressed` (DATETIME): The timestamp of the player's last recorded progress.

**Kind**: inner method of [<code>utils/calculateActivity</code>](#module_utils/calculateActivity)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the table is ensured to exist.  
**Example**  
```js
// Ensure the active_inactive table exists before updating player activity data.
await ensureActiveInactiveTable();
```
<a name="module_utils/calculateActivity..calculateProgressCount"></a>

### utils/calculateActivity~calculateProgressCount() ⇒ <code>Promise.&lt;number&gt;</code>
🎯 **Calculates the Number of Active Players**

Counts players in the `active_inactive` table whose `last_progressed` timestamp is within the past 7 days.

**Kind**: inner method of [<code>utils/calculateActivity</code>](#module_utils/calculateActivity)  
**Returns**: <code>Promise.&lt;number&gt;</code> - The count of active players.  
**Example**  
```js
// Retrieve and log the number of active players.
const activeCount = await calculateProgressCount();
console.log(`Active players: ${activeCount}`);
```
<a name="module_utils/calculateActivity..calculateInactivity"></a>

### utils/calculateActivity~calculateInactivity() ⇒ <code>Promise.&lt;number&gt;</code>
🎯 **Calculates the Number of Inactive Players**

Counts players in the `active_inactive` table whose `last_progressed` timestamp is older than 21 days.

**Kind**: inner method of [<code>utils/calculateActivity</code>](#module_utils/calculateActivity)  
**Returns**: <code>Promise.&lt;number&gt;</code> - The count of inactive players.  
**Example**  
```js
// Retrieve and log the number of inactive players.
const inactiveCount = await calculateInactivity();
console.log(`Inactive players: ${inactiveCount}`);
```
<a name="module_utils/dbUtils"></a>

## utils/dbUtils
**SQLite Database Utility Functions** 💾

This module provides utility functions for interacting with the SQLite database in the Varietyz Bot.
It includes functions to execute SQL queries, retrieve data, run transactions, and manage configuration values.
Additionally, it handles graceful database closure on process termination.

**Key Features:**
- **SQL Query Execution**: Execute INSERT, UPDATE, DELETE, and SELECT queries.
- **Data Retrieval**: Retrieve all matching rows (`getAll`) or a single row (`getOne`).
- **Transaction Support**: Run multiple queries in a transaction.
- **Configuration Management**: Get and set configuration values in the database.
- **Graceful Shutdown**: Closes the database connection on SIGINT.

**External Dependencies:**
- **sqlite3**: For interacting with the SQLite database.
- **logger**: For logging database operations and errors.


* [utils/dbUtils](#module_utils/dbUtils)
    * [~dbPath](#module_utils/dbUtils..dbPath) : <code>string</code>
    * [~db](#module_utils/dbUtils..db) : <code>sqlite3.Database</code>
    * [~runQuery(query, [params])](#module_utils/dbUtils..runQuery) ⇒ <code>Promise.&lt;sqlite3.RunResult&gt;</code>
    * [~getAll(query, [params])](#module_utils/dbUtils..getAll) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
    * [~getOne(query, [params])](#module_utils/dbUtils..getOne) ⇒ <code>Promise.&lt;(Object\|null)&gt;</code>
    * [~runTransaction(queries)](#module_utils/dbUtils..runTransaction) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~getConfigValue(key, [defaultValue])](#module_utils/dbUtils..getConfigValue) ⇒ <code>Promise.&lt;any&gt;</code>
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

**Kind**: inner method of [<code>utils/dbUtils</code>](#module_utils/dbUtils)  
**Returns**: <code>Promise.&lt;sqlite3.RunResult&gt;</code> - A promise that resolves to the result of the query.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| query | <code>string</code> |  | The SQL query to execute. |
| [params] | <code>Array.&lt;any&gt;</code> | <code>[]</code> | The parameters to bind to the SQL query. |

**Example**  
```js
// Insert a new user:
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

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| query | <code>string</code> |  | The SQL SELECT query to execute. |
| [params] | <code>Array.&lt;any&gt;</code> | <code>[]</code> | The parameters to bind to the SQL query. |

**Example**  
```js
// Retrieve users older than 25:
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

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| query | <code>string</code> |  | The SQL SELECT query to execute. |
| [params] | <code>Array.&lt;any&gt;</code> | <code>[]</code> | The parameters to bind to the SQL query. |

**Example**  
```js
// Retrieve a user with id 1:
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
**Returns**: <code>Promise.&lt;void&gt;</code> - A promise that resolves when the transaction is complete.  

| Param | Type | Description |
| --- | --- | --- |
| queries | <code>Array.&lt;{query: string, params: Array.&lt;any&gt;}&gt;</code> | An array of query objects with their parameters. |

**Example**  
```js
// Execute multiple queries as a transaction:
await runTransaction([
  { query: 'INSERT INTO users (name) VALUES (?)', params: ['Alice'] },
  { query: 'INSERT INTO users (name) VALUES (?)', params: ['Bob'] }
]);
```
<a name="module_utils/dbUtils..getConfigValue"></a>

### utils/dbUtils~getConfigValue(key, [defaultValue]) ⇒ <code>Promise.&lt;any&gt;</code>
Fetches a configuration value from the database.
If the key is not found, returns a default value.

**Kind**: inner method of [<code>utils/dbUtils</code>](#module_utils/dbUtils)  
**Returns**: <code>Promise.&lt;any&gt;</code> - A promise that resolves to the configuration value or the default.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| key | <code>string</code> |  | The configuration key. |
| [defaultValue] | <code>any</code> | <code></code> | The default value to return if key is not found. |

**Example**  
```js
const prefix = await getConfigValue('bot_prefix', '!');
```
<a name="module_utils/dbUtils..setConfigValue"></a>

### utils/dbUtils~setConfigValue(key, value)
Sets a configuration key's value in the database.
Inserts a new record if the key does not exist, or updates it otherwise.

**Kind**: inner method of [<code>utils/dbUtils</code>](#module_utils/dbUtils)  

| Param | Type | Description |
| --- | --- | --- |
| key | <code>string</code> | The configuration key. |
| value | <code>any</code> | The value to set for the key. |

**Example**  
```js
await setConfigValue('bot_prefix', '!');
```
<a name="module_utils/fetchPlayerData"></a>

## utils/fetchPlayerData
**Player Data Fetcher** 🔍

This module provides a function to retrieve player data for a specified RuneScape Name (RSN) from the Wise Old Man (WOM) API.
It handles common error scenarios such as non-existent players (404), rate limiting (429), and unexpected issues.

**Key Features:**
- **Player Data Retrieval**: Fetches player data from the WOM API for a given RSN.
- **Error Handling**: Manages common API errors including 404 (player not found) and 429 (rate limiting).
- **Rate Limiting**: Throws an error if the WOM API returns a rate limit response.

**External Dependencies:**
- **axios**: For making HTTP requests to the WOM API.
- **logger**: For logging warnings and errors during the fetch process.

<a name="module_utils/fetchPlayerData..fetchPlayerData"></a>

### utils/fetchPlayerData~fetchPlayerData(rsn) ⇒ <code>Promise.&lt;(Object\|null)&gt;</code>
🎯 **Fetches Player Data from the Wise Old Man API**

Retrieves data for a given RuneScape Name (RSN) from the Wise Old Man API.
Handles common scenarios including:
- 404 errors when the player is not found.
- 429 errors for rate limiting.
- Unexpected errors that may occur during the request.

**Kind**: inner method of [<code>utils/fetchPlayerData</code>](#module_utils/fetchPlayerData)  
**Returns**: <code>Promise.&lt;(Object\|null)&gt;</code> - A promise that resolves to the player data as an object,
or `null` if the player is not found.  
**Throws**:

- <code>Error</code> Throws an error if the WOM API rate limits the request or an unexpected error occurs.


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
**Player Fetch Times Utilities** ⏰This module provides utility functions for managing player fetch times in the Varietyz Bot's SQLite database.It ensures the existence of the `player_fetch_times` table, retrieves the last fetch time for a player,and updates the fetch timestamp when player data is refreshed.**Key Features:**- **Table Management**: Ensures the `player_fetch_times` table exists with the appropriate schema.- **Fetch Time Retrieval**: Retrieves the last fetch timestamp for a specified RuneScape Name (RSN), returning `null` if not found.- **Fetch Time Update**: Inserts or updates the fetch timestamp for a player.- **Table Reset**: Provides a function to drop the `player_fetch_times` table, if necessary.**External Dependencies:**- **dbUtils**: For executing SQL queries and interacting with the SQLite database.


* [utils/lastFetchedTime](#module_utils/lastFetchedTime)
    * [~ensurePlayerFetchTimesTable()](#module_utils/lastFetchedTime..ensurePlayerFetchTimesTable) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~getLastFetchedTime(rsn)](#module_utils/lastFetchedTime..getLastFetchedTime) ⇒ <code>Promise.&lt;(Date\|null)&gt;</code>
    * [~resetPlayerFetchTimesTable()](#module_utils/lastFetchedTime..resetPlayerFetchTimesTable) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~setLastFetchedTime(rsn)](#module_utils/lastFetchedTime..setLastFetchedTime) ⇒ <code>Promise.&lt;void&gt;</code>

<a name="module_utils/lastFetchedTime..ensurePlayerFetchTimesTable"></a>

### utils/lastFetchedTime~ensurePlayerFetchTimesTable() ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Ensures the Player Fetch Times Table Exists**Checks if the `player_fetch_times` table exists in the SQLite database and creates it if not.The table schema includes:- `rsn` (TEXT): The player's RuneScape Name (RSN), serving as the primary key.- `last_fetched_at` (DATETIME): The timestamp of the last data fetch, defaulting to the current time.

**Kind**: inner method of [<code>utils/lastFetchedTime</code>](#module_utils/lastFetchedTime)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the table exists.  
**Example**  
```js
// Ensure the fetch times table exists before fetching player data.await ensurePlayerFetchTimesTable();
```
<a name="module_utils/lastFetchedTime..getLastFetchedTime"></a>

### utils/lastFetchedTime~getLastFetchedTime(rsn) ⇒ <code>Promise.&lt;(Date\|null)&gt;</code>
🎯 **Retrieves the Last Fetched Timestamp for a Player**Queries the `player_fetch_times` table for the last fetch timestamp associated with the specified RSN.If the RSN is found, returns a Date object representing the timestamp; otherwise, returns `null`.

**Kind**: inner method of [<code>utils/lastFetchedTime</code>](#module_utils/lastFetchedTime)  
**Returns**: <code>Promise.&lt;(Date\|null)&gt;</code> - A promise that resolves to the last fetched time as a Date object, or `null` if not found.  

| Param | Type | Description |
| --- | --- | --- |
| rsn | <code>string</code> | The RuneScape Name (RSN) of the player. |

**Example**  
```js
// Retrieve the last fetch time for a player.const lastFetched = await getLastFetchedTime('playerone');console.log(lastFetched); // Outputs a Date object or null.
```
<a name="module_utils/lastFetchedTime..resetPlayerFetchTimesTable"></a>

### utils/lastFetchedTime~resetPlayerFetchTimesTable() ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Resets the Player Fetch Times Table**Drops the `player_fetch_times` table from the SQLite database if it exists.This can be used for cleanup or to force a rebuild of the table.

**Kind**: inner method of [<code>utils/lastFetchedTime</code>](#module_utils/lastFetchedTime)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the table is dropped.  
**Example**  
```js
// Reset the fetch times table.await resetPlayerFetchTimesTable();
```
<a name="module_utils/lastFetchedTime..setLastFetchedTime"></a>

### utils/lastFetchedTime~setLastFetchedTime(rsn) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Updates the Last Fetched Timestamp for a Player**Inserts a new record or updates the existing record in the `player_fetch_times` table with the current timestampfor the specified RuneScape Name (RSN). This function ensures that the database reflects the latest data fetch time.

**Kind**: inner method of [<code>utils/lastFetchedTime</code>](#module_utils/lastFetchedTime)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the timestamp is updated.  

| Param | Type | Description |
| --- | --- | --- |
| rsn | <code>string</code> | The RuneScape Name (RSN) of the player. |

**Example**  
```js
// Update the last fetched timestamp for a player.await setLastFetchedTime('playerone');
```
<a name="module_utils/logger"></a>

## utils/logger
**Winston Logger Utility** 📝

This module configures and exports a Winston logger instance with daily log rotation and enhanced error handling.
It writes log messages to both the console and log files, organizes logs by year and month, and gracefully handles
uncaught exceptions and unhandled promise rejections.

**Key Features:**
- **Console Logging**: Provides colorized output for easy readability.
- **Daily Log Rotation**: Organizes log files into directories by year and month, rotates files daily, limits file size, and retains logs for 7 days.
- **Error Handling**: Captures uncaught exceptions and unhandled promise rejections, logs them, and exits the process.
- **Log Directory Management**: Ensures required directories exist for storing log files and audit information.

**External Dependencies:**
- **winston**: Core logging library.
- **winston-daily-rotate-file**: Transport for daily rotating log files.
- **path**: For handling file paths.
- **fs**: For file system operations.


* [utils/logger](#module_utils/logger)
    * [~logger](#module_utils/logger..logger) : <code>winston.Logger</code>
    * [~getYearMonthPath()](#module_utils/logger..getYearMonthPath) ⇒ <code>string</code>
    * [~createLogDirectories()](#module_utils/logger..createLogDirectories) ⇒ <code>void</code>
    * [~initializeLogger()](#module_utils/logger..initializeLogger) ⇒ <code>void</code>
    * ["uncaughtException" (error)](#event_uncaughtException) ⇒ <code>void</code>
    * ["unhandledRejection" (reason, promise)](#event_unhandledRejection) ⇒ <code>void</code>

<a name="module_utils/logger..logger"></a>

### utils/logger~logger : <code>winston.Logger</code>
Creates and configures the Winston logger instance.

The logger writes logs to the console with colorized output and to daily rotated log files.

**Kind**: inner constant of [<code>utils/logger</code>](#module_utils/logger)  
**Example**  
```js
logger.info('This is an informational message');
logger.error('This is an error message');
```
<a name="module_utils/logger..getYearMonthPath"></a>

### utils/logger~getYearMonthPath() ⇒ <code>string</code>
Generates the directory path for logs based on the current year and month.

**Kind**: inner method of [<code>utils/logger</code>](#module_utils/logger)  
**Returns**: <code>string</code> - The log directory path for the current year and month.  
**Example**  
```js
const logPath = getYearMonthPath();
// e.g., 'logs/2025/january'
```
<a name="module_utils/logger..createLogDirectories"></a>

### utils/logger~createLogDirectories() ⇒ <code>void</code>
Ensures that necessary log directories exist. Creates directories for year/month logs and a dedicated audit folder.

**Kind**: inner method of [<code>utils/logger</code>](#module_utils/logger)  
**Example**  
```js
createLogDirectories();
```
<a name="module_utils/logger..initializeLogger"></a>

### utils/logger~initializeLogger() ⇒ <code>void</code>
Initializes the logging system by ensuring that necessary directories exist.

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
Handles unhandled promise rejections by logging the promise and its reason.

**Kind**: event emitted by [<code>utils/logger</code>](#module_utils/logger)  

| Param | Type | Description |
| --- | --- | --- |
| reason | <code>any</code> | The reason for the rejection. |
| promise | <code>Promise</code> | The promise that was rejected. |

<a name="module_utils/normalizeRsn"></a>

## utils/normalizeRsn
**RuneScape Name (RSN) Normalizer** 🔄

This module provides a utility function for normalizing RuneScape names (RSNs).
It ensures that RSNs are stored in a consistent format for database operations and efficient lookups.

**Key Features:**
- **RSN Normalization**: Converts RSNs to a standard format by removing unwanted characters, collapsing multiple spaces, and converting the entire string to lowercase.
- **Error Handling**: Validates that the input is a string, throwing an error if not.

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
// Example of normalizing an RSN:
const normalized = normalizeRsn('  John_Doe-- ');
console.log(normalized); // 'john doe'
```
<a name="module_utils/purgeChannel"></a>

## utils/purgeChannel
**Discord Channel Purger** 🧹

This module provides a utility function to purge messages from a specified Discord text channel while respecting rate limits.
It is optimized to handle large volumes of messages by processing them in batches, ensuring efficient deletion without
triggering Discord's rate limits.

**Key Features:**
- **Efficient Message Deletion**: Deletes messages in batches of up to 100.
- **Rate Limit Management**: Introduces delays between deletions to prevent hitting Discord's rate limits.
- **Error Handling**: Logs and handles errors that occur during the deletion process.

**External Dependencies:**
- `sleep` from `./sleepUtil`: Introduces delays between deletion batches.
- `logger`: Logs information, warnings, and errors.

<a name="module_utils/purgeChannel..purgeChannel"></a>

### utils/purgeChannel~purgeChannel(channel) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Purges All Messages from a Discord Text Channel**

Fetches and deletes messages in batches of up to 100 until the channel is empty.
A delay is added between each batch to avoid Discord's rate limits.

**Kind**: inner method of [<code>utils/purgeChannel</code>](#module_utils/purgeChannel)  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when all messages in the channel are deleted.  

| Param | Type | Description |
| --- | --- | --- |
| channel | <code>Discord.TextChannel</code> | The Discord text channel from which messages will be purged. |

**Example**  
```js
// Purge all messages in a specified channel:
const channel = client.channels.cache.get('CHANNEL_ID');
if (channel) {
    await purgeChannel(channel);
}
```
<a name="module_utils/rankUtils"></a>

## utils/rankUtils
**RuneScape Clan Rank Utilities** 🎖️

This module provides utility functions for managing RuneScape clan ranks in the Varietyz Bot.
It offers tools for retrieving rank-specific details (such as emojis and colors), formatting experience
points, and normalizing rank strings. These utilities enhance the presentation and handling of rank-related
data in Discord interactions.

**Key Features:**
- **Rank Emojis**: Retrieves emojis associated with specific ranks.
- **Rank Colors**: Provides hexadecimal color codes for ranks, with a default fallback.
- **Experience Formatting**: Formats numerical experience points with commas for readability.
- **Rank String Normalization**: Converts rank identifiers to display-friendly formats.

**External Dependencies:**
- The `RANKS` object from the `../../config/constants` module, which defines rank metadata (e.g., emojis, colors).


* [utils/rankUtils](#module_utils/rankUtils)
    * [~getRankEmoji(rank)](#module_utils/rankUtils..getRankEmoji) ⇒ <code>string</code>
    * [~getRankColor(rank)](#module_utils/rankUtils..getRankColor) ⇒ <code>number</code>
    * [~formatExp(experience)](#module_utils/rankUtils..formatExp) ⇒ <code>string</code>
    * [~formatRank(rank)](#module_utils/rankUtils..formatRank) ⇒ <code>string</code>

<a name="module_utils/rankUtils..getRankEmoji"></a>

### utils/rankUtils~getRankEmoji(rank) ⇒ <code>string</code>
🎯 **Retrieves the Emoji for a Given Rank**

Returns the emoji associated with the provided rank. The lookup is case-insensitive.

**Kind**: inner method of [<code>utils/rankUtils</code>](#module_utils/rankUtils)  
**Returns**: <code>string</code> - The corresponding rank emoji, or an empty string if no emoji is defined.  

| Param | Type | Description |
| --- | --- | --- |
| rank | <code>string</code> | The clan member's rank. |

**Example**  
```js
const emoji = getRankEmoji('Leader');
console.log(emoji); // e.g., '👑'
```
<a name="module_utils/rankUtils..getRankColor"></a>

### utils/rankUtils~getRankColor(rank) ⇒ <code>number</code>
🎯 **Retrieves the Color for a Given Rank**

Returns the hexadecimal color code associated with the provided rank. The lookup is case-insensitive.
If the rank is not found, it returns a default yellow color.

**Kind**: inner method of [<code>utils/rankUtils</code>](#module_utils/rankUtils)  
**Returns**: <code>number</code> - The rank color in hexadecimal format (e.g., 0xff0000), or 0xffff00 as a default.  

| Param | Type | Description |
| --- | --- | --- |
| rank | <code>string</code> | The clan member's rank. |

**Example**  
```js
const color = getRankColor('Officer');
console.log(color); // e.g., 0xff0000
```
<a name="module_utils/rankUtils..formatExp"></a>

### utils/rankUtils~formatExp(experience) ⇒ <code>string</code>
🎯 **Formats Experience Points**

Converts the provided experience value to an integer and formats it with commas
to improve readability.

**Kind**: inner method of [<code>utils/rankUtils</code>](#module_utils/rankUtils)  
**Returns**: <code>string</code> - The formatted experience with commas.  
**Throws**:

- <code>TypeError</code> If the input cannot be parsed as a number.


| Param | Type | Description |
| --- | --- | --- |
| experience | <code>number</code> \| <code>string</code> | The experience points to format. |

**Example**  
```js
const formattedExp = formatExp(1234567);
console.log(formattedExp); // '1,234,567'
```
<a name="module_utils/rankUtils..formatRank"></a>

### utils/rankUtils~formatRank(rank) ⇒ <code>string</code>
🎯 **Formats a Rank String for Display**

Normalizes a rank string by replacing underscores with spaces and capitalizing each word.
This function converts storage format (e.g., "clan_leader") into a display-friendly format (e.g., "Clan Leader").

**Kind**: inner method of [<code>utils/rankUtils</code>](#module_utils/rankUtils)  
**Returns**: <code>string</code> - The formatted rank string.  

| Param | Type | Description |
| --- | --- | --- |
| rank | <code>string</code> | The rank string to format. |

**Example**  
```js
const formattedRank = formatRank('clan_leader');
console.log(formattedRank); // 'Clan Leader'
```
<a name="module_utils/sleepUtil"></a>

## utils/sleepUtil
**Sleep Utility** ⏳

This module provides a utility function for creating delays in execution.
It offers a simple, promise-based mechanism to pause asynchronous operations
for a specified duration. This is especially useful in async/await workflows to
introduce delays without blocking the event loop.

**Key Features:**
- **Promise-based Delay**: Returns a promise that resolves after the specified time.
- **Input Validation**: Validates that the delay duration is a non-negative number.
- **Ease of Use**: Simplifies adding delays in asynchronous operations.

**External Dependencies:**
- None.

<a name="module_utils/sleepUtil..sleep"></a>

### utils/sleepUtil~sleep(ms) ⇒ <code>Promise.&lt;void&gt;</code>
Pauses execution for a specified number of milliseconds.

This function returns a promise that resolves after the specified duration,
allowing asynchronous functions to use `await` to introduce a delay.

**Kind**: inner method of [<code>utils/sleepUtil</code>](#module_utils/sleepUtil)  
**Returns**: <code>Promise.&lt;void&gt;</code> - A promise that resolves after the specified duration.  
**Throws**:

- <code>TypeError</code> If the provided `ms` is not a number or is negative.


| Param | Type | Description |
| --- | --- | --- |
| ms | <code>number</code> | The number of milliseconds to delay. Must be a non-negative number. |

**Example**  
```js
// Example: Pause execution for 2 seconds.
async function example() {
    console.log('Start');
    await sleep(2000);
    console.log('End'); // "End" will log after approximately 2 seconds.
}
```
<a name="module_utils/validateRsn"></a>

## utils/validateRsn
**RSN Validator Utilities** 🔍

This module provides utility functions for validating RuneScape names (RSNs) to ensure they meet specific format criteria.
This helps guarantee that RSNs are stored consistently in the database and can be reliably looked up.

**Key Features:**
- **Format Validation**: Ensures RSNs are between 1 and 12 characters long and contain only letters, numbers, and single spaces (no hyphens or underscores).
- **Forbidden Phrase Detection**: Rejects RSNs containing prohibited phrases like "Java", "Mod", or "Jagex".
- **Feedback Messages**: Returns detailed validation messages indicating any issues with the RSN.

External Dependencies:
- None.

<a name="module_utils/validateRsn..validateRsn"></a>

### utils/validateRsn~validateRsn(rsn) ⇒ <code>Object</code>
Validates the format of a RuneScape Name (RSN).

This function checks that the RSN:
- Is a string.
- Has a length between 1 and 12 characters after trimming.
- Contains only letters, numbers, and single spaces between words (hyphens and underscores are not allowed).
- Does not contain forbidden phrases like "Java", "Mod", or "Jagex".

**Kind**: inner method of [<code>utils/validateRsn</code>](#module_utils/validateRsn)  
**Returns**: <code>Object</code> - An object containing:
- {boolean} valid - Indicates whether the RSN is valid.
- {string} message - Provides feedback on the validation result (empty if valid).  

| Param | Type | Description |
| --- | --- | --- |
| rsn | <code>string</code> | The RSN to validate. |

**Example**  
```js
const validation = validateRsn('PlayerOne');
// Expected output: { valid: true, message: '' }

const invalid = validateRsn('Player_One');
// Expected output: { valid: false, message: 'RSN can only contain letters, numbers, and single spaces between words. (If your RSN includes a hyphen or underscore, replace it with a space)' }
```
<a name="module_scripts/create_db"></a>

## scripts/create\_db
**Database Initialization Script** 🛠️

This script initializes and sets up the SQLite database for the Varietyz Bot.
It deletes any existing database file to ensure a clean setup and then creates all necessary tables:
- `registered_rsn`: Stores registered RuneScape names.
- `clan_members`: Stores information about clan members.
- `recent_name_changes`: Tracks recent name changes.
- `player_data`: Stores various player-specific data points.
- `player_fetch_times`: Tracks the last time player data was fetched.
- `active_inactive`: Tracks active and inactive player progression.

The script logs the success or failure of each table creation process and closes the database connection
gracefully upon completion.

**External Dependencies:**
- **SQLite3**: For interacting with the SQLite database.
- **fs**: For file system operations (deleting existing database, creating directories).
- **path**: For constructing file paths.
- **logger**: For logging operations and errors.


* [scripts/create_db](#module_scripts/create_db)
    * [~dbPath](#module_scripts/create_db..dbPath) : <code>string</code>
    * [~initializeDatabase()](#module_scripts/create_db..initializeDatabase) ⇒ <code>sqlite3.Database</code>
    * [~createRegisteredRsnTable(db)](#module_scripts/create_db..createRegisteredRsnTable)
    * [~createClanMembersTable(db)](#module_scripts/create_db..createClanMembersTable)
    * [~createRecentNameChangesTable(db)](#module_scripts/create_db..createRecentNameChangesTable)
    * [~createPlayerDataTable(db)](#module_scripts/create_db..createPlayerDataTable)
    * [~createFetchTimeTable(db)](#module_scripts/create_db..createFetchTimeTable)
    * [~createActiveInactiveTable(db)](#module_scripts/create_db..createActiveInactiveTable)

<a name="module_scripts/create_db..dbPath"></a>

### scripts/create_db~dbPath : <code>string</code>
Path to the SQLite database file.

**Kind**: inner constant of [<code>scripts/create\_db</code>](#module_scripts/create_db)  
<a name="module_scripts/create_db..initializeDatabase"></a>

### scripts/create_db~initializeDatabase() ⇒ <code>sqlite3.Database</code>
Initializes the SQLite database by deleting any existing database file,
creating the necessary directories, and establishing a new database connection.

**Kind**: inner method of [<code>scripts/create\_db</code>](#module_scripts/create_db)  
**Returns**: <code>sqlite3.Database</code> - The new SQLite database instance.  
**Example**  
```js
const db = initializeDatabase();
```
<a name="module_scripts/create_db..createRegisteredRsnTable"></a>

### scripts/create_db~createRegisteredRsnTable(db)
Creates the 'registered_rsn' table to store registered RuneScape names.

**Kind**: inner method of [<code>scripts/create\_db</code>](#module_scripts/create_db)  

| Param | Type | Description |
| --- | --- | --- |
| db | <code>sqlite3.Database</code> | The SQLite database instance. |

<a name="module_scripts/create_db..createClanMembersTable"></a>

### scripts/create_db~createClanMembersTable(db)
Creates the 'clan_members' table to store clan member information.

**Kind**: inner method of [<code>scripts/create\_db</code>](#module_scripts/create_db)  

| Param | Type | Description |
| --- | --- | --- |
| db | <code>sqlite3.Database</code> | The SQLite database instance. |

<a name="module_scripts/create_db..createRecentNameChangesTable"></a>

### scripts/create_db~createRecentNameChangesTable(db)
Creates the 'recent_name_changes' table to track recent player name changes.

**Kind**: inner method of [<code>scripts/create\_db</code>](#module_scripts/create_db)  

| Param | Type | Description |
| --- | --- | --- |
| db | <code>sqlite3.Database</code> | The SQLite database instance. |

<a name="module_scripts/create_db..createPlayerDataTable"></a>

### scripts/create_db~createPlayerDataTable(db)
Creates the 'player_data' table to store various player-specific data points.

**Kind**: inner method of [<code>scripts/create\_db</code>](#module_scripts/create_db)  

| Param | Type | Description |
| --- | --- | --- |
| db | <code>sqlite3.Database</code> | The SQLite database instance. |

<a name="module_scripts/create_db..createFetchTimeTable"></a>

### scripts/create_db~createFetchTimeTable(db)
Creates the 'player_fetch_times' table to track when player data was last fetched.

**Kind**: inner method of [<code>scripts/create\_db</code>](#module_scripts/create_db)  

| Param | Type | Description |
| --- | --- | --- |
| db | <code>sqlite3.Database</code> | The SQLite database instance. |

<a name="module_scripts/create_db..createActiveInactiveTable"></a>

### scripts/create_db~createActiveInactiveTable(db)
Creates the 'active_inactive' table to track player activity status.

**Kind**: inner method of [<code>scripts/create\_db</code>](#module_scripts/create_db)  

| Param | Type | Description |
| --- | --- | --- |
| db | <code>sqlite3.Database</code> | The SQLite database instance. |

<a name="module_tasks"></a>

## tasks
**Scheduled Tasks for the Varietyz Bot** ⏰This module defines and manages scheduled tasks for the Varietyz Bot. Each task is represented as an object that includesits name, the asynchronous function to execute, the interval (in seconds) at which it should run, and flags indicatingwhether the task should run on startup and be scheduled for periodic execution.**Key Features:**- **Task Registration & Scheduling**: Registers tasks with customizable intervals and startup behavior.- **Data Updates & Synchronization**: Includes tasks for updating data, processing name changes, fetching player data,handling hiscores, and updating voice channels.- **Integration with External Modules**: Utilizes external modules for database operations, logging, and data processing.- **Asynchronous Execution**: Supports asynchronous task execution with proper error logging.**External Dependencies:**- **dotenv**: Loads environment variables for configuration.- Various processing modules (e.g., `member_channel`, `name_changes`, `player_data_extractor`).- Database utilities (`dbUtils`) and logging utilities (`logger`).


* [tasks](#module_tasks)
    * [module.exports](#exp_module_tasks--module.exports) : <code>Array.&lt;Task&gt;</code> ⏏
        * [~Task](#module_tasks--module.exports..Task) : <code>Object</code>

<a name="exp_module_tasks--module.exports"></a>

### module.exports : <code>Array.&lt;Task&gt;</code> ⏏
An array of scheduled tasks for the Varietyz Bot.Each task adheres to the [Task](Task) typedef.

**Kind**: Exported member  
<a name="module_tasks--module.exports..Task"></a>

#### module.exports~Task : <code>Object</code>
**Kind**: inner typedef of [<code>module.exports</code>](#exp_module_tasks--module.exports)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | The unique name of the task. |
| func | <code>function</code> | The asynchronous function to execute for the task. |
| interval | <code>number</code> | The interval in seconds at which the task should run. |
| runOnStart | <code>boolean</code> | Indicates whether the task should run immediately upon bot startup. |
| runAsTask | <code>boolean</code> | Indicates whether the task should be scheduled to run at regular intervals. |

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

<a name="resourcesPath"></a>

## resourcesPath : <code>string</code>
Path to the resources directory.

**Kind**: global constant  
<a name="projectBasePath"></a>

## projectBasePath : <code>string</code>
Base path for the project, starting at "src".

**Kind**: global constant  
<a name="execute"></a>

## execute(interaction) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 Executes the `/help` command.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| interaction | <code>Discord.CommandInteraction</code> | The interaction object. |

<a name="autocomplete"></a>

## autocomplete(interaction) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 Handles Autocomplete for `/help` command options.- Suggests valid command names for `command` option.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| interaction | <code>Discord.AutocompleteInteraction</code> | The autocomplete interaction object. |

<a name="createCommandEmbed"></a>

## createCommandEmbed(command) ⇒ <code>EmbedBuilder</code>
🎯 Creates a JSDoc-styled embed for a specific command.

**Kind**: global function  
**Returns**: <code>EmbedBuilder</code> - A formatted embed with command details.  

| Param | Type | Description |
| --- | --- | --- |
| command | <code>Object</code> | The command object. |

<a name="formatCommandUsage"></a>

## formatCommandUsage(command) ⇒ <code>string</code>
🎯 Formats the command usage by listing all options.

**Kind**: global function  
**Returns**: <code>string</code> - The formatted command usage.  

| Param | Type | Description |
| --- | --- | --- |
| command | <code>Object</code> | The command object. |

<a name="generateExample"></a>

## generateExample(command) ⇒ <code>string</code>
🎯 Generates an example usage for the command.

**Kind**: global function  
**Returns**: <code>string</code> - Example command usage.  

| Param | Type | Description |
| --- | --- | --- |
| command | <code>Object</code> | The command object. |

<a name="loadAndCategorizeCommands"></a>

## loadAndCategorizeCommands() ⇒ <code>Object</code>
🎯 Loads all commands dynamically and categorizes them.

**Kind**: global function  
**Returns**: <code>Object</code> - Contains a flat list of all commands.  
<a name="determineCategory"></a>

## determineCategory(filename) ⇒ <code>string</code>
🎯 Determines the category of a command based on its filename.

**Kind**: global function  
**Returns**: <code>string</code> - The category of the command.  

| Param | Type | Description |
| --- | --- | --- |
| filename | <code>string</code> | The filename of the command. |

<a name="checkAdminPermissions"></a>

## checkAdminPermissions(interaction) ⇒ <code>boolean</code>
🎯 Checks if a user has administrator permissions.

**Kind**: global function  
**Returns**: <code>boolean</code> - Returns true if the user has admin permissions.  

| Param | Type | Description |
| --- | --- | --- |
| interaction | <code>Discord.CommandInteraction</code> | The interaction object. |

<a name="createCompetition"></a>

## createCompetition(womclient, db, type, metric, startsAt, endsAt, constants) ⇒ <code>Promise.&lt;Object&gt;</code>
🎯 **Creates a New Competition on WOM and Inserts it into the Database**This function creates a new competition via the WOM API using the provided parameters.It then inserts the new competition details into the database. For BOTW competitions,a rotation index is calculated based on the most recent BOTW competition.

**Kind**: global function  
**Returns**: <code>Promise.&lt;Object&gt;</code> - A promise that resolves to the newly created competition object from WOM.  
**Throws**:

- <code>Error</code> Throws an error if the provided metric is invalid or if the competition creation fails.


| Param | Type | Description |
| --- | --- | --- |
| womclient | <code>WOMClient</code> | The WOMClient instance used for creating competitions. |
| db | <code>Object</code> | The database utility object for executing queries. |
| type | <code>string</code> | The competition type, either `'SOTW'` or `'BOTW'`. |
| metric | <code>string</code> | The metric name (e.g., `'mining'`); underscores will be replaced with spaces. |
| startsAt | <code>Date</code> | The start time for the competition. |
| endsAt | <code>Date</code> | The end time for the competition. |
| constants | <code>Object</code> | Configuration constants, including `WOM_GROUP_ID` and `WOM_VERIFICATION`. |

**Example**  
```js
// Example usage:const newCompetition = await createCompetition(womclient, db, 'SOTW', 'mining', new Date(), new Date(Date.now() + 604800000), constants);console.log('Created Competition:', newCompetition);
```
<a name="chunkArray"></a>

## chunkArray(array, size)
**Kind**: global function  

| Param | Default |
| --- | --- |
| array |  | 
| size | <code>25</code> | 

<a name="recordCompetitionWinner"></a>

## recordCompetitionWinner(competition)
🎯 **Records the Competition Winner**Determines the real winner of a competition based on in-game performance (not votes)by retrieving competition details from the WOM API. If a valid winner is found,the function records the winner in the `winners` table and updates the cumulative statsfor the user in the `users` table. Each win increments `total_wins` and adds the metric gainto the respective total for either SOTW or BOTW.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| competition | <code>Object</code> | The ended competition object containing at least `id` and `type`. |

**Example**  
```js
// Record the winner for an ended competition:await recordCompetitionWinner({ id: 123, type: 'SOTW', title: 'Weekly Skill Competition' });
```
<a name="updateFinalLeaderboard"></a>

## updateFinalLeaderboard(competition, client)
🎯 **Updates the Final Competition Leaderboard**Retrieves the final standings for an ended competition from the WOM API, formats the top 10 leaderboardand the "Biggest Gainer" field with clickable player links, and sends an embed to the designatedHall of Fame channel in Discord. The embed title is clickable and links to the competition page on WOM.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| competition | <code>Object</code> | The ended competition object. |
| client | <code>Object</code> | The Discord client instance. |

**Example**  
```js
// Update the final leaderboard for a competition:await updateFinalLeaderboard(competition, client);
```
<a name="updateActiveCompetitionEmbed"></a>

## updateActiveCompetitionEmbed(competitionType, db, client, constants) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Updates the Active Competition Embed in Discord**Retrieves all active competitions of the specified type, updates the leaderboard,builds new competition embeds and voting dropdowns, and then either edits existingmessages or posts new ones in the designated Discord channel.

**Kind**: global function  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the active competition embed has been updated.  

| Param | Type | Description |
| --- | --- | --- |
| competitionType | <code>string</code> | The competition type, either `SOTW` or `BOTW`. |
| db | <code>Object</code> | The database utility object. |
| client | <code>Discord.Client</code> | The Discord client instance. |
| constants | <code>Object</code> | Configuration constants (e.g., channel IDs). |

**Example**  
```js
// Update the active embed for SOTW competitions:await updateActiveCompetitionEmbed('SOTW', db, client, constants);
```
<a name="buildPollDropdown"></a>

## buildPollDropdown(compType, db) ⇒ <code>Promise.&lt;Object&gt;</code>
🎯 **Builds the Voting Dropdown for Competitions**Constructs a dropdown menu component for competition voting.For BOTW competitions, the available options are chunked if necessary, using the current rotation index.Vote counts for each option are fetched from the database to display current tallies.

**Kind**: global function  
**Returns**: <code>Promise.&lt;Object&gt;</code> - Returns a Discord dropdown component for voting.  

| Param | Type | Description |
| --- | --- | --- |
| compType | <code>string</code> | The competition type, either `SOTW` or `BOTW`. |
| db | <code>Object</code> | The database utility object. |

**Example**  
```js
// Build a voting dropdown for BOTW competitions:const dropdown = await buildPollDropdown('BOTW', db);
```
<a name="updateLeaderboard"></a>

## updateLeaderboard(competitionType, db, client, constants) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Updates the Competition Leaderboard**Retrieves active competition details, fetches competition data from the WOM API,sorts participants by progress gained, formats the leaderboard, and sends or updatesthe leaderboard embed in the corresponding Discord channel.

**Kind**: global function  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the leaderboard has been updated.  

| Param | Type | Description |
| --- | --- | --- |
| competitionType | <code>string</code> | The competition type, either `SOTW` or `BOTW`. |
| db | <code>Object</code> | The database utility object. |
| client | <code>Object</code> | The Discord client instance. |
| constants | <code>Object</code> | Configuration constants (e.g., channel IDs). |

**Example**  
```js
// Update the SOTW leaderboard:await updateLeaderboard('SOTW', db, client, constants);
```
<a name="getActiveCompetition"></a>

## getActiveCompetition(competitionType, db) ⇒ <code>Promise.&lt;(Object\|null)&gt;</code>
🎯 **Fetches the Active Competition**Retrieves the active competition from the database based on the current timestamp.

**Kind**: global function  
**Returns**: <code>Promise.&lt;(Object\|null)&gt;</code> - Returns the active competition object or `null` if not found.  

| Param | Type | Description |
| --- | --- | --- |
| competitionType | <code>string</code> | The competition type, either `SOTW` or `BOTW`. |
| db | <code>Object</code> | The database utility object. |

**Example**  
```js
const activeComp = await getActiveCompetition('BOTW', db);
```
<a name="formatLeaderboardDescription"></a>

## formatLeaderboardDescription(participants, competitionType, metric, guild) ⇒ <code>string</code>
🎯 **Formats the Leaderboard Description**Constructs a formatted description string for the leaderboard embed, including player names,progress, and dynamically fetched metric emojis.

**Kind**: global function  
**Returns**: <code>string</code> - A formatted string containing the leaderboard description.  

| Param | Type | Description |
| --- | --- | --- |
| participants | <code>Array.&lt;Object&gt;</code> | Array of participant objects with progress details. |
| competitionType | <code>string</code> | The competition type, either `SOTW` or `BOTW`. |
| metric | <code>string</code> | The competition metric (e.g., "Mining", "Agility"). |
| guild | <code>Guild</code> | The Discord guild object used to fetch custom emojis. |

**Example**  
```js
const description = formatLeaderboardDescription(participants, 'SOTW', 'Mining', guild);
```
<a name="buildLeaderboardEmbed"></a>

## buildLeaderboardEmbed(competitionType, description, competitionId) ⇒ <code>EmbedBuilder</code>
🎯 **Builds the Leaderboard Embed**Creates a Discord embed for the leaderboard with a clickable title linking to the Wise Old Man website.

**Kind**: global function  
**Returns**: <code>EmbedBuilder</code> - A Discord EmbedBuilder instance representing the leaderboard.  

| Param | Type | Description |
| --- | --- | --- |
| competitionType | <code>string</code> | The competition type, either `SOTW` or `BOTW`. |
| description | <code>string</code> | The formatted leaderboard description. |
| competitionId | <code>number</code> | The ID of the competition. |

**Example**  
```js
const embed = buildLeaderboardEmbed('BOTW', description, competition.id);
```
<a name="sendOrUpdateEmbed"></a>

## sendOrUpdateEmbed(channel, competition, embed, db) ⇒ <code>Promise.&lt;void&gt;</code>
🎯 **Sends or Updates the Leaderboard Embed**If the competition already has a leaderboard message, this function attempts to fetch and edit it.If it fails (e.g., message not found), a new message is sent and the competition record is updated.

**Kind**: global function  
**Returns**: <code>Promise.&lt;void&gt;</code> - Resolves when the message has been sent or updated.  

| Param | Type | Description |
| --- | --- | --- |
| channel | <code>Channel</code> | The Discord channel where the leaderboard is posted. |
| competition | <code>Object</code> | The competition object containing leaderboard information. |
| embed | <code>EmbedBuilder</code> | The embed to send or update. |
| db | <code>Object</code> | The database utility object. |

**Example**  
```js
await sendOrUpdateEmbed(channel, competition, embed, db);
```
<a name="scheduleRotation"></a>

## scheduleRotation(endTime, rotationCallback, scheduledJobs)
🎯 **Schedules a Competition Rotation**Cancels any existing rotation job and schedules a new rotation job using the `node-schedule` package.When the scheduled time (`endTime`) is reached, the provided `rotationCallback` is invoked.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| endTime | <code>Date</code> | The time when the competition ends and the rotation should trigger. |
| rotationCallback | <code>function</code> | The callback function to execute when the job triggers. |
| scheduledJobs | <code>Map.&lt;string, any&gt;</code> | A map tracking scheduled jobs. The key used here is `'rotation'`. |

**Example**  
```js
// Schedule a rotation for a competition ending at a specific date:scheduleRotation(new Date('2025-02-03T15:00:00Z'), async () => {// Callback logic for rotation}, scheduledJobs);
```
<a name="scheduleRotationsOnStartup"></a>

## scheduleRotationsOnStartup(db, rotationCallback, constants, scheduledJobs)
🎯 **Schedules Rotations on Bot Startup**On bot startup, this function checks for active competitions and schedules a rotation based on the nearestcompetition end time. If no active competitions are found, it triggers an immediate rotation.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| db | <code>Object</code> | The database utility object used to query competition data. |
| rotationCallback | <code>function</code> | The callback function to invoke when a rotation is triggered. |
| constants | <code>Object</code> | A configuration object containing constant values (e.g., competition types). |
| scheduledJobs | <code>Map.&lt;string, any&gt;</code> | A map tracking scheduled jobs. |

**Example**  
```js
// On startup, schedule rotations:scheduleRotationsOnStartup(db, async () => {// Logic to start the next competition cycle}, constants, scheduledJobs);
```
<a name="calculateEndDate"></a>

## calculateEndDate(rotationWeeks) ⇒ <code>Date</code>
Calculates the end date for a competition based on the number of rotation weeks.The end date is set to the upcoming Sunday at 23:59 UTC, with additional weeks added as specified.- The competition start time is considered as one minute from the current time.- If today is Sunday, the competition will end on the next Sunday.

**Kind**: global function  
**Returns**: <code>Date</code> - The calculated end date set to Sunday at 23:59 UTC.  

| Param | Type | Description |
| --- | --- | --- |
| rotationWeeks | <code>number</code> | The number of weeks for the competition duration. |

**Example**  
```js
// Calculate the end date for a competition lasting 2 weeks:const endDate = calculateEndDate(2);console.log(endDate); // Outputs a Date object for the Sunday 23:59 UTC two weeks from now.
```
<a name="normalizeString"></a>

## normalizeString(str) ⇒ <code>string</code>
🎯 **Normalizes a String for Comparison**Trims the input string, converts it to lowercase, and replaces spaces, dashes, and underscoreswith a single underscore. Useful for standardizing metric names and other identifiers.

**Kind**: global function  
**Returns**: <code>string</code> - The normalized string.  

| Param | Type | Description |
| --- | --- | --- |
| str | <code>string</code> | The string to normalize. |

**Example**  
```js
const normalized = normalizeString('  My-Example_String  ');// normalized === 'my_example_string'
```
<a name="getImagePath"></a>

## getImagePath(metric) ⇒ <code>Promise.&lt;string&gt;</code>
🎯 **Retrieves the Image Path for a Given Metric**Looks up the file path for the provided metric name in the image cache database.Uses normalization to improve matching and logs details for debugging.

**Kind**: global function  
**Returns**: <code>Promise.&lt;string&gt;</code> - The file path associated with the metric.  
**Throws**:

- <code>Error</code> Throws an error if the metric is not found.


| Param | Type | Description |
| --- | --- | --- |
| metric | <code>string</code> | The metric name to look up. |

**Example**  
```js
const imagePath = await getImagePath('Mining');console.log(imagePath);
```
<a name="createCompetitionEmbed"></a>

## createCompetitionEmbed(client, type, metric, startsAt, endsAt, competitionId) ⇒ <code>Promise.&lt;{embeds: Array.&lt;EmbedBuilder&gt;, files: Array.&lt;AttachmentBuilder&gt;}&gt;</code>
🎯 **Creates a Competition Embed with Images and Voting Options**Builds an embed for a competition, complete with a thumbnail image, title, description,time fields, and additional styling. The embed includes a clickable title linking to the competition page.

**Kind**: global function  
**Returns**: <code>Promise.&lt;{embeds: Array.&lt;EmbedBuilder&gt;, files: Array.&lt;AttachmentBuilder&gt;}&gt;</code> - An object containing the embed and its attachments.  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>Client</code> | The Discord.js client. |
| type | <code>string</code> | The competition type: 'SOTW' or 'BOTW'. |
| metric | <code>string</code> | The metric name for the competition. |
| startsAt | <code>string</code> | ISO-formatted start date of the competition. |
| endsAt | <code>string</code> | ISO-formatted end date of the competition. |
| competitionId | <code>string</code> \| <code>number</code> | The unique identifier for the competition. |

**Example**  
```js
const { embeds, files } = await createCompetitionEmbed(client, 'SOTW', 'mining', '2023-03-01T12:00:00Z', '2023-03-08T23:59:00Z', 123);
```
<a name="formatTimestamp"></a>

## formatTimestamp(dateString) ⇒ <code>Object</code>
🎯 **Formats a Timestamp for Display**Converts an ISO date string into a human-readable object containing the day of the week,formatted time, and formatted date in UTC.

**Kind**: global function  
**Returns**: <code>Object</code> - An object with `dayOfWeek`, `formattedTime`, and `formattedDate` properties.  

| Param | Type | Description |
| --- | --- | --- |
| dateString | <code>string</code> | The ISO date string. |

**Example**  
```js
const timestamp = formatTimestamp('2023-03-15T18:30:00Z');console.log(timestamp.dayOfWeek); // e.g., "Wednesday"
```
<a name="buildLeaderboardDescription"></a>

## buildLeaderboardDescription(participations, competitionType, guild) ⇒ <code>string</code>
🎯 **Builds a Leaderboard Description**Constructs a text description for a competition leaderboard by listing the top 10 participants,including their display names and progress values.

**Kind**: global function  
**Returns**: <code>string</code> - The formatted leaderboard description.  

| Param | Type | Description |
| --- | --- | --- |
| participations | <code>Array.&lt;Object&gt;</code> | Array of participation objects with player and progress data. |
| competitionType | <code>string</code> | The competition type (unused here, but reserved for future customization). |
| guild | <code>Discord.Guild</code> | The Discord guild object (can be used to fetch emojis or other info). |

**Example**  
```js
const description = buildLeaderboardDescription(participations, 'SOTW', guild);
```
<a name="createVotingDropdown"></a>

## createVotingDropdown(options, type) ⇒ <code>ActionRowBuilder</code>
🎯 **Creates a Voting Dropdown Menu**Generates an ActionRow containing a StringSelectMenu for voting.If no options are provided, returns a disabled menu with a placeholder message.

**Kind**: global function  
**Returns**: <code>ActionRowBuilder</code> - An action row containing the voting dropdown.  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>Array.&lt;Object&gt;</code> | An array of option objects with keys: label, description, value, and optionally voteCount. |
| type | <code>string</code> | The competition type, used to customize the placeholder. |

**Example**  
```js
const dropdown = createVotingDropdown([{ label: 'Mining', description: 'Vote for Mining', value: 'mining', voteCount: 10 },{ label: 'Fishing', description: 'Vote for Fishing', value: 'fishing', voteCount: 5 }], 'SOTW');
```
<a name="tallyVotesAndRecordWinner"></a>

## tallyVotesAndRecordWinner(competition) ⇒ <code>Promise.&lt;(string\|null)&gt;</code>
🎯 **Tallies Votes and Determines the Winning Metric for a Competition**This function tallies votes for a completed competition by querying the database for votesassociated with the competition's ID. It groups the votes by the selected metric and countsthe number of votes per metric. If there is a tie between metrics with the highest vote count,it randomly selects one of them as the winner.

**Kind**: global function  
**Returns**: <code>Promise.&lt;(string\|null)&gt;</code> - A promise that resolves to the winning metric as a string, or `null` if no votes exist.  

| Param | Type | Description |
| --- | --- | --- |
| competition | <code>Object</code> | The completed competition object. Must include an `id` and `type` property. |

**Example**  
```js
// Example usage:const winningMetric = await tallyVotesAndRecordWinner(competition);if (winningMetric) {console.log(`The winning metric is: ${winningMetric}`);} else {console.log('No votes were recorded for this competition.');}
```
<a name="getAllFilesWithMetadata"></a>

## getAllFilesWithMetadata(dir) ⇒ <code>Array.&lt;{fileName: string, filePath: string}&gt;</code>
Recursively retrieves all files from a directory and its subdirectories along with metadata.This function scans the specified directory and all nested subdirectories to produce an arrayof objects. Each object contains:- `fileName`: The lowercase file name without its extension.- `filePath`: The relative path starting with "src/" to the file, with forward slashes as separators.

**Kind**: global function  
**Returns**: <code>Array.&lt;{fileName: string, filePath: string}&gt;</code> - An array of file metadata objects.  

| Param | Type | Description |
| --- | --- | --- |
| dir | <code>string</code> | The directory to scan. |

**Example**  
```js
const files = getAllFilesWithMetadata(resourcesPath);console.log(files);
```
<a name="populateImageCache"></a>

## populateImageCache() ⇒ <code>Promise.&lt;void&gt;</code>
Populates the image_cache table in the database with file metadata from the resources directory.This function performs the following steps:1. Retrieves all files from the resources directory using `getAllFilesWithMetadata`.2. Drops the existing image_cache table (if it exists) to ensure a fresh setup.3. Iterates over each file's metadata and attempts to update an existing database entry.If no existing entry is updated, it inserts a new record.

**Kind**: global function  
**Returns**: <code>Promise.&lt;void&gt;</code> - A promise that resolves when the image cache has been successfully updated.  
**Example**  
```js
// Run the script to populate the image cache.populateImageCache().then(() => logger.info('Image cache populated.')).catch(err => logger.error(err));
```
