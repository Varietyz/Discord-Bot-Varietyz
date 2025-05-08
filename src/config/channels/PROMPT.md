Below is a complete, detailed prompt you can pass on to an AI assistant to have it help you create new preset files based on your current structures. This prompt incorporates the configuration details, file structure, permission logic, role and webhook definitions, and the guidelines as defined in your attachments (preset_name.json, channelMessages.json, permissionsMap.js, and README.md).

---

**Prompt:**

You are an expert assistant in creating Discord server preset files. I have a current system that automates the creation of channels, categories, roles, webhooks, and automated messages using preset JSON files. The system is defined by the following resources:

1. **Configuration (varietyz.json):**
   - The preset file has two top-level arrays:
     - **noCategory:** Contains channel definitions that appear at the root (e.g., welcome, rules, roles).
     - **categories:** Contains an array of category objects. Each category has a name, a permission key (e.g., `staffOnly`, `verifiedReadOnly`), and a list of channel definitions.
   - Each channel object in either section includes required fields like:
     - `key` (unique identifier)
     - `name` (displayed channel name)
     - `type` (e.g., `"GuildText"`, `"GuildVoice"`, `"GuildAnnouncement"`, or `"GuildForum"`)
     - `topic` (a brief description or guide for the channel)
     - `permissionKey` (defines the set of permission overwrites from our permissions map)
   - Optional properties include:
     - **role:** An object defining a role to be created or ensured (with fields: `name`, `mentionable` (boolean), and `color` (hex code)).
     - **webhook:** An object to automate message posting (with fields: `enabled` (boolean), `key`, and `name`).
     - **messageKey:** A key that references an entry in our separate `channelMessages.json` file to auto-post a text/embedded message when the channel is created.
2. **Automated Messages (channelMessages.json):**
   - Contains entries that define the type of message (“text”, “embed”, or “both”), the content, embed details (title, description, color, imageUrl, thumbnailUrl, footerText), and the reactions (emoji arrays) that must be added to the message.
3. **Permission Configuration (permissionsMap.js):**
   - Implements functions for various permission keys such as `publicReadOnly`, `staffOnly`, `modOnly`, `readAndReactOnly`, `verifiedReadOnly`, `verifiedWrite`, `verifiedReadReact`, `premiumOnly`, and others.
   - These functions return arrays of permission overwrite objects (using Discord.js’s PermissionsBitField) that are applied to each channel based on the preset’s `permissionKey`.
4. **Developer Documentation (README.md):**
   - Offers a step-by-step guide on building new preset files, including a cheatsheet of channel types, permission keys, role object fields, webhook object fields, and instructions on how to auto-post messages using the `messageKey`.
   - Reinforces that the preset file must follow a consistent structure with two top-level sections: `noCategory` and `categories`.

Your task is to help generate new preset JSON files that adhere to these structures and conventions. The output preset must be production-ready and fully aligned with the information provided. Please consider the following guidelines:

- **Structure & Format:**
  - The JSON file must have two top-level arrays: `noCategory` for channels without categories and `categories` for channels grouped within Discord categories.
  - Each channel definition should include the required fields (`key`, `name`, `type`, `topic`, `permissionKey`) and may optionally include `role`, `webhook`, and `messageKey`.
- **Role & Webhook Objects:**

  - When a channel defines a role, ensure you include `name`, `mentionable`, and `color` properties.
  - If a channel utilizes a webhook, include the properties `enabled`, `key`, and `name`.

- **Automated Messaging:**

  - For channels that use a `messageKey`, the key must refer to a valid message entry (e.g., like `welcome_msg`, `rules_msg`, or `roles_msg`) that contains the definition for the message format (text and/or embed) and any reaction emojis.

- **Permissions:**

  - Use the permission keys as defined in our permissionsMap.js (such as `publicReadOnly`, `verifiedReadOnly`, `staffOnly`, etc.) to configure the channel access properly.

- **Extensibility & Consistency:**
  - Your generated preset file should allow for future modifications (e.g., adding new categories or channels) without breaking the established structure.
  - Please include comments (if possible) to explain any non-obvious sections, helping maintain clarity for future developers.

As an example, please generate a new preset JSON file for a hypothetical new category called **"🎮 • Game Streams"** which includes:

- A channel for stream announcements (using a webhook for auto-posting new stream alerts) and
- A voice channel for live game chat,
- Both channels should reference appropriate permission keys (e.g., channels visible to all verified members) and include any extra configuration (like role assignment for a new role "Streamer").

Provide the complete JSON output based on the established format, and feel free to ask me questions to best determine the full generation to clarify before making choices.

---

Use the above prompt as the context to generate new, consistent Discord server preset files that fully align with the current configuration and guidelines.
