/* eslint-disable max-len */
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../../utils/essentials/dbUtils');
const logger = require('../../../utils/essentials/logger');

module.exports = {
    data: new SlashCommandBuilder().setName('live_gains_tutorial').setDescription('📜 Interactive guide for setting up RuneLite Discord Webhooks.'),

    async execute(interaction) {
        try {
            const discordId = interaction.user.id;
            const validRegistration = await db.getOne(
                `
                SELECT r.*, cm.player_id AS clan_player_id
                FROM registered_rsn AS r
                INNER JOIN clan_members AS cm 
                    ON r.player_id = cm.player_id
                    AND LOWER(r.rsn) = LOWER(cm.rsn)
                WHERE r.discord_id = ?
                `,
                [discordId],
            );

            if (!validRegistration) {
                return interaction.reply({
                    content: '🚫 **Error:** You must be a registered clan member to use this command.',
                    flags: 64, // Message visible only to the user.
                });
            }

            // Defer the reply while processing.
            await interaction.deferReply({ flags: 64 });

            // Fetch Webhook Data from the Database.
            const webhooks = await db.guild.getAll('SELECT webhook_key, webhook_url, channel_id FROM guild_webhooks');
            const webhookMap = new Map(webhooks.map(({ webhook_key, webhook_url, channel_id }) => [webhook_url, { webhook_key, channel_id }]));

            // Fetch Image Paths from the Database.
            // IMPORTANT: Use the same column key as in your first command.
            const images = await db.image.getAll('SELECT file_name, file_path FROM tutorial_files');
            const imageMap = new Map(images.map(({ file_name, file_path }) => [file_name, file_path]));

            // Define tutorial steps.
            const steps = [
                { text: '**1.** Open RuneLite\n**2.** Go to "Configuration" in the top right corner', image: 'step_1' },
                { text: '**3.** Open "Plugin Hub"', image: 'step_2' },
                { text: '**4.** Search for ```Discord Notifications/Split Tracker```\nPress "Install" and wait for the gear icon to appear.', image: 'step_3_lg' },
                {
                    text: '**5.** Check the box for **"Separate WebHook"**\nPaste the following link into **"Automatic WebHook"**:',
                    webhook: 'https://discord.com/api/webhooks/1221510185680633956/uqHTBDTdDmLs5Qy2A90oqD7_rsPVwWv1GI7HD4Dk6wogiNOUPLnfyIf0uBDfGNuG6Q6m',
                    image: 'step_4_lg',
                },
                {
                    text: '**6.** Open the "Valuable Loot" category & use these settings:\n- **Minimum Value:** `200000`\n- **Minimum Rarity:** `100`\n- Check "Separate Loot WebHook"\nPaste this link:',
                    webhook: 'https://discord.com/api/webhooks/1221510185680633956/uqHTBDTdDmLs5Qy2A90oqD7_rsPVwWv1GI7HD4Dk6wogiNOUPLnfyIf0uBDfGNuG6Q6m',
                    image: 'step_5_lg',
                },
                {
                    text: '**7.** Open the "Leveling" category & use these settings:\n- **Minimum level:** `1`\n- **Level Message:** `$name achieved $skill $level / 99`\n- **Multi Skill Level Message:** `, and $skill $level / 99`\n- Check "Separate Level-Up WebHook"\nPaste this link:',
                    webhook: 'https://discord.com/api/webhooks/1221509817651429418/IFadM1Oe_z6LWeLwVm3fGELYVSLcrgHbJLKJopaGKTcAAT2Yb3mWx2RO6fFc4HFlhGZh',
                    image: 'step_6_lg',
                },
                {
                    text: '**8.** Open the "Questing" category & use these settings:\n- **Quest Message:** `$name has completed $quest`\n- Check "Separate Quest WebHook"\nPaste this link:',
                    webhook: 'https://discord.com/api/webhooks/1221511529774452909/NsEqdVJ--V49Obk7vtk447hhKHtRvfv0pCb-9ImDLxF2WDbaQMifNSmse0_RE4_20oCu',
                    image: 'step_7_lg',
                },
                {
                    text: '**9.** Open the "Deaths" category & use these settings:\n- **Death Message:** `$name has met their fate..`\n- Check "Separate Death WebHook"\nPaste this link:',
                    webhook: 'https://discord.com/api/webhooks/1221511664935899246/vidAGy69f9yvgSJkyRCOwruk8hKIdZOoxmen8rgN2ZyJgt-pXnSPPbFSM2Tdvvvlgn_K',
                    image: 'step_8_lg',
                },
                {
                    text: '**10.** Open the "Clue Scrolls" category & use these settings:\n- **Clue Message:** `$name completed a clue scroll!`\n- Check "Separate Clue WebHook"\nPaste this link:',
                    webhook: 'https://discord.com/api/webhooks/1221510519572402318/LhOevCwTtKatTz4Z4AClslxQmiYVhRtJq7mTkbILdLwnLUKAgAnUpCP8PpWzDPTL5jH7',
                    image: 'step_9_lg',
                },
                {
                    text: '**11.** Open the "Pets" category & use these settings:\n- **Pet Message:** `Big news! $name received a pet!`\n- Check "Separate Pet WebHook"\nPaste this link:',
                    webhook: 'https://discord.com/api/webhooks/1221512013994397857/AvjQjlAoL0ct5P2n-LqY85NwhCwAVMWlMvGJH0QJYeLQEVcbUqjCUPwGmWTvo5PAgi-G',
                    image: 'step_10_lg',
                },
                {
                    text: '**12.** Open the "Collection Log" category & use these settings:\n- **Collection Log Message:** `$itemName has been added to the collection log of $name`\n- Check "Separate Collection Log WebHook"\nPaste this link:',
                    webhook: 'https://discord.com/api/webhooks/1221510764104257628/f0Y-x9NZw0sZcoopZxuzumSGnZuore2fJ1hRx-kEH9k9n_MxelRle1POvIORXY5UaOR6',
                    image: 'step_11_lg',
                },
                { text: '**13.** Open the "Advanced" category and enter your registered RSN in the "Whitelisted RSNs" box.', image: 'step_12_lg' },
                { text: '**14.** Done! 🎉' },
            ];

            // Create Embeds for each step.
            // Also collect a set of file paths for images that are used.
            const embeds = [];
            const usedImages = new Set();

            steps.forEach((step, index) => {
                const embed = new EmbedBuilder()
                    .setDescription(step.text)
                    .setColor(0x3498db)
                    .setFooter({ text: `Step ${index + 1} of ${steps.length}` });

                // If webhook data exists, add it as fields.
                if (step.webhook) {
                    const webhookData = webhookMap.get(step.webhook);
                    if (webhookData) {
                        const { channel_id } = webhookData;
                        embed.addFields({ name: '🔗 Webhook', value: `||\`\`\`${step.webhook}\`\`\`||`, inline: false }, { name: '📌 Channel', value: `<#${channel_id}>`, inline: false });
                    } else {
                        logger.warn(`⚠️ Webhook data not found for webhook URL: ${step.webhook}`);
                    }
                }

                // If there's an image, set it and track the file path.
                if (step.image && imageMap.has(step.image)) {
                    // The image is referenced as an attachment.
                    embed.setImage(`attachment://${step.image}.png`);
                    usedImages.add(imageMap.get(step.image));
                }

                embeds.push(embed);
            });

            // Prepare file attachments for all used images.
            const files = [...usedImages].map((filePath) => ({
                attachment: filePath,
                name: filePath.split('/').pop(), // Extracts the file name from the path.
            }));

            // Create Pagination Buttons.
            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('prev_step').setLabel('⬅️ Previous').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('next_step').setLabel('Next ➡️').setStyle(ButtonStyle.Primary),
            );

            let currentStep = 0;
            // Send the initial reply with the first embed and attach the files.
            const reply = await interaction.editReply({
                embeds: [embeds[currentStep]],
                components: [buttons],
                files, // Attach all images used in any of the steps.
                flags: 64,
            });

            // Create a collector for pagination button interactions.
            const collector = reply.createMessageComponentCollector({ time: 600000 });

            collector.on('collect', async (i) => {
                if (i.customId === 'prev_step' && currentStep > 0) {
                    currentStep--;
                } else if (i.customId === 'next_step' && currentStep < steps.length - 1) {
                    currentStep++;
                }

                // Update the message with the new embed.
                // Files do not need to be re-attached since they are already part of the message.
                await i.update({ embeds: [embeds[currentStep]], components: [buttons] });
            });
        } catch (error) {
            logger.error('❌ Error executing /runelite_webhook_guide:', error);
            await interaction.editReply({ content: '❌ An error occurred.', flags: 64 });
        }
    },
};
