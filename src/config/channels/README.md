# How to Build Discord Server Preset Files

This guide shows you **how** to create new preset JSON files for your server, **what** fields to include (channels, roles, webhooks, etc.), and **how** to auto-post messages (text or embeds) when channels are created. By following these instructions, you can rapidly set up categories, text or voice channels, permissions, and initial messages in a consistent manner.

---

## 1. Cheatsheet Reference

Below is a quick table listing the **channel types**, **permission keys**, **role fields**, **webhook fields**, **and message fields**.

### 1.1 Channel Types

| **Type**            | **Discord.js Enum**             | **Description**                                                 |
| ------------------- | ------------------------------- | --------------------------------------------------------------- |
| `GuildText`         | `ChannelType.GuildText`         | Standard text channel.                                          |
| `GuildVoice`        | `ChannelType.GuildVoice`        | Classic voice channel for voice chat.                           |
| `GuildAnnouncement` | `ChannelType.GuildAnnouncement` | “News/Announcements” channel; staff can post, users can follow. |
| `GuildForum`        | `ChannelType.GuildForum`        | Forum channel, supports threads for organized discussions.      |
| `GuildStageVoice`   | `ChannelType.GuildStageVoice`   | Stage channel (like a broadcast/panel) for limited speakers.    |
| `GuildDirectory`    | `ChannelType.GuildDirectory`    | Directory channel for server discovery (rarely used).           |

> **Note**: You typically **do not** define `GuildCategory` for a channel’s `type`—that’s handled by the **category** object, not by channels themselves.

---

### 1.2 Permission Keys

| **Key**             | **Description**                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| `publicReadOnly`    | Everyone can view/read, but nobody can send messages (unless a specific role is given extra permission). |
| `publicWrite`       | Everyone can view and send messages (a fully public channel).                                            |
| `staffOnly`         | Only the admin role and/or a specified role can see/send. `@everyone` is denied `ViewChannel`.           |
| `modOnly`           | Only the “mod” role (found by name) and/or a specified role can see/send.                                |
| `voiceReadNoJoin`   | Everyone sees the voice channel but cannot connect. Only a specified role can join.                      |
| `voiceSpeakOnly`    | Everyone is denied connect. The “streamer” role or a passed-in role can connect/speak.                   |
| `readAndReactOnly`  | Everyone can read & react, but not send messages. A specified role can send.                             |
| `feedbackWriteOnly` | Only a specified role can view/write; `@everyone` is denied.                                             |
| `teamOnly`          | Similar to “feedbackWriteOnly” but named for team channels.                                              |
| `donatorOnly`       | Only the passed-in role can view/send + use slash commands.                                              |
| `adultOnly`         | Only the “18+” role or a passed-in role can view/send.                                                   |
| `designerOnly`      | Denies everyone view; only the passed-in role can view, send, attach files.                              |
| `customRoleOnly`    | Denies everyone; only the passed-in role can view/send/read message history.                             |

If you invent new permission styles, add them in `permissionsMap.js`. Then reference that new key in your preset.

---

### 1.3 `role` Object Fields

| **Field**     | **Description**                                                |
| ------------- | -------------------------------------------------------------- |
| `name`        | Role display name (e.g. `"Moderator"`, `"Developer"`).         |
| `mentionable` | Boolean (`true`/`false`). When `true`, anyone can `@RoleName`. |
| `color`       | Hex color code for the role (e.g. `"#1ABC9C"`).                |

---

### 1.4 `webhook` Object Fields

| **Field** | **Description**                                                                          |
| --------- | ---------------------------------------------------------------------------------------- |
| `enabled` | Boolean (`true`/`false`). If `true`, the bot ensures a webhook in the channel.           |
| `key`     | A unique DB identifier (e.g., `"webhook_youtube"`), used to store the webhook reference. |
| `name`    | The display name of the webhook (e.g., `"🎥 YouTube Feed"`).                             |

---

### 1.5 **Automated “Channel Messages”** (`messageKey`)

If you want the bot to **post a message** (text, embed, or both) automatically as soon as the channel is created or ensured, you can include a `messageKey` in your channel definition. For example:

```json5
{
  key: "rules",
  name: "🔰•-rules",
  type: "GuildText",
  topic: "Server rules & code of conduct. React ✅ to agree.",
  permissionKey: "readAndReactOnly",
  messageKey: "rules_msg",
}
```

This `messageKey` points to an **entry** in a separate JSON file (e.g. `channelMessages.json`) that defines how the message is constructed:

```json5
{
  rules_msg: {
    type: "embed", // "text", "embed", or "both"
    content: "React with ✅ to agree!",
    embed: {
      title: "Server Rules",
      description: "1) Be nice\n2) Follow guidelines\n3) No spam or harassment",
      color: 16711680, // decimal or hex color
      imageUrl: "...",
      thumbnailUrl: "...",
      footerText: "Thanks for reading!",
    },
    reactions: ["✅", "❌"],
  },
}
```

