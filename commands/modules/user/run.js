exports.name = 'user';
exports.description = 'User-related commands';
exports.category = 'User';
exports.defaultSubcommand = 'info'; // Default to info subcommand

exports.execute = async (ctx) => {
    // This will only run if no subcommands are found, but since we have defaultSubcommand,
    // it should redirect to the info subcommand automatically
    return {
        content: 'Please specify a subcommand. Use `/user info` to get user information. Or if you did specify a subcommand, this might be a error, report to LunarcatOwO.'
    };
};
