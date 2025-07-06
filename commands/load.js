
const fs = require('fs');
const path = require('path');

// Store active cleanup timers for resetting
const activeCleanupTimers = new Map();

function hasPermission(member, requiredPermissions, userId = null) {
    if (!requiredPermissions || requiredPermissions.length === 0) {
        return true; // No permissions required
    }
    
    // Check for BotOwner permission first
    if (requiredPermissions.includes('BotOwner')) {
        const botOwnerId = process.env.ROOT_USR;
        if (!botOwnerId) {
            console.warn('ROOT_USR environment variable not set, BotOwner permission checks will fail');
            return false;
        }
        const userIdToCheck = userId || (member ? member.id : null);
        return userIdToCheck === botOwnerId;
    }
    
    if (!member) {
        return false; // Can't check guild permissions without member
    }
    
    // Check if user is server owner (they have all permissions except BotOwner)
    if (member.guild && member.id === member.guild.ownerId) {
        return true;
    }
    
    // Check if member has any of the required permissions
    return requiredPermissions.some(permission => {
        if (typeof permission === 'string') {
            return member.permissions.has(permission);
        }
        return false;
    });
}

/**
 * Generate a custom ID for interactions with optional user locking
 * @param {string} baseId - The base custom ID
 * @param {string} userId - The user ID for locking (if userLocked is true)
 * @param {boolean} userLocked - Whether to include user ID for locking
 * @returns {string} - The generated custom ID
 */
function generateInteractionId(baseId, userId = null, userLocked = false) {
    if (userLocked && userId) {
        return `${baseId}_${userId}_${Date.now()}`;
    }
    return baseId;
}

/**
 * Schedule auto-cleanup for an interaction response with timer reset capability
 * @param {Object} interactionOrMessage - The Discord interaction or message
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} context - Context for logging (e.g., command name)
 * @param {Object} originalResponse - The original response message (for text commands)
 * @param {string} messageId - Optional message ID for timer tracking (auto-generated if not provided)
 * @returns {string} - The message ID used for timer tracking
 */
function scheduleAutoCleanup(interactionOrMessage, timeoutMs, context = 'interaction', originalResponse = null, messageId = null) {
    if (!timeoutMs) return null;
    
    const isSlashCommand = interactionOrMessage && typeof interactionOrMessage.reply === 'function' && interactionOrMessage.commandName;
    const isMessage = interactionOrMessage && interactionOrMessage.author && interactionOrMessage.channel && typeof interactionOrMessage.channel.send === 'function';
    
    // Generate or use provided message ID for timer tracking
    let timerKey = messageId;
    if (!timerKey) {
        if (isSlashCommand) {
            timerKey = `slash_${interactionOrMessage.id}_${interactionOrMessage.user.id}`;
        } else if (isMessage) {
            timerKey = `message_${interactionOrMessage.id}_${interactionOrMessage.author.id}`;
        } else {
            timerKey = `unknown_${Date.now()}_${Math.random()}`;
        }
    }
    
    // Clear existing timer if one exists for this message
    if (activeCleanupTimers.has(timerKey)) {
        clearTimeout(activeCleanupTimers.get(timerKey));
        activeCleanupTimers.delete(timerKey);
    }
    
    // Schedule new cleanup timer
    const timerId = setTimeout(async () => {
        try {
            if (isSlashCommand && (interactionOrMessage.replied || interactionOrMessage.deferred)) {
                // Handle slash command interactions
                const currentMessage = await interactionOrMessage.fetchReply();
                
                await interactionOrMessage.editReply({
                    embeds: currentMessage.embeds,
                    content: currentMessage.content,
                    components: [] // Remove all components while keeping embeds and content
                });
                
            } else if (isMessage && originalResponse) {
                // Handle text command responses
                if (originalResponse.components && originalResponse.components.length > 0) {
                    await originalResponse.edit({
                        embeds: originalResponse.embeds,
                        content: originalResponse.content,
                        components: [] // Remove all components
                    });
                }
            }
        } catch (error) {
            // Silently handle cleanup failures (message may have been deleted, etc.)
        } finally {
            // Remove timer from active timers map
            activeCleanupTimers.delete(timerKey);
        }
    }, timeoutMs);
    
    // Store the timer for potential cancellation/reset
    activeCleanupTimers.set(timerKey, timerId);
    
    return timerKey;
}

/**
 * Reset the auto-cleanup timer for a specific message/interaction
 * @param {string} timerKey - The timer key returned by scheduleAutoCleanup
 * @param {Object} interactionOrMessage - The Discord interaction or message
 * @param {number} timeoutMs - New timeout in milliseconds
 * @param {string} context - Context for logging
 * @param {Object} originalResponse - The original response message (for text commands)
 * @returns {string} - The timer key for continued tracking
 */
