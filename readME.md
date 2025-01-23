# Discord Bot Project

## Overview

This project is a robust and feature-rich Discord bot implemented in JavaScript using the Discord.js library. The bot is designed to enhance community management, automate member-related tasks, and maintain smooth interactions with the server. The bot employs modular design, advanced error handling, and scalability, making it suitable for medium to large-scale Discord communities.

## Features

1. **Automated Role Management**:

   - Assigns roles automatically to new members.
   - Dynamically adjusts roles based on predefined criteria.

2. **Slash Commands**:

   - Fully integrated with Discord's slash command system.
   - Provides a clean and interactive user experience.

3. **Username Tracking**:

   - Tracks member username changes.
   - Maintains a history of past usernames for better member identification.

4. **Database Integration**:

   - Interacts with a robust database for persistent data storage.
   - Handles username normalization during searches and comparisons.

5. **Activity Monitoring**:

   - Tracks and logs member activity within the server.
   - Provides detailed reports on active members.

6. **Message Management**:

   - Responds to specific keywords or commands in text channels.
   - Supports customized automated responses.

7. **Player Data Extraction**:

   - Parses and processes player-related data for server activities and statistics.

8. **Normalization Utility**:

   - Ensures consistent formatting of usernames for seamless database operations.

9. **Error Logging and Monitoring**:
   - Logs bot actions and errors with detailed timestamps and context for debugging.

## File Breakdown

### Core Files

1. **`main.js`**:

   - The entry point for the bot.
   - Handles initialization, command registration, and event listeners.

2. **`dbUtils.js`**:

   - Database utilities for establishing connections and managing queries.
   - Includes robust error handling for database interactions.

3. **`utils.js`**:
   - Contains general utility functions that streamline operations across modules.

### Functional Modules

1. **`auto_roles.js`**:

   - Automates role assignment for new and existing members based on server logic.

2. **`active_members.js`**:

   - Tracks member activity and generates reports on server engagement.

3. **`name_changes.js`**:

   - Logs and monitors username changes for all server members.

4. **`player_data_extractor.js`**:

   - Processes player-related information, such as stats and activity logs.

5. **`removersn.js`**:
   - Manages the removal of sensitive or unwanted data from server interactions.

### Data Management

1. **`create_db.js`**:

   - Sets up the database schema and performs initial configurations.

2. **`constants.js`**:
   - Centralized configuration and constants for consistent reference across modules.

### Utility Scripts

1. **`normalize.js`**:

   - Provides normalization functions for name formatting and consistency.

2. **`logger.js`**:
   - Logs bot actions, events, and errors for monitoring and debugging purposes.

### Message Handling

1. **`messages.js`**:

   - Handles predefined responses to specific commands or messages.

2. **`hello.js`**:
   - A simple test module for verifying bot responsiveness.

### Task Management

1. **`tasks.js`**:

   - Manages periodic or scheduled tasks for the bot, such as data clean-up.

2. **`member_channel.js`**:
   - Handles actions and permissions for member-specific channels.

### Miscellaneous

1. **`rsnlist.js`**:

   - Manages a list of registered usernames or identifiers for the server.

2. **`name_changes.js`**:
   - Logs and tracks member username changes to provide an audit trail.

## Setup Instructions

1. **Prerequisites**:

   - Node.js installed on your machine.
   - A Discord account and bot token from the Discord Developer Portal.
   - Access to a database for persistent storage.

2. **Installation**:

   - Clone the repository:
     ```bash
     git clone <repository_url>
     cd <repository_name>
     ```
   - Install dependencies:
     ```bash
     npm install
     ```

3. **Configuration**:

   - Update the `constants.js` file with your bot token, database credentials, and other relevant settings.

4. **Database Setup**:

   - Run the `create_db.js` script to set up the database schema:
     ```bash
     node create_db.js
     ```

5. **Running the Bot**:
   - Start the bot:
     ```bash
     node main.js
     ```

## Contributing

- Follow standard JavaScript style guides.
- Document your code changes with clear comments.
- Test new features thoroughly before merging into the main branch.

## Future Improvements

- Expand role management logic for more granular customization.
- Add enhanced monitoring tools for tracking bot health and performance.
- Introduce machine learning for activity prediction and server recommendations.

## License

This project is licensed under the [MIT License](LICENSE).
