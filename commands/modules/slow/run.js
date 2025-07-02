exports.name = 'slow';
exports.description = 'A command that takes time to process (demonstrates deferred replies)';

exports.execute = async (ctx) => {
    // Defer the reply for long-running operations (only works for slash commands)
    if (ctx.isSlashCommand) {
        await ctx.deferReply();
    } else {
        // For message commands, send a "processing" message
        await ctx.reply({ content: '⏳ Processing...' });
    }
    
    // Simulate slow processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const result = {
        embeds: [{
            title: 'Processing Complete!',
            description: 'This command took 3 seconds to process.',
            fields: [
                {
                    name: 'Command Type',
                    value: ctx.isSlashCommand ? 'Slash Command' : 'Message Command',
                    inline: true
                },
                {
                    name: 'User',
                    value: ctx.user.tag,
                    inline: true
                }
            ],
            color: 0xff9900,
            timestamp: new Date().toISOString()
        }]
    };
    
    // For deferred slash commands, edit the reply. For messages, send new message
    if (ctx.isSlashCommand) {
        await ctx.editReply(result);
    } else {
        await ctx.reply(result);
    }
};
