exports.description = 'Show moderation help';

exports.execute = async (ctx) => {
    return {
        embeds: [{
            title: '🔨 Moderation Help',
            description: 'Available moderation commands and their usage:',
            fields: [
                {
                    name: 'Ban Command',
                    value: '**Message:** `n+moderation ban @user [reason]`\n**Slash:** `/moderation ban user:[user] reason:[reason] delete_messages:[days]`',
                    inline: false
                },
                {
                    name: 'Unban Command',
                    value: '**Message:** `n+moderation unban <user_id> [reason]`\n**Slash:** `/moderation unban user:[user_id] reason:[reason]`',
                    inline: false
                },
                {
                    name: 'Permissions Required',
                    value: '• You need **Ban Members** permission\n• Bot needs **Ban Members** permission\n• Cannot ban users with higher/equal roles',
                    inline: false
                },
                {
                    name: 'Features',
                    value: '• Sends DM notification to banned user\n• Tracks bans across servers in database\n• Supports deleting recent messages\n• Role hierarchy checks\n• Shows ban status in user info',
                    inline: false
                },
                {
                    name: 'Examples',
                    value: '`n+moderation ban @spammer Spamming in chat`\n`n+moderation unban 123456789012345678 Appeal accepted`\n`/moderation ban user:@trolluser reason:Breaking rules delete_messages:1`',
                    inline: false
                }
            ],
            color: 0xFF6B6B,
            footer: {
                text: 'Ban information is tracked globally across all servers!'
            }
        }]
    };
};
