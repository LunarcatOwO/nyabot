exports.name = 'unban';
exports.description = 'Unban a user from the server';
exports.options = [
    {
        name: 'user',
        type: 3, // STRING type for user ID since they're not in the server
        description: 'The user ID to unban',
        required: true
    },
    {
        name: 'reason',
        type: 3, // STRING type
        description: 'Reason for the unban',
        required: false
    }
];

exports.execute = async (ctx) => {
    // Check if the command is being used in a guild
    if (!ctx.guild) {
        return {
            embeds: [{
                title: '❌ Guild Only',
                description: 'This command can only be used in a server.',
                color: 0xFF0000
            }]
        };
    }

    // Check if the bot has permission to ban members (needed for unban too)
    if (!ctx.guild.members.me.permissions.has('BanMembers')) {
        return {
            embeds: [{
                title: '❌ Missing Permissions',
                description: 'I don\'t have permission to unban members in this server.',
                color: 0xFF0000
            }]
        };
    }

    // Check if the user has permission to ban members
    if (!ctx.member.permissions.has('BanMembers')) {
        return {
            embeds: [{
                title: '❌ Permission Denied',
                description: 'You don\'t have permission to unban members.',
                color: 0xFF0000
            }]
        };
    }

    let userInput, reason = 'No reason provided';

    if (ctx.isSlashCommand) {
        userInput = ctx.options.getString('user');
        reason = ctx.options.getString('reason') || 'No reason provided';
    } else if (ctx.isMessage) {
        if (ctx.args.length === 0) {
            return {
                embeds: [{
                    title: '❌ Missing Arguments',
                    description: 'Please specify a user ID to unban.\n\nUsage: `n+moderation unban <user_id> [reason]`',
                    color: 0xFF0000
                }]
            };
        }
        
        userInput = ctx.args[0];
        const reasonArgs = ctx.args.slice(1);
        if (reasonArgs.length > 0) {
            reason = reasonArgs.join(' ');
        }
    }

    // Validate user ID format
    const snowflakeRegex = /^\d{17,19}$/;
    if (!snowflakeRegex.test(userInput)) {
        return {
            embeds: [{
                title: '❌ Invalid User ID',
                description: 'Please provide a valid Discord user ID (17-19 digits).\n\nUsage: `n+moderation unban <user_id> [reason]`',
                color: 0xFF0000
            }]
        };
    }

    // Check if trying to unban themselves or the bot
    if (userInput === ctx.user.id) {
        return {
            embeds: [{
                title: '❌ Invalid Action',
                description: 'You cannot unban yourself.',
                color: 0xFF0000
            }]
        };
    }

    if (userInput === ctx.raw.client.user.id) {
        return {
            embeds: [{
                title: '❌ Invalid Action',
                description: 'I cannot unban myself.',
                color: 0xFF0000
            }]
        };
    }

    try {
        // Check if user is actually banned
        const bans = await ctx.guild.bans.fetch();
        const bannedUser = bans.get(userInput);
        
        if (!bannedUser) {
            return {
                embeds: [{
                    title: '❌ User Not Banned',
                    description: `User with ID \`${userInput}\` is not banned from this server.`,
                    color: 0xFF0000
                }]
            };
        }

        // Perform the unban
        await ctx.guild.members.unban(userInput, `${reason} | Unbanned by: ${ctx.user.tag} (${ctx.user.id})`);

        // Update database to mark ban as inactive
        try {
            const db = require('../../../helpers/db');
            await db.write.logUnban(userInput, ctx.guild.id);
        } catch (dbError) {
            console.error('Failed to log unban:', dbError);
        }

        // Get user info for response
        let targetUser;
        try {
            targetUser = await ctx.raw.client.users.fetch(userInput);
        } catch {
            targetUser = { tag: `Unknown User (${userInput})`, id: userInput };
        }

        // Success response
        return {
            embeds: [{
                title: '✅ User Unbanned Successfully',
                description: `**${targetUser.tag}** has been unbanned from the server.`,
                fields: [
                    {
                        name: 'User',
                        value: `${targetUser.tag} (${targetUser.id})`,
                        inline: true
                    },
                    {
                        name: 'Reason',
                        value: reason,
                        inline: true
                    },
                    {
                        name: 'Unbanned by',
                        value: ctx.user.tag,
                        inline: true
                    }
                ],
                color: 0x00FF00,
                timestamp: new Date().toISOString(),
                footer: {
                    text: 'Moderation action completed'
                }
            }]
        };

    } catch (error) {
        console.error('Error unbanning user:', error);

        return {
            embeds: [{
                title: '❌ Unban Failed',
                description: `Failed to unban user with ID \`${userInput}\`.`,
                fields: [
                    {
                        name: 'Error',
                        value: error.message.length > 1024 ? error.message.substring(0, 1021) + '...' : error.message,
                        inline: false
                    }
                ],
                color: 0xFF0000
            }]
        };
    }
};
