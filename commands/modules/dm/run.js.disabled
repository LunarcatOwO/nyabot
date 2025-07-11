exports.name = 'dm';
exports.description = 'Send a DM to a user (Root user only)';
exports.ephemeral = true;
exports.category = 'NyaBot Staff';
exports.permissions = ['BotOwner']; // Use the proper permission system
exports.options = [
    {
        name: 'user',
        type: 6, // USER type
        description: 'The user to send a DM to',
        required: true
    },
    {
        name: 'message',
        type: 3, // STRING type
        description: 'The message to send',
        required: true
    }
];

exports.execute = async (ctx) => {
    let targetUser, message;

    if (ctx.isSlashCommand) {
        targetUser = ctx.options.getUser('user');
        message = ctx.options.getString('message');
    } else if (ctx.isMessage) {
        // For message commands, check for mentions or user ID
        const mentions = ctx.raw.mentions?.users;
        if (mentions && mentions.size > 0) {
            targetUser = mentions.first();
            // Get message from remaining args (skip the mention)
            const messageArgs = ctx.args.slice(1);
            if (messageArgs.length > 0) {
                message = messageArgs.join(' ');
            }
        } else if (ctx.args.length > 0) {
            // Try to get user by ID
            const userInput = ctx.args[0];
            const snowflakeRegex = /^\d{17,19}$/;
            
            if (snowflakeRegex.test(userInput)) {
                try {
                    targetUser = await ctx.raw.client.users.fetch(userInput);
                    // Get message from remaining args
                    const messageArgs = ctx.args.slice(1);
                    if (messageArgs.length > 0) {
                        message = messageArgs.join(' ');
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
                        description: 'Please mention a user or provide a valid user ID.\n\nUsage: `n+ dm @user <message>`',
                        color: 0xFF0000
                    }]
                };
            }
        } else {
            return {
                embeds: [{
                    title: '❌ Missing Arguments',
                    description: 'Please specify a user and message.\n\nUsage: `n+ dm @user <message>`',
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

    if (!message) {
        return {
            embeds: [{
                title: '❌ Missing Message',
                description: 'Please provide a message to send.',
                color: 0xFF0000
            }]
        };
    }

    try {
        const helpers = require('../../../helpers/load.js');
        const sentMessage = await helpers.dm.send.sendDM(targetUser, message, ctx.raw.client, ctx.user);
        
        if (sentMessage) {
            return {
                embeds: [{
                    title: '✅ DM Sent Successfully',
                    description: `Message sent to **${targetUser.tag}**`,
                    fields: [
                        {
                            name: 'Target User',
                            value: `${targetUser.tag} (${targetUser.id})`,
                            inline: true
                        },
                        {
                            name: 'Message',
                            value: message.length > 1024 ? message.substring(0, 1021) + '...' : message,
                            inline: false
                        },
                        {
                            name: 'Sent by',
                            value: ctx.user.tag,
                            inline: true
                        }
                    ],
                    color: 0x00FF00,
                    timestamp: new Date().toISOString()
                }]
            };
        } else {
            return {
                embeds: [{
                    title: '❌ DM Failed',
                    description: `Failed to send DM to **${targetUser.tag}**`,
                    fields: [
                        {
                            name: 'Possible Reasons',
                            value: '• User has DMs disabled\n• User has blocked the bot\n• User is not reachable',
                            inline: false
                        }
                    ],
                    color: 0xFF0000
                }]
            };
        }
    } catch (error) {
        console.error('Error in DM command:', error);
        
        return {
            embeds: [{
                title: '❌ Command Error',
                description: 'An error occurred while sending the DM.',
                fields: [
                    {
                        name: 'Error Details',
                        value: error.message.length > 1024 ? error.message.substring(0, 1021) + '...' : error.message,
                        inline: false
                    }
                ],
                color: 0xFF0000
            }]
        };
    }
};
