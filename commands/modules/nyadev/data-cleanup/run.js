exports.description = 'Manage guild data cleanup and view departure status';
exports.permissions = ['BotOwner'];
exports.options = [
    {
        name: 'action',
        type: 3, // STRING
        description: 'Action to perform',
        required: true,
        choices: [
            { name: 'Status', value: 'status' },
            { name: 'Check Now', value: 'check' },
            { name: 'Force Purge', value: 'purge' }
        ]
    },
    {
        name: 'guild_id',
        type: 3, // STRING
        description: 'Guild ID (required for force purge)',
        required: false
    }
];

exports.execute = async (ctx) => {
    const action = ctx.isSlashCommand ? ctx.options.getString('action') : ctx.args[0];
    const guildId = ctx.isSlashCommand ? ctx.options.getString('guild_id') : ctx.args[1];

    if (!action) {
        return {
            embeds: [{
                title: '❌ Missing Action',
                description: 'Please specify an action: `status`, `check`, or `purge`',
                color: 0xFF0000
            }]
        };
    }

    try {
        const guildCleanup = require('../../../../helpers/guild/cleanup');

        switch (action.toLowerCase()) {
            case 'status': {
                const stats = await guildCleanup.getGuildDepartureStats();
                
                if (!stats) {
                    return {
                        embeds: [{
                            title: '❌ Error',
                            description: 'Failed to retrieve guild departure statistics.',
                            color: 0xFF0000
                        }]
                    };
                }

                const nextPurgeText = stats.next_purge_scheduled 
                    ? `<t:${Math.floor(new Date(stats.next_purge_scheduled).getTime() / 1000)}:R>`
                    : 'None scheduled';

                return {
                    embeds: [{
                        title: '📊 Guild Data Cleanup Status',
                        fields: [
                            {
                                name: '⏳ Pending Departures',
                                value: stats.pending_departures.toString(),
                                inline: true
                            },
                            {
                                name: '🕒 Next Scheduled Purge',
                                value: nextPurgeText,
                                inline: false
                            }
                        ],
                        color: 0x0099FF,
                        timestamp: new Date().toISOString(),
                        footer: {
                            text: 'Data is automatically purged 48 hours after bot leaves a server'
                        }
                    }]
                };
            }

            case 'check': {
                await guildCleanup.checkAndPurgeExpiredGuilds();
                
                return {
                    embeds: [{
                        title: '✅ Manual Cleanup Check Completed',
                        description: 'Checked for and purged any expired guild data. Check console logs for details.',
                        color: 0x00FF00,
                        timestamp: new Date().toISOString()
                    }]
                };
            }

            case 'purge': {
                if (!guildId) {
                    return {
                        embeds: [{
                            title: '❌ Missing Guild ID',
                            description: 'Guild ID is required for force purge action.',
                            color: 0xFF0000
                        }]
                    };
                }

                const success = await guildCleanup.purgeGuildData(guildId);
                
                if (success) {
                    return {
                        embeds: [{
                            title: '✅ Force Purge Completed',
                            description: `Successfully purged all data for guild: \`${guildId}\``,
                            color: 0x00FF00,
                            timestamp: new Date().toISOString(),
                            footer: {
                                text: 'Warning: This action cannot be undone'
                            }
                        }]
                    };
                } else {
                    return {
                        embeds: [{
                            title: '❌ Force Purge Failed',
                            description: `Failed to purge data for guild: \`${guildId}\`. Check console logs for details.`,
                            color: 0xFF0000
                        }]
                    };
                }
            }

            default:
                return {
                    embeds: [{
                        title: '❌ Invalid Action',
                        description: 'Valid actions are: `status`, `check`, or `purge`',
                        color: 0xFF0000
                    }]
                };
        }
    } catch (error) {
        console.error('Error in data cleanup command:', error);
        
        return {
            embeds: [{
                title: '❌ Command Error',
                description: 'An error occurred while executing the data cleanup command.',
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
