exports.description = 'Set a configuration value';
exports.options = [
    {
        name: 'key',
        type: 3, // STRING type
        description: 'The configuration key to set',
        required: true
    },
    {
        name: 'value',
        type: 3, // STRING type  
        description: 'The value to set',
        required: true
    }
];

exports.execute = async (ctx) => {
    let key, value;
    
    // Handle different command types
    if (ctx.isSlashCommand) {
        key = ctx.options.getString('key');
        value = ctx.options.getString('value');
    } else if (ctx.isMessage) {
        // For message commands, use args
        if (ctx.args.length < 2) {
            return {
                embeds: [
                    {
                        title: 'Error',
                        description: 'Please provide both a key and value.\nUsage: `n+config set <key> <value>`',
                        color: 0xff0000
                    }
                ]
            };
        }
        key = ctx.args[0];
        value = ctx.args.slice(1).join(' '); // Join remaining args as value
    }
    
    // Simulate setting the configuration
    return {
        embeds: [
            {
                title: 'Configuration Updated',
                description: `Successfully updated configuration!`,
                fields: [
                    {
                        name: 'Key',
                        value: key,
                        inline: true
                    },
                    {
                        name: 'Value',
                        value: value,
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
            }
        ]
    };
};
