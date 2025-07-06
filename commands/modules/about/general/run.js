exports.description = 'General information about NyaBot';

exports.execute = async (ctx) => {
    // Create dropdown for navigation
    const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
    
    const embed = {
        title: '🤖 About NyaBot - General',
        description: 'Welcome to NyaBot! Your friendly Discord companion.',
        fields: [
            {
                name: '📋 Description',
                value: 'NyaBot is a versatile Discord bot designed to help manage your server with moderation tools, user utilities, and fun features.',
                inline: false
            },
            {
                name: '🛠️ Features',
                value: '• Moderation commands (ban, unban, banlist)\n• User information utilities\n• Server management tools\n• Status management\n• Help system with pagination',
                inline: false
            },
            {
                name: '📊 Version',
                value: 'v1.0.0',
                inline: true
            },
            {
                name: '🏓 Uptime',
                value: `${Math.floor(process.uptime())} seconds`,
                inline: true
            },
            {
                name: '💻 Built With',
                value: `Node.js ${process.version}\nDiscord.js ${require('discord.js').version}`,
                inline: true
            }
        ],
        color: 0x5865F2,
        timestamp: new Date().toISOString(),
        footer: {
            text: 'NyaBot • General Information'
        }
    };

    // Create dropdown menu for navigation
    let components = [];
    try {
        const selectMenu = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('about_nav')
                    .setPlaceholder('Select information to view...')
                    .addOptions([
                        {
                            label: 'General Information',
                            description: 'About NyaBot and its features',
                            value: 'general',
                            emoji: '🤖',
                            default: true
                        },
                        {
                            label: 'Copyright',
                            description: 'Copyright and licensing information',
                            value: 'copyright',
                            emoji: '📄'
                        },
                        {
                            label: 'Invite Bot',
                            description: 'Get invitation link for the bot',
                            value: 'invite',
                            emoji: '🔗'
                        },
                        {
                            label: 'Privacy Policy',
                            description: 'Privacy and data handling policy',
                            value: 'privacy',
                            emoji: '🔒'
                        },
                        {
                            label: 'Terms of Service',
                            description: 'Terms and conditions of use',
                            value: 'terms',
                            emoji: '📜'
                        }
                    ])
            );
        
        components = [selectMenu];
    } catch (discordError) {
        // Discord.js not available (probably in test environment)
        // Add navigation info to footer instead
        embed.footer.text += ' | Use "about <section>" to navigate';
    }

    return {
        embeds: [embed],
        components: components
    };
};
