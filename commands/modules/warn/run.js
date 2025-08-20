exports.name = 'warn';
exports.description = 'Warn a user';
exports.category = 'Moderation';
exports.permissions = ['ModerateMembers']; // Required permissions
exports.guildOnly = true; // Can only be used in servers
exports.options = [
    {
        name: 'user',
        type: 6, // USER type
        description: 'The user to warn',
        required: true
    },
    {
        name: 'reason',
        type: 3, // STRING type
        description: 'Reason for the warning',
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

    // Check if the user has permission to moderate members
    if (!ctx.member.permissions.has('ModerateMembers')) {
        return {
            embeds: [{
                title: '❌ Permission Denied',
                description: 'You don\'t have permission to warn members.',
                color: 0xFF0000
            }]
        };
    }

    let targetUser, reason = 'No reason provided';

    if (ctx.isSlashCommand) {
        targetUser = ctx.options.getUser('user');
        reason = ctx.options.getString('reason') || 'No reason provided';
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
                    return {
                        embeds: [{
                            title: '❌ User Not Found',
                            description: `Could not find user with ID: \`${userInput}\``,
                            color: 0xFF0000
                        }]
                    };
                }
            } else {
                return {
                    embeds: [{
                        title: '❌ Invalid Usage',
                        description: 'Please mention a user or provide a valid user ID.\n\nUsage: `n+ warn @user [reason]`',
                        color: 0xFF0000
                    }]
                };
            }
        } else {
            return {
                embeds: [{
                    title: '❌ Missing Arguments',
                    description: 'Please specify a user to warn.\n\nUsage: `n+ warn @user [reason]`',
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

    // Check if trying to warn themselves
    if (targetUser.id === ctx.user.id) {
        return {
            embeds: [{
                title: '❌ Invalid Action',
                description: 'You cannot warn yourself.',
                color: 0xFF0000
            }]
        };
    }

    // Check if trying to warn the bot
    if (targetUser.id === ctx.raw.client.user.id) {
        return {
            embeds: [{
                title: '❌ Invalid Action',
                description: 'You cannot warn me.',
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
            // User is not in the guild, but we can still warn by ID for records
        }

        // If user is in guild, check role hierarchy
        if (targetMember) {
            // Check if target is an owner
            if (targetMember.id === ctx.guild.ownerId) {
                return {
                    embeds: [{
                        title: '❌ Cannot Warn Owner',
                        description: 'You cannot warn the server owner.',
                        color: 0xFF0000
                    }]
                };
            }

            // Check if executor can warn the target (role hierarchy)
            if (ctx.member.roles.highest.position <= targetMember.roles.highest.position && ctx.user.id !== ctx.guild.ownerId) {
                return {
                    embeds: [{
                        title: '❌ Insufficient Role Hierarchy',
                        description: 'You cannot warn someone with the same or higher role than you.',
                        color: 0xFF0000
                    }]
                };
            }
        }

        // Try to send a DM to the user before logging the warning
        if (targetMember) {
            try {
                await targetUser.send({
                    embeds: [{
                        title: '⚠️ You have been warned',
                        description: `You have been warned in **${ctx.guild.name}**`,
                        fields: [
                            {
                                name: 'Reason',
                                value: reason,
                                inline: true
                            },
                            {
                                name: 'Warned by',
                                value: ctx.user.tag,
                                inline: true
                            }
                        ],
                        color: 0xFFCC00,
                        timestamp: new Date().toISOString()
                    }]
                });
            } catch {
                // Ignore if DM fails (user has DMs disabled)
            }
        }

        // Store warning information in database
        try {
            const db = require('../../../helpers/db');
            await db.write.logWarning(targetUser.id, ctx.guild.id, ctx.user.id, reason);
        } catch (dbError) {
            console.error('Failed to log warning:', dbError);
            return {
                embeds: [{
                    title: '❌ Database Error',
                    description: 'Failed to save the warning to the database.',
                    color: 0xFF0000
                }]
            };
        }

        // Send to modlog if configured
        try {
            const helpers = require('../../../helpers/load');
            if (helpers.modlog && helpers.modlog.log) {
                await helpers.modlog.log.sendModLog(ctx.raw.client, ctx.guild.id, {
                    action: 'warn',
                    target: targetUser,
                    moderator: ctx.user,
                    reason: reason
                });
            }
        } catch (modlogError) {
            console.error('Failed to send modlog:', modlogError);
        }

        // Get updated warning count
        let warningCount = 0;
        try {
            const db = require('../../../helpers/db');
            warningCount = await db.read.getUserWarningCount(targetUser.id, ctx.guild.id);
        } catch (dbError) {
            console.error('Failed to get warning count:', dbError);
        }

        // Success response
        return {
            embeds: [{
                title: '⚠️ User Warned Successfully',
                description: `**${targetUser.tag}** has been warned.`,
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
                        name: 'Warned by',
                        value: ctx.user.tag,
                        inline: true
                    },
                    {
                        name: 'Total Warnings',
                        value: warningCount.toString(),
                        inline: true
                    }
                ],
                color: 0xFFCC00,
                timestamp: new Date().toISOString(),
                footer: {
                    text: 'Moderation action completed'
                }
            }]
        };

    } catch (error) {
        console.error('Error warning user:', error);

        return {
            embeds: [{
                title: '❌ Warning Failed',
                description: `Failed to warn **${targetUser.tag}**.`,
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
