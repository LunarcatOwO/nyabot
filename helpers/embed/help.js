/**
 * Helper functions to generate help embed with categorized commands and pagination
 */

function generateHelpEmbed(commands, page = 1) {
    // Group commands by category
    const categories = {};
    commands.forEach(cmd => {
        const category = cmd.category || 'General';
        if (!categories[category]) {
            categories[category] = [];
        }
        categories[category].push(cmd);
    });
    
    // Sort commands within each category alphabetically
    Object.keys(categories).forEach(category => {
        categories[category].sort((a, b) => a.name.localeCompare(b.name));
    });
    
    // Sort categories alphabetically, but put "General" last
    const sortedCategories = Object.keys(categories).sort((a, b) => {
        if (a === 'General') return 1;
        if (b === 'General') return -1;
        return a.localeCompare(b);
    });
    
    // Each category gets its own page
    const totalPages = sortedCategories.length;
    
    // Validate page number
    if (page > totalPages || page < 1) {
        return {
            error: true,
            embed: {
                title: '❌ Invalid Page',
                description: `Page ${page} doesn't exist. There are only ${totalPages} page(s) available.`,
                color: 0xFF0000
            }
        };
    }

    // Get the category for this page
    const currentCategory = sortedCategories[page - 1];
    const categoryCommands = categories[currentCategory];

    // Create fields for commands in this category
    const categoryFields = [];
    
    categoryCommands.forEach(cmd => {
        const emoji = cmd.isSubcommand ? '•' : '•'; // Same emoji for both main and subcommands
        categoryFields.push({
            name: `${emoji} ${cmd.name}`,
            value: cmd.description,
            inline: true
        });
    });

    // Create the embed
    const embed = {
        title: `🤖 NyaBot Commands - ${currentCategory}`,
        description: `**Category:** 📂 ${currentCategory}\n\n**Message Commands:** \`n+ command\`\n**Slash Commands:** \`/command\``,
        fields: categoryFields,
        color: 0x5865F2,
        footer: {
            text: `Page ${page} of ${totalPages} • ${categoryCommands.length} commands in ${currentCategory} • Total: ${commands.length} commands`
        },
        timestamp: new Date().toISOString()
    };

    return {
        error: false,
        embed,
        totalPages,
        currentPage: page,
        commandCount: commands.length,
        categoryCount: sortedCategories.length,
        currentCategory: currentCategory
    };
}

function generateHelpButtons(currentPage, totalPages, userId) {
    const components = [];
    const commandLoader = require('../../commands/load');

    // Add category dropdown if there are multiple categories
    if (totalPages > 1) {
        try {
            const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
            
            const selectId = commandLoader.helpers.generateInteractionId('help_category', userId, true);
            const selectMenu = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId(selectId)
                        .setPlaceholder('📂 Select a category...')
                        .setMaxValues(1)
                        // Options will be added by the caller
                );
            
            components.push(selectMenu);
        } catch (discordError) {
            // Discord.js not available (probably in test environment)
        }
    }

    // Add navigation buttons if there are multiple pages
    if (totalPages > 1) {
        try {
            const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
            
            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(commandLoader.helpers.generateInteractionId(`help_nav_first_${currentPage}_${totalPages}`, userId, true))
                        .setLabel('⏪ First Category')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage === 1),
                    new ButtonBuilder()
                        .setCustomId(commandLoader.helpers.generateInteractionId(`help_nav_prev_${currentPage}_${totalPages}`, userId, true))
                        .setLabel('◀️ Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentPage === 1),
                    new ButtonBuilder()
                        .setCustomId(commandLoader.helpers.generateInteractionId(`help_nav_next_${currentPage}_${totalPages}`, userId, true))
                        .setLabel('Next ▶️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentPage === totalPages),
                    new ButtonBuilder()
                        .setCustomId(commandLoader.helpers.generateInteractionId(`help_nav_last_${currentPage}_${totalPages}`, userId, true))
                        .setLabel('Last Category ⏩')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage === totalPages)
                );
            
            components.push(buttons);
        } catch (discordError) {
            // Discord.js not available (probably in test environment)
        }
    }

    return components;
}

function generateCompleteHelpInterface(commands, page, userId) {
    const result = generateHelpEmbed(commands, page);
    
    if (result.error) {
        return result;
    }

    // Group commands by category to build dropdown options
    const categories = {};
    commands.forEach(cmd => {
        const category = cmd.category || 'General';
        if (!categories[category]) {
            categories[category] = [];
        }
        categories[category].push(cmd);
    });

    // Sort categories alphabetically, but put "General" last
    const sortedCategories = Object.keys(categories).sort((a, b) => {
        if (a === 'General') return 1;
        if (b === 'General') return -1;
        return a.localeCompare(b);
    });

    // Generate components
    const components = generateHelpButtons(result.currentPage, result.totalPages, userId);
    
    // Add dropdown options if we have a dropdown component
    if (components.length > 0 && components[0].components[0] && components[0].components[0].data && components[0].components[0].data.type === 3) { // StringSelectMenu type
        const dropdownOptions = sortedCategories.map((category, index) => ({
            label: category,
            value: `${index + 1}`, // Page number
            description: `${categories[category].length} command${categories[category].length !== 1 ? 's' : ''}`,
            emoji: '📂',
            default: (index + 1) === page
        }));
        
        components[0].components[0].setOptions(dropdownOptions);
    }

    return {
        ...result,
        components,
        sortedCategories
    };
}

module.exports = {
    generateHelpEmbed,
    generateHelpButtons,
    generateCompleteHelpInterface
};
