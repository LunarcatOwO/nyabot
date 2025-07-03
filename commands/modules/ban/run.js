exports.name = 'ban';
exports.description = 'Ban a user from the server';
exports.options = [
    {
        name: 'user',
        type: 6, // USER type
        description: 'The user to ban',
        required: true
    },
    {
        name: 'reason',
        type: 3, // STRING type
        description: 'Reason for the ban',
        required: false
    },
    {
        name: 'delete_messages',
        type: 4, // INTEGER type
        description: 'Number of days of messages to delete (0-7)',
        required: false,
        min_value: 0,
        max_value: 7
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

    // Check if the bot has permission to ban members
    if (!ctx.guild.members.me.permissions.has('BanMembers')) {
        return {
            embeds: [{
                title: '❌ Missing Permissions',
                description: 'I don\'t have permission to ban members in this server.',
                color: 0xFF0000
            }]
        };
    }

    // Check if the user has permission to ban members
    if (!ctx.member.permissions.has('BanMembers')) {
        return {
            embeds: [{
                title: '❌ Permission Denied',
                description: 'You don\'t have permission to ban members.',
                color: 0xFF0000
            }]
        };
    }

    let targetUser, reason = 'No reason provided', deleteMessageDays = 0;

    if (ctx.isSlashCommand) {
        targetUser = ctx.options.getUser('user');
        reason = ctx.options.getString('reason') || 'No reason provided';
        deleteMessageDays = ctx.options.getInteger('delete_messages') || 0;
    } else if (ctx.isMessage) {
        // For message commands, check for mentions or user ID
        const mentions = ctx.raw.mentions?.users;
        if (mentions && mentions.size > 0) {
            targetUser = mentions.first();
            // Get reason from remaining args (skip the mention)
            const reasonArgs = ctx.args.slice(1);
            if (reasonArgs.length > 0) {
                reason = reasonArgs.join(' ');
            }
        } else if (ctx.args.length > 0) {
            // Try to get user by ID
            const userInput = ctx.args[0];
            const snowflakeRegex = /^\d{17,19}$/;
            
            if (snowflakeRegex.test(userInput)) {
                try {
                    targetUser = await ctx.raw.client.users.fetch(userInput);
                    // Get reason from remaining args
                    const reasonArgs = ctx.args.slice(1);
                    if (reasonArgs.length > 0) {
                        reason = reasonArgs.join(' ');
                    }
                } catch {
                    return { content: `❌ Could not find user with ID: \`${userInput}\`` };
                }
            } else {
                return {
                    embeds: [{
                        title: '❌ Invalid Usage',
                        description: 'Please mention a user or provide a valid user ID.\n\nUsage: `n+moderation ban @user [reason]`',
                        color: 0xFF0000
                    }]
                };
            }
        } else {
            return {
                embeds: [{
                    title: '❌ Missing Arguments',
                    description: 'Please specify a user to ban.\n\nUsage: `n+moderation ban @user [reason]`',
                    color: 0xFF0000
                }]
            };
        }
    }

    if (!targetUser) {
        return {
            embeds: [{
                title: '❌ User Not Found',
                description: 'Could not find the specified user.',
                color: 0xFF0000
            }]
        };
    }

    // Check if trying to ban themselves
    if (targetUser.id === ctx.user.id) {
        return {
            embeds: [{
                title: '❌ Invalid Action',
                description: 'You cannot ban yourself.',
                color: 0xFF0000
            }]
        };
    }

    // Check if trying to ban the bot
    if (targetUser.id === ctx.raw.client.user.id) {
        return {
            embeds: [{
                title: '❌ Invalid Action',
                description: 'I cannot ban myself.',
                color: 0xFF0000
            }]
        };
    }

    try {
        // Check if the user is in the guild
        let targetMember = null;
        try {
            targetMember = await ctx.guild.members.fetch(targetUser.id);
        } catch {
            // User is not in the guild, but we can still ban by ID
        }

        // If user is in guild, check role hierarchy
        if (targetMember) {
            // Check if target is an owner
            if (targetMember.id === ctx.guild.ownerId) {
                return {
                    embeds: [{
                        title: '❌ Cannot Ban Owner',
                        description: 'You cannot ban the server owner.',
                        color: 0xFF0000
                    }]
                };
            }

            // Check if executor can ban the target (role hierarchy)
            if (ctx.member.roles.highest.position <= targetMember.roles.highest.position && ctx.user.id !== ctx.guild.ownerId) {
                return {
                    embeds: [{
                        title: '❌ Insufficient Role Hierarchy',
                        description: 'You cannot ban someone with the same or higher role than you.',
                        color: 0xFF0000
                    }]
                };
            }

            // Check if bot can ban the target
            if (ctx.guild.members.me.roles.highest.position <= targetMember.roles.highest.position) {
                return {
                    embeds: [{
                        title: '❌ Cannot Ban User',
                        description: 'I cannot ban someone with the same or higher role than me.',
                        color: 0xFF0000
                    }]
                };
            }
        }

        // Try to send a DM to the user before banning (if they're in the guild)
        if (targetMember) {
            try {
                await targetUser.send({
                    embeds: [{
                        title: '🔨 You have been banned',
                        description: `You have been banned from **${ctx.guild.name}**`,
                        fields: [
                            {
                                name: 'Reason',
                                value: reason,
                                inline: true
                            },
                            {
                                name: 'Banned by',
                                value: ctx.user.tag,
                                inline: true
                            }
                        ],
                        color: 0xFF0000,
                        timestamp: new Date().toISOString()
                    }]
                });
            } catch {
                // Ignore if DM fails (user has DMs disabled)
            }
        }

        // Perform the ban
        await ctx.guild.members.ban(targetUser.id, {
            reason: `${reason} | Banned by: ${ctx.user.tag} (${ctx.user.id})`,
            deleteMessageDays: deleteMessageDays
        });

        // Store ban information in database for tracking
        try {
            const db = require('../../../helpers/db');
            await db.write.logBan(targetUser.id, ctx.guild.id, ctx.user.id, reason);
        } catch (dbError) {
            console.error('Failed to log ban:', dbError);
        }

        // Success response
        return {
            embeds: [{
                title: '🔨 User Banned Successfully',
                description: `**${targetUser.tag}** has been banned from the server.`,
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
                        name: 'Banned by',
                        value: ctx.user.tag,
                        inline: true
                    },
                    {
                        name: 'Messages Deleted',
                        value: deleteMessageDays > 0 ? `${deleteMessageDays} day(s)` : 'None',
                        inline: true
                    }
                ],
                color: 0xFF6B6B,
                timestamp: new Date().toISOString(),
                footer: {
                    text: 'Moderation action completed'
                }
            }]
        };

    } catch (error) {
        console.error('Error banning user:', error);

        return {
            embeds: [{
                title: '❌ Ban Failed',
                description: `Failed to ban **${targetUser.tag}**. This could be due to missing permissions or the user is already banned.`,
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
