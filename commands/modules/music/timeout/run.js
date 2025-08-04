const { MusicManager } = require('../../../../helpers/music');

exports.name = 'timeout';
exports.description = 'Show time until auto-disconnect or manually trigger timeout for testing';
exports.options = [
    {
        name: 'action',
        type: 3, // STRING type
        description: 'Action to perform',
        required: false,
        choices: [
            { name: 'status', value: 'status' },
            { name: 'trigger', value: 'trigger' },
            { name: 'reset', value: 'reset' }
        ]
    }
];

exports.execute = async (ctx) => {
    const action = ctx.options?.getString('action') || 'status';
    
    try {
        if (action === 'trigger') {
            // Manually trigger auto-disconnect for testing
            MusicManager.leave(ctx.guild.id);
            return { content: '🔕 **Manually triggered disconnect**' };
        } else if (action === 'reset') {
            // Check if connected
            if (MusicManager.isConnected(ctx.guild.id)) {
                return { content: '🔄 **Connection refreshed** - Bot will auto-disconnect after inactivity' };
            } else {
                return { content: '❌ Bot is not connected to any voice channel' };
            }
        } else {
            // Show status
            const isConnected = MusicManager.isConnected(ctx.guild.id);
            const queueInfo = MusicManager.getQueueInfo(ctx.guild.id);
            
            let status = `**Music Bot Status:**\n`;
            status += `🔗 Connected: ${isConnected ? 'Yes' : 'No'}\n`;
            status += `🎵 Queue: ${queueInfo.totalTracks} tracks\n`;
            status += `▶️ Playing: ${queueInfo.currentTrack ? 'Yes' : 'No'}\n`;
            status += `\n*Bot will auto-disconnect after inactivity*`;
            
            return { content: status, ephemeral: true };
        }
    } catch (error) {
        console.error('Timeout command error:', error);
        return {
            content: '❌ An error occurred while managing timeout.',
            ephemeral: true
        };
    }
};
