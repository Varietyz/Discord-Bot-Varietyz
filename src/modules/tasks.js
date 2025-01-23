// tasks.js

const { updateData } = require("./functions/member_channel");
const { processNameChanges } = require("./functions/name_changes");
const {
  fetchAndUpdatePlayerData,
} = require("./functions/player_data_extractor");
const {
  fetchAndProcessMember,
  getUserRSNs,
} = require("./functions/auto_roles");
const { updateVoiceChannel } = require("./functions/active_members");
require("dotenv").config();
const { getAll } = require("../utils/dbUtils");

module.exports = [
  {
    name: "updateData",
    func: async (client) => await updateData(client),
    interval: 600 * 3,
    runOnStart: true,
    runAsTask: true,
  },
  {
    name: "processNameChanges",
    func: async (client) => await processNameChanges(client),
    interval: 3600 * 3,
    runOnStart: true,
    runAsTask: true,
  },
  {
    name: "fetchAndUpdatePlayerData",
    func: async () => await fetchAndUpdatePlayerData(),
    interval: 3600 * 1,
    runOnStart: true,
    runAsTask: true,
  },
  {
    name: "handleHiscoresData",
    func: async (client) => {
      const guild = client.guilds.cache.get(process.env.GUILD_ID);
      if (!guild) {
        console.error("Guild not found");
        return;
      }

      // Fetch all user IDs with RSNs
      const userIds = await getAll(
        "SELECT DISTINCT user_id FROM registered_rsn",
      );

      for (const { user_id: userId } of userIds) {
        await fetchAndProcessMember(guild, userId); // Dynamically process members
      }
    },
    interval: 3600 * 1,
    runOnStart: true,
    runAsTask: true,
  },
  {
    name: "updateVoiceChannel",
    func: async (client) => await updateVoiceChannel(client),
    interval: 3600 * 3,
    runOnStart: true,
    runAsTask: true,
  },
];
