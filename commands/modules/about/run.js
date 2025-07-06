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
        embeds: [{
            title: '🤖 About NyaBot',
            description: 'Use the dropdown below or subcommands to view different information sections.',
            color: 0x5865F2
        }]
    };
};
