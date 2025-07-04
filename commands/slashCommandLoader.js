
const { REST, Routes } = require('discord.js');
const load = require('./load');

const CLIENT_ID = process.env.CLIENT_ID;
const TOKEN = process.env.TOKEN;

// Prepare commands for registration
const commands = Object.entries(load)
    .filter(([key, cmd]) => {
        // Skip function exports (like getAvailableCommands)
        if (typeof cmd === 'function') {
            console.log(`Skipping function export: ${key}`);
            return false;
        }
        
        // Only include commands that have a name property and execute function
        if (!cmd.name || typeof cmd.execute !== 'function') {
            console.warn(`Warning: Invalid command found:`, key, cmd);
            return false;
        }
        
        // Skip bot owner only commands from global registration
        // These will be handled at runtime with permission checks
        if (cmd.permissions && cmd.permissions.includes('BotOwner')) {
            console.log(`Skipping bot owner only command from global registration: ${cmd.name}`);
            return true; // Still include it but we'll handle permissions at runtime
        }
        
        return true;
    })
    .map(([key, cmd]) => {
        const command = {
            name: cmd.name,
            description: cmd.description || 'No description',
        };
        
        // Add subcommands if they exist
        if (cmd.subcommands && Object.keys(cmd.subcommands).length > 0) {
            command.options = Object.entries(cmd.subcommands).map(([name, subCmd]) => ({
                name: name,
                type: 1, // SUB_COMMAND type
                description: subCmd.description || `${name} subcommand`,
                options: subCmd.options || []
            }));
            
            // If there's a default subcommand, we need to make sure it's included
            if (cmd.defaultSubcommand && !cmd.subcommands[cmd.defaultSubcommand]) {
                console.warn(`Warning: Default subcommand '${cmd.defaultSubcommand}' not found for command '${cmd.name}'`);
            }
        } else if (cmd.options) {
            // Add options for commands without subcommands
            command.options = cmd.options;
        }
        
        return command;
    });

const rest = new REST({ version: '10' }).setToken(TOKEN);

async function registerSlashCommands() {
    try {
        console.log('Started refreshing application (/) commands.');
        console.log(`Registering ${commands.length} commands:`, commands.map(c => c.name));
        
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands },
        );
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Failed to register slash commands:', error);
        console.log('Commands that failed to register:', JSON.stringify(commands, null, 2));
    }
}

module.exports = { registerSlashCommands };
