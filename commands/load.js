
const fs = require('fs');
const path = require('path');

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

function createContext(interaction, args = [], ephemeral = false) {
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
            const ctx = createContext(interaction, args, cmd.ephemeral || false);
            
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
                            
                            // If subcommand has different ephemeral setting, create new context
                            const subCtx = subEphemeral !== cmd.ephemeral 
                                ? createContext(interaction, ctx.args, subEphemeral || false)
                                : ctx;
                                
                            const result = await subcommand.execute(subCtx);
                            if (result) {
                                await subCtx.reply(result);
                            }
                            return;
                        }
                    }
                }
                
                // Execute main command (fallback)
                if (originalExecute) {
                    const result = await originalExecute(ctx);
                    if (result) {
                        await ctx.reply(result);
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
        
        const baseCommand = {
            name: commandName,
            description: command.description || 'No description available',
            isSubcommand: false
        };
        availableCommands.push(baseCommand);
        
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
                    isSubcommand: true
                });
            }
        }
    }
    
    return availableCommands;
}

module.exports = load;
module.exports.getAvailableCommands = getAvailableCommands;
