exports.description = 'Set bot status';
exports.permissions = ['BotOwner']; // Only bot owner can change bot status
exports.options = [
    {
        name: 'activity',
        type: 3, // STRING
        description: 'The activity text to display',
        required: true
    },
    {
        name: 'type',
        type: 3, // STRING
        description: 'Activity type',
        required: false,
        choices: [
            { name: 'Playing', value: 'PLAYING' },
            { name: 'Watching', value: 'WATCHING' },
            { name: 'Listening', value: 'LISTENING' },
            { name: 'Competing', value: 'COMPETING' },
            { name: 'Streaming', value: 'STREAMING' }
        ]
    },
    {
        name: 'status',
        type: 3, // STRING
        description: 'Bot status',
        required: false,
        choices: [
            { name: 'Online', value: 'online' },
            { name: 'Idle', value: 'idle' },
            { name: 'Do Not Disturb', value: 'dnd' },
            { name: 'Invisible', value: 'invisible' }
        ]
    }
];

exports.execute = async (ctx) => {
    let activity, type = 'PLAYING', status = 'online';
    
    if (ctx.isSlashCommand) {
        activity = ctx.options.getString('activity');
        type = ctx.options.getString('type') || 'PLAYING';
        status = ctx.options.getString('status') || 'online';
    } else {
        if (ctx.args.length === 0) {
            return {
                embeds: [{
                    title: '❌ Missing Arguments',
                    description: 'Usage: `n+status set <activity> [type] [status]`\n\nExample: `n+status set "with Discord.js" PLAYING online`',
                    color: 0xff0000
                }]
            };
        }
        
        activity = ctx.args.join(' ');
        // You could add more parsing for type and status from message commands if needed
    }
    
    // Load helpers to access status functions
    const helpers = require('../../../../helpers/load.js');
    
    if (helpers.status && helpers.status.setStatus) {
        const success = helpers.status.setStatus.setStatus(ctx.raw.client, {
            activity,
            type,
            status
        });
        
        if (success) {
            return {
                embeds: [{
                    title: '✅ Status Updated',
                    description: 'Bot status has been successfully updated!',
                    fields: [
                        {
                            name: 'Activity',
                            value: `${type}: ${activity}`,
                            inline: true
                        },
                        {
                            name: 'Status',
                            value: status.charAt(0).toUpperCase() + status.slice(1),
                            inline: true
                        },
                        {
                            name: 'Updated by',
                            value: ctx.user.tag,
                            inline: true
                        }
                    ],
                    color: 0x00ff00,
                    timestamp: new Date().toISOString()
                }]
            };
        } else {
            return {
                embeds: [{
                    title: '❌ Failed to Update Status',
                    description: 'There was an error updating the bot status.',
                    color: 0xff0000
                }]
            };
        }
    } else {
        return {
            embeds: [{
                title: '❌ Status Helper Not Available',
                description: 'The status helper could not be loaded.',
                color: 0xff0000
            }]
        };
    }
};
