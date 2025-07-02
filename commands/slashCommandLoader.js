
const { REST, Routes } = require('discord.js');
const load = require('./load');

const CLIENT_ID = process.env.CLIENT_ID;
const TOKEN = process.env.TOKEN;

// Prepare commands for registration
const commands = Object.values(load).map(cmd => {
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
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands },
        );
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
}

module.exports = { registerSlashCommands };
