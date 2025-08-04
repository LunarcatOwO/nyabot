const { MusicManager } = require('../../../../helpers/music');

exports.name = 'loop';
exports.description = 'Toggle loop mode for the current song';

exports.execute = async (ctx) => {
    // Check if bot is connected to a voice channel in this guild
    if (!MusicManager.isConnected(ctx.guild.id)) {
        return {
            content: '❌ I\'m not playing any music right now!',
            ephemeral: true
        };
    }

    const queueInfo = MusicManager.getQueueInfo(ctx.guild.id);
    
    if (queueInfo.totalTracks === 0) {
        return {
            content: '❌ No songs in queue to loop!',
            ephemeral: true
        };
    }

    try {
        const isLooping = MusicManager.toggleLoop(ctx.guild.id);
        
        return {
            content: `🔄 Loop mode ${isLooping ? '**enabled**' : '**disabled**'}.`
        };
    } catch (error) {
        console.error('Loop command error:', error);
        return {
            content: '❌ An error occurred while toggling loop mode.',
            ephemeral: true
        };
    }
};
