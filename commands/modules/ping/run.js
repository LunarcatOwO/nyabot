exports.name = 'ping';
exports.description = 'Check if the bot is responsive';
exports.category = 'Utility';
exports.ephemeral = true; // Make ping responses ephemeral to reduce chat clutter

exports.execute = async (ctx) => {
    const startTime = Date.now();
    
    // Get API latency from the client's WebSocket ping
    const apiLatency = Math.round(ctx.raw.client.ws.ping);
    
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
                    name: 'API Latency',
                    value: `${apiLatency} ms`,
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
