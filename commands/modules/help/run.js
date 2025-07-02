exports.name = 'help';
exports.description = 'Displays help information.';
exports.execute = async (ctx) => {
    // Easy response - just return the data and the framework handles the rest
    return {
        embeds: [
            {
                title: 'NyaBot Help',
                description: 'Welcome to NyaBot! Here are the available commands:\n\n**📋 General Commands:**\n• `help` - Shows this help message\n• `ping` - Check bot responsiveness\n\n**👤 User Commands:**\n• `user` / `user info` - Show user information\n• `user avatar` - Show user avatar\n\n**⚙️ Configuration:**\n• `config` / `config help` - Show config help\n• `config view` - View current settings\n• `config set` - Set configuration values\n\n**� Status Management:**\n• `status` / `status info` - Show current bot status\n• `status set` - Set custom status (admin only)\n• `status random` - Set random status (admin only)\n\n**�🧪 Testing:**\n• `slow` - Test long-running command',
                color: 0x5865F2,
                fields: [
                    {
                        name: 'Command Prefixes',
                        value: '**Message Commands:** `n+command`\n**Slash Commands:** `/command`',
                        inline: true
                    },
                    {
                        name: 'User Information',
                        value: `**User:** ${ctx.user.tag}\n**ID:** ${ctx.user.id}`,
                        inline: true
                    },
                    {
                        name: 'Command Type',
                        value: ctx.isSlashCommand ? '⚡ Slash Command' : '💬 Message Command',
                        inline: true
                    }
                ],
                footer: {
                    text: 'Tip: Both slash commands and message commands work the same way!'
                },
                timestamp: new Date().toISOString()
            }
        ]
    };
};
