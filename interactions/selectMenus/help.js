exports.customId = 'help_category';
exports.description = 'Handle help command category selection';

exports.execute = async (interaction) => {
    // Parse the select menu data
    const parts = interaction.customId.split('_');
    if (parts.length < 4) {
        return interaction.reply({
            content: '❌ Invalid select menu interaction format.',
            ephemeral: true
        });
    }
    
    const originalUserId = parts[2];
    // parts[3] is timestamp for uniqueness
    
    // Check if the user who selected is the same as who triggered the command
    if (interaction.user.id !== originalUserId) {
        return interaction.reply({
            content: '❌ Only the user who triggered this help command can navigate it.',
            ephemeral: true
        });
    }
    
    const selectedPage = parseInt(interaction.values[0]);
    
    try {
        // Get commands available to this user
        const commandLoader = require('../../commands/load');
        const commands = commandLoader.getAvailableCommands(interaction.member, interaction.guild, interaction.user.id);
        
        if (commands.length === 0) {
            return interaction.reply({
                content: '❌ No commands are available to you in this context.',
                ephemeral: true
            });
        }

        // Use helper to generate complete help interface
        const helpHelper = require('../../helpers/helpEmbed');
        const result = helpHelper.generateCompleteHelpInterface(commands, selectedPage, interaction.user.id);
        
        if (result.error) {
            return interaction.reply({
                embeds: [result.embed],
                ephemeral: true
            });
        }

        // Schedule cleanup after 1 minute
        if (result.components && result.components.length > 0) {
            setTimeout(async () => {
                try {
                    // Try to edit the message to remove components
                    await interaction.editReply({
                        embeds: [result.embed],
                        components: [] // Remove all components
                    });
                } catch (error) {
                    // Message might have been deleted or interaction expired
                    console.log('Help cleanup: Message no longer accessible');
                }
            }, 60000); // 1 minute
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
