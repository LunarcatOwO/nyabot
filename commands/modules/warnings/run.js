exports.name = 'warnings';
exports.description = 'View warnings for a user';
exports.category = 'Moderation';
exports.permissions = ['ModerateMembers']; // Required permissions
exports.guildOnly = true; // Can only be used in servers
exports.ephemeral = true; // Make response ephemeral (only visible to user) for slash commands
exports.userLocked = true; // Lock interactions to the user who triggered the command
exports.autoCleanup = 45000; // Auto-remove components after 45 seconds
exports.options = [
    {
        name: 'user',
        type: 6, // USER type
        description: 'The user to check warnings for',
        required: false
    },
    {
        name: 'page',
        type: 4, // INTEGER type
        description: 'Page number to view (default: 1)',
        required: false,
        min_value: 1
    }
];

exports.execute = async (ctx) => {
    // Check if the command is being used in a guild
    if (!ctx.guild) {
        return {
            embeds: [{
                title: '❌ Guild Only',
                description: 'This command can only be used in a server.',
                color: 0xFF0000
            }]
        };
    }

    // Check if the user has permission to moderate members
    if (!ctx.member.permissions.has('ModerateMembers')) {
        return {
            embeds: [{
                title: '❌ Permission Denied',
                description: 'You don\'t have permission to view warnings.',
                color: 0xFF0000
            }]
        };
    }

    let targetUser = ctx.user; // Default to command user
    let page = 1;

    if (ctx.isSlashCommand) {
        targetUser = ctx.options.getUser('user') || ctx.user;
        page = ctx.options.getInteger('page') || 1;
    } else if (ctx.isMessage) {
        // For message commands, check for mentions or user ID
        const mentions = ctx.raw.mentions?.users;
        if (mentions && mentions.size > 0) {
            targetUser = mentions.first();
        } else if (ctx.args.length > 0) {
            // Try to get user by ID
            const userInput = ctx.args[0];
            const snowflakeRegex = /^\d{17,19}$/;
            
            if (snowflakeRegex.test(userInput)) {
                try {
                    targetUser = await ctx.raw.client.users.fetch(userInput);
                } catch {
                    return {
                        embeds: [{
                            title: '❌ User Not Found',
                            description: `Could not find user with ID: \`${userInput}\``,
                            color: 0xFF0000
                        }]
                    };
                }
            }
            
            // Check for page number in second argument
            if (ctx.args.length > 1) {
                const pageInput = parseInt(ctx.args[1]);
                if (!isNaN(pageInput) && pageInput > 0) {
                    page = pageInput;
                }
            }
        }
    }

    try {
        const db = require('../../../helpers/db');
        
        // Get all warnings for the user in this guild
        const warnings = await db.read.getUserWarnings(targetUser.id, ctx.guild.id);
        
        if (warnings.length === 0) {
            return {
                embeds: [{
                    title: '📋 User Warnings',
                    description: `✅ **${targetUser.tag}** has no warnings in this server.`,
                    color: 0x00FF00,
                    footer: {
                        text: `Server: ${ctx.guild.name}`
                    }
                }]
            };
        }

        // Pagination
        const itemsPerPage = 5;
        const totalPages = Math.ceil(warnings.length / itemsPerPage);
        
        // Validate page number
        if (page > totalPages) {
            return {
                embeds: [{
                    title: '❌ Invalid Page',
                    description: `Page ${page} does not exist. There are only ${totalPages} page(s) of warnings.`,
                    color: 0xFF0000
                }]
            };
        }

        // Calculate pagination
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, warnings.length);
        const pageWarnings = warnings.slice(startIndex, endIndex);

        // Create warning fields
        const warningFields = pageWarnings.map((warning, index) => {
            const globalIndex = startIndex + index + 1;
            const warnedBy = warning.warned_by_username || `Unknown User (${warning.warned_by})`;
            const reason = warning.reason || 'No reason provided';
            const date = new Date(warning.warned_at).toLocaleDateString();
            
            return {
                name: `${globalIndex}. Warning #${warning.id}`,
                value: `**Reason:** ${reason.length > 100 ? reason.substring(0, 97) + '...' : reason}\n**Warned by:** ${warnedBy}\n**Date:** ${date}`,
                inline: false
            };
        });

        // Create the embed
        const embed = {
            title: '⚠️ User Warnings',
            description: `Showing warnings for **${targetUser.tag}** in **${ctx.guild.name}**`,
            fields: warningFields,
            color: 0xFFCC00,
            footer: {
                text: `Page ${page} of ${totalPages} • Total warnings: ${warnings.length}`
            },
            timestamp: new Date().toISOString()
        };

        // Create navigation buttons if there are multiple pages
        let components = [];
        if (totalPages > 1) {
            const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
            
            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`warnings_nav_first_${page}_${totalPages}_${targetUser.id}_${ctx.guild.id}`)
                        .setLabel('⏪ First')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === 1),
                    new ButtonBuilder()
                        .setCustomId(`warnings_nav_prev_${page}_${totalPages}_${targetUser.id}_${ctx.guild.id}`)
                        .setLabel('◀️ Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === 1),
                    new ButtonBuilder()
                        .setCustomId(`warnings_nav_next_${page}_${totalPages}_${targetUser.id}_${ctx.guild.id}`)
                        .setLabel('Next ▶️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === totalPages),
                    new ButtonBuilder()
                        .setCustomId(`warnings_nav_last_${page}_${totalPages}_${targetUser.id}_${ctx.guild.id}`)
                        .setLabel('Last ⏩')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === totalPages)
                );
            
            components = [buttons];
        }

        return { 
            embeds: [embed],
            components: components
        };

    } catch (error) {
        console.error('Error fetching warnings:', error);

        return {
            embeds: [{
                title: '❌ Error Fetching Warnings',
                description: 'Failed to retrieve the warnings list. This could be due to a database error.',
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
