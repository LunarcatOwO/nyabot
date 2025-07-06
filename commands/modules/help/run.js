exports.name = 'help';
exports.description = 'Displays help information and lists all available commands.';
exports.category = 'Utility';
exports.ephemeral = true; // Make help responses ephemeral to avoid clutter
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
        const commands = commandLoader.getAvailableCommands(ctx.member, ctx.guild, ctx.user.id);
        
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
        const helpHelper = require('../../../helpers/helpEmbed');
        const result = helpHelper.generateCompleteHelpInterface(commands, page, ctx.user.id);
        
        if (result.error) {
            return { embeds: [result.embed] };
        }

        // Schedule cleanup after 1 minute
        if (result.components && result.components.length > 0) {
            setTimeout(async () => {
                try {
                    // Try to edit the message to remove components
                    if (ctx.isSlashCommand && (ctx.raw.replied || ctx.raw.deferred)) {
                        await ctx.editReply({
                            embeds: [result.embed],
                            components: [] // Remove all components
                        });
                    }
                } catch (error) {
                    // Message might have been deleted or interaction expired
                    console.log('Help cleanup: Message no longer accessible');
                }
            }, 60000); // 1 minute
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
