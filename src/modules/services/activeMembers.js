/* eslint-disable no-unused-vars */
// @ts-nocheck

/**
 * @fileoverview
 * 🎯 **Active/Inactive Clan Member Activity Utilities** ⚡
 *
 * This module provides utility functions for tracking **active** and **inactive** clan members within Varietyz Bot.
 * It integrates with the **Wise Old Man API** to fetch OSRS player data, calculates **member activity** over time,
 * and dynamically updates a **Discord voice channel** to reflect the number of active members.
 *
 * ---
 *
 * 🔹 **Key Features:**
 * - 📡 **Activity Data Update:** Fetches player data from the WOM API and updates the `active_inactive` database table.
 * - 📊 **Activity Calculation:** Determines active players (last **7 days**) and inactive players (last **21 days**) using **Luxon**.
 * - 🔄 **Voice Channel Sync:** Dynamically updates a **Discord voice channel name** with the number of active members.
 * - 🔁 **Retry Mechanism:** Implements **exponential backoff** to handle failed API requests efficiently.
 *
 * ---
 *
 * 🔹 **External Dependencies:**
 * - 📅 **Luxon:** For handling time calculations.
 * - 📡 **Wise Old Man API:** To fetch player and group details.
 * - 💬 **Discord.js:** For updating Discord channels.
 * - 🗄️ **SQLite (dbUtils):** For database interactions.
 *
 * @module modules/services/activeMembers
 */

const { DateTime } = require('luxon');
const logger = require('../utils/essentials/logger');
const WOMApiClient = require('../../api/wise_old_man/apiClient');
const { VOICE_CHANNEL_ID } = require('../../config/constants');
const { getAll, runQuery } = require('../utils/essentials/dbUtils');
const { calculateInactivity, calculateProgressCount } = require('../utils/helpers/calculateActivity');

/**
 * 🗂️ **Player Progress Tracker**
 *
 * Stores player progress data mapped by **RSN (RuneScape Name)**.
 * Each player's last progress date is stored as a **Luxon DateTime object**.
 *
 * @type {Object.<string, DateTime>}
 */
const playerProgress = {};

/**
 * 🎯 **Fetches & Updates Clan Member Activity**
 *
 * - Retrieves **clan member data** from the WOM API.
 * - Updates the `active_inactive` table with **each player's last progress date**.
 * - Implements **exponential backoff** for handling failed requests.
 *
 * @async
 * @function updateActivityData
 * @param {number} [maxRetries=3] - 🔁 Maximum number of retry attempts if fetching data fails.
 * @param {number} [baseDelay=5000] - ⏳ Base delay (in milliseconds) before retrying.
 * @returns {Promise<void>} Resolves when the activity data has been successfully processed.
 *
 * @throws {Error} ❌ Throws an error if **all retries fail**.
 *
 * @example
 * // Update activity data with up to 5 retries and a 10-second delay:
 * await updateActivityData(5, 10000);
 */
async function updateActivityData(maxRetries = 3, baseDelay = 5000) {
    let retryCount = 0;
    logger.info(`📡 Using WOM Group ID: ${WOMApiClient.groupId}`);

    while (retryCount < maxRetries) {
        try {
            const groupDetails = await WOMApiClient.request('groups', 'getGroupDetails', WOMApiClient.groupId);

            if (groupDetails?.memberships) {
                for (const membership of groupDetails.memberships) {
                    const { player } = membership;

                    if (player?.lastChangedAt) {
                        const lastProgressed = DateTime.fromJSDate(player.lastChangedAt);
                        if (lastProgressed.isValid) {
                            await runQuery(
                                `INSERT INTO active_inactive (player_id, last_progressed)
                                 VALUES (?, ?)
                                 ON CONFLICT(player_id) DO UPDATE SET last_progressed = excluded.last_progressed`,
                                [player.id, lastProgressed.toISO()],
                            );
                        } else {
                            logger.warn(`⚠️ Invalid date format for **${player.username}**. Last Progress: \`${player.lastChangedAt}\``);
                        }
                    } else {
                        logger.info(`📛 No progress data available for **${player.username}**.`);
                    }
                }

                logger.info('✅ Successfully fetched and processed player activity data.');
                return;
            }

            throw new Error('❌ Failed to retrieve **group details or memberships data**.');
        } catch (error) {
            retryCount++;

            if (retryCount === maxRetries) {
                logger.error(`🚨 **Data fetch failed** after \`${maxRetries}\` attempts: ${error.message}`);
                throw error;
            }

            const delay = baseDelay * Math.pow(2, retryCount - 1);
            logger.warn(`⚠️ **Retry ${retryCount}/${maxRetries}**: Trying again in \`${delay}ms\`... ⏳`);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
}

/**
 * 🔄 **Updates Discord Voice Channel with Active Members Count**
 *
 * - Fetches **current active members** from the database.
 * - Updates the **Discord voice channel name** with the count.
 *
 * @async
 * @function updateVoiceChannel
 * @param {Discord.Client} client - 🤖 The **Discord bot client** instance.
 * @returns {Promise<void>} Resolves when the voice channel is successfully updated.
 *
 * @example
 * // Sync the active members count with the voice channel:
 * await updateVoiceChannel(client);
 */
async function updateVoiceChannel(client) {
    try {
        const guild = client.guilds.cache.get(process.env.GUILD_ID);
        if (guild) {
            const voiceChannel = guild.channels.cache.get(VOICE_CHANNEL_ID);
            if (voiceChannel) {
                await updateActivityData(3, 5000);
                const emoji = '🟢';
                const count = await calculateProgressCount();
                const newChannelName = `${emoji} Active Clannies: ${count}`;

                await voiceChannel.setName(newChannelName);
                logger.info(`✅ **Voice channel updated** → \`${newChannelName}\``);
            } else {
                logger.error('🚫 **Voice channel not found.**');
            }
        } else {
            logger.error('🚨 **Guild not found.** Unable to update channel.');
        }
    } catch (error) {
        logger.error(`❌ **Error updating voice channel:** ${error.message}`);
    }
}

module.exports = {
    updateActivityData,
    calculateProgressCount,
    calculateInactivity,
    updateVoiceChannel,
};
