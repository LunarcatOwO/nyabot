exports.name = 'banlist';
exports.description = 'Show all banned users from the server';
exports.permissions = ['BanMembers', 'ModerateMembers']; // User needs either permission
exports.guildOnly = true; // Can only be used in servers
exports.ephemeral = true; // Make response ephemeral (only visible to user) for slash commands
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
    // Check if the bot has permission to view bans
    if (!ctx.guild.members.me.permissions.has('BanMembers')) {
        return {
            embeds: [{
                title: '❌ Missing Bot Permissions',
                description: 'I don\'t have permission to view bans in this server.',
                color: 0xFF0000
            }]
        };
    }

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
        // Fetch all bans from the guild
        const bans = await ctx.guild.bans.fetch();
        
        if (bans.size === 0) {
            return {
                embeds: [{
                    title: '📋 Ban List',
                    description: '✅ No users are currently banned from this server.',
                    color: 0x00FF00,
                    footer: {
                        text: `Server: ${ctx.guild.name}`
                    }
                }]
            };
        }

        // Convert to array and sort by ban reason or username
        const banArray = Array.from(bans.values());
        banArray.sort((a, b) => {
            // Sort by username, fallback to user ID if no username
            const nameA = a.user.username || a.user.id;
            const nameB = b.user.username || b.user.id;
            return nameA.localeCompare(nameB);
        });

        // Pagination settings
        const itemsPerPage = 10;
        const totalPages = Math.ceil(banArray.length / itemsPerPage);
        
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
        const endIndex = Math.min(startIndex + itemsPerPage, banArray.length);
        const pageBans = banArray.slice(startIndex, endIndex);

        // Create embed fields for banned users
        const banFields = pageBans.map((ban, index) => {
            const globalIndex = startIndex + index + 1;
            const user = ban.user;
            const reason = ban.reason || 'No reason provided';
            
            return {
                name: `${globalIndex}. ${user.username || 'Unknown User'}`,
                value: `**ID:** \`${user.id}\`\n**Reason:** ${reason.length > 100 ? reason.substring(0, 97) + '...' : reason}`,
                inline: false
            };
        });

        // Create the embed
        const embed = {
            title: '🔨 Server Ban List',
            description: `Showing banned users in **${ctx.guild.name}**`,
            fields: banFields,
            color: 0xFF6B6B,
            footer: {
                text: `Page ${page} of ${totalPages} • Total bans: ${bans.size}`
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
                        .setCustomId(`banlist_nav_first_${page}_${totalPages}_${ctx.guild.id}`)
                        .setLabel('⏪ First')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === 1),
                    new ButtonBuilder()
                        .setCustomId(`banlist_nav_prev_${page}_${totalPages}_${ctx.guild.id}`)
                        .setLabel('◀️ Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === 1),
                    new ButtonBuilder()
                        .setCustomId(`banlist_nav_next_${page}_${totalPages}_${ctx.guild.id}`)
                        .setLabel('Next ▶️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === totalPages),
                    new ButtonBuilder()
                        .setCustomId(`banlist_nav_last_${page}_${totalPages}_${ctx.guild.id}`)
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
        console.error('Error fetching ban list:', error);

        return {
            embeds: [{
                title: '❌ Error Fetching Ban List',
                description: 'Failed to retrieve the ban list. This could be due to missing permissions or a server error.',
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