function resetAutoCleanupTimer(timerKey, interactionOrMessage, timeoutMs, context = 'interaction', originalResponse = null) {
    if (!timerKey || !timeoutMs) return timerKey;
    
    // Use the existing scheduleAutoCleanup function with the same timer key
    // This will automatically clear the old timer and create a new one
    return scheduleAutoCleanup(interactionOrMessage, timeoutMs, context, originalResponse, timerKey);
}

/**
 * Cancel an active auto-cleanup timer
 * @param {string} timerKey - The timer key to cancel
 */
function cancelAutoCleanupTimer(timerKey) {
    if (!timerKey || !activeCleanupTimers.has(timerKey)) return;
    
    clearTimeout(activeCleanupTimers.get(timerKey));
    activeCleanupTimers.delete(timerKey);
}

/**
 * Check if a user is authorized to use an interaction
 * @param {Object} interaction - The Discord interaction
 * @param {string} customId - The custom ID to check
 * @returns {boolean} - Whether the user is authorized
 */
function checkInteractionAuthorization(interaction, customId) {
    const parts = customId.split('_');
    
    // If the custom ID has a user ID (user-locked interaction)
    if (parts.length >= 3 && parts[parts.length - 2].match(/^\d+$/)) {
        const authorizedUserId = parts[parts.length - 2];
        return interaction.user.id === authorizedUserId;
    }
    
    // If no user ID in custom ID, anyone can use it
    return true;
}

function createContext(interaction, args = [], ephemeral = false, userLocked = false, autoCleanup = null) {
    // Check if this is a slash command interaction
    const isSlashCommand = interaction && typeof interaction.reply === 'function' && interaction.commandName;
    // Check if this is a message
    const isMessage = interaction && interaction.author && interaction.channel && typeof interaction.channel.send === 'function';
    
    if (!isSlashCommand && !isMessage) {
        console.error('Invalid interaction type:', interaction);
        return null;
    }
    
    return {
        // Common properties
        user: isSlashCommand ? interaction.user : interaction.author,
        guild: interaction.guild,
        channel: interaction.channel,
        member: interaction.member,
        
        // Command-specific properties
        args: isSlashCommand ? [] : args, // For message commands
        options: isSlashCommand ? interaction.options : null, // For slash commands
        isSlashCommand,
        isMessage,
        userLocked, // Whether interactions should be locked to this user
        autoCleanup, // Auto-cleanup timeout in milliseconds
        timerKey: null, // Will be set when timer is started
        
        // Timer management methods
        resetTimer: function() {
            if (this.timerKey && this.autoCleanup) {
                this.timerKey = resetAutoCleanupTimer(this.timerKey, interaction, this.autoCleanup, 'timer-reset');
            }
            return this.timerKey;
        },
        
        cancelTimer: function() {
            if (this.timerKey) {
                cancelAutoCleanupTimer(this.timerKey);
                this.timerKey = null;
            }
        },
        
        // Unified response methods
        reply: async (content) => {
            if (isSlashCommand) {
                if (interaction.replied || interaction.deferred) {
                    return interaction.editReply(content);
                }
                // Apply ephemeral flag for slash commands if requested and not already replied
                const replyOptions = ephemeral ? { ...content, ephemeral: true } : content;
                return interaction.reply(replyOptions);
            } else if (isMessage) {
                return interaction.channel.send(content);
            }
        },
        
        editReply: async (content) => {
            if (isSlashCommand) {
                return interaction.editReply(content);
            } else if (isMessage) {
                // For message commands, send a new message
                return interaction.channel.send(content);
            }
        },
        
        deferReply: async (options = {}) => {
            if (isSlashCommand) {
                // Apply ephemeral flag if requested and not already set
                const deferOptions = ephemeral && !options.hasOwnProperty('ephemeral') 
                    ? { ...options, ephemeral: true } 
                    : options;
                return interaction.deferReply(deferOptions);
            }
            // For message commands, we can't defer, so this is a no-op
        },
        
        // Raw interaction/message for advanced usage
        raw: interaction
    };
}

