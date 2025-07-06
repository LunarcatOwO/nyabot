exports.description = 'Get invitation link for the bot';

exports.execute = async (ctx) => {
    const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    
    const embed = {
        title: '🔗 About NyaBot - Invite',
        description: 'Add NyaBot to your Discord server!',
        fields: [
            {
                name: '🎯 Recommended Permissions',
                value: '• Ban Members\n• Kick Members\n• Manage Messages\n• View Channels\n• Send Messages\n• Embed Links\n• Use Slash Commands',
                inline: false
            },
            {
                name: '⚡ Quick Setup',
                value: '[Placeholder] After inviting, run `/help` to see available commands.',
                inline: false
            },
            {
                name: '🛠️ Admin Permissions',
                value: '[Placeholder] For full functionality, consider granting Administrator permissions.',
                inline: false
            },
            {
                name: '📋 Bot ID',
                value: `\`${ctx.raw.client.user.id}\``,
                inline: true
            },
            {
                name: '🌟 Support Server',
                value: '[Placeholder] Join our support server for help!',
                inline: true
            }
        ],
        color: 0x00FF00,
        timestamp: new Date().toISOString(),
        footer: {
            text: 'NyaBot • Invitation Information'
        }
    };

    // Create action rows
    let components = [];
    try {
        // Dropdown menu for navigation
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
                            emoji: '🔗',
                            default: true
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

        // Invite button
        const inviteButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Invite NyaBot')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://discord.com/api/oauth2/authorize?client_id=${ctx.raw.client.user.id}&permissions=8&scope=bot%20applications.commands`)
                    .setEmoji('🔗'),
                new ButtonBuilder()
                    .setLabel('Support Server')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://discord.gg/placeholder') // Replace with actual support server
                    .setEmoji('🛠️')
            );
        
        components = [selectMenu, inviteButton];
    } catch (discordError) {
        embed.footer.text += ' | Use "about <section>" to navigate';
    }

    return {
        embeds: [embed],
        components: components
    };
};
