const {
    guild: { getOne, runQuery },
} = require('../../../utils/dbUtils');
const logger = require('../../../utils/logger');
const { EmbedBuilder } = require('discord.js');

const deletedThreads = new Set(); // 🔄 Tracks deleted threads

module.exports = {
    name: 'threadDelete',
    once: false,

    /**
     * Triggered when a thread is deleted.
     * @param thread - The thread that was deleted.
     */
    async execute(thread) {
        if (!thread.guild) return;

        try {
            logger.info(`🗑️ [ThreadDelete] Thread "${thread.name}" (ID: ${thread.id}) was deleted.`);

            // ✅ Add thread ID to deletedThreads Set (Prevents duplicate logs)
            deletedThreads.add(thread.id);
            setTimeout(() => deletedThreads.delete(thread.id), 30000); // 🔄 Remove after 30 seconds

            // 🔄 **Delete thread from database**
            await runQuery('DELETE FROM guild_channels WHERE channel_id = ?', [thread.id]);
            logger.info(`🗑️ [Database] Removed thread "${thread.name}" (ID: ${thread.id}) from guild_channels table.`);

            // 🔍 Fetch log channel from database
            const logChannelData = await getOne('SELECT channel_id FROM log_channels WHERE log_key = ?', ['thread_logs']);
            if (!logChannelData) return;

            const logChannel = await thread.guild.channels.fetch(logChannelData.channel_id).catch(() => null);
            if (!logChannel) return;

            // 📌 Build Embed
            const embed = new EmbedBuilder()
                .setColor(0xff0000) // Red for deletions
                .setTitle('🗑️ Thread Deleted')
                .addFields({ name: '📌 Thread Name', value: `\`${thread.name}\``, inline: true }, { name: '📁 Parent Channel', value: thread.parentId ? `<#${thread.parentId}>` : '`Unknown`', inline: true })
                .setFooter({ text: `Thread ID: ${thread.id}` })
                .setTimestamp();

            // 📤 Send log
            await logChannel.send({ embeds: [embed] });

            logger.info(`📋 Successfully logged thread deletion: "${thread.name}"`);
        } catch (error) {
            logger.error(`❌ Error logging thread deletion: ${error.message}`);
        }
    },
};

// 🔄 Export deletedThreads Set for `messageDeleteBulk.js`
module.exports.deletedThreads = deletedThreads;
