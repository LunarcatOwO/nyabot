exports.description = 'Copyright and licensing information';

exports.execute = async (ctx) => {
    const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
    
    const embed = {
        title: '📄 About NyaBot - Copyright',
        description: 'Copyright and licensing information for NyaBot.',
        fields: [
            {
                name: '📄 License',
                value: '[Placeholder] This bot is licensed under the MIT License.',
                inline: false
            },
            {
                name: '👤 Developer',
                value: '[Placeholder] Developed by LunarcatOwO',
                inline: true
            },
            {
                name: '📅 Copyright Year',
                value: '© 2025',
                inline: true
            },
            {
                name: '⚖️ Legal Notice',
                value: '[Placeholder] All rights reserved. This software is provided "as is" without warranty of any kind.',
                inline: false
            },
            {
                name: '🔗 Source Code',
                value: '[Placeholder] Source code may be available on GitHub.',
                inline: false
            }
        ],
        color: 0xFF9900,
        timestamp: new Date().toISOString(),
        thumbnail: {
            url: ctx.raw.client.user.displayAvatarURL({ dynamic: true, size: 256 })
        },
        footer: {
            text: 'NyaBot • Copyright Information'
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
                            emoji: '🤖'
                        },
                        {
                            label: 'Copyright',
                            description: 'Copyright and licensing information',
                            value: 'copyright',
                            emoji: '📄',
                            default: true
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
        embed.footer.text += ' | Use "about <section>" to navigate';
    }

    return {
        embeds: [embed],
        components: components
    };
};
