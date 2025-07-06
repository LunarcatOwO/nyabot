exports.description = 'License information';

exports.execute = async (ctx) => {
    const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
    
    const embed = {
        title: 'About Me - License',
        fields: [
            {
                name: 'License',
                value: 'Nyabot is licensed under GNU General Public License v3.0 (GPL-3.0).',
                inline: false
            },
            {
                name: 'Developer',
                value: 'Developed by LunarcatOwO',
                inline: true
            },
            {
                name: 'Notice',
                value: `This program comes with ABSOLUTELY NO WARRANTY. This is free software, and you are welcome to redistribute it under certain conditions; go to [LICENSE FILE](https://github.com/LunarcatOwO/nyabot/blob/main/LICENSE) on github for details.`,
                inline: false
            },
            {
                name: 'Source Code',
                value: 'Source code is available on [GitHub](https://github.com/LunarcatOwO/NyaBot).',
                inline: false
            },
            {
                name: 'License Year',
                value: '2025',
                inline: true
            },
        ],
        color: 0xFF9900,
        timestamp: new Date().toISOString(),
        thumbnail: {
            url: ctx.raw.client.user.displayAvatarURL({ dynamic: true, size: 256 })
        },
        footer: {
            text: 'NyaBot • License Information'
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
                            value: 'general'
                        },
                        {
                            label: 'License',
                            description: 'Licensing information',
                            value: 'license',
                            default: true
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
        embed.footer.text += ' | Use "about <section>" to navigate';
    }

    return {
        embeds: [embed],
        components: components
    };
};
