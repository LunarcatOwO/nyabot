exports.description = 'Show current bot status';
exports.permissions = ['BotOwner'];

exports.execute = async (ctx) => {
    const client = ctx.raw.client;
    const presence = client.user.presence;
    
    let statusEmoji = '🟢';
    let statusText = presence.status || 'online';
    
    switch (statusText) {
        case 'online':
            statusEmoji = '🟢';
            break;
        case 'idle':
            statusEmoji = '🟡';
            break;
        case 'dnd':
            statusEmoji = '🔴';
            break;
        case 'invisible':
            statusEmoji = '⚫';
            break;
    }
    
    const activity = presence.activities.length > 0 ? presence.activities[0] : null;
    
    // Get auto-rotation status
    const helpers = require('../../../../helpers/load.js');
    let rotationInfo = 'Unknown';
    if (helpers.status && helpers.status.setStatus && helpers.status.setStatus.getRotationStatus) {
        const rotationStatus = helpers.status.setStatus.getRotationStatus();
        if (rotationStatus.active) {
            rotationInfo = '🔄 Active';
        } else if (rotationStatus.enabled) {
            rotationInfo = '⏸️ Enabled (Paused)';
        } else {
            rotationInfo = '⏹️ Disabled';
        }
    }
    
    return {
        embeds: [{
            title: '🤖 Current Bot Status',
            fields: [
                {
                    name: 'Status',
                    value: `${statusEmoji} ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}`,
                    inline: true
                },
                {
                    name: 'Activity',
                    value: activity ? `${activity.type === 0 ? 'Playing' : activity.type === 1 ? 'Streaming' : activity.type === 2 ? 'Listening to' : activity.type === 3 ? 'Watching' : 'Competing in'} ${activity.name}` : 'No activity set',
                    inline: true
                },
                {
                    name: 'Auto Rotation',
                    value: rotationInfo,
                    inline: true
                },
                {
                    name: 'Bot Info',
                    value: `**Tag:** ${client.user.tag}\n**ID:** ${client.user.id}`,
                    inline: false
                }
            ],
            thumbnail: {
                url: client.user.displayAvatarURL({ dynamic: true, size: 256 })
            },
            color: 0x5865F2,
            timestamp: new Date().toISOString(),
            footer: {
                text: 'Use /nyadev status-rotation to manage auto rotation'
            }
        }]
    };
};
