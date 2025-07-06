exports.name = 'help';
exports.description = 'Displays help information and lists all available commands.';
exports.category = 'Utility';
exports.ephemeral = true; // Make help responses ephemeral to avoid clutter
exports.userLocked = true; // Lock interactions to the user who triggered the command
exports.autoCleanup = 60000; // Auto-remove components after 60 seconds (1 minute)
exports.options = [
    {
        name: 'page',
        type: 4, // INTEGER type
        description: 'Page number to view (default: 1)',
        required: false,
        min_value: 1
    }
];

exports.execute = async (ctx) => {
    let page = 1;

    if (ctx.isSlashCommand) {
        page = ctx.options.getInteger('page') || 1;
    } else if (ctx.isMessage && ctx.args.length > 0) {
        const pageInput = parseInt(ctx.args[0]);
        if (!isNaN(pageInput) && pageInput > 0) {
            page = pageInput;
        }
    }

    try {
        // Get commands available to this user
        const commandLoader = require('../../load');
        const commands = commandLoader.helpers.getAvailableCommands(ctx.member, ctx.guild, ctx.user.id);
        
        if (commands.length === 0) {
            return {
                embeds: [{
                    title: '🤖 NyaBot Commands',
                    description: '❌ No commands are available to you in this context.',
                    color: 0xFF0000
                }]
            };
        }

        // Use helper to generate complete help interface
        const result = commandLoader.helpers.embed.help.generateCompleteHelpInterface(commands, page, ctx.user.id);
        
        if (result.error) {
            return { embeds: [result.embed] };
        }

        return { 
            embeds: [result.embed],
            components: result.components || []
        };

    } catch (error) {
        console.error('Error generating help command:', error);

        return {
            embeds: [{
                title: '❌ Error Generating Help',
                description: 'Failed to retrieve command information.',
                fields: [
                    {
                        name: 'Error Details',
                        value: error.message.length > 1024 ? error.message.substring(0, 1021) + '...' : error.message,
                        inline: false
                    }
                ],
                color: 0xFF0000
            }]
        };
    }
};
