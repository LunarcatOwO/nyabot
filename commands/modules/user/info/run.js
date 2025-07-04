exports.description = 'Show user information';
exports.ephemeral = true; // Make response ephemeral for privacy
exports.options = [
    {
        name: 'user',
        type: 6, // USER type
        description: 'The user to show info for (mention or user ID)',
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
            // Try to get user by ID - check if it's a valid snowflake ID
            const userInput = ctx.args[0];
            const snowflakeRegex = /^\d{17,19}$/;
            
            if (snowflakeRegex.test(userInput)) {
                try {
                    targetUser = await ctx.raw.client.users.fetch(userInput);
                } catch {
                    return { content: `❌ Could not find user with ID: \`${userInput}\`` };
                }
            } else {
                return { content: `❌ Invalid user ID format. Please provide a valid Discord user ID (17-19 digits).` };
            }
        } else {
            targetUser = ctx.user;
        }
        
        if (ctx.guild && targetUser) {
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
    
    // Check ban status and membership
    let isUserBannedFromCurrentGuild = false;
    
    try {
        const db = require('../../../../helpers/db');
        
        // Check if user is banned from current guild
        if (ctx.guild) {
            const banInfo = await db.read.isUserBanned(targetUser.id, ctx.guild.id);
            isUserBannedFromCurrentGuild = !!banInfo;
        }
    } catch (dbError) {
        console.error('Error checking ban status:', dbError);
    }
    
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
    } else if (ctx.guild) {
        if (isUserBannedFromCurrentGuild) {
            embed.fields.push({
                name: 'Server Status',
                value: '🔨 **Banned from this server**',
                inline: true
            });
            embed.color = 0xFF0000; // Red color for banned users
        } else {
            embed.fields.push({
                name: 'Server Status',
                value: '❌ Not in this server',
                inline: true
            });
        }
    }
    
    return { embeds: [embed] };
};
