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
                        name: 'config modlog [channel|disable]',
                        value: 'Setup moderation logging channel or view current settings',
                        inline: false
                    },
                    {
                        name: 'config set <key> <value>',
                        value: 'Set a configuration value',
                        inline: false
                    },
                    {
                        name: 'Examples',
                        value: '`n+config view`\n`n+config modlog #mod-logs`\n`n+config modlog disable`\n`/config modlog channel:#mod-logs`\n`/config view`',
                        inline: false
                    }
                ],
                color: 0x00ff00
            }
        ]
    };
};
