const { MusicManager } = require('../../../../helpers/music');

exports.name = 'shuffle';
exports.description = 'Toggle shuffle mode for the queue';

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
            content: '❌ No songs in queue to shuffle!',
            ephemeral: true
        };
    }

    try {
        const isShuffling = MusicManager.toggleShuffle(ctx.guild.id);
        
        return {
            content: `🔀 Shuffle mode ${isShuffling ? '**enabled**' : '**disabled**'}.`
        };
    } catch (error) {
        console.error('Shuffle command error:', error);
        return {
            content: '❌ An error occurred while toggling shuffle mode.',
            ephemeral: true
        };
    }
};