Where:

- **`type`** – "text", "embed", or "both" indicates whether you only send text, only embed, or text + embed in one message.
- **`content`** – The plain text of the message.
- **`embed`** – If present, defines the embed’s `title`, `description`, `color`, `imageUrl`, `thumbnailUrl`, `footerText`, etc.
- **`reactions`** – An array of emoji to add after the message is posted.

Your bot code can then detect `messageKey`, load the matching JSON entry, and auto-post the message (with optional reactions).

> **Important**: By default, if you rerun your setup command multiple times, you may repost the message. If you only want to post **once**, add a small check in your logic to post only if the channel is newly created.

---

## 2. Overall File Structure

A typical preset file has two top-level arrays:

```json5
{
  noCategory: [
    // Channels that appear outside any category
  ],
  categories: [
    {
      name: "Some Category",
      permissionKey: "somePermission",
      channels: [
        {
          // channel definition
        },
      ],
    },
  ],
}
```

### 2.1 `noCategory`

- An array of channel objects that should live at the **root** of the server (no category).
- Great for “Welcome” or “Rules” channels you want visible at the top.

### 2.2 `categories`

- An array of objects, **each** describing a Category in Discord:
  - **`name`** – The display name of the category.
  - **`permissionKey`** (optional) – Category-level overwrites (e.g., `staffOnly`).
  - **`channels`** – An array of channels under this category.

---

## 3. Channel Definition

Within `noCategory` or inside a category’s `channels` array, each channel entry looks like:

```json5
{
  key: "rules",
  name: "🔰•-rules",
  type: "GuildText",
  topic: "Server rules & code of conduct.",
  permissionKey: "readAndReactOnly",
  role: {
    name: "Moderator",
    mentionable: true,
    color: "#3498DB",
  },
  webhook: {
    enabled: true,
    key: "webhook_site_signups",
    name: "📝 Site | New Signup",
  },
  messageKey: "rules_msg", // <--- new field to auto-post a message
}
```

### Required Fields

- **`key`** – Unique identifier for the channel in your DB.
- **`name`** – The displayed channel name in Discord.
- **`type`** – One of the supported channel types.

### Optional Fields

- **`topic`** – The channel topic.
- **`permissionKey`** – A named permission set for overwrites.
- **`role`** – If present, the bot ensures that role exists/creates it.
- **`webhook`** – If you want an automated webhook in this channel.
- **`messageKey`** – If present, the bot looks up a matching entry in `channelMessages.json` and posts it upon creation.

---

## 4. Roles in the Channel Object

When you include a `role` object:

```json5
"role": {
  "name": "Moderator",
  "mentionable": true,
  "color": "#3498DB"
}
```

- **`name`** – The bot checks if a role with this name exists; if not, creates it.
- **`mentionable`** – Whether you can mention `@Moderator`.
- **`color`** – The hex color code (Discord role color).

---

## 5. Webhooks in the Channel Object

If you include a `webhook` object:

```json5
"webhook": {
  "enabled": true,
  "key": "webhook_site_signups",
  "name": "📝 Site | New Signup"
}
```

- **`enabled`** – `true` means the bot ensures a webhook in this channel.
- **`key`** – Unique identifier for the DB (`"webhook_site_signups"`).
- **`name`** – Display name for the webhook.

---

## 6. Example Minimal Preset

Below is a tiny example to show minimal usage:

```json5
{
  noCategory: [
    {
      key: "welcome",
      name: "👋•-welcome",
      type: "GuildText",
      topic: "Welcome channel",
      permissionKey: "publicReadOnly",
      messageKey: "welcome_msg",
    },
  ],
  categories: [
    {
      name: "📣 • Official Info",
      permissionKey: "publicReadOnly",
      channels: [
        {
          key: "announcements",
          name: "📢•-announcements",
          type: "GuildAnnouncement",
          topic: "Server-wide announcements by Staff only.",
          permissionKey: "publicReadOnly",
          role: {
            name: "Staff",
            mentionable: false,
            color: "#FFD700",
          },
        },
      ],
    },
  ],
}
```

You might also have a **separate** file: `channelMessages.json`, such as:

```json5
{
  welcome_msg: {
    type: "text",
    content: "Welcome to the server! Please check out the #rules channel.",
    reactions: ["👋"],
  },
}
```

---

## 7. Creation Flow

1. **Place** your JSON file (e.g., `myserver.json`) in the appropriate folder (`config/channels`).
2. **Run** your slash command or script (e.g., `/channels setup preset:myserver.json category:all`).
3. **The Bot** will:
   1. Read the file.
   2. For each category:
      - Create the category (if missing).
      - Create or update each channel.
      - Apply permission overwrites based on `permissionKey`.
      - Create or reuse any `role` object if provided.
      - Create webhooks if `webhook.enabled` is `true`.
      - If `messageKey` is provided, auto-post that message (embed or text) from `channelMessages.json`.
   3. For `noCategory`, do the same minus the category creation step.

---
