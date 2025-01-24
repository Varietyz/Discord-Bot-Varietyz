## Modules

<dl>
<dt><a href="#module_config/constants">config/constants</a></dt>
<dd><p>Defines and exports all constant values used throughout the Varietyz Bot.
This includes general bot configurations, channel IDs, WOM API settings, rate limiting configurations,
and role definitions with associated emojis and colors.</p>
</dd>
<dt><a href="#module_modules/commands/removersn">modules/commands/removersn</a></dt>
<dd><p>Defines the <code>/removersn</code> slash command for the Varietyz Bot.
This command allows users to remove up to three registered RuneScape Names (RSNs) from their account.
It includes validation, rate limiting, database interactions, and an autocomplete feature for RSN suggestions.</p>
</dd>
<dt><a href="#module_modules/commands/rsn">modules/commands/rsn</a></dt>
<dd><p>Defines the <code>/rsn</code> slash command for the Varietyz Bot.
This command allows users to register their Old School RuneScape Name (RSN).
It includes validation, rate limiting, and handles special Easter egg RSNs with custom responses.</p>
</dd>
<dt><a href="#module_modules/commands/rsnlist">modules/commands/rsnlist</a></dt>
<dd><p>Defines the <code>/rsnlist</code> slash command for the Varietyz Bot.
This command retrieves and displays all registered RuneScape Names (RSNs) along with their associated ranks for clan members.</p>
</dd>
<dt><a href="#module_modules/functions/active_members">modules/functions/active_members</a></dt>
<dd><p>Utility functions for managing active and inactive clan members within the Varietyz Bot.
This module interacts with the WOM API to fetch player data, calculate member activity,
and update Discord voice channel names based on member activity.</p>
</dd>
<dt><a href="#module_modules/functions/auto_roles">modules/functions/auto_roles</a></dt>
<dd><p>Utility functions for managing automatic role assignments in the Varietyz Bot.
This module handles fetching and processing player data, merging data from multiple RSNs,
and assigning or removing Discord roles based on players&#39; hiscores and achievements.</p>
</dd>
<dt><a href="#module_modules/functions/logger">modules/functions/logger</a></dt>
<dd><p>Configures and exports a Winston logger instance with daily log rotation.
The logger handles logging to both the console and log files organized by year and month.
It also manages uncaught exceptions and unhandled promise rejections.</p>
</dd>
<dt><a href="#module_modules/functions/member_channel">modules/functions/member_channel</a></dt>
<dd><p>Utility functions for managing clan members within the Varietyz Bot.
Handles role assignments, updates clan member data, interacts with the WOM API,
and updates Discord channels with the latest member details.</p>
</dd>
<dt><a href="#module_modules/functions/name_changes">modules/functions/name_changes</a></dt>
<dd><p>Utility functions for handling player name changes within the Varietyz Bot.
This module interacts with the WOM API to fetch name changes, updates the database accordingly,
and manages associated Discord notifications.</p>
</dd>
<dt><a href="#module_modules/functions/player_data_extractor">modules/functions/player_data_extractor</a></dt>
<dd><p>Utility functions for extracting and managing player data.
Handles fetching data from external APIs, formatting data for database storage,
and ensuring data integrity within the SQLite database.</p>
</dd>
<dt><a href="#module_modules/tasks">modules/tasks</a></dt>
<dd><p>Defines scheduled tasks for the Varietyz Bot.
Each task includes a name, the function to execute, the interval at which to run,
and flags indicating whether to run on startup and as a scheduled task.</p>
</dd>
<dt><a href="#module_modules/utils">modules/utils</a></dt>
<dd><p>Utility functions for the Varietyz Bot.
Provides helper functions for normalizing RSNs, handling ranks, managing rate limits,
interacting with Discord channels, and making HTTP requests with retry logic.</p>
</dd>
<dt><a href="#module_scripts/create_db">scripts/create_db</a></dt>
<dd><p>Script to initialize and set up the SQLite database for the Varietyz Bot.
Creates necessary tables for storing registered RSNs, clan members, recent name changes, and player data.
Deletes any existing database file before creating a new one to ensure a clean setup.</p>
</dd>
<dt><a href="#module_utils/dbUtils">utils/dbUtils</a></dt>
<dd><p>Utility functions for interacting with the SQLite database.
Provides functions to execute queries and handle database operations.</p>
</dd>
<dt><a href="#module_utils/normalize">utils/normalize</a></dt>
<dd><p>Utility functions for normalizing RuneScape names.
Provides functions to standardize RSNs for consistent database storage and lookup.</p>
</dd>
</dl>

## Classes

<dl>
<dt><a href="#WOMApiClient">WOMApiClient</a></dt>
<dd><p>A client for interacting with the Wise Old Man (WOM) API.
Manages rate-limited requests, handles retries, and provides access to the WOM API endpoints.</p>
</dd>
</dl>

## Constants

<dl>
<dt><a href="#client">client</a> : <code>Client</code></dt>
<dd><p>Create a new Discord client instance with necessary intents.</p>
</dd>
<dt><a href="#commands">commands</a> : <code>Array.&lt;Object&gt;</code></dt>
<dd></dd>
<dt><a href="#functions">functions</a> : <code>Array.&lt;Object&gt;</code></dt>
<dd></dd>
</dl>

## Functions

<dl>
<dt><a href="#loadModules">loadModules(type)</a> ⇒ <code>Array.&lt;Object&gt;</code></dt>
<dd><p>Dynamically loads all modules of a given type (commands or functions) from the specified directory.</p>
</dd>
<dt><a href="#initializeBot">initializeBot()</a> ⇒ <code>Promise.&lt;void&gt;</code></dt>
<dd><p>Initializes the Discord bot by loading modules, registering slash commands, and logging in.</p>
</dd>
<dt><a href="#handleSlashCommand">handleSlashCommand(interaction)</a> ⇒ <code>Promise.&lt;void&gt;</code></dt>
<dd><p>Executes the appropriate slash command based on the interaction.</p>
</dd>
<dt><a href="#handleAutocomplete">handleAutocomplete(interaction)</a> ⇒ <code>Promise.&lt;void&gt;</code></dt>
<dd><p>Handles autocomplete interactions by delegating to the appropriate command&#39;s autocomplete handler.</p>
</dd>
</dl>

<a name="module_config/constants"></a>

## config/constants
Defines and exports all constant values used throughout the Varietyz Bot.This includes general bot configurations, channel IDs, WOM API settings, rate limiting configurations,and role definitions with associated emojis and colors.


