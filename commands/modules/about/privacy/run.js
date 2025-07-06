exports.description = 'Privacy and data handling policy';

exports.execute = async (ctx) => {
    const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
    
    const embed = {
        title: '🔒 About NyaBot - Privacy Policy',
        description: 'How NyaBot handles your data and privacy.',
        fields: [
            {
                name: '📊 Data Collection',
                value: '[Placeholder] We collect minimal data necessary for bot functionality, including user IDs, server IDs, and command usage statistics.',
                inline: false
            },
            {
                name: '💾 Data Storage',
                value: '[Placeholder] Data is stored securely and only for as long as necessary to provide our services.',
                inline: false
            },
            {
                name: '🔐 Data Security',
                value: '[Placeholder] We implement appropriate security measures to protect your data against unauthorized access.',
                inline: false
            },
            {
                name: '🚫 Data Sharing',
                value: '[Placeholder] We do not sell, trade, or share your personal data with third parties.',
                inline: false
            },
            {
                name: '🗑️ Data Deletion',
                value: '[Placeholder] You can request data deletion by contacting us. Data is automatically purged when the bot leaves a server.',
                inline: false
            },
            {
                name: '📧 Contact',
                value: '[Placeholder] For privacy concerns, contact us at privacy@example.com',
                inline: false
            }
        ],
        color: 0x0099FF,
        timestamp: new Date().toISOString(),
        thumbnail: {
            url: ctx.raw.client.user.displayAvatarURL({ dynamic: true, size: 256 })
        },
        footer: {
            text: 'NyaBot • Privacy Policy • Last Updated: 2025-01-01'
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
                            emoji: '🔒',
                            default: true
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
