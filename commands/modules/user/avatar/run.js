exports.description = 'Show user avatar';
exports.options = [
    {
        name: 'user',
        type: 6, // USER type
        description: 'The user to show avatar for',
        required: false
    }
];

exports.execute = async (ctx) => {
    let targetUser;
    
    if (ctx.isSlashCommand) {
        targetUser = ctx.options.getUser('user') || ctx.user;
    } else if (ctx.isMessage) {
        // For message commands, check if user mentioned someone or provided an ID
        const mentions = ctx.raw.mentions?.users;
        if (mentions && mentions.size > 0) {
            targetUser = mentions.first();
        } else if (ctx.args.length > 0) {
            // Try to get user by ID
            try {
                targetUser = await ctx.raw.client.users.fetch(ctx.args[0]);
            } catch {
                targetUser = ctx.user;
            }
        } else {
            targetUser = ctx.user;
        }
    }
    
    const avatarURL = targetUser.displayAvatarURL({ dynamic: true, size: 512 });
    
    return {
        embeds: [
            {
                title: `${targetUser.tag}'s Avatar`,
                image: {
                    url: avatarURL
                },
                color: 0x5865F2
            }
        ]
    };
};
