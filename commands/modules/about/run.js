exports.name = 'about';
exports.description = 'Information about NyaBot';
exports.category = 'Information';
exports.defaultSubcommand = 'general';
exports.ephemeral = true; // Keep information responses private
exports.userLocked = true; // Lock interactions to the user who triggered the command
exports.autoCleanup = 60000; // Auto-remove components after 60 seconds

exports.execute = async (ctx) => {
    // This will redirect to the general subcommand by default
    return {
        content: 'Please specify a subcommand. Use `/about general` to get general information about NyaBot. Or if you did specify a subcommand, this might be a error, report to LunarcatOwO.'
    };
};
