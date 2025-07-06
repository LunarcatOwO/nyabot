exports.name = 'guild-sync';
exports.description = 'Manage guild data synchronization and view sync status';
exports.category = 'NyaBot Staff';
exports.permissions = ['BotOwner']; // Only bot owner can manage guild sync
exports.ephemeral = true;
exports.options = [
    {
        name: 'action',
        type: 3, // STRING
        description: 'Action to perform',
        required: true,
        choices: [
            { name: 'Status', value: 'status' },
            { name: 'Sync Now', value: 'sync' },
            { name: 'Full Audit', value: 'audit' },
            { name: 'Check Left Guilds', value: 'check-left' }
        ]
    }
];

exports.execute = async (ctx) => {
    const action = ctx.isSlashCommand ? ctx.options.getString('action') : ctx.args[0];

    if (!action) {
        return {
            embeds: [{
                title: '❌ Missing Action',
                description: 'Please specify an action: `status`, `sync`, `audit`, or `check-left`',
                color: 0xFF0000
            }]
        };
    }

    try {
        const guildSync = require('../../../helpers/guild/sync');
        const client = ctx.client || ctx.guild?.client;

        if (!client) {
            return {
                embeds: [{
                    title: '❌ Error',
                    description: 'Could not access Discord client.',
                    color: 0xFF0000
                }]
            };
        }

        switch (action.toLowerCase()) {
            case 'status': {
                const stats = await guildSync.getGuildSyncStats(client);
                
                if (!stats) {
                    return {
                        embeds: [{
                            title: '❌ Error',
                            description: 'Failed to retrieve guild synchronization statistics.',
                            color: 0xFF0000
                        }]
                    };
                }

                const statusColor = stats.syncNeeded ? 0xFFA500 : 0x00FF00;
                const statusEmoji = stats.syncNeeded ? '⚠️' : '✅';

                return {
                    embeds: [{
                        title: `${statusEmoji} Guild Synchronization Status`,
                        fields: [
                            {
                                name: '🏢 Current Guilds',
                                value: stats.currentGuilds.toString(),
                                inline: true
                            },
                            {
                                name: '📊 Database Guilds',
                                value: stats.dbGuilds.toString(),
                                inline: true
                            },
                            {
                                name: '⏰ Outdated Guilds',
                                value: stats.outdatedGuilds.toString(),
                                inline: true
                            },
                            {
                                name: '🔄 Sync Status',
                                value: stats.syncNeeded ? 'Sync Needed' : 'Up to Date',
                                inline: false
                            }
                        ],
                        color: statusColor,
                        timestamp: new Date().toISOString(),
                        footer: {
                            text: 'Guild data is automatically synced every 6 hours'
                        }
                    }]
                };
            }

            case 'sync': {
                const result = await guildSync.syncAllGuilds(client);
                
                return {
                    embeds: [{
                        title: '🔄 Manual Guild Sync Completed',
                        fields: [
                            {
                                name: '✅ Updated Guilds',
                                value: result.updated.toString(),
                                inline: true
                            },
                            {
                                name: '❌ Errors',
                                value: result.errors.toString(),
                                inline: true
                            }
                        ],
                        color: result.errors === 0 ? 0x00FF00 : 0xFFA500,
                        timestamp: new Date().toISOString()
                    }]
                };
            }

            case 'audit': {
                const auditResult = await guildSync.performFullGuildAudit(client);
                
                const leftGuildsText = auditResult.leftResult.leftGuilds.length > 0 
                    ? auditResult.leftResult.leftGuilds.map(g => `• ${g.name} (${g.id})`).join('\n')
                    : 'None found';

                return {
                    embeds: [{
                        title: '🔍 Full Guild Audit Completed',
                        fields: [
                            {
                                name: '📊 Pre-Audit Stats',
                                value: `Current: ${auditResult.stats.currentGuilds} | DB: ${auditResult.stats.dbGuilds} | Outdated: ${auditResult.stats.outdatedGuilds}`,
                                inline: false
                            },
                            {
                                name: '🔄 Sync Results',
                                value: `Updated: ${auditResult.syncResult.updated} | Errors: ${auditResult.syncResult.errors}`,
                                inline: false
                            },
                            {
                                name: '🚪 Left Guilds Found',
                                value: leftGuildsText.length > 1024 ? leftGuildsText.substring(0, 1021) + '...' : leftGuildsText,
                                inline: false
                            }
                        ],
                        color: 0x0099FF,
                        timestamp: new Date().toISOString()
                    }]
                };
            }

            case 'check-left': {
                const leftResult = await guildSync.checkForLeftGuilds(client);
                
                const leftGuildsText = leftResult.leftGuilds.length > 0 
                    ? leftResult.leftGuilds.map(g => `• ${g.name} (${g.id})`).join('\n')
                    : 'None found';

                return {
                    embeds: [{
                        title: '🚪 Left Guilds Check Completed',
                        fields: [
                            {
                                name: '📋 Guilds No Longer Present',
                                value: leftGuildsText.length > 1024 ? leftGuildsText.substring(0, 1021) + '...' : leftGuildsText,
                                inline: false
                            },
                            {
                                name: '📊 Summary',
                                value: `Found ${leftResult.leftGuilds.length} guild(s) that have been marked for cleanup`,
                                inline: false
                            }
                        ],
                        color: leftResult.leftGuilds.length > 0 ? 0xFFA500 : 0x00FF00,
                        timestamp: new Date().toISOString(),
                        footer: {
                            text: 'Left guilds are automatically scheduled for data cleanup after 48 hours'
                        }
                    }]
                };
            }

            default:
                return {
                    embeds: [{
                        title: '❌ Invalid Action',
                        description: 'Valid actions are: `status`, `sync`, `audit`, or `check-left`',
                        color: 0xFF0000
                    }]
                };
        }
    } catch (error) {
        console.error('Error in guild sync command:', error);
        
        return {
            embeds: [{
                title: '❌ Command Error',
                description: 'An error occurred while executing the guild sync command.',
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
