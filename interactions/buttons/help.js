exports.customId = 'help_nav';
exports.description = 'Handle help command pagination navigation';

exports.execute = async (interaction) => {
    // Parse the button data
    const parts = interaction.customId.split('_');
    if (parts.length < 5) {
        return interaction.reply({
            content: '❌ Invalid button interaction format.',
            ephemeral: true
        });
    }
    
    const action = parts[2];
    const currentPage = parseInt(parts[3]);
    const totalPages = parseInt(parts[4]);
    
    let newPage = currentPage;
    
    // Determine new page based on action
    switch (action) {
        case 'first':
            newPage = 1;
            break;
        case 'prev':
            newPage = Math.max(1, currentPage - 1);
            break;
        case 'next':
            newPage = Math.min(totalPages, currentPage + 1);
            break;
        case 'last':
            newPage = totalPages;
            break;
        default:
            return interaction.reply({
                content: '❌ Invalid navigation action.',
                ephemeral: true
            });
    }
    
    // If page hasn't changed, just acknowledge
    if (newPage === currentPage) {
        return interaction.reply({
            content: `📋 You're already on ${newPage === 1 ? 'the first' : 'the last'} page.`,
            ephemeral: true
        });
    }
    
    try {
        // Get commands available to this user
        const commandLoader = require('../../commands/load');
        const commands = commandLoader.getAvailableCommands(interaction.member, interaction.guild, interaction.user.id);
        
        // Sort commands alphabetically
        commands.sort((a, b) => a.name.localeCompare(b.name));
        
        // Pagination settings
        const itemsPerPage = 10;
        const totalPagesRecalc = Math.ceil(commands.length / itemsPerPage);
        
        // Validate new page
        if (newPage > totalPagesRecalc) {
            return interaction.reply({
                content: '❌ That page no longer exists.',
                ephemeral: true
            });
        }
        
        const startIndex = (newPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, commands.length);
        const pageCommands = commands.slice(startIndex, endIndex);
        
        // Create embed fields
        const commandFields = pageCommands.map((cmd, index) => {
            const globalIndex = startIndex + index + 1;
            const emoji = cmd.isSubcommand ? '└─' : '•';
            
            return {
                name: `${globalIndex}. ${emoji} ${cmd.name}`,
                value: cmd.description,
                inline: false
            };
        });
        
        // Create updated embed
        const embed = {
            title: '🤖 NyaBot Commands',
            description: 'Here are all available commands!\n\n' +
                '**Message Commands:** `n+ command`\n**Slash Commands:** `/command`',
            fields: commandFields,
            color: 0x5865F2,
            footer: {
                text: `Page ${newPage} of ${totalPagesRecalc} • Total commands: ${commands.length}`
            },
            timestamp: new Date().toISOString()
        };
        
        // Create navigation buttons
        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        
        let components = [];
        if (totalPagesRecalc > 1) {
            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`help_nav_first_${newPage}_${totalPagesRecalc}`)
                        .setLabel('⏪ First')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(newPage === 1),
                    new ButtonBuilder()
                        .setCustomId(`help_nav_prev_${newPage}_${totalPagesRecalc}`)
                        .setLabel('◀️ Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(newPage === 1),
                    new ButtonBuilder()
                        .setCustomId(`help_nav_next_${newPage}_${totalPagesRecalc}`)
                        .setLabel('Next ▶️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(newPage === totalPagesRecalc),
                    new ButtonBuilder()
                        .setCustomId(`help_nav_last_${newPage}_${totalPagesRecalc}`)
                        .setLabel('Last ⏩')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(newPage === totalPagesRecalc)
                );
            
            components = [buttons];
        }
        
        // Update the message
        await interaction.update({
            embeds: [embed],
            components: components
        });
        
    } catch (error) {
        console.error('Error handling help navigation:', error);
        
        await interaction.reply({
            content: '❌ An error occurred while navigating the help menu.',
            ephemeral: true
        });
    }
};
