exports.name = 'help';
exports.description = 'Displays help information and lists all available commands.';
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
        
        // Sort commands alphabetically
        commands.sort((a, b) => a.name.localeCompare(b.name));
        
        if (commands.length === 0) {
            return {
                embeds: [{
                    title: '🤖 NyaBot Commands',
                    description: '❌ No commands are available to you in this context.',
                    color: 0xFF0000
                }]
            };
        }

        // Pagination settings
        const itemsPerPage = 10;
        const totalPages = Math.ceil(commands.length / itemsPerPage);
        
        // Validate page number
        if (page > totalPages) {
            return {
                embeds: [{
                    title: '❌ Invalid Page',
                    description: `Page ${page} doesn't exist. There are only ${totalPages} page(s) available.`,
                    color: 0xFF0000
                }]
            };
        }

        // Calculate pagination
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, commands.length);
        const pageCommands = commands.slice(startIndex, endIndex);

        // Create embed fields for commands
        const commandFields = pageCommands.map((cmd, index) => {
            const globalIndex = startIndex + index + 1;
            const emoji = cmd.isSubcommand ? '└─' : '•';
            
            return {
                name: `${globalIndex}. ${emoji} ${cmd.name}`,
                value: cmd.description,
                inline: false
            };
        });

        // Create the embed
        const embed = {
            title: '🤖 NyaBot Commands',
            description: 'Here are all available commands!\n\n' +
                '**Message Commands:** `n+ command`\n**Slash Commands:** `/command`',
            fields: commandFields,
            color: 0x5865F2,
            footer: {
                text: `Page ${page} of ${totalPages} • Total commands: ${commands.length}`
            },
            timestamp: new Date().toISOString()
        };

        // Create navigation buttons if there are multiple pages
        let components = [];
        if (totalPages > 1) {
            try {
                const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
                
                const buttons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`help_nav_first_${page}_${totalPages}`)
                            .setLabel('⏪ First')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(page === 1),
                        new ButtonBuilder()
                            .setCustomId(`help_nav_prev_${page}_${totalPages}`)
                            .setLabel('◀️ Previous')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(page === 1),
                        new ButtonBuilder()
                            .setCustomId(`help_nav_next_${page}_${totalPages}`)
                            .setLabel('Next ▶️')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(page === totalPages),
                        new ButtonBuilder()
                            .setCustomId(`help_nav_last_${page}_${totalPages}`)
                            .setLabel('Last ⏩')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(page === totalPages)
                    );
                
                components = [buttons];
            } catch (discordError) {
                // Discord.js not available (probably in test environment)
                // Add page navigation info to footer instead
                embed.footer.text += ` | Use "help <page>" to navigate`;
            }
        }

        return { 
            embeds: [embed],
            components: components
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
