exports.description = 'Show configuration help';
exports.execute = async (ctx) => {
    return {
        embeds: [
            {
                title: 'Configuration Help',
                description: 'Available configuration commands:',
                fields: [
                    {
                        name: 'config view',
                        value: 'View current configuration settings',
                        inline: false
                    },
                    {
                        name: 'config set <key> <value>',
                        value: 'Set a configuration value',
                        inline: false
                    },
                    {
                        name: 'Examples',
                        value: '`n+config view`\n`n+config set prefix !`\n`/config view`',
                        inline: false
                    }
                ],
                color: 0x00ff00
            }
        ]
    };
};
