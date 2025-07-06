exports.customId = 'help_category';
exports.description = 'Handle help command category selection';

exports.execute = async (interaction) => {
    const commandLoader = require('../../commands/load');
    
    // Check if user is authorized to use this interaction
    if (!commandLoader.helpers.checkInteractionAuthorization(interaction, interaction.customId)) {
        return interaction.reply({
            content: '❌ Only the user who triggered this help command can navigate it.',
            ephemeral: true
        });
    }
    
    const selectedPage = parseInt(interaction.values[0]);
    
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
        const result = commandLoader.helpers.embed.help.generateCompleteHelpInterface(commands, selectedPage, interaction.user.id);
        
        if (result.error) {
            return await interaction.reply({
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
        console.error('Error handling help category selection:', error);
        
        await interaction.reply({
            content: '❌ An error occurred while changing categories.',
            ephemeral: true
        });
    }
};
