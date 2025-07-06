exports.name = 'status';
exports.description = 'Manage bot status';
exports.permissions = ['BotOwner'];
exports.category = 'NyaBot Staff';
exports.defaultSubcommand = 'info';

exports.execute = async (ctx) => {
    return {
        embeds: [{
            title: '🤖 Bot Status Management',
            description: 'Available status commands:\n• `status info` - Show current status\n• `status set` - Set custom status\n• `status random` - Set random status',
            color: 0x5865F2
        }]
    };
};
