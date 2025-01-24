# Varietyz Bot

![Varietyz Bot Banner](https://i.ibb.co/sFRG1QW/Main-Banner.gif)

Welcome to **Varietyz Bot**, the ultimate Discord companion designed specifically for Old School RuneScape (OSRS) clans! Whether you're a veteran adventurer or new to the world of Gielinor, Varietyz Bot offers a comprehensive suite of tools to enhance your clan's management, foster community engagement, and streamline your gaming experience.

---

## Table of Contents

- [Introduction](#introduction)
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
        - [Remove RSNs (`/removersn`)](#remove-rsns-removersn)
        - [View Registered RSNs (`/rsnlist`)](#view-registered-rsns-rsnlist)
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

- **Remove RSNs (`/removersn`):** If you need to update or remove your RSNs, use this command to manage up to three RSNs securely.

    _Example:_

    ```
    /removersn DragonSlayer99 OldHero123
    ```

- **View Registered RSNs (`/rsnlist`):** View all RSNs registered within the clan along with their associated ranks. This provides transparency and allows members to see each other's achievements.

    _Example:_

    ```
    /rsnlist
    ```

### 🛡️ Automatic Role Assignments

**Varietyz Bot** automatically assigns and manages roles based on your in-game achievements and activity levels. This not only saves time but also adds a layer of gamification to your Discord server.

- **Boss Kill Roles:** Earn roles by defeating specific bosses in OSRS. The more bosses you defeat, the higher your rank!

    _Example:_ Defeating K'ril Tsutsaroth 150 times might grant you the "K'ril Tsutsaroth Slayer" role.

- **Activity-Based Roles:** Stay active in the game and complete challenges to earn special roles. This encourages continuous participation and engagement.

    _Example:_ Completing 200 Clue Scrolls All could earn you the "Clue Solver" role.

- **Skill-Based Roles:** Achieve milestones like 99 Attack or 2277 Total Experience to receive prestigious roles that showcase your dedication and skill.

    _Example:_ Achieving 99 Attack grants you the "Master of Attack" role.

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

**Folder Structure**
├─ 📄 .eslintignore
├─ 📄 .eslintrc.js
├─ 📄 eslint-checkstyle-report.xml
├─ 📄 jsdoc.json
├─ 📄 LICENSE
├─ 📄 package.json
├─ 📄 README.md
├─ 📄 Simplified_README.md
├─ 📂 src
│ ├─ 📂 api
│ │ └─ 📂 wise_old_man
│ │ └─ 📄 apiClient.js
│ ├─ 📂 config
│ │ └─ 📄 constants.js
│ ├─ 📂 data
│ │ └─ 📄 database.sqlite
│ ├─ 📄 main.js
│ ├─ 📂 modules
│ │ ├─ 📂 commands
│ │ │ ├─ 📄 removersn.js
│ │ │ ├─ 📄 rsn.js
│ │ │ └─ 📄 rsnlist.js
│ │ ├─ 📂 functions
│ │ │ ├─ 📄 active_members.js
│ │ │ ├─ 📄 auto_roles.js
│ │ │ ├─ 📄 logger.js
│ │ │ ├─ 📄 member_channel.js
│ │ │ ├─ 📄 name_changes.js
│ │ │ └─ 📄 player_data_extractor.js
│ │ ├─ 📄 tasks.js
│ │ └─ 📄 utils.js
│ ├─ 📂 scripts
│ │ └─ 📄 create_db.js
│ └─ 📂 utils
│ ├─ 📄 dbUtils.js
│ └─ 📄 normalize.js
└─ 📄 template.hbs

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

    - If a member changes their RSN or wishes to remove an existing one, they can use the `/removersn` command.
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

Your contributions and feedback are invaluable to the growth and improvement of **Varietyz Bot**. Whether you're reporting a bug, suggesting a new feature, or contributing code, your involvement helps shape the future of the project.

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
    git clone https://github.com/yourusername/varietyz-bot.git
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
    WOM_API_KEY=your_wom_api_key
    WOM_GROUP_ID=your_wom_group_id
    ```

    - `DISCORD_TOKEN`: The token you copied from the Discord Developer Portal.
    - `WOM_API_KEY`: Your API key from the Wise Old Man.
    - `WOM_GROUP_ID`: The specific group ID you want the bot to manage within WOM.

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

#### Remove RSNs (`/removersn`)

**Purpose:** Remove up to three of your registered RSNs from your account, useful if you've changed your RSN or no longer wish to track certain accounts.

**How to Use:**

1. Type `/removersn` followed by the RSNs you wish to remove.
2. The bot will process the removal and update your roles accordingly.

**Example:**

```
/removersn DragonSlayer99 OldHero123
```

**What Happens:**

- The specified RSNs are removed from your account.
- Associated roles are revoked if no longer applicable.
- Confirmation is sent to you in Discord.

#### View Registered RSNs (`/rsnlist`)

**Purpose:** View a comprehensive list of all RSNs registered within the clan along with their associated ranks.

**How to Use:**

1. Simply type `/rsnlist` in your Discord server.
2. The bot will display a formatted list of RSNs and ranks.

**Example:**

```
/rsnlist
```

**What Happens:**

- A neatly formatted embed message appears, listing all clan members' RSNs and their current ranks.
- This allows for easy tracking and recognition of member achievements.

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

**Varietyz Bot** is structured into various modules to ensure maintainability, scalability, and clarity. Below is an overview of each module and its responsibilities.

<details>
  <summary>Click to expand modules</summary>

### config/constants

Defines and exports all constant values used throughout the Varietyz Bot. This includes general bot configurations, channel IDs, WOM API settings, rate limiting configurations, and role definitions with associated emojis and colors.

### modules/commands/removersn

Defines the `/removersn` slash command for the Varietyz Bot. This command allows users to remove up to three registered RuneScape Names (RSNs) from their account. It includes validation, rate limiting, database interactions, and an autocomplete feature for RSN suggestions.

### modules/commands/rsn

Defines the `/rsn` slash command for the Varietyz Bot. This command allows users to register their Old School RuneScape Name (RSN). It includes validation, rate limiting, and handles special Easter egg RSNs with custom responses.

### modules/commands/rsnlist

Defines the `/rsnlist` slash command for the Varietyz Bot. This command retrieves and displays all registered RuneScape Names (RSNs) along with their associated ranks for clan members.

### modules/functions/active_members

Utility functions for managing active and inactive clan members within the Varietyz Bot. This module interacts with the WOM API to fetch player data, calculate member activity, and update Discord voice channel names based on member activity.

### modules/functions/auto_roles

Utility functions for managing automatic role assignments in the Varietyz Bot. This module handles fetching and processing player data, merging data from multiple RSNs, and assigning or removing Discord roles based on players' hiscores and achievements.

### modules/functions/logger

Configures and exports a Winston logger instance with daily log rotation. The logger handles logging to both the console and log files organized by year and month. It also manages uncaught exceptions and unhandled promise rejections.

### modules/functions/member_channel

Utility functions for managing clan members within the Varietyz Bot. Handles role assignments, updates clan member data, interacts with the WOM API, and updates Discord channels with the latest member details.

### modules/functions/name_changes

Utility functions for handling player name changes within the Varietyz Bot. This module interacts with the WOM API to fetch name changes, updates the database accordingly, and manages associated Discord notifications.

### modules/functions/player_data_extractor

Utility functions for extracting and managing player data. Handles fetching data from external APIs, formatting data for database storage, and ensuring data integrity within the SQLite database.

### modules/tasks

Defines scheduled tasks for the Varietyz Bot. Each task includes a name, the function to execute, the interval at which to run, and flags indicating whether to run on startup and as a scheduled task.

### modules/utils

Utility functions for the Varietyz Bot. Provides helper functions for normalizing RSNs, handling ranks, managing rate limits, interacting with Discord channels, and making HTTP requests with retry logic.

### scripts/create_db

Script to initialize and set up the SQLite database for the Varietyz Bot. Creates necessary tables for storing registered RSNs, clan members, recent name changes, and player data. Deletes any existing database file before creating a new one to ensure a clean setup.

### utils/dbUtils

Utility functions for interacting with the SQLite database. Provides functions to execute queries and handle database operations.

### utils/normalize

Utility functions for normalizing RuneScape names. Provides functions to standardize RSNs for consistent database storage and lookup.

</details>

---

## Classes

<details>
  <summary>Click to expand classes</summary>

### WOMApiClient

A client for interacting with the Wise Old Man (WOM) API. Manages rate-limited requests, handles retries, and provides access to the WOM API endpoints.

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

</details>

---

## WOMApiClient

### `new WOMApiClient()`

Initializes the WOM API client with an API key and user agent. Sets rate limits based on the presence of an API key and validates the WOM group ID.

**Methods:**

- **handleWOMRateLimit() ⇒ `Promise<void>`**
  Ensures that the WOM API rate limit is not exceeded. Throws an error if the request limit is reached within the current 60-second window.

- **retryRequest(endpoint, methodName, params, [retries]) ⇒ `Promise<any>`**
  Retries a failed API request with exponential backoff.

- **request(endpoint, methodName, [params]) ⇒ `Promise<any>`**
  Makes a request to the WOM API with rate limiting and retries.

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

- **RSN (RuneScape Name):** The unique username a player uses in Old School RuneScape.
- **WOM (Wise Old Man) API:** An external service that provides detailed statistics and data about OSRS players.
- **Discord.js:** A JavaScript library that allows developers to interact with the Discord API easily.
- **Slash Commands:** Special commands in Discord that start with a `/`, enabling interactive and intuitive user interactions.
- **SQLite:** A lightweight, file-based database system used for storing and managing data.
- **API (Application Programming Interface):** A set of rules that allows different software entities to communicate with each other.

---

## Frequently Asked Questions (FAQ)

**Q1: What is Varietyz Bot?**

- **A1:** Varietyz Bot is a Discord bot designed to help manage OSRS clans by tracking player data, assigning roles based on achievements, and enhancing community engagement.

**Q2: Do I need programming knowledge to set up Varietyz Bot?**

- **A2:** While some basic understanding of using command-line interfaces and editing configuration files is helpful, the setup process is straightforward and well-documented.

**Q3: How does Varietyz Bot track player achievements?**

- **A3:** Varietyz Bot uses the Wise Old Man (WOM) API to fetch real-time data about players' in-game activities, achievements, and statistics, which it then uses to manage roles and track activity.

**Q4: Can Varietyz Bot handle multiple RSNs per user?**

- **A4:** Yes, members can register up to three RSNs using the `/rsn` command, allowing for comprehensive tracking of their in-game activities across different accounts.

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