function wrapCommand(cmd) {
    const originalExecute = cmd.execute || cmd.run;
    
    return {
        ...cmd,
        execute: async (interaction, args = []) => {
            // Extract flags for user locking and auto cleanup
            const userLocked = cmd.userLocked || false;
            const autoCleanup = cmd.autoCleanup || null; // Time in milliseconds, or null for no cleanup
            
            const ctx = createContext(interaction, args, cmd.ephemeral || false, userLocked, autoCleanup);
            
            if (!ctx) {
                console.error('Failed to create context for interaction:', interaction);
                return;
            }

            // Check permissions before executing command
            if (cmd.permissions && cmd.permissions.length > 0) {
                if (!hasPermission(ctx.member, cmd.permissions, ctx.user.id)) {
                    const permissionNames = cmd.permissions.join(', ');
                    return ctx.reply({
                        embeds: [{
                            title: '❌ Permission Denied',
                            description: `You don't have the required permissions to use this command.\n\n**Required permissions:** ${permissionNames}`,
                            color: 0xFF0000
                        }]
                    });
                }
            }

            // Check if command requires guild (server) context
            if (cmd.guildOnly && !ctx.guild) {
                return ctx.reply({
                    embeds: [{
                        title: '❌ Guild Only',
                        description: 'This command can only be used in a server.',
                        color: 0xFF0000
                    }]
                });
            }
            
            try {
                // Handle sub commands
                if (cmd.subcommands && Object.keys(cmd.subcommands).length > 0) {
                    let subcommandName;
                    
                    if (ctx.isSlashCommand) {
                        subcommandName = ctx.options.getSubcommand(false);
                        
                        // If no subcommand provided and we have a default, use it
                        if (!subcommandName && cmd.defaultSubcommand) {
                            subcommandName = cmd.defaultSubcommand;
                        }
                    } else if (ctx.isMessage) {
                        if (args.length > 0) {
                            subcommandName = args[0].toLowerCase();
                            ctx.args = args.slice(1); // Remove subcommand from args
                        } else if (cmd.defaultSubcommand) {
                            // If no args provided and we have a default, use it
                            subcommandName = cmd.defaultSubcommand;
                        }
                    }
                    
                    if (subcommandName && cmd.subcommands[subcommandName]) {
                        const subcommand = cmd.subcommands[subcommandName];
                        
                        // Check subcommand permissions
                        if (subcommand.permissions && subcommand.permissions.length > 0) {
                            if (!hasPermission(ctx.member, subcommand.permissions, ctx.user.id)) {
                                const permissionNames = subcommand.permissions.join(', ');
                                return ctx.reply({
                                    embeds: [{
                                        title: '❌ Permission Denied',
                                        description: `You don't have the required permissions to use this subcommand.\n\n**Required permissions:** ${permissionNames}`,
                                        color: 0xFF0000
                                    }]
                                });
                            }
                        }
                        
                        // Check if subcommand requires guild context
                        if (subcommand.guildOnly && !ctx.guild) {
                            return ctx.reply({
                                embeds: [{
                                    title: '❌ Guild Only',
                                    description: 'This subcommand can only be used in a server.',
                                    color: 0xFF0000
                                }]
                            });
                        }
                        
                        if (subcommand.execute) {
                            // Check if subcommand has its own ephemeral setting, otherwise inherit from parent
                            const subEphemeral = subcommand.hasOwnProperty('ephemeral') ? subcommand.ephemeral : cmd.ephemeral;
                            
                            // Check for subcommand-specific flags, otherwise inherit from parent
                            const subUserLocked = subcommand.hasOwnProperty('userLocked') ? subcommand.userLocked : cmd.userLocked || false;
                            const subAutoCleanup = subcommand.hasOwnProperty('autoCleanup') ? subcommand.autoCleanup : cmd.autoCleanup || null;
                            
                            // If subcommand has different settings, create new context
                            const subCtx = (subEphemeral !== cmd.ephemeral || subUserLocked !== userLocked || subAutoCleanup !== autoCleanup)
                                ? createContext(interaction, ctx.args, subEphemeral || false, subUserLocked, subAutoCleanup)
                                : ctx;
                                
                            const result = await subcommand.execute(subCtx);
                            if (result) {
                                const response = await subCtx.reply(result);
                                
                                // Schedule auto-cleanup if enabled and result has components
                                if (subCtx.autoCleanup && result.components && result.components.length > 0) {
                                    subCtx.timerKey = scheduleAutoCleanup(interaction, subCtx.autoCleanup, `subcommand '${cmd.name} ${subcommandName}'`, response);
                                }
                            }
                            return;
                        }
                    }
                }
                
                // Execute main command (fallback)
                if (originalExecute) {
                    const result = await originalExecute(ctx);
                    if (result) {
                        const response = await ctx.reply(result);
                        
                        // Schedule auto-cleanup if enabled and result has components
                        if (ctx.autoCleanup && result.components && result.components.length > 0) {
                            ctx.timerKey = scheduleAutoCleanup(interaction, ctx.autoCleanup, `command '${cmd.name}'`, response);
                        }
                    }
                }
            } catch (error) {
                console.error(`Error executing command ${cmd.name}:`, error);
                
                // Try to send error message
                try {
                    const errorMessage = {
                        embeds: [{
                            title: 'Error',
                            description: 'An error occurred while executing this command.',
                            color: 0xff0000
                        }]
                    };
                    
                    if (ctx.isSlashCommand) {
                        if (interaction.replied || interaction.deferred) {
                            await interaction.editReply(errorMessage);
                        } else {
                            await interaction.reply({ ...errorMessage, ephemeral: true });
                        }
                    } else {
                        await ctx.reply(errorMessage);
                    }
                } catch (replyError) {
                    console.error('Failed to send error message:', replyError);
                }
            }
        }
    };
}

