exports.description = 'General information about NyaBot';

exports.execute = async (ctx) => {
    // Create dropdown for navigation
    const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
    
    const embed = {
        title: 'About Me - General',
        description: 'Thanks for choosing Me!',
        fields: [
            {
                name: 'About Me!',
                value: 'I am NyaBot, and I\'m trying to be the general purpose discord bot for your server. Maybe even the only bot you need!',
                inline: false
            },
            {
                name: 'Features I currently offer',
                value: '• Moderation commands (ban, unban, banlist)\n• User information utilities\n• Server management tools',
                inline: false
            },
            {
                name: '🟢 I\'ve been online for',
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
        thumbnail: {
            url: ctx.raw.client.user.displayAvatarURL({ dynamic: true, size: 256 })
        },
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
                            default: true
                        },
                        {
                            label: 'Copyright',
                            description: 'Copyright and licensing information',
                            value: 'copyright'
                        },
                        {
                            label: 'Invite Bot',
                            description: 'Get invitation link for the bot',
                            value: 'invite'
                        },
                        {
                            label: 'Privacy Policy',
                            description: 'Privacy and data handling policy',
                            value: 'privacy'
                        },
                        {
                            label: 'Terms of Service',
                            description: 'Terms and conditions of use',
                            value: 'terms'
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
