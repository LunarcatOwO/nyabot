exports.description = 'Show user information';
exports.options = [
    {
        name: 'user',
        type: 6, // USER type
        description: 'The user to show info for',
        required: false
    }
];

exports.execute = async (ctx) => {
    let targetUser, targetMember;
    
    if (ctx.isSlashCommand) {
        targetUser = ctx.options.getUser('user') || ctx.user;
        if (ctx.guild) {
            try {
                targetMember = await ctx.guild.members.fetch(targetUser.id);
            } catch {
                targetMember = null;
            }
        }
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
        
        if (ctx.guild) {
            try {
                targetMember = await ctx.guild.members.fetch(targetUser.id);
            } catch {
                targetMember = null;
            }
        }
    }
    
    const embed = {
        title: `User Info: ${targetUser.tag}`,
        thumbnail: {
            url: targetUser.displayAvatarURL({ dynamic: true, size: 256 })
        },
        fields: [
            {
                name: 'User ID',
                value: targetUser.id,
                inline: true
            },
            {
                name: 'Account Created',
                value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:F>`,
                inline: true
            }
        ],
        color: 0x5865F2,
        timestamp: new Date().toISOString()
    };
    
    if (targetMember) {
        embed.fields.push(
            {
                name: 'Joined Server',
                value: `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:F>`,
                inline: true
            },
            {
                name: 'Roles',
                value: targetMember.roles.cache.size > 1 ? 
                    targetMember.roles.cache.filter(role => role.name !== '@everyone').map(role => role.toString()).join(', ') : 
                    'No roles',
                inline: false
            }
        );
    }
    
    return { embeds: [embed] };
};
