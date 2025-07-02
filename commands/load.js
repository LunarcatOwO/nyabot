
const fs = require('fs');
const path = require('path');

function createContext(interaction, args = []) {
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
                return interaction.reply(content);
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
                return interaction.deferReply(options);
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
            const ctx = createContext(interaction, args);
            
            if (!ctx) {
                console.error('Failed to create context for interaction:', interaction);
                return;
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
                        if (subcommand.execute) {
                            const result = await subcommand.execute(ctx);
                            if (result) {
                                await ctx.reply(result);
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

module.exports = load;