* [config/constants](#module_config/constants)
    * [~GeneralBotConstants](#module_config/constants..GeneralBotConstants) : <code>object</code>
    * [~ChannelIDs](#module_config/constants..ChannelIDs) : <code>object</code>
    * [~RateLimitCache](#module_config/constants..RateLimitCache) : <code>object</code>
    * [~Ranks](#module_config/constants..Ranks) : <code>object</code>
    * [~Rank](#module_config/constants..Rank) : <code>Object</code>

<a name="module_config/constants..GeneralBotConstants"></a>

### config/constants~GeneralBotConstants : <code>object</code>
General configuration constants for the Varietyz Bot.

**Kind**: inner namespace of [<code>config/constants</code>](#module_config/constants)  
<a name="module_config/constants..ChannelIDs"></a>

### config/constants~ChannelIDs : <code>object</code>
Discord channel IDs used by the bot for various functionalities.

**Kind**: inner namespace of [<code>config/constants</code>](#module_config/constants)  
<a name="module_config/constants..RateLimitCache"></a>

### config/constants~RateLimitCache : <code>object</code>
Cache settings for rate limiting WOM API requests.

**Kind**: inner namespace of [<code>config/constants</code>](#module_config/constants)  
<a name="module_config/constants..Ranks"></a>

### config/constants~Ranks : <code>object</code>
Definitions for various roles within the Discord server, including associated emojis and colors.

**Kind**: inner namespace of [<code>config/constants</code>](#module_config/constants)  
<a name="module_config/constants..Rank"></a>

### config/constants~Rank : <code>Object</code>
**Kind**: inner typedef of [<code>config/constants</code>](#module_config/constants)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| emoji | <code>string</code> | The emoji associated with the rank. |
| role | <code>string</code> | The name of the Discord role. |
| color | <code>number</code> | The color code for the role embed (in hexadecimal). |

<a name="module_modules/commands/removersn"></a>

## modules/commands/removersn
Defines the `/removersn` slash command for the Varietyz Bot.This command allows users to remove up to three registered RuneScape Names (RSNs) from their account.It includes validation, rate limiting, database interactions, and an autocomplete feature for RSN suggestions.


* [modules/commands/removersn](#module_modules/commands/removersn)
    * [module.exports](#exp_module_modules/commands/removersn--module.exports) : <code>SlashCommandBuilder</code> ⏏
        * [~normalizeRsn(rsn)](#module_modules/commands/removersn--module.exports..normalizeRsn) ⇒ <code>string</code>
        * [~execute(interaction)](#module_modules/commands/removersn--module.exports..execute) ⇒ <code>Promise.&lt;void&gt;</code>
        * [~autocomplete(interaction)](#module_modules/commands/removersn--module.exports..autocomplete) ⇒ <code>Promise.&lt;void&gt;</code>

<a name="exp_module_modules/commands/removersn--module.exports"></a>

### module.exports : <code>SlashCommandBuilder</code> ⏏
Defines the `/removersn` slash command using Discord's SlashCommandBuilder.

**Kind**: Exported constant  
**Example**  
```js
// This command can be registered with Discord's APIconst removersnCommand = module.exports.data;
```
<a name="module_modules/commands/removersn--module.exports..normalizeRsn"></a>

#### module.exports~normalizeRsn(rsn) ⇒ <code>string</code>
Normalizes an RSN for consistent comparison.

**Kind**: inner method of [<code>module.exports</code>](#exp_module_modules/commands/removersn--module.exports)  
**Returns**: <code>string</code> - - Normalized RSN.  

| Param | Type | Description |
| --- | --- | --- |
| rsn | <code>string</code> | RSN to normalize. |

**Example**  
```js
const normalized = normalizeRsn('Player-One');logger.info(normalized); // 'player one'
```
<a name="module_modules/commands/removersn--module.exports..execute"></a>

#### module.exports~execute(interaction) ⇒ <code>Promise.&lt;void&gt;</code>
Executes the `/removersn` command, allowing users to remove up to three RSNs from their account.It handles validation, rate limiting, database interactions, and provides feedback to the user.

**Kind**: inner method of [<code>module.exports</code>](#exp_module_modules/commands/removersn--module.exports)  
**Returns**: <code>Promise.&lt;void&gt;</code> - - Resolves when the command has been executed.  

| Param | Type | Description |
| --- | --- | --- |
| interaction | <code>Discord.CommandInteraction</code> | The interaction object representing the command execution. |

**Example**  
```js
// Handler in your bot's command execution logicif (commandName === 'removersn') {await commands.removersn.execute(interaction);}
```
<a name="module_modules/commands/removersn--module.exports..autocomplete"></a>

#### module.exports~autocomplete(interaction) ⇒ <code>Promise.&lt;void&gt;</code>
Handles the autocomplete functionality for RSN options in the `/removersn` command.Suggests RSNs that the user has registered and match the current input.

**Kind**: inner method of [<code>module.exports</code>](#exp_module_modules/commands/removersn--module.exports)  
**Returns**: <code>Promise.&lt;void&gt;</code> - - Resolves when autocomplete suggestions have been sent.  

| Param | Type | Description |
| --- | --- | --- |
| interaction | <code>Discord.CommandInteraction</code> | The interaction object representing the autocomplete event. |

**Example**  
```js
// Handler in your bot's command execution logicif (commandName === 'removersn') {await commands.removersn.autocomplete(interaction);}
```
<a name="module_modules/commands/rsn"></a>

## modules/commands/rsn
Defines the `/rsn` slash command for the Varietyz Bot.This command allows users to register their Old School RuneScape Name (RSN).It includes validation, rate limiting, and handles special Easter egg RSNs with custom responses.


* [modules/commands/rsn](#module_modules/commands/rsn)
    * _static_
        * [.data](#module_modules/commands/rsn.data) : <code>SlashCommandBuilder</code>
    * _inner_
        * [~validateRsn(rsn)](#module_modules/commands/rsn..validateRsn) ⇒ <code>Object</code>
        * [~normalizeRsn(rsn)](#module_modules/commands/rsn..normalizeRsn) ⇒ <code>string</code>
        * [~fetchPlayerData(rsn)](#module_modules/commands/rsn..fetchPlayerData) ⇒ <code>Promise.&lt;(Object\|null)&gt;</code>
        * [~execute(interaction)](#module_modules/commands/rsn..execute) ⇒ <code>Promise.&lt;void&gt;</code>

<a name="module_modules/commands/rsn.data"></a>

### modules/commands/rsn.data : <code>SlashCommandBuilder</code>
Defines the `/rsn` slash command using Discord's SlashCommandBuilder.

**Kind**: static constant of [<code>modules/commands/rsn</code>](#module_modules/commands/rsn)  
**Example**  
```js
// This command can be registered with Discord's APIconst rsnCommand = module.exports.data;
```
<a name="module_modules/commands/rsn..validateRsn"></a>

### modules/commands/rsn~validateRsn(rsn) ⇒ <code>Object</code>
Validates the format of an RSN (RuneScape Name).

**Kind**: inner method of [<code>modules/commands/rsn</code>](#module_modules/commands/rsn)  
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
const validation = validateRsn('PlayerOne');logger.info(validation); // { valid: true, message: '' }
```
<a name="module_modules/commands/rsn..normalizeRsn"></a>

### modules/commands/rsn~normalizeRsn(rsn) ⇒ <code>string</code>
Normalizes an RSN for consistent comparison.

**Kind**: inner method of [<code>modules/commands/rsn</code>](#module_modules/commands/rsn)  
**Returns**: <code>string</code> - - Normalized RSN.  

| Param | Type | Description |
| --- | --- | --- |
| rsn | <code>string</code> | RSN to normalize. |

**Example**  
```js
const normalized = normalizeRsn('Player-One');logger.info(normalized); // 'player one'
```
<a name="module_modules/commands/rsn..fetchPlayerData"></a>

### modules/commands/rsn~fetchPlayerData(rsn) ⇒ <code>Promise.&lt;(Object\|null)&gt;</code>
Fetches player data from the Wise Old Man (WOM) API.

**Kind**: inner method of [<code>modules/commands/rsn</code>](#module_modules/commands/rsn)  
**Returns**: <code>Promise.&lt;(Object\|null)&gt;</code> - - Player data from WOM API or `null` if unavailable.  
**Throws**:

- <code>Error</code> - Throws an error if rate limited or an unexpected error occurs.


| Param | Type | Description |
| --- | --- | --- |
| rsn | <code>string</code> | The RSN to fetch data for. |

**Example**  
```js
const playerData = await fetchPlayerData('PlayerOne');if (playerData) {logger.info(playerData);}
```
<a name="module_modules/commands/rsn..execute"></a>

### modules/commands/rsn~execute(interaction) ⇒ <code>Promise.&lt;void&gt;</code>
Executes the `/rsn` command, allowing users to register their RSN.Handles validation, rate limiting, database interactions, and Easter egg responses.

**Kind**: inner method of [<code>modules/commands/rsn</code>](#module_modules/commands/rsn)  
**Returns**: <code>Promise.&lt;void&gt;</code> - - Resolves when the command has been executed.  

| Param | Type | Description |
| --- | --- | --- |
| interaction | <code>Discord.CommandInteraction</code> | The interaction object representing the command execution. |

**Example**  
```js
// Handler in your bot's command execution logicif (commandName === 'rsn') {await commands.rsn.execute(interaction);}
```
<a name="module_modules/commands/rsnlist"></a>

## modules/commands/rsnlist
Defines the `/rsnlist` slash command for the Varietyz Bot.This command retrieves and displays all registered RuneScape Names (RSNs) along with their associated ranks for clan members.


* [modules/commands/rsnlist](#module_modules/commands/rsnlist)
    * _static_
        * [.data](#module_modules/commands/rsnlist.data) : <code>SlashCommandBuilder</code>
    * _inner_
        * [~isValidEmbedSize(embedDescription, [maxDescriptionLength])](#module_modules/commands/rsnlist..isValidEmbedSize) ⇒ <code>boolean</code>
        * [~loadRSNData()](#module_modules/commands/rsnlist..loadRSNData) ⇒ <code>Promise.&lt;Object.&lt;string, Array.&lt;string&gt;&gt;&gt;</code>
        * [~loadClanMembers()](#module_modules/commands/rsnlist..loadClanMembers) ⇒ <code>Promise.&lt;Array.&lt;{name: string, rank: string}&gt;&gt;</code>
        * [~prepareUserContent(userId, rsns, clanMembers)](#module_modules/commands/rsnlist..prepareUserContent) ⇒ <code>string</code>
        * [~execute(interaction)](#module_modules/commands/rsnlist..execute) ⇒ <code>Promise.&lt;void&gt;</code>

<a name="module_modules/commands/rsnlist.data"></a>

### modules/commands/rsnlist.data : <code>SlashCommandBuilder</code>
Defines the `/rsnlist` slash command using Discord's SlashCommandBuilder.

**Kind**: static constant of [<code>modules/commands/rsnlist</code>](#module_modules/commands/rsnlist)  
**Example**  
```js
// This command can be registered with Discord's APIconst rsnListCommand = module.exports.data;
```
<a name="module_modules/commands/rsnlist..isValidEmbedSize"></a>

### modules/commands/rsnlist~isValidEmbedSize(embedDescription, [maxDescriptionLength]) ⇒ <code>boolean</code>
Validates whether the embed description size is within Discord's allowed limit.

**Kind**: inner method of [<code>modules/commands/rsnlist</code>](#module_modules/commands/rsnlist)  
**Returns**: <code>boolean</code> - - Returns `true` if the description size is valid, `false` otherwise.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| embedDescription | <code>string</code> |  | The content of the embed's description. |
| [maxDescriptionLength] | <code>number</code> | <code>4096</code> | The maximum allowed length for the embed description. |

**Example**  
```js
const isValid = isValidEmbedSize("Some description text", 4096);logger.info(isValid); // true
```
<a name="module_modules/commands/rsnlist..loadRSNData"></a>

### modules/commands/rsnlist~loadRSNData() ⇒ <code>Promise.&lt;Object.&lt;string, Array.&lt;string&gt;&gt;&gt;</code>
Loads all registered RSNs from the database.

**Kind**: inner method of [<code>modules/commands/rsnlist</code>](#module_modules/commands/rsnlist)  
**Returns**: <code>Promise.&lt;Object.&lt;string, Array.&lt;string&gt;&gt;&gt;</code> - - A promise that resolves to an object where keys are user IDs and values are arrays of RSNs.  
**Example**  
```js
const rsnData = await loadRSNData();logger.info(rsnData);// Output: { '123456789012345678': ['PlayerOne', 'PlayerTwo'], '876543210987654321': ['PlayerThree'] }
```
<a name="module_modules/commands/rsnlist..loadClanMembers"></a>

### modules/commands/rsnlist~loadClanMembers() ⇒ <code>Promise.&lt;Array.&lt;{name: string, rank: string}&gt;&gt;</code>
Loads all clan members from the database.

**Kind**: inner method of [<code>modules/commands/rsnlist</code>](#module_modules/commands/rsnlist)  
**Returns**: <code>Promise.&lt;Array.&lt;{name: string, rank: string}&gt;&gt;</code> - - A promise that resolves to an array of clan member objects.  
**Example**  
```js
const clanMembers = await loadClanMembers();logger.info(clanMembers);// Output: [ { name: 'PlayerOne', rank: 'Iron' }, { name: 'PlayerTwo', rank: 'Gold' } ]
```
<a name="module_modules/commands/rsnlist..prepareUserContent"></a>

### modules/commands/rsnlist~prepareUserContent(userId, rsns, clanMembers) ⇒ <code>string</code>
Prepares the embed content for a user by formatting their RSNs and associated ranks.

**Kind**: inner method of [<code>modules/commands/rsnlist</code>](#module_modules/commands/rsnlist)  
**Returns**: <code>string</code> - - A formatted string containing the user's mention and their RSNs with ranks.  

| Param | Type | Description |
| --- | --- | --- |
| userId | <code>string</code> | The Discord user ID. |
| rsns | <code>Array.&lt;string&gt;</code> | An array of RSNs linked to the user. |
| clanMembers | <code>Array.&lt;{name: string, rank: string}&gt;</code> | An array of clan member objects. |

**Example**  
```js
const content = prepareUserContent('123456789012345678', ['PlayerOne'], [{ name: 'PlayerOne', rank: 'Iron' }]);logger.info(content);// Output:// "\n<@123456789012345678>\n- 🟦[PlayerOne](https://wiseoldman.net/players/playerone)\n"
```
<a name="module_modules/commands/rsnlist..execute"></a>

### modules/commands/rsnlist~execute(interaction) ⇒ <code>Promise.&lt;void&gt;</code>
Executes the `/rsnlist` command, fetching and displaying all registered RSNs and their ranks.

**Kind**: inner method of [<code>modules/commands/rsnlist</code>](#module_modules/commands/rsnlist)  
**Returns**: <code>Promise.&lt;void&gt;</code> - - Resolves when the command has been executed.  

| Param | Type | Description |
| --- | --- | --- |
| interaction | <code>Discord.CommandInteraction</code> | The interaction object representing the command execution. |

**Example**  
```js
// Handler in your bot's command execution logicif (commandName === 'rsnlist') {await commands.rsnlist.execute(interaction);}
```
<a name="module_modules/functions/active_members"></a>

## modules/functions/active\_members
Utility functions for managing active and inactive clan members within the Varietyz Bot.This module interacts with the WOM API to fetch player data, calculate member activity,and update Discord voice channel names based on member activity.


* [modules/functions/active_members](#module_modules/functions/active_members)
    * [~playerProgress](#module_modules/functions/active_members..playerProgress) : <code>Object.&lt;string, DateTime&gt;</code>
    * [~updateVoiceData([maxRetries], [baseDelay])](#module_modules/functions/active_members..updateVoiceData) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~calculateProgressCount()](#module_modules/functions/active_members..calculateProgressCount) ⇒ <code>number</code>
    * [~calculateInactivity()](#module_modules/functions/active_members..calculateInactivity) ⇒ <code>number</code>
    * [~updateVoiceChannel(client)](#module_modules/functions/active_members..updateVoiceChannel) ⇒ <code>Promise.&lt;void&gt;</code>

<a name="module_modules/functions/active_members..playerProgress"></a>

### modules/functions/active_members~playerProgress : <code>Object.&lt;string, DateTime&gt;</code>
Object to store player progress data.Keys are player names (RSNs), and values are Luxon DateTime objects representing the last progression date.

**Kind**: inner constant of [<code>modules/functions/active\_members</code>](#module_modules/functions/active_members)  
<a name="module_modules/functions/active_members..updateVoiceData"></a>

### modules/functions/active_members~updateVoiceData([maxRetries], [baseDelay]) ⇒ <code>Promise.&lt;void&gt;</code>
Fetches player data from the WOM API and updates the `playerProgress` object.

**Kind**: inner method of [<code>modules/functions/active\_members</code>](#module_modules/functions/active_members)  
**Returns**: <code>Promise.&lt;void&gt;</code> - - Resolves when data is successfully fetched and processed.  
**Throws**:

- <code>Error</code> - Throws an error if all retry attempts fail.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [maxRetries] | <code>number</code> | <code>3</code> | The maximum number of retry attempts in case of failure. |
| [baseDelay] | <code>number</code> | <code>5000</code> | The base delay in milliseconds before retrying after a failure. |

**Example**  
```js
await updateVoiceData(5, 10000);
```
<a name="module_modules/functions/active_members..calculateProgressCount"></a>

### modules/functions/active_members~calculateProgressCount() ⇒ <code>number</code>
Calculates the number of active players who have progressed in the last 7 days.

**Kind**: inner method of [<code>modules/functions/active\_members</code>](#module_modules/functions/active_members)  
**Returns**: <code>number</code> - - The count of active players.  
**Example**  
```js
const activeCount = calculateProgressCount();logger.info(`Active Players: ${activeCount}`);
```
<a name="module_modules/functions/active_members..calculateInactivity"></a>

### modules/functions/active_members~calculateInactivity() ⇒ <code>number</code>
Calculates the number of inactive players who have not progressed in the last 21 days.

**Kind**: inner method of [<code>modules/functions/active\_members</code>](#module_modules/functions/active_members)  
**Returns**: <code>number</code> - - The count of inactive players.  
**Example**  
```js
const inactiveCount = calculateInactivity();logger.info(`Inactive Players: ${inactiveCount}`);
```
<a name="module_modules/functions/active_members..updateVoiceChannel"></a>

### modules/functions/active_members~updateVoiceChannel(client) ⇒ <code>Promise.&lt;void&gt;</code>
Updates the Discord voice channel name to reflect the current number of active clan members.It fetches and processes player data, calculates the active member count, and updates the channel name accordingly.

**Kind**: inner method of [<code>modules/functions/active\_members</code>](#module_modules/functions/active_members)  
**Returns**: <code>Promise.&lt;void&gt;</code> - - Resolves when the voice channel name has been updated.  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>Discord.Client</code> | The Discord client instance. |

**Example**  
```js
await updateVoiceChannel(client);
```
<a name="module_modules/functions/auto_roles"></a>

## modules/functions/auto\_roles
Utility functions for managing automatic role assignments in the Varietyz Bot.This module handles fetching and processing player data, merging data from multiple RSNs,and assigning or removing Discord roles based on players' hiscores and achievements.


* [modules/functions/auto_roles](#module_modules/functions/auto_roles)
    * [module.exports](#exp_module_modules/functions/auto_roles--module.exports) ⏏
        * [~getUserRSNs(userId)](#module_modules/functions/auto_roles--module.exports..getUserRSNs) ⇒ <code>Promise.&lt;Array.&lt;string&gt;&gt;</code>
        * [~getPlayerDataForRSN(rsn)](#module_modules/functions/auto_roles--module.exports..getPlayerDataForRSN) ⇒ <code>Promise.&lt;Object&gt;</code>
        * [~mergeRsnData(rsns)](#module_modules/functions/auto_roles--module.exports..mergeRsnData) ⇒ <code>Promise.&lt;Object&gt;</code>
        * [~fetchAndProcessMember(guild, userId)](#module_modules/functions/auto_roles--module.exports..fetchAndProcessMember) ⇒ <code>Promise.&lt;void&gt;</code>
        * [~handleHiscoresData(guild, member, rsns, hiscoresData)](#module_modules/functions/auto_roles--module.exports..handleHiscoresData) ⇒ <code>Promise.&lt;void&gt;</code>
        * [~createAchievementRoles(guild, member, hiscoresData, channelUpdate)](#module_modules/functions/auto_roles--module.exports..createAchievementRoles) ⇒ <code>Promise.&lt;void&gt;</code>
        * [~mapBossToRole(bossName)](#module_modules/functions/auto_roles--module.exports..mapBossToRole) ⇒ <code>string</code>
        * [~mapActivityToRole(activityName)](#module_modules/functions/auto_roles--module.exports..mapActivityToRole) ⇒ <code>string</code>
        * [~maybeAssignBossRole(guild, member, bossName, kills, playerName, channelUpdate)](#module_modules/functions/auto_roles--module.exports..maybeAssignBossRole) ⇒ <code>Promise.&lt;void&gt;</code>
        * [~maybeAssignActivityRole(guild, member, activityName, score, playerName, channelUpdate)](#module_modules/functions/auto_roles--module.exports..maybeAssignActivityRole) ⇒ <code>Promise.&lt;void&gt;</code>
        * [~createUpdateOsrsRoles(guild, member, hiscoresData, channelUpdate)](#module_modules/functions/auto_roles--module.exports..createUpdateOsrsRoles) ⇒ <code>Promise.&lt;void&gt;</code>

<a name="exp_module_modules/functions/auto_roles--module.exports"></a>

### module.exports ⏏
Exports the main function responsible for fetching and processing member data.

**Kind**: Exported member  
<a name="module_modules/functions/auto_roles--module.exports..getUserRSNs"></a>

#### module.exports~getUserRSNs(userId) ⇒ <code>Promise.&lt;Array.&lt;string&gt;&gt;</code>
Retrieves all RuneScape Names (RSNs) associated with a given Discord user from the database.

**Kind**: inner method of [<code>module.exports</code>](#exp_module_modules/functions/auto_roles--module.exports)  
**Returns**: <code>Promise.&lt;Array.&lt;string&gt;&gt;</code> - - A promise that resolves to an array of RSNs.  

| Param | Type | Description |
| --- | --- | --- |
| userId | <code>string</code> | The Discord user ID. |

**Example**  
```js
const rsns = await getUserRSNs('123456789012345678');logger.info(rsns); // ['PlayerOne', 'PlayerTwo']
```
<a name="module_modules/functions/auto_roles--module.exports..getPlayerDataForRSN"></a>

#### module.exports~getPlayerDataForRSN(rsn) ⇒ <code>Promise.&lt;Object&gt;</code>
Fetches player data for a specific RSN from the database.It standardizes the RSN before performing the query to ensure accurate retrieval.

**Kind**: inner method of [<code>module.exports</code>](#exp_module_modules/functions/auto_roles--module.exports)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - - A promise that resolves to an object mapping data keys to values.  

| Param | Type | Description |
| --- | --- | --- |
| rsn | <code>string</code> | The RuneScape Name to fetch data for. |

**Example**  
```js
const playerData = await getPlayerDataForRSN('PlayerOne');logger.info(playerData);
```
<a name="module_modules/functions/auto_roles--module.exports..mergeRsnData"></a>

#### module.exports~mergeRsnData(rsns) ⇒ <code>Promise.&lt;Object&gt;</code>
Merges hiscores data from multiple RSNs, ensuring that the highest values are retainedfor skills, boss kills, and activities. This allows treating multiple RSNs as a singlecombined account for role assignments.

**Kind**: inner method of [<code>module.exports</code>](#exp_module_modules/functions/auto_roles--module.exports)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - - A promise that resolves to the merged hiscores data.  

| Param | Type | Description |
| --- | --- | --- |
| rsns | <code>Array.&lt;string&gt;</code> | An array of RSNs to merge data from. |

**Example**  
```js
const mergedData = await mergeRsnData(['PlayerOne', 'PlayerTwo']);logger.info(mergedData);
```
<a name="module_modules/functions/auto_roles--module.exports..fetchAndProcessMember"></a>

#### module.exports~fetchAndProcessMember(guild, userId) ⇒ <code>Promise.&lt;void&gt;</code>
Fetches and processes data for a Discord guild member based on their associated RSNs.It retrieves RSNs from the database, fetches and merges hiscores data, and assignsappropriate Discord roles based on the merged data.

**Kind**: inner method of [<code>module.exports</code>](#exp_module_modules/functions/auto_roles--module.exports)  
**Returns**: <code>Promise.&lt;void&gt;</code> - - Resolves when the member has been processed.  

| Param | Type | Description |
| --- | --- | --- |
| guild | <code>Discord.Guild</code> | The Discord guild (server). |
| userId | <code>string</code> | The Discord user ID. |

**Example**  
```js
await fetchAndProcessMember(guild, '123456789012345678');
```
<a name="module_modules/functions/auto_roles--module.exports..handleHiscoresData"></a>

#### module.exports~handleHiscoresData(guild, member, rsns, hiscoresData) ⇒ <code>Promise.&lt;void&gt;</code>
Handles the assignment of roles based on hiscores data. It delegates to specificfunctions for OSRS roles and achievement-based roles.

**Kind**: inner method of [<code>module.exports</code>](#exp_module_modules/functions/auto_roles--module.exports)  
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
<a name="module_modules/functions/auto_roles--module.exports..createAchievementRoles"></a>

#### module.exports~createAchievementRoles(guild, member, hiscoresData, channelUpdate) ⇒ <code>Promise.&lt;void&gt;</code>
Assigns or updates boss kill and activity-based roles based on players' achievements.

**Kind**: inner method of [<code>module.exports</code>](#exp_module_modules/functions/auto_roles--module.exports)  
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
<a name="module_modules/functions/auto_roles--module.exports..mapBossToRole"></a>

#### module.exports~mapBossToRole(bossName) ⇒ <code>string</code>
Maps a boss name to its corresponding Discord role name.

**Kind**: inner method of [<code>module.exports</code>](#exp_module_modules/functions/auto_roles--module.exports)  
**Returns**: <code>string</code> - - The corresponding Discord role name.  

| Param | Type | Description |
| --- | --- | --- |
| bossName | <code>string</code> | The name of the boss. |

**Example**  
```js
const roleName = mapBossToRole('K\'ril Tsutsaroth'); // 'K\'ril Tsutsaroth'
```
<a name="module_modules/functions/auto_roles--module.exports..mapActivityToRole"></a>

#### module.exports~mapActivityToRole(activityName) ⇒ <code>string</code>
Maps an activity name to its corresponding Discord role name.

**Kind**: inner method of [<code>module.exports</code>](#exp_module_modules/functions/auto_roles--module.exports)  
**Returns**: <code>string</code> - - The corresponding Discord role name.  

| Param | Type | Description |
| --- | --- | --- |
| activityName | <code>string</code> | The name of the activity. |

**Example**  
```js
const roleName = mapActivityToRole('Clue Scrolls All'); // 'Clue Solver'
```
<a name="module_modules/functions/auto_roles--module.exports..maybeAssignBossRole"></a>

#### module.exports~maybeAssignBossRole(guild, member, bossName, kills, playerName, channelUpdate) ⇒ <code>Promise.&lt;void&gt;</code>
Assigns a boss-related Discord role to a member if they meet the kill threshold.Sends an embed message to the designated channel upon successful role assignment.

**Kind**: inner method of [<code>module.exports</code>](#exp_module_modules/functions/auto_roles--module.exports)  
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
<a name="module_modules/functions/auto_roles--module.exports..maybeAssignActivityRole"></a>

#### module.exports~maybeAssignActivityRole(guild, member, activityName, score, playerName, channelUpdate) ⇒ <code>Promise.&lt;void&gt;</code>
Assigns an activity-related Discord role to a member if they meet the score threshold.Sends an embed message to the designated channel upon successful role assignment.

**Kind**: inner method of [<code>module.exports</code>](#exp_module_modules/functions/auto_roles--module.exports)  
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
<a name="module_modules/functions/auto_roles--module.exports..createUpdateOsrsRoles"></a>

#### module.exports~createUpdateOsrsRoles(guild, member, hiscoresData, channelUpdate) ⇒ <code>Promise.&lt;void&gt;</code>
Assigns or updates OSRS skill-based roles (e.g., 99 Attack, 2277 Total) based on hiscores data.It also removes any 99 skill roles that the member no longer qualifies for.

**Kind**: inner method of [<code>module.exports</code>](#exp_module_modules/functions/auto_roles--module.exports)  
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
<a name="module_modules/functions/logger"></a>

## modules/functions/logger
Configures and exports a Winston logger instance with daily log rotation.The logger handles logging to both the console and log files organized by year and month.It also manages uncaught exceptions and unhandled promise rejections.


* [modules/functions/logger](#module_modules/functions/logger)
    * [~logFormat](#module_modules/functions/logger..logFormat) : <code>winston.Format</code>
    * [~logger](#module_modules/functions/logger..logger) : <code>winston.Logger</code>
    * [~getYearMonthPath()](#module_modules/functions/logger..getYearMonthPath) ⇒ <code>string</code>
    * [~createLogDirectories()](#module_modules/functions/logger..createLogDirectories) ⇒ <code>void</code>
    * [~initializeLogger()](#module_modules/functions/logger..initializeLogger) ⇒ <code>void</code>
    * ["logger" (error)](#module_modules/functions/logger..event_logger) ⇒ <code>void</code>
    * ["logger" (reason, promise)](#module_modules/functions/logger..event_logger) ⇒ <code>void</code>

<a name="module_modules/functions/logger..logFormat"></a>

### modules/functions/logger~logFormat : <code>winston.Format</code>
Custom log format combining timestamp and log level with the message.

**Kind**: inner constant of [<code>modules/functions/logger</code>](#module_modules/functions/logger)  
<a name="module_modules/functions/logger..logger"></a>

### modules/functions/logger~logger : <code>winston.Logger</code>
Creates and configures the Winston logger instance.The logger writes logs to the console and to daily rotated log files.

**Kind**: inner constant of [<code>modules/functions/logger</code>](#module_modules/functions/logger)  
**Example**  
```js
logger.info('This is an info message');logger.error('This is an error message');
```
<a name="module_modules/functions/logger..getYearMonthPath"></a>

### modules/functions/logger~getYearMonthPath() ⇒ <code>string</code>
Generates the directory path for logs based on the current year and month.

**Kind**: inner method of [<code>modules/functions/logger</code>](#module_modules/functions/logger)  
**Returns**: <code>string</code> - - The path to the log directory for the current year and month.  
**Example**  
```js
const logPath = getYearMonthPath();// logPath might be 'logs/2025/january'
```
<a name="module_modules/functions/logger..createLogDirectories"></a>

### modules/functions/logger~createLogDirectories() ⇒ <code>void</code>
Ensures that the necessary log directories exist.Creates year/month folders and a dedicated handler directory for audit files if they don't exist.

**Kind**: inner method of [<code>modules/functions/logger</code>](#module_modules/functions/logger)  
**Example**  
```js
createLogDirectories();
```
<a name="module_modules/functions/logger..initializeLogger"></a>

### modules/functions/logger~initializeLogger() ⇒ <code>void</code>
Initializes the logging system by ensuring necessary directories exist.Must be called before any logging occurs.

**Kind**: inner method of [<code>modules/functions/logger</code>](#module_modules/functions/logger)  
**Example**  
```js
initializeLogger();
```
<a name="module_modules/functions/logger..event_logger"></a>

### "logger" (error) ⇒ <code>void</code>
Handles uncaught exceptions by logging the error and exiting the process.

**Kind**: event emitted by [<code>modules/functions/logger</code>](#module_modules/functions/logger)  

| Param | Type | Description |
| --- | --- | --- |
| error | <code>Error</code> | The uncaught exception. |

**Example**  
```js
// This is handled automatically by the logger configuration.
```
<a name="module_modules/functions/logger..event_logger"></a>

### "logger" (reason, promise) ⇒ <code>void</code>
Handles unhandled promise rejections by logging the reason and the promise.

**Kind**: event emitted by [<code>modules/functions/logger</code>](#module_modules/functions/logger)  

| Param | Type | Description |
| --- | --- | --- |
| reason | <code>any</code> | The reason for the rejection. |
| promise | <code>Promise</code> | The promise that was rejected. |

**Example**  
```js
// This is handled automatically by the logger configuration.
```
<a name="module_modules/functions/member_channel"></a>

## modules/functions/member\_channel
Utility functions for managing clan members within the Varietyz Bot.Handles role assignments, updates clan member data, interacts with the WOM API,and updates Discord channels with the latest member details.


* [modules/functions/member_channel](#module_modules/functions/member_channel)
    * [~roleRange](#module_modules/functions/member_channel..roleRange) : <code>Array.&lt;string&gt;</code>
    * [~rankHierarchy](#module_modules/functions/member_channel..rankHierarchy) : <code>Object.&lt;string, number&gt;</code>
    * [~handleMemberRoles(member, roleName, guild, player, rank)](#module_modules/functions/member_channel..handleMemberRoles) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~updateData(client)](#module_modules/functions/member_channel..updateData) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~updateDatabase(newData)](#module_modules/functions/member_channel..updateDatabase) ⇒ <code>Promise.&lt;boolean&gt;</code>
    * [~updateClanChannel(client, cachedData)](#module_modules/functions/member_channel..updateClanChannel) ⇒ <code>Promise.&lt;void&gt;</code>

<a name="module_modules/functions/member_channel..roleRange"></a>

### modules/functions/member_channel~roleRange : <code>Array.&lt;string&gt;</code>
Represents the hierarchy of roles based on their rank names.Lower index indicates a lower rank.

**Kind**: inner constant of [<code>modules/functions/member\_channel</code>](#module_modules/functions/member_channel)  
<a name="module_modules/functions/member_channel..rankHierarchy"></a>

### modules/functions/member_channel~rankHierarchy : <code>Object.&lt;string, number&gt;</code>
Maps each role name to its hierarchy index for quick reference.

**Kind**: inner constant of [<code>modules/functions/member\_channel</code>](#module_modules/functions/member_channel)  
<a name="module_modules/functions/member_channel..handleMemberRoles"></a>

### modules/functions/member_channel~handleMemberRoles(member, roleName, guild, player, rank) ⇒ <code>Promise.&lt;void&gt;</code>
Handles the assignment and removal of roles for a Discord guild member based on their rank.It removes lower-ranked roles and assigns the appropriate role if not already present.

**Kind**: inner method of [<code>modules/functions/member\_channel</code>](#module_modules/functions/member_channel)  
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
<a name="module_modules/functions/member_channel..updateData"></a>

### modules/functions/member_channel~updateData(client) ⇒ <code>Promise.&lt;void&gt;</code>
Updates clan member data by fetching the latest information from the WOM API,updating roles, and refreshing the clan channel in Discord.

**Kind**: inner method of [<code>modules/functions/member\_channel</code>](#module_modules/functions/member_channel)  
**Returns**: <code>Promise.&lt;void&gt;</code> - - Resolves when the update process is complete.  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>Discord.Client</code> | The Discord client instance. |

**Example**  
```js
await updateData(client);
```
<a name="module_modules/functions/member_channel..updateDatabase"></a>

### modules/functions/member_channel~updateDatabase(newData) ⇒ <code>Promise.&lt;boolean&gt;</code>
Updates the 'clan_members' table in the database with new clan member data.It compares the current data with the new data and updates the database if changes are detected.

**Kind**: inner method of [<code>modules/functions/member\_channel</code>](#module_modules/functions/member_channel)  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - - Returns `true` if changes were detected and the database was updated, `false` otherwise.  

| Param | Type | Description |
| --- | --- | --- |
| newData | <code>Array.&lt;Object&gt;</code> | An array of objects containing player names and their ranks. |

**Example**  
```js
const changes = await updateDatabase(newData);if (changes) {logger.info('Database updated.');}
```
<a name="module_modules/functions/member_channel..updateClanChannel"></a>

### modules/functions/member_channel~updateClanChannel(client, cachedData) ⇒ <code>Promise.&lt;void&gt;</code>
Updates the Discord clan channel with the latest clan member data.It purges existing messages and sends updated information as embeds.

**Kind**: inner method of [<code>modules/functions/member\_channel</code>](#module_modules/functions/member_channel)  
**Returns**: <code>Promise.&lt;void&gt;</code> - - Resolves when the clan channel is updated.  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>Discord.Client</code> | The Discord client instance. |
| cachedData | <code>Array.&lt;Object&gt;</code> | An array of objects containing player data for the embeds. |

**Example**  
```js
await updateClanChannel(client, cachedData);
```
<a name="module_modules/functions/name_changes"></a>

## modules/functions/name\_changes
Utility functions for handling player name changes within the Varietyz Bot.This module interacts with the WOM API to fetch name changes, updates the database accordingly,and manages associated Discord notifications.


* [modules/functions/name_changes](#module_modules/functions/name_changes)
    * [~fetchNameChanges()](#module_modules/functions/name_changes..fetchNameChanges) ⇒ <code>Promise.&lt;Array.&lt;NameChange&gt;&gt;</code>
    * [~saveToDatabase(nameChanges)](#module_modules/functions/name_changes..saveToDatabase) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~updateRegisteredRSN(oldName, newName, channelManager)](#module_modules/functions/name_changes..updateRegisteredRSN) ⇒ <code>Promise.&lt;boolean&gt;</code>
    * [~processNameChanges(client)](#module_modules/functions/name_changes..processNameChanges) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~NameChange](#module_modules/functions/name_changes..NameChange) : <code>Object</code>

<a name="module_modules/functions/name_changes..fetchNameChanges"></a>

### modules/functions/name_changes~fetchNameChanges() ⇒ <code>Promise.&lt;Array.&lt;NameChange&gt;&gt;</code>
Fetches recent name changes from the WOM API for a specific group.

**Kind**: inner method of [<code>modules/functions/name\_changes</code>](#module_modules/functions/name_changes)  
**Returns**: <code>Promise.&lt;Array.&lt;NameChange&gt;&gt;</code> - - A promise that resolves to an array of name change records.  
**Example**  
```js
const nameChanges = await fetchNameChanges();logger.info(nameChanges);
```
<a name="module_modules/functions/name_changes..saveToDatabase"></a>

### modules/functions/name_changes~saveToDatabase(nameChanges) ⇒ <code>Promise.&lt;void&gt;</code>
Saves an array of name changes to the 'recent_name_changes' table in the database.Clears existing entries before inserting new ones to maintain the latest state.

**Kind**: inner method of [<code>modules/functions/name\_changes</code>](#module_modules/functions/name_changes)  
**Returns**: <code>Promise.&lt;void&gt;</code> - - Resolves when the operation is complete.  

| Param | Type | Description |
| --- | --- | --- |
| nameChanges | <code>Array.&lt;NameChange&gt;</code> | Array of name change objects to be saved. |

**Example**  
```js
await saveToDatabase(nameChanges);
```
<a name="module_modules/functions/name_changes..updateRegisteredRSN"></a>

### modules/functions/name_changes~updateRegisteredRSN(oldName, newName, channelManager) ⇒ <code>Promise.&lt;boolean&gt;</code>
Updates the 'registered_rsn' table with new RSN mappings based on name changes.Handles conflicts where the new RSN might already exist for the same or different users.Sends Discord notifications for successful updates and conflict resolutions.

**Kind**: inner method of [<code>modules/functions/name\_changes</code>](#module_modules/functions/name_changes)  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - - Resolves to `true` if the RSN was updated, `false` otherwise.  

| Param | Type | Description |
| --- | --- | --- |
| oldName | <code>string</code> | The old RuneScape Name (RSN) to be updated. |
| newName | <code>string</code> | The new RSN to replace the old one. |
| channelManager | <code>Discord.GuildChannelManager</code> | Discord channel manager for sending messages. |

**Example**  
```js
const updated = await updateRegisteredRSN('OldName', 'NewName', client.channels);if (updated) {logger.info('RSN updated successfully.');}
```
<a name="module_modules/functions/name_changes..processNameChanges"></a>

### modules/functions/name_changes~processNameChanges(client) ⇒ <code>Promise.&lt;void&gt;</code>
Processes name changes by fetching recent changes from the WOM API,saving them to the database, and updating the registered RSNs accordingly.Also handles dependencies and conflict resolutions based on the timestamp of changes.

**Kind**: inner method of [<code>modules/functions/name\_changes</code>](#module_modules/functions/name_changes)  
**Returns**: <code>Promise.&lt;void&gt;</code> - - Resolves when the name changes have been processed.  

| Param | Type | Description |
| --- | --- | --- |
| client | <code>Discord.Client</code> | Discord client instance. |

**Example**  
```js
await processNameChanges(client);
```
<a name="module_modules/functions/name_changes..NameChange"></a>

### modules/functions/name_changes~NameChange : <code>Object</code>
Represents a name change record.

**Kind**: inner typedef of [<code>modules/functions/name\_changes</code>](#module_modules/functions/name_changes)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| oldName | <code>string</code> | The original RuneScape Name (RSN) before the change. |
| newName | <code>string</code> | The new RSN after the change. |
| resolvedAt | <code>number</code> | The timestamp when the name change was resolved. |

<a name="module_modules/functions/player_data_extractor"></a>

## modules/functions/player\_data\_extractor
Utility functions for extracting and managing player data.Handles fetching data from external APIs, formatting data for database storage,and ensuring data integrity within the SQLite database.


* [modules/functions/player_data_extractor](#module_modules/functions/player_data_extractor)
    * [~sleep(ms)](#module_modules/functions/player_data_extractor..sleep) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~formatDataForSql(data)](#module_modules/functions/player_data_extractor..formatDataForSql) ⇒ <code>Object</code>
        * [~flattenDict(d, [parentKey], [sep])](#module_modules/functions/player_data_extractor..formatDataForSql..flattenDict) ⇒ <code>Object</code>
    * [~ensurePlayerDataTable()](#module_modules/functions/player_data_extractor..ensurePlayerDataTable) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~savePlayerDataToDb(playerName, rawData)](#module_modules/functions/player_data_extractor..savePlayerDataToDb) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~loadRegisteredRsnData()](#module_modules/functions/player_data_extractor..loadRegisteredRsnData) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [~fetchAndSaveRegisteredPlayerData()](#module_modules/functions/player_data_extractor..fetchAndSaveRegisteredPlayerData) ⇒ <code>Promise.&lt;{data: Array.&lt;Object&gt;, fetchFailed: boolean}&gt;</code>
    * [~removeNonMatchingPlayers(currentClanUsers)](#module_modules/functions/player_data_extractor..removeNonMatchingPlayers) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~fetchAndUpdatePlayerData()](#module_modules/functions/player_data_extractor..fetchAndUpdatePlayerData) ⇒ <code>Promise.&lt;void&gt;</code>

<a name="module_modules/functions/player_data_extractor..sleep"></a>

### modules/functions/player_data_extractor~sleep(ms) ⇒ <code>Promise.&lt;void&gt;</code>
Pauses execution for a specified number of milliseconds.

**Kind**: inner method of [<code>modules/functions/player\_data\_extractor</code>](#module_modules/functions/player_data_extractor)  
**Returns**: <code>Promise.&lt;void&gt;</code> - - A promise that resolves after the specified delay.  

| Param | Type | Description |
| --- | --- | --- |
| ms | <code>number</code> | Milliseconds to sleep. |

**Example**  
```js
// Sleeps for 2 secondsawait sleep(2000);
```
<a name="module_modules/functions/player_data_extractor..formatDataForSql"></a>

### modules/functions/player_data_extractor~formatDataForSql(data) ⇒ <code>Object</code>
Flattens a nested object into a single-level object with concatenated keys.Filters out undesired fields and renames keys for database insertion.This function replicates the old 'formatDataForCsv' but returns an objectsuitable for database storage rather than CSV lines.

**Kind**: inner method of [<code>modules/functions/player\_data\_extractor</code>](#module_modules/functions/player_data_extractor)  
**Returns**: <code>Object</code> - - The formatted and flattened data object.  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Object</code> | The nested data object to format. |

**Example**  
```js
const rawData = {player: {stats: {attack: 99,strength: 99},info: {username: 'PlayerOne',country: 'US'}}};const formattedData = formatDataForSql(rawData);// formattedData = { 'Stats_Attack': 99, 'Stats_Strength': 99 }
```
<a name="module_modules/functions/player_data_extractor..formatDataForSql..flattenDict"></a>

#### formatDataForSql~flattenDict(d, [parentKey], [sep]) ⇒ <code>Object</code>
Recursively flattens a nested object.

**Kind**: inner method of [<code>formatDataForSql</code>](#module_modules/functions/player_data_extractor..formatDataForSql)  
**Returns**: <code>Object</code> - - The flattened object.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| d | <code>Object</code> |  | The object to flatten. |
| [parentKey] | <code>string</code> | <code>&quot;&#x27;&#x27;&quot;</code> | The base key to prepend to each key. |
| [sep] | <code>string</code> | <code>&quot;&#x27;_&#x27;&quot;</code> | The separator between keys. |

<a name="module_modules/functions/player_data_extractor..ensurePlayerDataTable"></a>

### modules/functions/player_data_extractor~ensurePlayerDataTable() ⇒ <code>Promise.&lt;void&gt;</code>
Ensures the 'player_data' table exists in the SQLite database.If the table does not exist, it creates one with the specified schema.

**Kind**: inner method of [<code>modules/functions/player\_data\_extractor</code>](#module_modules/functions/player_data_extractor)  
**Returns**: <code>Promise.&lt;void&gt;</code> - - Resolves when the table is ensured.  
**Example**  
```js
await ensurePlayerDataTable();
```
<a name="module_modules/functions/player_data_extractor..savePlayerDataToDb"></a>

### modules/functions/player_data_extractor~savePlayerDataToDb(playerName, rawData) ⇒ <code>Promise.&lt;void&gt;</code>
Saves formatted player data to the SQLite database.It overwrites existing entries for the player to ensure data integrity.

**Kind**: inner method of [<code>modules/functions/player\_data\_extractor</code>](#module_modules/functions/player_data_extractor)  
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
<a name="module_modules/functions/player_data_extractor..loadRegisteredRsnData"></a>

### modules/functions/player_data_extractor~loadRegisteredRsnData() ⇒ <code>Promise.&lt;Object&gt;</code>
Loads all registered RSNs from the database.Returns a mapping of user IDs to their associated RSNs.

**Kind**: inner method of [<code>modules/functions/player\_data\_extractor</code>](#module_modules/functions/player_data_extractor)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - - A mapping of user IDs to arrays of RSNs.  
**Throws**:

- <code>Error</code> - Throws an error if the database query fails.

**Example**  
```js
const rsnData = await loadRegisteredRsnData();// rsnData = { 'user1': ['RSN1', 'RSN2'], 'user2': ['RSN3'] }
```
<a name="module_modules/functions/player_data_extractor..fetchAndSaveRegisteredPlayerData"></a>

### modules/functions/player_data_extractor~fetchAndSaveRegisteredPlayerData() ⇒ <code>Promise.&lt;{data: Array.&lt;Object&gt;, fetchFailed: boolean}&gt;</code>
Fetches and saves registered player data by retrieving data from the WOM APIand storing it in the SQLite database.

**Kind**: inner method of [<code>modules/functions/player\_data\_extractor</code>](#module_modules/functions/player_data_extractor)  
**Returns**: <code>Promise.&lt;{data: Array.&lt;Object&gt;, fetchFailed: boolean}&gt;</code> - - An object containing the processed clan data and a flag indicating if any fetches failed.  
**Throws**:

- <code>Error</code> - Throws an error if critical operations fail.

**Example**  
```js
const result = await fetchAndSaveRegisteredPlayerData();// result = { data: [...], fetchFailed: false }
```
<a name="module_modules/functions/player_data_extractor..removeNonMatchingPlayers"></a>

### modules/functions/player_data_extractor~removeNonMatchingPlayers(currentClanUsers) ⇒ <code>Promise.&lt;void&gt;</code>
Removes players from the 'player_data' table who are no longer part of the current clan.This ensures that the database remains clean and only contains relevant player data.

**Kind**: inner method of [<code>modules/functions/player\_data\_extractor</code>](#module_modules/functions/player_data_extractor)  
**Returns**: <code>Promise.&lt;void&gt;</code> - - Resolves when non-matching players are removed.  

| Param | Type | Description |
| --- | --- | --- |
| currentClanUsers | <code>Set.&lt;string&gt;</code> | A set of current clan user IDs. |

**Example**  
```js
const currentUsers = new Set(['player1', 'player2']);await removeNonMatchingPlayers(currentUsers);
```
<a name="module_modules/functions/player_data_extractor..fetchAndUpdatePlayerData"></a>

### modules/functions/player_data_extractor~fetchAndUpdatePlayerData() ⇒ <code>Promise.&lt;void&gt;</code>
Orchestrates the entire player data update process:1. Fetches data from WOM for each registered RSN.2. Saves the fetched data to the database.3. Removes any leftover data that no longer corresponds to registered RSNs.

**Kind**: inner method of [<code>modules/functions/player\_data\_extractor</code>](#module_modules/functions/player_data_extractor)  
**Returns**: <code>Promise.&lt;void&gt;</code> - - Resolves when the update process is complete.  
**Example**  
```js
await fetchAndUpdatePlayerData();
```
<a name="module_modules/tasks"></a>

## modules/tasks
Defines scheduled tasks for the Varietyz Bot.Each task includes a name, the function to execute, the interval at which to run,and flags indicating whether to run on startup and as a scheduled task.


* [modules/tasks](#module_modules/tasks)
    * [module.exports](#exp_module_modules/tasks--module.exports) : <code>Array.&lt;Task&gt;</code> ⏏
        * [~Task](#module_modules/tasks--module.exports..Task) : <code>Object</code>

<a name="exp_module_modules/tasks--module.exports"></a>

### module.exports : <code>Array.&lt;Task&gt;</code> ⏏
An array of scheduled tasks for the Varietyz Bot.Each task is an object adhering to the [Task](Task) typedef.

**Kind**: Exported member  
<a name="module_modules/tasks--module.exports..Task"></a>

#### module.exports~Task : <code>Object</code>
Represents a scheduled task.

**Kind**: inner typedef of [<code>module.exports</code>](#exp_module_modules/tasks--module.exports)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | The unique name of the task. |
| func | <code>function</code> | The asynchronous function to execute for the task. |
| interval | <code>number</code> | The interval in seconds at which the task should run. |
| runOnStart | <code>boolean</code> | Indicates whether the task should run immediately upon bot startup. |
| runAsTask | <code>boolean</code> | Indicates whether the task should be scheduled to run at regular intervals. |

<a name="module_modules/utils"></a>

## modules/utils
Utility functions for the Varietyz Bot.Provides helper functions for normalizing RSNs, handling ranks, managing rate limits,interacting with Discord channels, and making HTTP requests with retry logic.


* [modules/utils](#module_modules/utils)
    * [~normalizeRSN(rsn)](#module_modules/utils..normalizeRSN) ⇒ <code>string</code>
    * [~getRankEmoji(rank)](#module_modules/utils..getRankEmoji) ⇒ <code>string</code>
    * [~getRankColor(rank)](#module_modules/utils..getRankColor) ⇒ <code>number</code>
    * [~purgeChannel(channel)](#module_modules/utils..purgeChannel) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~formatExp(experience)](#module_modules/utils..formatExp) ⇒ <code>string</code>
    * [~formatRank(rank)](#module_modules/utils..formatRank) ⇒ <code>string</code>
    * [~sleep(ms)](#module_modules/utils..sleep) ⇒ <code>Promise.&lt;void&gt;</code>
    * [~fetchWithRetry(url, headers, [retries], [delay])](#module_modules/utils..fetchWithRetry) ⇒ <code>Promise.&lt;Object&gt;</code>

<a name="module_modules/utils..normalizeRSN"></a>

### modules/utils~normalizeRSN(rsn) ⇒ <code>string</code>
Normalizes a RuneScape Name (RSN) for consistent comparison.Removes spaces, converts to lowercase.

**Kind**: inner method of [<code>modules/utils</code>](#module_modules/utils)  
**Returns**: <code>string</code> - Normalized RSN.  

| Param | Type | Description |
| --- | --- | --- |
| rsn | <code>string</code> | RSN string to normalize. |

**Example**  
```js
// returns 'johndoe'normalizeRSN('John Doe');
```
<a name="module_modules/utils..getRankEmoji"></a>

### modules/utils~getRankEmoji(rank) ⇒ <code>string</code>
Retrieves the emoji representation for a given rank.

**Kind**: inner method of [<code>modules/utils</code>](#module_modules/utils)  
**Returns**: <code>string</code> - Corresponding rank emoji, or an empty string if not found.  

| Param | Type | Description |
| --- | --- | --- |
| rank | <code>string</code> | The rank of the clan member. |

**Example**  
```js
// returns '👑'getRankEmoji('Leader');
```
<a name="module_modules/utils..getRankColor"></a>

### modules/utils~getRankColor(rank) ⇒ <code>number</code>
Retrieves the color associated with a given rank.

**Kind**: inner method of [<code>modules/utils</code>](#module_modules/utils)  
**Returns**: <code>number</code> - Corresponding rank color in hexadecimal, or yellow (`0xffff00`) if not found.  

| Param | Type | Description |
| --- | --- | --- |
| rank | <code>string</code> | The rank of the clan member. |

**Example**  
```js
// returns 0xff0000getRankColor('Officer');
```
<a name="module_modules/utils..purgeChannel"></a>

### modules/utils~purgeChannel(channel) ⇒ <code>Promise.&lt;void&gt;</code>
Deletes all messages in a specified Discord channel.Fetches and deletes messages in batches to handle large volumes.

**Kind**: inner method of [<code>modules/utils</code>](#module_modules/utils)  

| Param | Type | Description |
| --- | --- | --- |
| channel | <code>Discord.TextChannel</code> | The Discord channel to purge. |

**Example**  
```js
// Purge messages in the specified channelpurgeChannel(channel);
```
<a name="module_modules/utils..formatExp"></a>

### modules/utils~formatExp(experience) ⇒ <code>string</code>
Formats experience points by converting them to an integer and adding commas.

**Kind**: inner method of [<code>modules/utils</code>](#module_modules/utils)  
**Returns**: <code>string</code> - Formatted experience points with commas.  

| Param | Type | Description |
| --- | --- | --- |
| experience | <code>number</code> \| <code>string</code> | The experience points to format. |

**Example**  
```js
// returns '1,234,567'formatExp(1234567);
```
<a name="module_modules/utils..formatRank"></a>

### modules/utils~formatRank(rank) ⇒ <code>string</code>
Formats a rank string by replacing underscores with spaces and capitalizing each word.

**Kind**: inner method of [<code>modules/utils</code>](#module_modules/utils)  
**Returns**: <code>string</code> - Formatted rank string.  

| Param | Type | Description |
| --- | --- | --- |
| rank | <code>string</code> | The rank string to format. |

**Example**  
```js
// returns 'Clan Leader'formatRank('clan_leader');
```
<a name="module_modules/utils..sleep"></a>

### modules/utils~sleep(ms) ⇒ <code>Promise.&lt;void&gt;</code>
Pauses execution for a specified number of milliseconds.

**Kind**: inner method of [<code>modules/utils</code>](#module_modules/utils)  

| Param | Type | Description |
| --- | --- | --- |
| ms | <code>number</code> | Milliseconds to sleep. |

**Example**  
```js
// Sleeps for 2 secondsawait sleep(2000);
```
<a name="module_modules/utils..fetchWithRetry"></a>

### modules/utils~fetchWithRetry(url, headers, [retries], [delay]) ⇒ <code>Promise.&lt;Object&gt;</code>
Makes an HTTP GET request with retry logic in case of failures.Handles rate limiting and not-found errors specifically.

**Kind**: inner method of [<code>modules/utils</code>](#module_modules/utils)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - - The response data.  
**Throws**:

- <code>Error</code> - Throws an error if all retries fail or if a 404 error occurs.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| url | <code>string</code> |  | The URL to fetch. |
| headers | <code>Object</code> |  | HTTP headers to include in the request. |
| [retries] | <code>number</code> | <code>10</code> | Number of retry attempts. |
| [delay] | <code>number</code> | <code>10000</code> | Delay between retries in milliseconds. |

**Example**  
```js
// Fetch data with retriesconst data = await fetchWithRetry('https://api.example.com/data', { Authorization: 'Bearer token' });
```
<a name="module_scripts/create_db"></a>

## scripts/create\_db
Script to initialize and set up the SQLite database for the Varietyz Bot.Creates necessary tables for storing registered RSNs, clan members, recent name changes, and player data.Deletes any existing database file before creating a new one to ensure a clean setup.


* [scripts/create_db](#module_scripts/create_db)
    * [~dbPath](#module_scripts/create_db..dbPath) : <code>string</code>
    * [~initializeDatabase()](#module_scripts/create_db..initializeDatabase)
    * [~createRegisteredRsnTable(db)](#module_scripts/create_db..createRegisteredRsnTable)
    * [~createClanMembersTable(db)](#module_scripts/create_db..createClanMembersTable)
    * [~createRecentNameChangesTable(db)](#module_scripts/create_db..createRecentNameChangesTable)
    * [~createPlayerDataTable(db)](#module_scripts/create_db..createPlayerDataTable)

<a name="module_scripts/create_db..dbPath"></a>

### scripts/create_db~dbPath : <code>string</code>
Path to the SQLite database file.

**Kind**: inner constant of [<code>scripts/create\_db</code>](#module_scripts/create_db)  
<a name="module_scripts/create_db..initializeDatabase"></a>

### scripts/create_db~initializeDatabase()
Initializes the SQLite database by deleting any existing database file,creating the necessary directories, and establishing a new database connection.

**Kind**: inner method of [<code>scripts/create\_db</code>](#module_scripts/create_db)  
<a name="module_scripts/create_db..createRegisteredRsnTable"></a>

### scripts/create_db~createRegisteredRsnTable(db)
Creates the 'registered_rsn' table in the SQLite database.This table stores the RuneScape names registered by users.

**Kind**: inner method of [<code>scripts/create\_db</code>](#module_scripts/create_db)  

| Param | Type | Description |
| --- | --- | --- |
| db | <code>sqlite3.Database</code> | The SQLite database instance. |

<a name="module_scripts/create_db..createClanMembersTable"></a>

### scripts/create_db~createClanMembersTable(db)
Creates the 'clan_members' table in the SQLite database.This table stores information about clan members.

**Kind**: inner method of [<code>scripts/create\_db</code>](#module_scripts/create_db)  

| Param | Type | Description |
| --- | --- | --- |
| db | <code>sqlite3.Database</code> | The SQLite database instance. |

<a name="module_scripts/create_db..createRecentNameChangesTable"></a>

### scripts/create_db~createRecentNameChangesTable(db)
Creates the 'recent_name_changes' table in the SQLite database.This table records recent name changes of players.

**Kind**: inner method of [<code>scripts/create\_db</code>](#module_scripts/create_db)  

| Param | Type | Description |
| --- | --- | --- |
| db | <code>sqlite3.Database</code> | The SQLite database instance. |

<a name="module_scripts/create_db..createPlayerDataTable"></a>

### scripts/create_db~createPlayerDataTable(db)
Creates the 'player_data' table in the SQLite database.This table stores various data points related to players.

**Kind**: inner method of [<code>scripts/create\_db</code>](#module_scripts/create_db)  

| Param | Type | Description |
| --- | --- | --- |
| db | <code>sqlite3.Database</code> | The SQLite database instance. |

<a name="module_utils/dbUtils"></a>

## utils/dbUtils
Utility functions for interacting with the SQLite database.Provides functions to execute queries and handle database operations.


* [utils/dbUtils](#module_utils/dbUtils)
    * [~dbPath](#module_utils/dbUtils..dbPath) : <code>string</code>
    * [~db](#module_utils/dbUtils..db) : <code>sqlite3.Database</code>
    * [~runQuery(query, [params])](#module_utils/dbUtils..runQuery) ⇒ <code>Promise.&lt;sqlite3.RunResult&gt;</code>
    * [~getAll(query, [params])](#module_utils/dbUtils..getAll) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
    * [~getOne(query, [params])](#module_utils/dbUtils..getOne) ⇒ <code>Promise.&lt;Object&gt;</code>

<a name="module_utils/dbUtils..dbPath"></a>

### utils/dbUtils~dbPath : <code>string</code>
Path to the SQLite database file.

**Kind**: inner constant of [<code>utils/dbUtils</code>](#module_utils/dbUtils)  
<a name="module_utils/dbUtils..db"></a>

### utils/dbUtils~db : <code>sqlite3.Database</code>
Initializes and maintains the SQLite database connection.Logs the connection status using the logger.

**Kind**: inner constant of [<code>utils/dbUtils</code>](#module_utils/dbUtils)  
<a name="module_utils/dbUtils..runQuery"></a>

### utils/dbUtils~runQuery(query, [params]) ⇒ <code>Promise.&lt;sqlite3.RunResult&gt;</code>
Executes a SQL query that modifies data (e.g., INSERT, UPDATE, DELETE).Returns the result object containing metadata about the operation.

**Kind**: inner method of [<code>utils/dbUtils</code>](#module_utils/dbUtils)  
**Returns**: <code>Promise.&lt;sqlite3.RunResult&gt;</code> - - A promise that resolves to the result of the query.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| query | <code>string</code> |  | The SQL query to execute. |
| [params] | <code>Array.&lt;any&gt;</code> | <code>[]</code> | The parameters to bind to the SQL query. |

**Example**  
```js
runQuery('INSERT INTO users (name, age) VALUES (?, ?)', ['Alice', 30]).then(result => {logger.info(`Rows affected: ${result.changes}`);}).catch(err => {logger.error(err);});
```
<a name="module_utils/dbUtils..getAll"></a>

### utils/dbUtils~getAll(query, [params]) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
Executes a SQL SELECT query and retrieves all matching rows.

**Kind**: inner method of [<code>utils/dbUtils</code>](#module_utils/dbUtils)  
**Returns**: <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code> - - A promise that resolves to an array of rows.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| query | <code>string</code> |  | The SQL SELECT query to execute. |
| [params] | <code>Array.&lt;any&gt;</code> | <code>[]</code> | The parameters to bind to the SQL query. |

**Example**  
```js
getAll('SELECT * FROM users WHERE age > ?', [25]).then(rows => {logger.info(rows);}).catch(err => {logger.error(err);});
```
<a name="module_utils/dbUtils..getOne"></a>

### utils/dbUtils~getOne(query, [params]) ⇒ <code>Promise.&lt;Object&gt;</code>
Executes a SQL SELECT query and retrieves a single matching row.

**Kind**: inner method of [<code>utils/dbUtils</code>](#module_utils/dbUtils)  
**Returns**: <code>Promise.&lt;Object&gt;</code> - - A promise that resolves to a single row object.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| query | <code>string</code> |  | The SQL SELECT query to execute. |
| [params] | <code>Array.&lt;any&gt;</code> | <code>[]</code> | The parameters to bind to the SQL query. |

**Example**  
```js
getOne('SELECT * FROM users WHERE id = ?', [1]).then(row => {logger.info(row);}).catch(err => {logger.error(err);});
```
<a name="module_utils/normalize"></a>

## utils/normalize
Utility functions for normalizing RuneScape names.Provides functions to standardize RSNs for consistent database storage and lookup.

<a name="module_utils/normalize..standardizeName"></a>

### utils/normalize~standardizeName(rsn) ⇒ <code>string</code>
Normalizes a RuneScape Name (RSN) for consistent database storage and lookup.The normalization process includes:- Trimming leading and trailing spaces.- Converting all characters to lowercase.- Replacing runs of '-' or '_' with a single space.

**Kind**: inner method of [<code>utils/normalize</code>](#module_utils/normalize)  
**Returns**: <code>string</code> - - The normalized RSN.  

| Param | Type | Description |
| --- | --- | --- |
| rsn | <code>string</code> | The RuneScape name to normalize. |

**Example**  
```js
// returns 'john doe'standardizeName('  John_Doe-- ');
```
<a name="WOMApiClient"></a>

## WOMApiClient
A client for interacting with the Wise Old Man (WOM) API.Manages rate-limited requests, handles retries, and provides access to the WOM API endpoints.

**Kind**: global class  

* [WOMApiClient](#WOMApiClient)
    * [new WOMApiClient()](#new_WOMApiClient_new)
    * [.handleWOMRateLimit()](#WOMApiClient+handleWOMRateLimit) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.retryRequest(endpoint, methodName, params, [retries])](#WOMApiClient+retryRequest) ⇒ <code>Promise.&lt;any&gt;</code>
    * [.request(endpoint, methodName, [params])](#WOMApiClient+request) ⇒ <code>Promise.&lt;any&gt;</code>

<a name="new_WOMApiClient_new"></a>

### new WOMApiClient()
Initializes the WOM API client with an API key and user agent.Sets rate limits based on the presence of an API key and validates the WOM group ID.

**Throws**:

- <code>Error</code> Throws an error if the `WOM_GROUP_ID` is invalid.

<a name="WOMApiClient+handleWOMRateLimit"></a>

### womApiClient.handleWOMRateLimit() ⇒ <code>Promise.&lt;void&gt;</code>
Ensures that the WOM API rate limit is not exceeded.Throws an error if the request limit is reached within the current 60-second window.

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

<a name="client"></a>

## client : <code>Client</code>
Create a new Discord client instance with necessary intents.

**Kind**: global constant  
<a name="commands"></a>

## commands : <code>Array.&lt;Object&gt;</code>
**Kind**: global constant  
<a name="functions"></a>

## functions : <code>Array.&lt;Object&gt;</code>
**Kind**: global constant  
<a name="loadModules"></a>

## loadModules(type) ⇒ <code>Array.&lt;Object&gt;</code>
Dynamically loads all modules of a given type (commands or functions) from the specified directory.

**Kind**: global function  
**Returns**: <code>Array.&lt;Object&gt;</code> - An array of loaded modules.  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>string</code> | The type of modules to load ('commands' or 'functions'). |

<a name="initializeBot"></a>

## initializeBot() ⇒ <code>Promise.&lt;void&gt;</code>
Initializes the Discord bot by loading modules, registering slash commands, and logging in.

**Kind**: global function  
<a name="handleSlashCommand"></a>

## handleSlashCommand(interaction) ⇒ <code>Promise.&lt;void&gt;</code>
Executes the appropriate slash command based on the interaction.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| interaction | <code>CommandInteraction</code> | The command interaction to handle. |

<a name="handleAutocomplete"></a>

## handleAutocomplete(interaction) ⇒ <code>Promise.&lt;void&gt;</code>
Handles autocomplete interactions by delegating to the appropriate command's autocomplete handler.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| interaction | <code>AutocompleteInteraction</code> | The autocomplete interaction to handle. |

