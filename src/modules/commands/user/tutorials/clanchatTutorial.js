const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../../utils/essentials/dbUtils');
const logger = require('../../../utils/essentials/logger');

module.exports = {
    data: new SlashCommandBuilder().setName('clanchat_tutorial').setDescription('Shows a step-by-step guide to setting up Clan Chat Webhook on RuneLite.'),

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
                    flags: 64, // This ensures the message is visible only to the user.
                });
            }

            // Fetch tutorial images from the database
            const images = await db.image.getAll('SELECT file_name, file_path FROM tutorial_files');
            if (!images.length) {
                return interaction.reply({ content: '❌ No tutorial images found in the database.', flags: 64 });
            }

            // Convert image data into a map for easy lookup
            const imageMap = new Map(images.map(({ file_name, file_path }) => [file_name, file_path]));

            // Fetch Clan Chat Webhook details from `clanchat_config`
            const config = await db.getOne('SELECT secret_key, clan_name, endpoint_url FROM clanchat_config WHERE clanchat_key = ?', ['chathook_1']);
            if (!config) {
                return interaction.reply({ content: '❌ Clan Chat configuration not found.', flags: 64 });
            }

            const { secret_key, clan_name, endpoint_url } = config;

            // Steps Data
            const steps = [
                { title: '**1.** Open RuneLite\n**2.** Go to "Configuration" in the top right corner', image: 'step_1' },
                { title: '**3.** Open "Plugin Hub"', image: 'step_2' },
                {
                    title: '**4.** Search for ```Clan Chat Webhook```\n' + 'Press **Install** and wait.\n' + 'Once installed, click on the gear icon to configure settings.',
                    image: 'step_3_cc',
                },
                {
                    title: '**5.** Add the following data into the plugin fields:\n' + `- **Secret Key** ||\`\`\`${secret_key}\`\`\`||\n` + `- **Endpoint URL**: \`\`\`${endpoint_url}\`\`\`\n` + `- **Clan Name**: \`\`\`${clan_name}\`\`\``,
                    image: 'step_4_cc',
                },
                { title: '**6.** Press back and make sure the plugin is enabled.', image: 'step_5_cc' },
                { title: '**7.** Done! ✅' },
            ];

            // Construct Embeds and Track Used Images
            const embeds = [];
            const usedImages = new Set();

            for (const { title, image } of steps) {
                const embed = new EmbedBuilder()
                    .setDescription(title)
                    .setColor(0x3498db)
                    .setFooter({ text: `Step ${embeds.length + 1} of ${steps.length}` })
                    .setTimestamp();

                if (imageMap.has(image)) {
                    const imagePath = imageMap.get(image);
                    embed.setImage(`attachment://${image}.png`);
                    usedImages.add(imagePath); // Track only used images
                }

                embeds.push(embed);
            }

            // Attach Only Used Images
            const files = [...usedImages].map((filePath) => ({
                attachment: filePath,
                name: filePath.split('/').pop(),
            }));

            // Send Tutorial
            await interaction.reply({ embeds, files, flags: 64 });
        } catch (error) {
            logger.error('Error executing /clanchat_tutorial:', error);
            await interaction.reply({ content: '❌ An error occurred while generating the tutorial.', flags: 64 });
        }
    },
};
