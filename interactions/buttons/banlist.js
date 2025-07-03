exports.customId = 'banlist_nav';
exports.description = 'Handle banlist pagination navigation';

exports.execute = async (interaction) => {
    // Parse the button data
    const parts = interaction.customId.split('_');
    if (parts.length < 6) {
        return interaction.reply({
            content: '❌ Invalid button interaction format.',
            ephemeral: true
        });
    }
    
    const action = parts[2];
    const currentPage = parseInt(parts[3]);
    const totalPages = parseInt(parts[4]);
    const guildId = parts[5];
    
    const page = currentPage;
    const maxPages = totalPages;
    
    // Verify the interaction is from the same guild
    if (interaction.guild.id !== guildId) {
        return interaction.reply({
            content: '❌ This banlist is for a different server.',
            ephemeral: true
        });
    }
    
    // Check if user has permissions
    if (!interaction.member.permissions.has('BanMembers') && !interaction.member.permissions.has('ModerateMembers')) {
        return interaction.reply({
            content: '❌ You don\'t have permission to view the ban list.',
            ephemeral: true
        });
    }
    
    let newPage = page;
    
    // Determine new page based on action
    switch (action) {
        case 'first':
            newPage = 1;
            break;
        case 'prev':
            newPage = Math.max(1, page - 1);
            break;
        case 'next':
            newPage = Math.min(maxPages, page + 1);
            break;
        case 'last':
            newPage = maxPages;
            break;
        default:
            return interaction.reply({
                content: '❌ Invalid navigation action.',
                ephemeral: true
            });
    }
    
    // If page hasn't changed, just acknowledge
    if (newPage === page) {
        return interaction.reply({
            content: `📋 You're already on ${newPage === 1 ? 'the first' : 'the last'} page.`,
            ephemeral: true
        });
    }
    
    try {
        // Fetch bans again for the new page
        const bans = await interaction.guild.bans.fetch();
        
        if (bans.size === 0) {
            return interaction.update({
                embeds: [{
                    title: '📋 Ban List',
                    description: '✅ No users are currently banned from this server.',
                    color: 0x00FF00,
                    footer: {
                        text: `Server: ${interaction.guild.name}`
                    }
                }],
                components: []
            });
        }
        
        // Convert to array and sort
        const banArray = Array.from(bans.values());
        banArray.sort((a, b) => {
            const nameA = a.user.username || a.user.id;
            const nameB = b.user.username || b.user.id;
            return nameA.localeCompare(nameB);
        });
        
        // Pagination
        const itemsPerPage = 10;
        const totalPagesRecalc = Math.ceil(banArray.length / itemsPerPage);
        
        // Validate new page
        if (newPage > totalPagesRecalc) {
            return interaction.reply({
                content: '❌ That page no longer exists.',
                ephemeral: true
            });
        }
        
        const startIndex = (newPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, banArray.length);
        const pageBans = banArray.slice(startIndex, endIndex);
        
        // Create embed fields
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
        
        // Create updated embed
        const embed = {
            title: '🔨 Server Ban List',
            description: `Showing banned users in **${interaction.guild.name}**`,
            fields: banFields,
            color: 0xFF6B6B,
            footer: {
                text: `Page ${newPage} of ${totalPagesRecalc} • Total bans: ${bans.size}`
            },
            timestamp: new Date().toISOString()
        };
        
        // Create navigation buttons
        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`banlist_nav_first_${newPage}_${totalPagesRecalc}_${interaction.guild.id}`)
                    .setLabel('⏪ First')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(newPage === 1),
                new ButtonBuilder()
                    .setCustomId(`banlist_nav_prev_${newPage}_${totalPagesRecalc}_${interaction.guild.id}`)
                    .setLabel('◀️ Previous')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(newPage === 1),
                new ButtonBuilder()
                    .setCustomId(`banlist_nav_next_${newPage}_${totalPagesRecalc}_${interaction.guild.id}`)
                    .setLabel('Next ▶️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(newPage === totalPagesRecalc),
                new ButtonBuilder()
                    .setCustomId(`banlist_nav_last_${newPage}_${totalPagesRecalc}_${interaction.guild.id}`)
                    .setLabel('Last ⏩')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(newPage === totalPagesRecalc)
            );
        
        // Update the message
        await interaction.update({
            embeds: [embed],
            components: totalPagesRecalc > 1 ? [buttons] : []
        });
        
    } catch (error) {
        console.error('Error handling banlist navigation:', error);
        
        await interaction.reply({
            content: '❌ An error occurred while navigating the ban list.',
            ephemeral: true
        });
    }
};
