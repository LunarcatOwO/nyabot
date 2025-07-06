exports.description = 'Terms and conditions of use';

exports.execute = async (ctx) => {
    const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
    
    const embed = {
        title: 'About Me - Terms of Service (NOT COMPLETED)',
        description: 'Terms and conditions for using NyaBot.',
        fields: [
            {
                name: '✅ Acceptance of Terms',
                value: '[Placeholder] By using NyaBot, you agree to these terms of service and our privacy policy.',
                inline: false
            },
            {
                name: '🎯 Proper Usage',
                value: '[Placeholder] You must use the bot in accordance with Discord\'s Terms of Service and Community Guidelines.',
                inline: false
            },
            {
                name: '🚫 Prohibited Activities',
                value: '[Placeholder] Do not use the bot for harassment, spam, illegal activities, or to violate Discord\'s policies.',
                inline: false
            },
            {
                name: '⚠️ Service Availability',
                value: '[Placeholder] We provide the service "as is" and cannot guarantee 100% uptime or availability.',
                inline: false
            },
            {
                name: '🔄 Changes to Terms',
                value: '[Placeholder] We reserve the right to modify these terms at any time. Continued use constitutes acceptance.',
                inline: false
            },
            {
                name: '⚖️ Limitation of Liability',
                value: '[Placeholder] We are not liable for any damages resulting from the use of our service.',
                inline: false
            },
            {
                name: '📧 Contact',
                value: '[Placeholder] For questions about these terms, contact us at legal@example.com',
                inline: false
            }
        ],
        color: 0xFF6B6B,
        timestamp: new Date().toISOString(),
        thumbnail: {
            url: ctx.raw.client.user.displayAvatarURL({ dynamic: true, size: 256 })
        },
        footer: {
            text: 'NyaBot • Terms of Service • Last Updated: 2025-07-06'
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
                            value: 'license'
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
                            value: 'terms',
                            default: true
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
