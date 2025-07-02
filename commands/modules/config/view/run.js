exports.description = 'View current configuration settings';
exports.execute = async (ctx) => {
    // Example of accessing different properties from the context
    const guildName = ctx.guild ? ctx.guild.name : 'DM';
    const userTag = ctx.user.tag;
    
    return {
        embeds: [
            {
                title: 'Current Configuration',
                description: 'Here are the current bot settings:',
                fields: [
                    {
                        name: 'Prefix',
                        value: 'n+',
                        inline: true
                    },
                    {
                        name: 'Guild',
                        value: guildName,
                        inline: true
                    },
                    {
                        name: 'Requested by',
                        value: userTag,
                        inline: true
                    },
                    {
                        name: 'Command Type',
                        value: ctx.isSlashCommand ? 'Slash Command' : 'Message Command',
                        inline: true
                    }
                ],
                color: 0x0099ff,
                timestamp: new Date().toISOString()
            }
        ]
    };
};
