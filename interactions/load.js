const fs = require('fs');
const path = require('path');

// Store loaded interactions
const interactions = new Map();

/**
 * Load all interaction handlers from the interactions directory
 */
function loadInteractions() {
    console.log('🔄 Loading interaction handlers...');
    
    const interactionsDir = path.join(__dirname, '../interactions');
    
    if (!fs.existsSync(interactionsDir)) {
        console.log('⚠️ Interactions directory not found, skipping interaction loading');
        return;
    }
    
    try {
        loadInteractionsFromDirectory(interactionsDir);
        console.log(`✅ Loaded ${interactions.size} interaction handler(s)`);
    } catch (error) {
        console.error('❌ Error loading interactions:', error);
    }
}

/**
 * Recursively load interactions from a directory
 */
function loadInteractionsFromDirectory(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
            // Recursively load from subdirectories
            loadInteractionsFromDirectory(itemPath);
        } else if (item.endsWith('.js') && item !== 'load.js') {
            try {
                // Clear require cache to allow hot reloading
                delete require.cache[require.resolve(itemPath)];
                
                const interaction = require(itemPath);
                
                if (interaction.customId && typeof interaction.execute === 'function') {
                    interactions.set(interaction.customId, interaction);
                    console.log(`📁 Loaded interaction: ${interaction.customId}`);
                } else {
                    console.warn(`⚠️ Invalid interaction file: ${itemPath} (missing customId or execute function)`);
                }
            } catch (error) {
                console.error(`❌ Error loading interaction ${itemPath}:`, error);
            }
        }
    }
}

/**
 * Handle an interaction
 */
async function handleInteraction(interaction) {
    try {
        // Check if it's a button interaction
        if (!interaction.isButton()) {
            return;
        }
        
        // First try exact match
        let handler = interactions.get(interaction.customId);
        
        // If no exact match, try partial matches for dynamic interactions
        if (!handler) {
            for (const [customId, interactionHandler] of interactions) {
                if (interaction.customId.startsWith(customId + '_')) {
                    handler = interactionHandler;
                    break;
                }
            }
        }
        
        if (!handler) {
            console.warn(`⚠️ No handler found for interaction: ${interaction.customId}`);
            return;
        }
        
        // Execute the interaction handler
        await handler.execute(interaction);
        
    } catch (error) {
        console.error('❌ Error handling interaction:', error);
        
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: '❌ An error occurred while processing this interaction.',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: '❌ An error occurred while processing this interaction.',
                    ephemeral: true
                });
            }
        } catch (replyError) {
            console.error('❌ Error sending error response:', replyError);
        }
    }
}

/**
 * Reload all interactions (useful for development)
 */
function reloadInteractions() {
    console.log('🔄 Reloading interactions...');
    interactions.clear();
    loadInteractions();
}

/**
 * Get all loaded interactions
 */
function getLoadedInteractions() {
    return Array.from(interactions.keys());
}

module.exports = {
    loadInteractions,
    handleInteraction,
    reloadInteractions,
    getLoadedInteractions
};
