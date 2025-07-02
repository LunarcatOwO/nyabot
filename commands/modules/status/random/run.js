exports.description = 'Set a random bot status';

exports.execute = async (ctx) => {
    // Check if user has permission (you might want to add proper permission checks)
    if (ctx.user.id !== 'process.env.ROOT_USR') { // Replace with your user ID or add proper role checks
        return {
            embeds: [{
                title: '❌ Permission Denied',
                description: 'You do not have permission to change the bot status.',
                color: 0xff0000
            }]
        };
    }
    
    // Load helpers to access status functions
    const helpers = require('../../../../helpers/load.js');
    
    if (helpers.status && helpers.status.setStatus) {
        const success = helpers.status.setStatus.setRandomStatus(ctx.raw.client);
        
        if (success) {
            return {
                embeds: [{
                    title: '🎲 Random Status Set',
                    description: 'A random status has been applied to the bot!',
                    fields: [
                        {
                            name: 'Updated by',
                            value: ctx.user.tag,
                            inline: true
                        },
                        {
                            name: 'Tip',
                            value: 'Use `status info` to see the current status',
                            inline: true
                        }
                    ],
                    color: 0xff9900,
                    timestamp: new Date().toISOString()
                }]
            };
        } else {
            return {
                embeds: [{
                    title: '❌ Failed to Set Random Status',
                    description: 'There was an error setting a random status.',
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
