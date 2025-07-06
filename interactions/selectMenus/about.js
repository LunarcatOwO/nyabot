exports.customId = 'about_nav';
exports.description = 'Handle about command navigation dropdown';

exports.execute = async (interaction) => {
    const selectedValue = interaction.values[0];
    
    try {
        // Get the about command and its subcommands
        const aboutCommand = require('../../commands/modules/about/run.js');
        
        // Check if user has permissions (inherit from parent command if any)
        if (aboutCommand.permissions && aboutCommand.permissions.length > 0) {
            const { hasPermission } = require('../../commands/load.js');
            if (!hasPermission(interaction.member, aboutCommand.permissions, interaction.user.id)) {
                return interaction.reply({
                    content: '❌ You don\'t have permission to use this command.',
                    ephemeral: true
                });
            }
        }
        
        // Load the appropriate subcommand
        let subcommandPath;
        switch (selectedValue) {
            case 'general':
                subcommandPath = '../../commands/modules/about/general/run.js';
                break;
            case 'license':
                subcommandPath = '../../commands/modules/about/license/run.js';
                break;
            case 'invite':
                subcommandPath = '../../commands/modules/about/invite/run.js';
                break;
            case 'privacy':
                subcommandPath = '../../commands/modules/about/privacy/run.js';
                break;
            case 'terms':
                subcommandPath = '../../commands/modules/about/terms/run.js';
                break;
            default:
                return interaction.reply({
                    content: '❌ Invalid selection.',
                    ephemeral: true
                });
        }
        
        // Load and execute the subcommand
        const subcommand = require(subcommandPath);
        
        // Try to reset the timer with the about command's auto-cleanup timeout
        try {
            const { resetAutoCleanupTimer } = require('../../commands/load').helpers;
            
            if (interaction.message && interaction.message.interaction && aboutCommand.autoCleanup) {
                const timerKey = `slash_${interaction.message.interaction.id}_${interaction.user.id}`;
                resetAutoCleanupTimer(timerKey, interaction, aboutCommand.autoCleanup);
            }
        } catch (timerError) {
            // Silently handle timer reset failures
        }
        
        // Create context for the subcommand
        const ctx = {
            user: interaction.user,
            guild: interaction.guild,
            channel: interaction.channel,
            member: interaction.member,
            isSlashCommand: true,
            isMessage: false,
            raw: interaction,
            reply: async (content) => interaction.update(content)
        };
        
        // Execute the subcommand
        const result = await subcommand.execute(ctx);
        
        if (result) {
            await interaction.update(result);
        }
        
    } catch (error) {
        console.error('Error handling about navigation:', error);
        
        await interaction.reply({
            content: '❌ An error occurred while loading the requested information.',
            ephemeral: true
        });
    }
};
