exports.customId = 'help_nav';
exports.description = 'Handle help command pagination navigation';

exports.execute = async (interaction) => {
    const commandLoader = require('../../commands/load');
    
    // Check if user is authorized to use this interaction
    if (!commandLoader.helpers.checkInteractionAuthorization(interaction, interaction.customId)) {
        return interaction.reply({
            content: '❌ Only the user who triggered this help command can navigate it.',
            ephemeral: true
        });
    }
    
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
        const commands = commandLoader.helpers.getAvailableCommands(interaction.member, interaction.guild, interaction.user.id);
        
        if (commands.length === 0) {
            return interaction.reply({
                content: '❌ No commands are available to you in this context.',
                ephemeral: true
            });
        }

        // Use helper to generate complete help interface
        const commandLoader = require('../../commands/load');
        const result = commandLoader.helpers.embed.help.generateCompleteHelpInterface(commands, newPage, interaction.user.id);
        
        if (result.error) {
            return interaction.reply({
                embeds: [result.embed],
                ephemeral: true
            });
        }
        
        // Update the message
        await interaction.update({
            embeds: [result.embed],
            components: result.components || []
        });
        
    } catch (error) {
        console.error('Error handling help navigation:', error);
        
        await interaction.reply({
            content: '❌ An error occurred while navigating the help menu.',
            ephemeral: true
        });
    }
};
