exports.name = 'config';
exports.description = 'Manage bot configuration';
exports.defaultSubcommand = 'help'; // Default subcommand when no subcommand is provided

exports.execute = async (ctx) => {
    // This runs when no subcommand is provided
    return {
        embeds: [
            {
                title: 'Configuration',
                description: 'Use subcommands to manage bot configuration:\n• `config help` - Show configuration help\n• `config view` - View current settings\n• `config set` - Set a configuration value',
                color: 0x5865F2
            }
        ]
    };
};
