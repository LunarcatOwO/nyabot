exports.name = 'ping';
exports.description = 'Check if the bot is responsive';

exports.execute = async (ctx) => {
    const startTime = Date.now();
    
    return {
        embeds: [{
            title: '🏓 Pong!',
            description: `Bot is online and responsive!`,
            fields: [
                {
                    name: 'Response Time',
                    value: `${Date.now() - startTime}ms`,
                    inline: true
                },
                {
                    name: 'User',
                    value: ctx.user.tag,
                    inline: true
                },
                {
                    name: 'Command Type',
                    value: ctx.isSlashCommand ? 'Slash Command' : 'Message Command',
                    inline: true
                }
            ],
            color: 0x00ff00,
            timestamp: new Date().toISOString()
        }]
    };
};
