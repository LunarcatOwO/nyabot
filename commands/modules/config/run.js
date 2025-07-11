exports.name = 'config';
exports.description = 'Manage bot configuration';
exports.category = 'Setup';
exports.defaultSubcommand = 'help'; // Default subcommand when no subcommand is provided

exports.execute = async (ctx) => {
    // This runs when no subcommand is provided
    return {
        content: 'Please specify a subcommand. Use `/config help` to get configuration help. Or if you did specify a subcommand, this might be a error, report to LunarcatOwO.'
    };
};
