exports.description = 'Setup moderation logging channel';
exports.category = 'Setup';
exports.permissions = ['ManageGuild']; // Required permission to manage server settings
exports.guildOnly = true; // Can only be used in servers
exports.options = [
    {
        name: 'channel',
        type: 7, // CHANNEL type
        description: 'The channel to use for moderation logs',
        required: false,
        channel_types: [0] // TEXT_CHANNEL only
    },
    {
        name: 'disable',
        type: 5, // BOOLEAN type
        description: 'Disable moderation logging',
        required: false
    }
];

exports.execute = async (ctx) => {
    const { setBotConfig, getBotConfig } = require('../../../../helpers/db');
    
    // Check if user wants to disable modlog
    const shouldDisable = ctx.isSlashCommand ? ctx.options.getBoolean('disable') : 
                         ctx.args.includes('disable') || ctx.args.includes('off');
    
    if (shouldDisable) {
        try {
            await setBotConfig(`modlog_channel_${ctx.guild.id}`, null, 'Moderation log channel (disabled)');
            
            return {
                embeds: [{
                    title: '✅ Moderation Logging Disabled',
                    description: 'Moderation logging has been disabled for this server.',
                    color: 0x00FF00,
                    timestamp: new Date().toISOString()
                }]
            };
        } catch (error) {
            console.error('Error disabling modlog:', error);
            return {
                embeds: [{
                    title: '❌ Error',
                    description: 'Failed to disable moderation logging. Please try again later.',
                    color: 0xFF0000
                }]
            };
        }
    }
    
    // Get the channel from options
    let targetChannel = null;
    if (ctx.isSlashCommand) {
        targetChannel = ctx.options.getChannel('channel');
    } else if (ctx.args.length > 0) {
        // For message commands, try to parse channel mention or ID
        const channelArg = ctx.args[0];
        const channelId = channelArg.replace(/[<#>]/g, ''); // Remove channel mention formatting
        targetChannel = ctx.guild.channels.cache.get(channelId);
    }
    
    // If no channel specified, show current configuration
    if (!targetChannel) {
        try {
            const currentChannelId = await getBotConfig(`modlog_channel_${ctx.guild.id}`);
            
            if (!currentChannelId) {
                return {
                    embeds: [{
                        title: '📋 Moderation Logging Configuration',
                        description: 'Moderation logging is currently **disabled** for this server.\n\n' +
                                   '**To enable:**\n' +
                                   '• `/config modlog channel:#your-channel`\n' +
                                   '• `n+config modlog #your-channel`\n\n' +
                                   '**To disable:**\n' +
                                   '• `/config modlog disable:true`\n' +
                                   '• `n+config modlog disable`',
                        color: 0x0099FF,
                        timestamp: new Date().toISOString()
                    }]
                };
            }
            
            const currentChannel = ctx.guild.channels.cache.get(currentChannelId);
            const channelMention = currentChannel ? `<#${currentChannelId}>` : `Unknown Channel (${currentChannelId})`;
            
            return {
                embeds: [{
                    title: '📋 Moderation Logging Configuration',
                    description: `Moderation logging is currently **enabled** for this server.\n\n` +
                               `**Current log channel:** ${channelMention}\n\n` +
                               '**Events logged:**\n' +
                               '• Warnings (bot commands)\n' +
                               '• Bans (bot commands and Discord native)\n' +
                               '• Unbans (bot commands and Discord native)\n' +
                               '• Timeouts (Discord native)\n\n' +
                               '**To change channel:**\n' +
                               '• `/config modlog channel:#new-channel`\n' +
                               '• `n+config modlog #new-channel`\n\n' +
                               '**To disable:**\n' +
                               '• `/config modlog disable:true`\n' +
                               '• `n+config modlog disable`',
                    color: 0x00FF00,
                    timestamp: new Date().toISOString()
                }]
            };
        } catch (error) {
            console.error('Error fetching modlog config:', error);
            return {
                embeds: [{
                    title: '❌ Error',
                    description: 'Failed to fetch moderation logging configuration. Please try again later.',
                    color: 0xFF0000
                }]
            };
        }
    }
    
    // Validate the channel
    if (!targetChannel.isTextBased()) {
        return {
            embeds: [{
                title: '❌ Invalid Channel',
                description: 'The moderation log channel must be a text channel.',
                color: 0xFF0000
            }]
        };
    }
    
    // Check if bot has permissions to send messages in the channel
    const botMember = ctx.guild.members.cache.get(ctx.raw.client.user.id);
    const permissions = targetChannel.permissionsFor(botMember);
    
    if (!permissions.has(['ViewChannel', 'SendMessages', 'EmbedLinks'])) {
        return {
            embeds: [{
                title: '❌ Missing Permissions',
                description: `I don't have the required permissions in ${targetChannel}.\n\n` +
                           '**Required permissions:**\n' +
                           '• View Channel\n' +
                           '• Send Messages\n' +
                           '• Embed Links',
                color: 0xFF0000
            }]
        };
    }
    
    // Save the configuration
    try {
        await setBotConfig(`modlog_channel_${ctx.guild.id}`, targetChannel.id, 'Moderation log channel');
        
        // Send a test message to the channel
        await targetChannel.send({
            embeds: [{
                title: '🔧 Moderation Logging Enabled',
                description: `This channel has been set up for moderation logging by ${ctx.user}.\n\n` +
                           '**Events that will be logged:**\n' +
                           '• Warnings (bot commands)\n' +
                           '• Bans (bot commands and Discord native)\n' +
                           '• Unbans (bot commands and Discord native)\n' +
                           '• Timeouts (Discord native)',
                color: 0x00FF00,
                timestamp: new Date().toISOString(),
                footer: {
                    text: 'Moderation Logging System'
                }
            }]
        });
        
        return {
            embeds: [{
                title: '✅ Moderation Logging Configured',
                description: `Moderation logging has been enabled for this server.\n\n` +
                           `**Log channel:** ${targetChannel}\n\n` +
                           'A test message has been sent to the log channel to verify everything is working correctly.',
                color: 0x00FF00,
                timestamp: new Date().toISOString()
            }]
        };
    } catch (error) {
        console.error('Error setting up modlog:', error);
        return {
            embeds: [{
                title: '❌ Error',
                description: 'Failed to configure moderation logging. Please check my permissions and try again.',
                color: 0xFF0000
            }]
        };
    }
};