const musicManager = require('../../../../helpers/music');

exports.name = 'loop';
exports.description = 'Toggle loop mode for the current song';

exports.execute = async (ctx) => {
    const queue = musicManager.getQueue(ctx.guild.id);
    
    if (!queue || queue.songs.length === 0) {
        return {
            content: '❌ No songs in queue to loop!',
            ephemeral: true
        };
    }

    const isLooping = musicManager.toggleLoop(ctx.guild.id);
    
    return {
        content: `🔄 Loop mode ${isLooping ? '**enabled**' : '**disabled**'}.`
    };
};
