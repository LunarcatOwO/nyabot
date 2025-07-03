exports.name = 'moderation';
exports.description = 'Moderation commands';
exports.defaultSubcommand = 'help';

exports.execute = async (ctx) => {
    return {
        embeds: [{
            title: '🔨 Moderation Commands',
            description: 'Available moderation commands:\n• `moderation ban` - Ban a user from the server\n• `moderation unban` - Unban a user from the server\n• `moderation kick` - Kick a user from the server\n• `moderation timeout` - Timeout a user',
            color: 0xFF6B6B,
            footer: {
                text: 'Note: You need appropriate permissions to use these commands'
            }
        }]
    };
};
