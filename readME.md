# Varietyz Bot

![Varietyz Bot Banner](https://i.ibb.co/sFRG1QW/Main-Banner.gif)

Welcome to **Varietyz Bot**, the ultimate Discord companion designed specifically for Old School RuneScape (OSRS) clans! Varietyz Bot offers a comprehensive suite of tools to enhance your clan's management, foster community engagement, and streamline your clan experience. Whether you're a clan leader looking to streamline clan management or a member eager to showcase your in-game accomplishments, Varietyz Bot has you covered.

---

## Table of Contents

- [Introduction](#introduction)
    - [Why Varietyz Bot?](#why-varietyz-bot)
- [Features](#features)
    - [📋 Manage RuneScape Names (RSNs)](#-manage-runescape-names-rsns-)
    - [🛡️ Automatic Role Assignments](#-automatic-role-assignments)
    - [📈 Track Member Activity](#-track-member-activity)
    - [🔄 Scheduled Tasks](#-scheduled-tasks)
    - [🛠️ Robust Logging](#-robust-logging)
- [How It Works](#how-it-works)
    - [Technology Stack](#technology-stack)
    - [Background Operations](#background-operations)
    - [Data Flow](#data-flow)
    - [RSN Maintenance in the Database](#rsn-maintenance-in-the-database)
    - [Automatic Database Maintenance](#automatic-database-maintenance)
- [Project Status](#project-status)
    - [Upcoming Features](#upcoming-features)
    - [Contribution and Feedback](#contribution-and-feedback)
- [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
    - [Configuration](#configuration)
    - [Launching the Bot](#launching-the-bot)
- [How to Use](#how-to-use)
    - [🔧 Slash Commands](#-slash-commands)
        - [Register Your RSN (`/rsn`)](#register-your-rsn-rsn)
        - [Remove RSNs (`/remove_rsn`)](#remove-rsns-remove_rsn)
    - [Admin Commands](#admin-commands)
        - [View Registered RSNs (`/rsn_list`)](#view-registered-rsns-rsn_list)
        - [Remove RSN (`/admin_remove_rsn`)](#admin_remove_rsn)
        - [Rename RSN (`/admin_rename_rsn`)](#admin_rename_rsn)
        - [Check Activity (`/check_activity`)](#check_activity)
- [Customization](#customization)
    - [Setting Up Roles](#setting-up-roles)
    - [Configuring Channels](#configuring-channels)
- [Modules](#modules)
- [Classes](#classes)
- [Functions](#functions)
- [Scripts](#scripts)
- [Utilities](#utilities)
- [WOMApiClient](#womapiclient)
- [License](#license)
- [Contact](#contact)
- [Acknowledgments](#acknowledgments)
- [Glossary](#glossary)
- [Frequently Asked Questions (FAQ)](#frequently-asked-questions-faq)
- [Contributing](#contributing)

---

## Introduction

Managing a Discord clan for Old School RuneScape can be challenging, especially when it comes to tracking members' in-game progress, assigning roles based on achievements, and keeping the community engaged. **Varietyz Bot** simplifies these tasks by automating role assignments, tracking player data, and providing insightful analytics—all within your Discord server.

### Why Varietyz Bot?

- **Automation:** Reduces manual tasks by automating role assignments based on in-game achievements.
- **Engagement:** Keeps your clan members engaged with real-time updates and interactive commands.
- **Organization:** Maintains an organized clan roster with up-to-date RSN (RuneScape Name) information.
- **Integration:** Seamlessly integrates with the Wise Old Man (WOM) API to fetch and display comprehensive player data.
- **Ongoing Development:** Varietyz Bot is an ongoing project subject to frequent updates and enhancements, focusing on complete automation of WOM integration alongside Discord and custom APIs to keep your OSRS clan up-to-date automatically based on WOM group configurations.

---

## Features

### 📋 Manage RuneScape Names (RSNs)

**Varietyz Bot** allows clan members to register and manage their RuneScape Names (RSNs) directly within Discord. This ensures that your clan roster is always current and accurate.

- **Register Your RSN (`/rsn`):** Easily add your RSN to the clan database. This enables the bot to track your in-game achievements and assign appropriate roles.

    _Example:_

    ```
    /rsn DragonSlayer99
    ```

- **Remove RSNs (`/remove_rsn`):** If you need to remove your RSNs, use this command to manage up to three RSNs securely. Includes a confirmation prompt to prevent accidental removals.

    _Example:_

    ```
    /remove_rsn DragonSlayer99 OldHero123
    ```

- **View Registered RSNs (`/rsn_list`):** Administrators can view all RSNs registered within the clan along with their associated ranks. This provides transparency and allows admins to monitor member registrations.

    _Example:_

    ```
    /rsn_list
    ```

### 🛡️ Automatic Role Assignments

**Varietyz Bot** automatically assigns and manages roles based on your in-game achievements, activity levels, and participation in group events. This not only saves time but also adds a layer of gamification to your Discord server.

- **Boss Kill Roles:** Earn roles by defeating specific bosses in OSRS. The more bosses you defeat, the higher your rank!

    _Example:_ Defeating K'ril Tsutsaroth 150 times might grant you the "K'ril Tsutsaroth Slayer" role.

- **Activity-Based Roles:** Stay active in the game and complete challenges to earn special roles. This encourages continuous participation and engagement.

    _Example:_ Completing 200 Clue Scrolls All could earn you the "Clue Solver" role.

- **Skill-Based Roles:** Achieve milestones like 99 Attack or 2277 Total Experience to receive prestigious roles that showcase your dedication and skill.

    _Example:_ Achieving 99 Attack grants you the "Master of Attack" role.

- **Event Participation Roles:** New roles are assigned to players who actively participate in clan-wide events.

    _Example:_ Completing the "Winter Clan Challenge" grants the "Winter Challenger" role.

### 📈 Track Member Activity

Keeping track of each member's activity ensures that the clan remains active and engaged. **Varietyz Bot** monitors player activity and updates Discord channels accordingly.

- **Active & Inactive Members:** The bot monitors member activity and categorizes players as active or inactive based on their in-game progress. Voice channel names reflect these statuses to encourage re-engagement.

    _Example:_ An active member might be shown as "Active: 15 Players," while inactive members are labeled accordingly.

- **Player Data Integration:** Integrates with the Wise Old Man (WOM) API to fetch real-time player statistics, ensuring that all member data is current and accurate.

### 🔄 Scheduled Tasks

To maintain efficiency and ensure data integrity, **Varietyz Bot** performs regular scheduled tasks.

- **Regular Updates:** The bot automatically updates member data, roles, and channel information at set intervals, ensuring that everything stays up-to-date without manual intervention.

    _Example:_ Daily updates at midnight to refresh player statistics and role assignments.

- **Name Change Monitoring:** Automatically detects and handles player name changes, updating the clan roster to reflect the latest RSNs.

### 🛠️ Robust Logging

Monitoring the bot's performance and troubleshooting issues is made easy with comprehensive logging features.

- **Comprehensive Logs:** Keeps detailed logs of all bot activities, errors, and interactions. This helps in maintaining smooth operations and quickly addressing any issues that arise.

    _Example:_ Logs are organized by year and month, making it easy to track changes over time.

---

## How It Works

To give you a clearer understanding of how **Varietyz Bot** functions behind the scenes, here's a detailed explanation of its operations, technologies, and processes.

### Technology Stack

**Varietyz Bot** is built using a combination of reliable and efficient technologies that work together to provide a seamless experience:

- **Node.js:** A JavaScript runtime environment that allows the bot to run efficiently on various platforms. It's known for its non-blocking, event-driven architecture, which makes it ideal for real-time applications like Discord bots.
- **Discord.js:** A powerful library that enables easy interaction with Discord's API. It handles everything from sending messages to managing roles and responding to commands.
- **Wise Old Man (WOM) API:** An external service that provides detailed data about OSRS players, including stats, achievements, and activities. **Varietyz Bot** uses this API to fetch and display up-to-date player information.
- **SQLite:** A lightweight, file-based database system used to store and manage clan data, including registered RSNs, member information, and player statistics. SQLite is chosen for its simplicity and efficiency, making it perfect for small to medium-sized applications.
- **Winston Logger:** A versatile logging library that records the bot's activities, errors, and other important events. This aids in monitoring the bot's performance and troubleshooting any issues that arise.

### Background Operations

**Varietyz Bot** operates continuously in the background, performing several key functions to ensure your clan runs smoothly:

1. **Data Fetching:**

    - **RSN Registration:** When a member registers their RSN using the `/rsn` command, the bot sends a request to the WOM API to retrieve the player's data.
    - **Scheduled Updates:** At regular intervals (e.g., daily), the bot fetches updated data for all registered RSNs to keep member information current. This ensures that roles and statuses reflect the latest in-game achievements and activities.

2. **Role Management:**

    - **Automatic Assignments:** Based on the fetched player data, the bot assigns or removes roles according to predefined criteria (e.g., number of boss kills, skill levels).
    - **Activity Tracking:** The bot monitors member activity to categorize them as active or inactive, updating roles and channel names accordingly. This helps maintain an engaged and active clan.

3. **Database Management:**

    - **Storing Data:** All registered RSNs, member roles, and player statistics are stored in the SQLite database. This centralized storage ensures easy access and management of clan data.
    - **Handling Updates:** When a member removes an RSN or changes their name, the bot updates the database to reflect these changes accurately. This keeps the clan roster organized and up-to-date.

4. **Logging:**
    - **Activity Logs:** Every action the bot takes, including role assignments and data updates, is logged for transparency and troubleshooting.
    - **Error Handling:** Any errors encountered during operations are recorded in the logs to facilitate quick resolution and maintain the bot's reliability.

### Data Flow

Understanding the flow of data within **Varietyz Bot** helps in grasping how different components interact:

1. **Member Interaction:**

    - A clan member uses a slash command (e.g., `/rsn`) to register their RSN.
    - The bot processes the command, validates the RSN, and stores it in the SQLite database.

2. **Fetching Data:**

    - The bot sends a request to the WOM API using the provided RSN to retrieve player data.
    - The WOM API responds with detailed statistics, achievements, and activity data.

3. **Processing Data:**

    - The bot analyzes the fetched data to determine appropriate roles based on predefined criteria.
    - It updates the SQLite database with the latest player information to keep records accurate.

4. **Assigning Roles:**

    - Based on the processed data, the bot assigns or removes roles within the Discord server.
    - Roles are visually represented with specific emojis and colors for easy identification and engagement.

5. **Scheduled Updates:**

    - At set intervals, the bot repeats the data fetching and processing steps to ensure all information remains up-to-date.
    - It also handles any new name changes or updates to member activity, maintaining the clan's organizational integrity.

6. **Logging:**

    - All operations, including successful actions and errors, are logged using Winston Logger.
    - Logs are organized systematically (by year and month) for easy access and review, aiding in maintenance and troubleshooting.

### RSN Maintenance in the Database

Maintaining accurate and up-to-date RuneScape Names (RSNs) is crucial for effective clan management. **Varietyz Bot** employs several strategies to ensure RSNs are properly maintained within its database:

1. **Registration and Validation:**

    - When a member registers an RSN using the `/rsn` command, the bot validates the RSN by querying the WOM API.
    - Valid RSNs are stored in the `registered_rsn` table in the SQLite database, linked to the member's Discord user ID.

2. **Handling Multiple RSNs:**

    - Members can register up to three RSNs, allowing them to track multiple in-game accounts.
    - Each RSN is stored separately but associated with the same Discord user, enabling comprehensive tracking and role assignments across all registered accounts.

3. **Updating RSNs:**

    - If a member changes their RSN or wishes to remove an existing one, they can use the `/remove_rsn` command.
    - The bot updates the `registered_rsn` table by removing the specified RSNs and revoking any roles associated with them.
    - This ensures that outdated or incorrect RSNs do not clutter the database or affect role assignments.

4. **Automated Synchronization:**

    - **Varietyz Bot** periodically synchronizes the RSN data with the WOM API to fetch the latest player statistics.
    - This synchronization ensures that any changes in a player's achievements or activity levels are reflected in their roles within the Discord server.

5. **Name Change Monitoring:**

    - The bot continuously monitors for any name changes reported by the WOM API.
    - If a member changes their RSN in the WOM group, the bot updates the `registered_rsn` table accordingly and adjusts roles to match the new RSN.

6. **Conflict Resolution:**

    - In cases where multiple members attempt to register the same RSN or when RSNs are already associated with different users, the bot handles conflicts gracefully by notifying the involved members and preventing duplicate entries.

7. **Data Integrity:**

    - The SQLite database enforces data integrity through constraints and validations, ensuring that each RSN is unique and correctly linked to the appropriate Discord user.
    - Regular database maintenance tasks, such as cleaning up inactive RSNs and archiving old data, are performed to keep the database optimized and efficient.

### Automatic Database Maintenance

To ensure the database remains efficient and up-to-date, **Varietyz Bot** incorporates automatic database maintenance routines:

1. **Scheduled Cleanup:**

    - The bot periodically scans the database to remove RSNs that are no longer active or associated with any clan members.
    - This prevents the accumulation of obsolete data and maintains optimal database performance.

2. **Data Archiving:**

    - Historical data, such as past achievements and role assignments, are archived separately to allow for long-term tracking without bloating the main database.
    - Archiving ensures that the bot can provide detailed historical insights while keeping the primary data streamlined.

3. **Integrity Checks:**

    - Regular integrity checks are performed to identify and rectify any inconsistencies or corrupt entries within the database.
    - Automated scripts verify the consistency of relationships between tables, ensuring that RSNs, clan members, and their associated data remain accurately linked.

4. **Backup Procedures:**

    - Automated backups of the database are created at regular intervals to prevent data loss in case of unforeseen issues.
    - Backups are stored securely and can be restored easily to maintain the continuity of clan management operations.

5. **Performance Optimization:**

    - Indexes and optimized queries are employed to enhance the speed and efficiency of database operations.
    - The bot monitors query performance and adjusts indexing strategies as needed to accommodate the growing size of the clan's data.

By implementing these automatic maintenance strategies, **Varietyz Bot** ensures that the database remains robust, efficient, and reliable, providing a solid foundation for all clan management activities.

---

## Project Status

**Varietyz Bot** is an **ongoing project** that is continuously evolving based on user feedback and emerging needs within the OSRS community. As an active development project, it is subject to frequent updates, enhancements, and optimizations to provide the best possible experience for its users.

### Upcoming Features

- **Enhanced Custom API Integrations:** Expanding integration capabilities with other OSRS-related APIs to enrich player data and clan management features.
- **Advanced Analytics:** Introducing more in-depth analytics and reporting tools to help clan leaders make informed decisions.
- **User Interface Improvements:** Developing a web dashboard for easier management and monitoring of clan activities and member data.
- **Mobile Support:** Ensuring that all bot functionalities are accessible and optimized for mobile devices.
- **Automated Database Maintenance Enhancements:** Further refining the automated database maintenance processes to improve efficiency and reliability.

### Contribution and Feedback

Your contributions and feedback are invaluable to the growth and improvement of **Varietyz Bot**. Whether you're reporting a bug, suggesting a feature, or contributing code, your involvement helps shape the future of the project.

---

## Getting Started

Setting up **Varietyz Bot** is straightforward. Follow the steps below to get your bot up and running in your Discord server.

### Prerequisites

Before installing **Varietyz Bot**, ensure you have the following:

- **Node.js:** Make sure you have Node.js installed. You can download it from [Node.js Official Website](https://nodejs.org/).
- **Discord Account:** You need a Discord account to create and manage your server.
- **Discord Server:** Have a Discord server where you have administrative privileges to add the bot.
- **Wise Old Man (WOM) API Key:** Obtain an API key from the [Wise Old Man](https://wiseoldman.net/) website to allow the bot to fetch player data.

### Installation

1. **Clone the Repository**

    Begin by cloning the Varietyz Bot repository to your local machine:

    ```bash
    git clone https://github.com/varietyz/varietyz-bot.git
    cd varietyz-bot
    ```

2. **Install Dependencies**

    Install the necessary packages using `npm`:

    ```bash
    npm install
    ```

3. **Set Up the Database**

    Initialize the SQLite database by running the setup script:

    ```bash
    node scripts/create_db.js
    ```

    This script will create the required database tables and ensure a clean setup.

### Configuration

1. **Create a Discord Bot**

    - Navigate to the [Discord Developer Portal](https://discord.com/developers/applications).
    - Click on "New Application" and provide a name for your bot.
    - Go to the "Bot" section, click "Add Bot," and confirm.
    - **Important:** Copy the bot token and keep it secure. You'll need it for configuration.

2. **Configure Environment Variables**

    Create a `.env` file in the root directory of the project and add the following configurations:

    ```env
    DISCORD_TOKEN=your_discord_bot_token
    CLIENT_ID=your_discord_client_id
    GUILD_ID=your_discord_guild_id
    WOM_API_KEY=your_wise_old_man_api_key
    WOM_GROUP_ID=your_wise_old_man_group_id
    ```

    - `DISCORD_TOKEN`: The token you copied from the Discord Developer Portal.
    - `CLIENT_ID`: Your Discord application's client ID.
    - `GUILD_ID`: The ID of your Discord server where the bot will operate.
    - `WOM_API_KEY`: API key for the Wise Old Man API (if required).
    - `WOM_GROUP_ID`: The group ID from Wise Old Man to track.

3. **Invite the Bot to Your Server**

    - In the Discord Developer Portal, navigate to the "OAuth2" section.
    - Under "Scopes," select `bot` and `applications.commands`.
    - Under "Bot Permissions," select the necessary permissions:
        - **Manage Roles**
        - **Manage Channels**
        - **Send Messages**
        - **Embed Links**
        - **Read Message History**
        - **View Channels**
    - Copy the generated OAuth2 URL and paste it into your browser to invite the bot to your Discord server.

### Launching the Bot

Start the bot by running:

```bash
npm start
```

Upon successful launch, the bot will connect to your Discord server and begin managing roles, tracking RSNs, and performing scheduled tasks.

---

## How to Use

Interacting with **Varietyz Bot** is simple and intuitive through Discord's slash commands. Below are the primary commands you can use to manage your clan effectively.

### 🔧 Slash Commands

**Varietyz Bot** utilizes Discord's slash commands for seamless interaction. Here’s how you can use them:

#### Register Your RSN (`/rsn`)

**Purpose:** Register your Old School RuneScape Name (RSN) with the clan to enable tracking and role assignments.

**How to Use:**

1. In your Discord server, type `/rsn` followed by your RSN.
2. The bot will validate and register your RSN.

**Example:**

```
/rsn DragonSlayer99
```

**What Happens:**

- Your RSN is added to the clan database.
- The bot fetches your player data from the WOM API.
- Appropriate roles based on your achievements are assigned automatically.

#### Remove RSNs (`/remove_rsn`)

**Purpose:** Remove up to three of your registered RSNs from your account, useful if you've changed your RSN or no longer wish to track certain accounts. Includes a confirmation prompt to prevent accidental removals.

**How to Use:**

1. Type `/remove_rsn` followed by the RSNs you wish to remove.
2. Confirm the removal when prompted.
3. The bot will process the removal and update your roles accordingly.

**Example:**

```
/remove_rsn DragonSlayer99 OldHero123
```

**What Happens:**

- The specified RSNs are removed from your account after confirmation.
- Associated roles are revoked if no longer applicable.
- Confirmation is sent to you in Discord.

### Admin Commands

**Note:** These commands are restricted to administrators.

#### `/rsn_list`

**Description:** View a comprehensive list of all RSNs registered within the clan along with their associated ranks.

**How to Use:**

1. As an administrator, type `/rsn_list` in your Discord server.
2. The bot will display a formatted list of RSNs and ranks.

**Example:**

```
/rsn_list
```

**What Happens:**

- A neatly formatted embed message appears, listing all clan members' RSNs and their current ranks.
- This allows admins to monitor and recognize member achievements.

#### `/admin_remove_rsn`

**Description:** Remove a registered RSN from a specified guild member.

**Usage:**

```
/admin_remove_rsn <Member> <RSN>
```

**Features:**

- **Targeted Removal:** Specify which member's RSN to remove.
- **Validation:** Ensures the RSN exists before removal.
- **Confirmation Prompt:** Adds an extra layer of security against accidental deletions.
- **Autocomplete:** Helps in selecting valid members and RSNs.

**Example:**

```
/admin_remove_rsn @User DragonSlayer99
```

**What Happens:**

- The specified RSN is removed from the targeted member's account after confirmation.
- Associated roles are revoked if no longer applicable.
- Confirmation is sent to the admin in Discord.

#### `/admin_rename_rsn`

**Description:** Rename a registered RSN of a guild member.

**Usage:**

```
/admin_rename_rsn <Member> <Current_RSN> <New_RSN>
```

**Features:**

- **Validation:** Ensures the new RSN follows the required format and doesn't conflict with existing RSNs.
- **API Verification:** Confirms the new RSN exists via the Wise Old Man API.
- **Confirmation Prompt:** Prevents unintended renaming actions.
- **Autocomplete:** Assists in selecting valid members and RSNs.

**Example:**

```
/admin_rename_rsn @User DragonSlayer99 DragonMaster100
```

**What Happens:**

- The member's RSN is updated from `DragonSlayer99` to `DragonMaster100` after confirmation.
- Associated roles are updated based on the new RSN's achievements.
- Confirmation is sent to the admin in Discord.

#### `/check_activity`

**Description:** Check the current activity status of clan members.

**Usage:**

```
/check_activity <Status>
```

**Parameters:**

- `<Status>`: The activity status to filter by. Options include `Active` or `Inactive`.

**Features:**

- **View Active Members:** Displays a list of currently active members based on recent in-game activity.
- **View Inactive Members:** Shows members who have been inactive for a specified period.
- **Filters:** Allows filtering by specific criteria such as roles or activity levels.
- **Reports:** Generates a report summarizing the activity statistics for the clan.
- **Autocomplete:** Provides autocomplete options for the `Status` parameter.

**Example:**

```
/check_activity Active
```

**What Happens:**

- The bot retrieves and displays the current active or inactive member counts based on the provided status.
- Optionally, it can provide a detailed report if configured.
- Helps administrators monitor clan engagement and identify members who may need encouragement to participate.

---

## Customization

**Varietyz Bot** is highly customizable to fit the unique needs of your clan. Below are some ways you can tailor the bot to better serve your community.

### Setting Up Roles

Roles in Discord help in categorizing members based on their achievements and participation. Here's how to set them up:

1. **Define Roles:** Decide which roles you want the bot to manage. Common roles include:

    - **Leader**
    - **Officer**
    - **Member**
    - **Boss Slayer**
    - **Clue Solver**
    - **Skill Master**

2. **Assign Emojis and Colors:** For better visual representation, assign specific emojis and colors to each role.

    _Example:_

    - **Leader**: 👑 (Gold)
    - **Officer**: 🛡️ (Silver)
    - **Member**: 🧑‍🤝‍🧑 (Blue)
    - **Boss Slayer**: 🐉 (Red)

3. **Configure in `.env` or Configuration Files:**
    - Specify the role names, associated emojis, and colors in your configuration files to ensure the bot assigns them correctly based on achievements.

### Configuring Channels

Channels in Discord can be used to display information and facilitate communication. **Varietyz Bot** can manage specific channels to reflect member data.

1. **Clan Channel:** A dedicated channel where the bot posts updates about member achievements, role assignments, and activity status.

2. **Voice Channels:** Dynamic voice channels that update their names based on the number of active or inactive members, encouraging participation.

3. **Setup:**
    - Define the channels in your Discord server.
    - Provide the channel IDs in the `.env` file or the bot’s configuration to enable automated updates.

---

## Modules

<details>
  <summary>Click to expand modules</summary>

### config/constants

Defines and exports all constant values used throughout the Varietyz Bot. This includes general bot configurations, channel IDs, WOM API settings, rate limiting configurations, and role definitions with associated emojis and colors.

### modules/commands/remove_rsn

Defines the `/remove_rsn` slash command for the Varietyz Bot. This command allows users to remove up to three registered RuneScape Names (RSNs) from their account. It includes validation, rate limiting, database interactions, a confirmation prompt, and an autocomplete feature for RSN suggestions.

### modules/commands/rsn

Defines the `/rsn` slash command for the Varietyz Bot. This command allows users to register their Old School RuneScape Name (RSN). It includes validation, rate limiting, and handles special Easter egg RSNs with custom responses.

### modules/commands/rsn_list

Defines the `/rsn_list` slash command for administrators. This command retrieves and displays all registered RuneScape Names (RSNs) along with their associated ranks for clan members.

### modules/commands/admin_check_activity

Defines the `/check_activity` slash command for administrators. This command allows admins to check the current activity status of clan members, view active and inactive members, apply filters, and generate activity reports.

### modules/processing/active_members

Utility functions for managing active and inactive clan members within the Varietyz Bot. This module interacts with the WOM API to fetch player data, calculate member activity, and update Discord voice channel names based on member activity.

### modules/processing/auto_roles

Utility functions for managing automatic role assignments in the Varietyz Bot. This module handles fetching and processing player data, merging data from multiple RSNs, and assigning or removing Discord roles based on players' hiscores and achievements.

### modules/processing/logger

Configures and exports a Winston logger instance with daily log rotation. The logger handles logging to both the console and log files organized by year and month. It also manages uncaught exceptions and unhandled promise rejections.

### modules/processing/member_channel

Utility functions for managing clan members within the Varietyz Bot. Handles role assignments, updates clan member data, interacts with the WOM API, and updates Discord channels with the latest member details.

### modules/processing/name_changes

Utility functions for handling player name changes within the Varietyz Bot. This module interacts with the WOM API to fetch name changes, updates the database accordingly, and manages associated Discord notifications.

### modules/processing/player_data_extractor

Utility functions for extracting and managing player data. Handles fetching data from external APIs, formatting data for database storage, and ensuring data integrity within the SQLite database.

### tasks

Defines scheduled tasks for the Varietyz Bot. Each task includes a name, the function to execute, the interval at which to run, and flags indicating whether to run on startup and as a scheduled task.

### modules/utils

Utility functions for the Varietyz Bot. Provides helper functions for normalizing RSNs, handling ranks, managing rate limits, interacting with Discord channels, and making HTTP requests with retry logic.

### scripts/create_db

Script to initialize and set up the SQLite database for the Varietyz Bot. Creates necessary tables for storing registered RSNs, clan members, recent name changes, and player data. Deletes any existing database file before creating a new one to ensure a clean setup.

### utils/dbUtils

Utility functions for interacting with the SQLite database. Provides functions to execute queries and handle database operations.

### utils/normalize

Utility functions for normalizing RuneScape names. Provides functions to standardize RSNs for consistent database storage and lookup.

### utils/calculateActivity

Utility functions for managing player activity data in the Varietyz Bot's SQLite database. This module provides functions for ensuring the existence of the `active_inactive` table, retrieving the last fetch time, and calculating active and inactive player counts based on their last progress.

### utils/fetchPlayerData

Utility function for fetching player data from the Wise Old Man (WOM) API. Handles potential errors such as non-existent players, rate limiting, and unexpected issues.

### utils/lastFetchedTime

Utility functions for managing player fetch times in a SQLite database. Provides functions for ensuring the existence of the `player_fetch_times` table, retrieving the last fetch time, and updating the fetch timestamp for a specific player's RuneScape Name (RSN).

### utils/logger

Winston logger utility for the Varietyz Bot. Configures and exports a Winston logger instance with daily log rotation and enhanced error handling. Handles logging to both the console and log files, manages log directories, rotates logs daily, and handles uncaught exceptions and unhandled promise rejections.

### utils/normalizeRsn

Utility function for normalizing RuneScape names (RSNs). Ensures RSNs are stored in a consistent format for database operations and efficient lookups.

### utils/purgeChannel

Utility function for managing Discord channels in the Varietyz Bot. Provides a function to purge messages from a specified Discord channel while respecting rate limits. Optimized to handle large volumes of messages by processing them in batches.

### utils/sleepUtil

Utility function for creating delays in execution. Provides a simple mechanism to pause asynchronous operations for a specified duration.

### utils/validateRsn

Utility functions for validating RuneScape names (RSNs). Ensures RSNs meet specific format criteria for consistent database storage and lookup.

### utils/rankUtils

Utility functions for managing RuneScape clan ranks in the Varietyz Bot. Provides tools for retrieving rank-specific details, formatting experience points, and normalizing rank strings.

</details>

---

## Classes

<details>
  <summary>Click to expand classes</summary>

### WOMApiClient

A client for interacting with the Wise Old Man (WOM) API. Manages rate-limited requests, handles retries, and provides access to the WOM API endpoints.

**Methods:**

- **handleWOMRateLimit() ⇒ `Promise<void>`**

    Ensures that the WOM API rate limit is not exceeded. Throws an error if the request limit is reached within the current 60-second window.

- **retryRequest(endpoint, methodName, params, [retries]) ⇒ `Promise<any>`**

    Retries a failed API request with exponential backoff.

- **request(endpoint, methodName, [params]) ⇒ `Promise<any>`**

    Makes a request to the WOM API with rate limiting and retries.

</details>

---

## Functions

<details>
  <summary>Click to expand functions</summary>

### loadModules(type) ⇒ `Array<Object>`

Dynamically loads all modules of a given type (commands or functions) from the specified directory.

- **Param:** `type` (`string`) - The type of modules to load ('commands' or 'functions').

### initializeBot() ⇒ `Promise<void>`

Initializes the Discord bot by loading modules, registering slash commands, and logging in.

### handleSlashCommand(interaction) ⇒ `Promise<void>`

Executes the appropriate slash command based on the interaction.

- **Param:** `interaction` (`CommandInteraction`) - The command interaction to handle.

### handleAutocomplete(interaction) ⇒ `Promise<void>`

Handles autocomplete interactions by delegating to the appropriate command's autocomplete handler.

- **Param:** `interaction` (`AutocompleteInteraction`) - The autocomplete interaction to handle.

</details>

---

## Scripts

<details>
  <summary>Click to expand scripts</summary>

### scripts/create_db

Script to initialize and set up the SQLite database for the Varietyz Bot. Creates necessary tables for storing registered RSNs, clan members, recent name changes, and player data. Deletes any existing database file before creating a new one to ensure a clean setup.

</details>

---

## Utilities

<details>
  <summary>Click to expand utilities</summary>

### utils/dbUtils

Utility functions for interacting with the SQLite database. Provides functions to execute queries and handle database operations.

### utils/normalize

Utility functions for normalizing RuneScape names. Provides functions to standardize RSNs for consistent database storage and lookup.

### utils/calculateActivity

Utility functions for managing player activity data in the Varietyz Bot's SQLite database. This module provides functions for ensuring the existence of the `active_inactive` table, retrieving the last fetch time, and calculating active and inactive player counts based on their last progress.

### utils/fetchPlayerData

Utility function for fetching player data from the Wise Old Man (WOM) API. Handles potential errors such as non-existent players, rate limiting, and unexpected issues.

### utils/lastFetchedTime

Utility functions for managing player fetch times in a SQLite database. Provides functions for ensuring the existence of the `player_fetch_times` table, retrieving the last fetch time, and updating the fetch timestamp for a specific player's RuneScape Name (RSN).

### utils/logger

Winston logger utility for the Varietyz Bot. Configures and exports a Winston logger instance with daily log rotation and enhanced error handling. Handles logging to both the console and log files, manages log directories, rotates logs daily, and handles uncaught exceptions and unhandled promise rejections.

### utils/normalizeRsn

Utility function for normalizing RuneScape names (RSNs). Ensures RSNs are stored in a consistent format for database operations and efficient lookups.

### utils/purgeChannel

Utility function for managing Discord channels in the Varietyz Bot. Provides a function to purge messages from a specified Discord channel while respecting rate limits. Optimized to handle large volumes of messages by processing them in batches.

### utils/sleepUtil

Utility function for creating delays in execution. Provides a simple mechanism to pause asynchronous operations for a specified duration.

### utils/validateRsn

Utility functions for validating RuneScape names (RSNs). Ensures RSNs meet specific format criteria for consistent database storage and lookup.

### utils/rankUtils

Utility functions for managing RuneScape clan ranks in the Varietyz Bot. Provides tools for retrieving rank-specific details, formatting experience points, and normalizing rank strings.

</details>

---

## License

This project is licensed under the [BSD 2-Clause](LICENSE). You are free to use, modify, and distribute it as per the license terms.

---

## Contact

Have questions, suggestions, or need support? Reach out to me!

- **Discord:** [@jaybane](https://discordapp.com/users/406828985696387081)
- **Email:** [jay.bane@outlook.com](mailto:jay.bane@outlook.com)

I'm here to help and eager to hear your feedback!

---

## Acknowledgments

A big thank you to all the tools and communities that made **Varietyz Bot** possible:

- **Wise Old Man (WOM) API:** For providing comprehensive player data that powers the bot’s tracking features.
- **Discord.js:** The powerful library that enables seamless interactions between Varietyz Bot and Discord.
- **Community Contributors:** Special thanks to all the contributors who have helped improve Varietyz Bot through their valuable feedback and code contributions.

---

## Glossary

To help you better understand the terminology used in this README, here's a quick glossary of terms:

### **Discord-Related Terms**

- **RSN (RuneScape Name):** The unique username a player uses in Old School RuneScape.
- **Bot Token:** A unique identifier that allows a bot to connect and interact with Discord's API.
- **Client ID:** The unique identifier for a Discord application, used to authenticate the bot.
- **Guild ID:** The unique identifier for a Discord server.
- **Channel ID:** The unique identifier for a specific channel within a Discord server.
- **Permissions:** The rights granted to users or bots to perform certain actions within a Discord server, such as managing roles or channels.
- **Embeds:** Richly formatted messages in Discord that can include images, links, and other media.
- **Command Interaction:** An event in Discord that occurs when a user invokes a slash command.
- **Autocomplete Interaction:** An event in Discord that provides suggestions as a user types a command.

---

### **Programming and Development Terms**

- **API (Application Programming Interface):** A set of rules that allows different software entities to communicate with each other.
- **API Key:** A unique identifier used to authenticate requests to an API, ensuring secure and controlled access.
- **JSON (JavaScript Object Notation):** A lightweight data-interchange format that's easy for humans to read and write and easy for machines to parse and generate.
- **Module:** A reusable piece of code that encapsulates related functions, classes, or variables.
- **Script:** A file containing code that performs a specific task or set of tasks.
- **Function:** A block of code designed to perform a particular task, which can be called with arguments to execute.
- **Utility Functions:** Helper functions that perform common, often repeated tasks to simplify code.
- **Class:** A blueprint for creating objects in object-oriented programming, defining their properties and behaviors.
- **Object-Oriented Programming (OOP):** A programming paradigm based on the concept of objects, which can contain data and methods.
- **Error Handling:** The process of responding to and managing errors that occur during the execution of a program.
- **Logging:** The process of recording information about a program's operation, used for debugging and monitoring.
- **Rate Limiting:** Restrictions placed on how frequently certain actions can be performed, such as API requests, to prevent abuse.
- **Exponential Backoff:** A strategy for retrying failed operations by waiting increasingly longer intervals between retries.
- **Fork:** A personal copy of another user's repository that allows you to freely experiment with changes without affecting the original project.
- **Pull Request:** A method of submitting contributions to a project by proposing changes that the project maintainers can review and merge.
- **CLI (Command Line Interface):** A text-based interface used to interact with software or scripts by typing commands.
- **npm (Node Package Manager):** A package manager for JavaScript that allows developers to install and manage software packages.

---

## Frequently Asked Questions (FAQ)

**Q1: What is Varietyz Bot?**

- **A1:** Varietyz Bot is a Discord bot designed to help manage OSRS clans by tracking player data, assigning roles based on achievements, and enhancing community engagement.

**Q2: Do I need programming knowledge to set up Varietyz Bot?**

- **A2:** While some basic understanding of using command-line interfaces and editing configuration files is helpful, the setup process is straightforward and well-documented.

**Q3: How does Varietyz Bot track player achievements?**

- **A3:** Varietyz Bot uses the Wise Old Man (WOM) API to fetch real-time data about players' in-game activities, achievements, and statistics, which it then uses to manage roles and track activity.

**Q4: Can Varietyz Bot handle multiple RSNs per user?**

- **A4:** Yes, members can register multiple RSNs using the `/rsn` command, allowing for comprehensive tracking of their in-game activities across different accounts.

**Q5: Is my data secure with Varietyz Bot?**

- **A5:** Yes, all data is stored securely in an SQLite database. Additionally, the bot follows best practices for handling API keys and sensitive information.

**Q6: How often does Varietyz Bot update player data?**

- **A6:** The bot performs scheduled updates at regular intervals (e.g., daily) to ensure that all player data and roles remain up-to-date.

**Q7: Can I customize the roles and criteria for assignments?**

- **A7:** Absolutely! Varietyz Bot is highly customizable. You can define roles, assign specific emojis and colors, and set criteria for role assignments based on your clan's preferences.

**Q8: How does automatic database maintenance work?**

- **A8:** Varietyz Bot incorporates automated routines such as scheduled cleanups, data archiving, integrity checks, backups, and performance optimizations to ensure the database remains efficient and up-to-date without manual intervention.

**Q9: What happens if a player changes their RSN in-game?**

- **A9:** The bot monitors for any name changes reported by the WOM API. If a member changes their RSN, the bot updates the `registered_rsn` table accordingly and adjusts roles to match the new RSN.

**Q10: How can I contribute to Varietyz Bot?**

- **A10:** Your contributions and feedback are invaluable! Please refer to the [Contributing](#contributing) section above for detailed instructions on how to get involved.

**Q11: What should I do if Varietyz Bot is not responding to commands?**

- **A11:** First, ensure that the bot is online by checking its status in your Discord server. If it's online but not responding, verify that it has the necessary permissions to execute commands and manage roles. Additionally, check the logs by accessing the bot's logging system to identify any potential errors. Restarting the bot might also resolve temporary issues.

**Q12: How do I update Varietyz Bot to the latest version?**

- **A12:** To update Varietyz Bot, navigate to your bot's directory and run the following commands:

    ```bash
    git pull origin main
    npm install
    npm start
    ```

    This will pull the latest changes from the repository, install any new dependencies, and restart the bot with the updated code.

**Q13: Can Varietyz Bot integrate with other APIs or services besides the WOM API?**

- **A13:** Currently, Varietyz Bot is primarily integrated with the WOM API to fetch OSRS player data. However, future updates may include integrations with additional APIs or services based on community demand and project development goals.

**Q14: How do I reset my RSN registrations?**

- **A14:** To reset your RSN registrations, use the `/remove_rsn` command followed by all the RSNs you wish to remove. Confirm the removal when prompted. This will clear your current RSN registrations and associated roles, allowing you to register new RSNs as needed.

    _Example:_

    ```
    /remove_rsn DragonSlayer99 OldHero123
    ```

**Q15: What permissions does Varietyz Bot require to function properly?**

- **A15:** Varietyz Bot requires the following permissions to operate effectively:

    - **Manage Roles:** To assign and remove roles based on player achievements.
    - **Manage Channels:** To update channel names based on member activity.
    - **Send Messages:** To communicate with users and provide updates.
    - **Embed Links:** To create rich embed messages for better visualization.
    - **Read Message History:** To access past messages if needed.
    - **View Channels:** To see and interact within specified channels.

    Ensure that these permissions are granted when inviting the bot to your server.

**Q16: Does Varietyz Bot support games other than Old School RuneScape?**

- **A16:** Currently, Varietyz Bot is specifically designed for managing OSRS clans using data from the WOM API. Support for other games may be considered in future updates based on user interest and project scope.

**Q17: How can I troubleshoot role assignment issues with Varietyz Bot?**

- **A17:** If you're experiencing issues with role assignments:

    1. **Check Bot Permissions:** Ensure that Varietyz Bot has the necessary permissions to manage roles in your Discord server.
    2. **Verify Role Hierarchy:** The bot's highest role must be above the roles it is trying to assign.
    3. **Review Logs:** Access the bot's logs to identify any errors or warnings related to role assignments.
    4. **Restart the Bot:** Sometimes, simply restarting the bot can resolve temporary glitches.
    5. **Contact Support:** If the issue persists, reach out through the provided contact channels for further assistance.

**Q18: How does Varietyz Bot handle API rate limits?**

- **A18:** Varietyz Bot is designed to respect the rate limits imposed by the WOM API. It manages request queues and implements retry mechanisms with exponential backoff to handle situations where the rate limit is reached. This ensures that the bot operates smoothly without exceeding API usage limits.

**Q19: Can I request a new feature for Varietyz Bot?**

- **A19:** Absolutely! Your feedback and feature requests are welcome. Please visit the [Contributing](#contributing) section and submit your suggestions through issues or pull requests in the repository. Your input helps shape the future development of Varietyz Bot.

**Q20: What should I do if I forget my Discord server's GUILD_ID or other configuration details?**

- **A20:** If you forget your Discord server's `GUILD_ID` or other configuration details:

    1. **Enable Developer Mode:**
        - Go to Discord **User Settings** > **Advanced** > **Developer Mode** and toggle it on.
    2. **Find GUILD_ID:**
        - Right-click on your server's icon in the Discord sidebar and select **Copy ID**.
    3. **Retrieve Other IDs:**
        - Similarly, you can right-click on channels, roles, or users to copy their respective IDs.

    Ensure that you have Developer Mode enabled to access these IDs.

---

## Contributing

We welcome contributions from the community! Whether you're reporting a bug, suggesting a feature, or submitting a pull request, your input helps us improve Varietyz Bot.

### How to Contribute

1. **Fork the Repository**

    Click the [Fork](https://github.com/varietyz/varietyz-bot/fork) button at the top-right corner of this page.

2. **Clone Your Fork**

    ```bash
    git clone https://github.com/yourusername/varietyz-bot.git
    cd varietyz-bot
    ```

3. **Create a New Branch**

    ```bash
    git checkout -b feature/YourFeatureName
    ```

4. **Make Your Changes**

    Implement your feature or fix the bug.

5. **Commit Your Changes**

    ```bash
    git commit -m "Add feature: YourFeatureName"
    ```

6. **Push to Your Fork**

    ```bash
    git push origin feature/YourFeatureName
    ```

7. **Submit a Pull Request**

    Go to the original repository and click on the "New Pull Request" button. Provide a clear description of your changes.

### Code of Conduct

Please ensure all contributions adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Be respectful, constructive, and collaborative.

---

_Thank you for using Varietyz Bot! We hope it enhances your RuneScape clan experience._