function getModules(dir) {
    let modules = {};
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
        if (item.isDirectory()) {
            const folderPath = path.join(dir, item.name);
            const runFilePath = path.join(folderPath, 'run.js');
            
            // Check if this directory has a run.js file (main command)
            if (fs.existsSync(runFilePath)) {
                const folderName = item.name;
                try {
                    const mainCommand = require(runFilePath);
                    
                    // Look for subcommands in subdirectories
                    const subcommands = {};
                    const subItems = fs.readdirSync(folderPath, { withFileTypes: true });
                    
                    for (const subItem of subItems) {
                        if (subItem.isDirectory()) {
                            const subRunPath = path.join(folderPath, subItem.name, 'run.js');
                            if (fs.existsSync(subRunPath)) {
                                try {
                                    const subCommand = require(subRunPath);
                                    subcommands[subItem.name] = subCommand;
                                    console.log(`✅ Loaded command: ${folderName}.${subItem.name}`);
                                } catch (error) {
                                    console.error(`❌ Failed to load subcommand ${folderName}/${subItem.name}:`, error);
                                }
                            }
                        }
                    }
                    
                    // Attach subcommands to main command if any exist
                    if (Object.keys(subcommands).length > 0) {
                        mainCommand.subcommands = subcommands;
                    }
                    
                    modules[folderName] = wrapCommand(mainCommand);
                    console.log(`✅ Loaded command: ${folderName}`);
                } catch (error) {
                    console.error(`❌ Failed to load command ${folderName}:`, error);
                }
            } else {
                // Recursively search subfolders if no run.js in current directory
                const subModules = getModules(folderPath);
                modules = { ...modules, ...subModules };
            }
        }
    }
    
    return modules;
}

const load = getModules(path.join(__dirname, 'modules'));

// Function to get commands available to a specific user
function getAvailableCommands(member, guild, userId = null) {
    const availableCommands = [];
    
    for (const [commandName, command] of Object.entries(load)) {
        // Skip function exports (like getAvailableCommands itself)
        if (typeof command === 'function') {
            continue;
        }
        
        // Check if command requires guild and we're not in a guild
        if (command.guildOnly && !guild) {
            continue;
        }
        
        // Check if user has permissions for main command
        if (command.permissions && command.permissions.length > 0) {
            if (!hasPermission(member, command.permissions, userId)) {
                continue;
            }
        }

        // Only add the base command if it doesn't have a default subcommand
        // If it has a default subcommand, users will effectively never use the base command
        if (!command.defaultSubcommand) {
            const baseCommand = {
                name: commandName,
                description: command.description || 'No description available',
                category: command.category || 'General',
                isSubcommand: false
            };
            availableCommands.push(baseCommand);
        }
        
        // Add subcommands if they exist and user has access
        if (command.subcommands && Object.keys(command.subcommands).length > 0) {
            for (const [subName, subCommand] of Object.entries(command.subcommands)) {
                // Check if subcommand requires guild and we're not in a guild
                if (subCommand.guildOnly && !guild) {
                    continue;
                }
                
                // Check if user has permissions for subcommand
                if (subCommand.permissions && subCommand.permissions.length > 0) {
                    if (!hasPermission(member, subCommand.permissions, userId)) {
                        continue;
                    }
                }
                
                availableCommands.push({
                    name: `${commandName} ${subName}`,
                    description: subCommand.description || 'No description available',
                    category: subCommand.category || command.category || 'General',
                    isSubcommand: true
                });
            }
        }
    }
    
    return availableCommands;
}

// Load all helpers using the helpers loader
const allHelpers = require('../helpers/load');

module.exports = load;
module.exports.helpers = {
    getAvailableCommands,
    generateInteractionId,
    checkInteractionAuthorization,
    scheduleAutoCleanup,
    resetAutoCleanupTimer,
    cancelAutoCleanupTimer,
    ...allHelpers
};
