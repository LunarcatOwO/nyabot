exports.customId = 'warnings_nav';
exports.description = 'Handle warnings pagination navigation';

exports.execute = async (interaction) => {
    // Parse the button data
    const parts = interaction.customId.split('_');
    if (parts.length < 7) {
        return interaction.reply({
            content: '❌ Invalid button interaction format.',
            ephemeral: true
        });
    }
    
    const action = parts[2];
    const currentPage = parseInt(parts[3]);
    const totalPages = parseInt(parts[4]);
    const targetUserId = parts[5];
    const guildId = parts[6];
    
    // Verify the interaction is from the same guild
    if (interaction.guild.id !== guildId) {
        return interaction.reply({
            content: '❌ This warnings list is for a different server.',
            ephemeral: true
        });
    }
    
    // Check if user has permissions
    if (!interaction.member.permissions.has('ModerateMembers')) {
        return interaction.reply({
            content: '❌ You don\'t have permission to view warnings.',
            ephemeral: true
        });
    }
    
    // Calculate new page
    let newPage = currentPage;
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
                content: '❌ Unknown navigation action.',
                ephemeral: true
            });
    }
    
    try {
        // Fetch target user
        const targetUser = await interaction.client.users.fetch(targetUserId);
        
        // Get warnings from database
        const db = require('../../helpers/db');
        const warnings = await db.read.getUserWarnings(targetUserId, guildId);
        
        if (warnings.length === 0) {
            return interaction.update({
                embeds: [{
                    title: '📋 User Warnings',
                    description: `✅ **${targetUser.tag}** has no warnings in this server.`,
                    color: 0x00FF00,
                    footer: {
                        text: `Server: ${interaction.guild.name}`
                    }
                }],
                components: []
            });
        }
        
        // Pagination
        const itemsPerPage = 5;
        const totalPagesRecalc = Math.ceil(warnings.length / itemsPerPage);
        
        // Validate new page
        if (newPage > totalPagesRecalc) {
            return interaction.reply({
                content: `❌ Page ${newPage} does not exist. There are only ${totalPagesRecalc} page(s) of warnings.`,
                ephemeral: true
            });
        }
        
        // Calculate pagination
        const startIndex = (newPage - 1) * itemsPerPage;
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
            description: `Showing warnings for **${targetUser.tag}** in **${interaction.guild.name}**`,
            fields: warningFields,
            color: 0xFFCC00,
            footer: {
                text: `Page ${newPage} of ${totalPagesRecalc} • Total warnings: ${warnings.length}`
            },
            timestamp: new Date().toISOString()
        };
        
        // Create navigation buttons
        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`warnings_nav_first_${newPage}_${totalPagesRecalc}_${targetUserId}_${interaction.guild.id}`)
                    .setLabel('⏪ First')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(newPage === 1),
                new ButtonBuilder()
                    .setCustomId(`warnings_nav_prev_${newPage}_${totalPagesRecalc}_${targetUserId}_${interaction.guild.id}`)
                    .setLabel('◀️ Previous')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(newPage === 1),
                new ButtonBuilder()
                    .setCustomId(`warnings_nav_next_${newPage}_${totalPagesRecalc}_${targetUserId}_${interaction.guild.id}`)
                    .setLabel('Next ▶️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(newPage === totalPagesRecalc),
                new ButtonBuilder()
                    .setCustomId(`warnings_nav_last_${newPage}_${totalPagesRecalc}_${targetUserId}_${interaction.guild.id}`)
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
        console.error('Error handling warnings navigation:', error);
        
        await interaction.reply({
            content: '❌ An error occurred while navigating the warnings list.',
            ephemeral: true
        });
    }
};
