exports.description = 'Set a random bot status';
exports.permissions = ['BotOwner'];
exports.options = [
    {
        name: 'auto-rotation',
        type: 3, // STRING with choices
        description: 'Enable auto rotation after setting random status',
        required: false,
        choices: [
            { name: 'True', value: 'true' },
            { name: 'False', value: 'false' }
        ]
    }
];

exports.execute = async (ctx) => {
    // Get the auto-rotation option (defaults to false)
    const autoRotationOption = ctx.isSlashCommand ? ctx.options.getString('auto-rotation') : null;
    const enableAutoRotation = autoRotationOption === 'true';
    
    // Load helpers to access status functions
    const helpers = require('../../../../helpers/load.js');
    
    if (helpers.status && helpers.status.setStatus) {
        const success = helpers.status.setStatus.setRandomStatus(ctx.raw.client, false);
        
        if (success) {
            // Handle auto-rotation based on the option
            if (enableAutoRotation) {
                // Enable auto rotation with default interval (30 seconds)
                helpers.status.setStatus.enableAutoRotation(30);
            }
            
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
                            name: 'Auto Rotation',
                            value: enableAutoRotation ? 'Enabled (30s interval)' : 'Disabled',
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
