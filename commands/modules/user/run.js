exports.name = 'user';
exports.description = 'User-related commands';
exports.category = 'User';
exports.defaultSubcommand = 'info'; // Default to info subcommand

exports.execute = async (ctx) => {
    // This will only run if no subcommands are found, but since we have defaultSubcommand,
    // it should redirect to the info subcommand automatically
    return {
        embeds: [{
            title: 'User Commands',
            description: 'Available user commands:\n• `user info` - Show user information\n• `user avatar` - Show user avatar',
            color: 0x5865F2
        }]
    };
};
