exports.description = 'Get invitation link for the bot';

exports.execute = async (ctx) => {
    const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    
    const embed = {
        title: '🔗 About NyaBot - Invite',
        description: 'Add NyaBot to your Discord server!',
        fields: [
            {
                name: 'Permissions I need',
                value: 'Administrator permissions',
                inline: false
            },
            {
                name: 'Quick Setup',
                value: 'Currently Nyabot after inviting will just work! No additional setup required. run the `/help` command to see available commands.',
                inline: false
            },
            {
                name: 'Admin Permissions',
                value: 'For full functionality, consider granting Administrator permissions to the user.',
                inline: false
            },
            {
                name: 'Support Server',
                value: 'I wish we had one but not yet! Create a issue on GitHub if you need help.',
                inline: true
            }
        ],
        color: 0x00FF00,
        timestamp: new Date().toISOString(),
        thumbnail: {
            url: ctx.raw.client.user.displayAvatarURL({ dynamic: true, size: 256 })
        },
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
                            value: 'general'
                        },
                        {
                            label: 'Copyright',
                            description: 'Copyright and licensing information',
                            value: 'copyright'
                        },
                        {
                            label: 'Invite Bot',
                            description: 'Get invitation link for the bot',
                            value: 'invite',
                            default: true
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

        // Invite button
        const inviteButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Invite NyaBot')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://discord.com/oauth2/authorize?client_id=1389320877560303687`)
                    .setEmoji('🔗'),
                // new ButtonBuilder()
                //     .setLabel('Support Server')
                //     .setStyle(ButtonStyle.Link)
                //     .setURL('https://discord.gg/placeholder')
                //     .setEmoji('🛠️')
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
