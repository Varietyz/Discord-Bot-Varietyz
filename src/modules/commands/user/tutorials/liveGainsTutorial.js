const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const db = require('../../../utils/essentials/dbUtils');
const logger = require('../../../utils/essentials/logger');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('live_gains_tutorial')
        .setDescription(
            '📜 Interactive guide for setting up RuneLite Discord Webhooks.'
        ),
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
                [discordId]
            );
            if (!validRegistration) {
                return interaction.reply({
                    content:
            '🚫 **Error:** You must be a registered clan member to use this command.',
                    flags: 64,
                });
            }
            await interaction.deferReply({ flags: 64 });
            const webhooks = await db.guild.getAll(
                'SELECT webhook_key, webhook_url, channel_id FROM guild_webhooks'
            );
            const webhookMap = new Map(
                webhooks.map(({ webhook_key, webhook_url, channel_id }) => [
                    webhook_key,
                    { webhook_key, webhook_url, channel_id },
                ])
            );
            const images = await db.image.getAll(
                'SELECT file_name, file_path FROM tutorial_files'
            );
            const imageMap = new Map(
                images.map(({ file_name, file_path }) => [file_name, file_path])
            );
            const steps = [
                {
                    text: '**1.** Open RuneLite\n**2.** Go to \'Configuration\' in the top right corner',
                    image: 'step_1',
                },
                {
                    text: '**3.** Open \'Plugin Hub\'',
                    image: 'step_2',
                },
                {
                    text: '**4.** Search for ```Discord Notifications/Split Tracker```\nPress \'install\' and wait for a moment.\nWhen you see the \'remove\' button appear, you will also see a configuration gear.\nClick on it to adjust settings.',
                    image: 'step_3_lg',
                },
                {
                    text: '**5.** Check the box with **\'.... Seperate WebHook\'**\nPlace the link in the box **\'Automatic WebHook\'** (See photo below)\n',
                    webhook: 'webhook_osrs_received_drop',
                    image: 'step_4_lg',
                },
                {
                    text: '**6.** Open the Valuable Loot category & Copy the settings from below (Image for exact result)\n- **Minimum Value:** ```200000```\n- **Minimum Rarity:** ```100```\n- Check the box \'Seperate Loot WebHook\'\nPlace the link in the \'Valuable Loot WebHook\' box\n',
                    webhook: 'webhook_osrs_received_drop',
                    image: 'step_5_lg',
                },
                {
                    text: '**7.** Open the Levelling category & Copy the settings from below (Image for exact result)\n- **Minimum level:** replace \'**0**\' with \'**1**\'\n- **Level Message:** ```$name achieved $skill $level / 99```\n- **Multi Skill Level Message:** ```, and $skill $level / 99```\n- Check the box \'Seperate Level-Up WebHook\'\nPlace the link in the \'Level-Up Webhook\' box\n',
                    webhook: 'webhook_osrs_level_achieved',
                    image: 'step_6_lg',
                },
                {
                    text: '**8.** Open the Questing category & Copy the settings from below (Image for exact result)\n- **Quest Message:** ```$name has completed $quest```\n- Check the box \'Seperate Quest WebHook\'\nPlace the link in the \'Quest Webhook\' box\n',
                    webhook: 'webhook_osrs_quest_completed',
                    image: 'step_7_lg',
                },
                {
                    text: '**9.** Open the Deaths category & Copy the settings from below (Image for exact result)\n- **Death Message:** ```$name has met their fate..```\n- Check the box \'Seperate Death WebHook\'\nPlace the link in the \'Death Webhook\' box\n',
                    webhook: 'webhook_osrs_deceased',
                    image: 'step_8_lg',
                },
                {
                    text: '**10.** Open the Clue Scrolls category & Copy the settings from below (Image for exact result)\n- **Clue Message:** ```$name completed a clue scroll!```\n- Check the box \'Seperate Clue WebHook\'\nPlace the link in the \'Clue Webhook\' box\n',
                    webhook: 'webhook_osrs_clue_scroll_completed',
                    image: 'step_9_lg',
                },
                {
                    text: '**11.** Open the Pets category & Copy the settings from below (Image for exact result)\n- **Pet Message:** ```Big news! $name received a pet!```\n- Check the box \'Seperate Pet WebHook\'\nPlace the link in the \'Pet Webhook\' box\n',
                    webhook: 'webhook_osrs_adopted_a_pet',
                    image: 'step_10_lg',
                },
                {
                    text: '**12.** Open the Collection Log category & Copy the settings from below (Image for exact result)\n- **Collection Log Message:** ```$itemName has been added to the collection log of $name```\n- Check the box \'Seperate Collection Log WebHook\'\nPlace the link in the \'Collection Log Webhook\' box\n',
                    webhook: 'webhook_osrs_collectable_registered',
                    image: 'step_11_lg',
                },
                {
                    text: '**13.** Open the Advanced category and write your RSN in the \'Whitelisted RSNs\' box which you have registered with the clan',
                    image: 'step_12_lg',
                },
                {
                    text: '**14.** Done!',
                },
            ];
            const getButtons = (currentStep) => {
                const row = new ActionRowBuilder();
                if (currentStep > 0) {
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId('prev_step')
                            .setLabel('⬅️ Previous')
                            .setStyle(ButtonStyle.Primary)
                    );
                }
                if (currentStep < steps.length - 1) {
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId('next_step')
                            .setLabel('Next ➡️')
                            .setStyle(ButtonStyle.Primary)
                    );
                }
                return row;
            };
            const embeds = [];
            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];
                const embed = new EmbedBuilder()
                    .setDescription(step.text)
                    .setColor(0x3498db)
                    .setFooter({ text: `Step ${i + 1} of ${steps.length}` })
                    .setTimestamp();
                if (step.webhook) {
                    const webhookData = webhookMap.get(step.webhook);
                    if (webhookData) {
                        embed.addFields(
                            {
                                name: '🔗 Webhook',
                                value: `||\`\`\`${webhookData.webhook_url}\`\`\`||`,
                                inline: false,
                            },
                            {
                                name: '📌 Channel',
                                value: `<#${webhookData.channel_id}>`,
                                inline: false,
                            }
                        );
                    } else {
                        logger.warn(`⚠️ Webhook data not found for key: ${step.webhook}`);
                    }
                }
                if (step.image && imageMap.has(step.image)) {
                    embed.setImage(`attachment://${step.image}.png`);
                }
                embeds.push(embed);
            }
            const getAttachmentForStep = (step) => {
                if (step.image && imageMap.has(step.image)) {
                    const filePath = imageMap.get(step.image);
                    return [
                        {
                            attachment: filePath,
                            name: `${step.image}.png`,
                        },
                    ];
                }
                return [];
            };
            let currentStep = 0;
            const initialFiles = getAttachmentForStep(steps[currentStep]);
            const replyMessage = await interaction.editReply({
                embeds: [embeds[currentStep]],
                components: [getButtons(currentStep)],
                files: initialFiles,
                flags: 64,
            });
            const collector = replyMessage.createMessageComponentCollector({
                time: 600000,
            });
            collector.on('collect', async (i) => {
                if (i.customId === 'prev_step' && currentStep > 0) {
                    currentStep--;
                } else if (
                    i.customId === 'next_step' &&
          currentStep < steps.length - 1
                ) {
                    currentStep++;
                }
                const newFiles = getAttachmentForStep(steps[currentStep]);
                await i.update({
                    embeds: [embeds[currentStep]],
                    components: [getButtons(currentStep)],
                    files: newFiles,
                });
            });
        } catch (error) {
            logger.error('❌ Error executing /live_gains_tutorial:', error);
            await interaction.editReply({
                content: '❌ An error occurred.',
                flags: 64,
            });
        }
    },
};
