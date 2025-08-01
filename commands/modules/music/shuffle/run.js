const musicManager = require('../../../../helpers/music');

exports.name = 'shuffle';
exports.description = 'Toggle shuffle mode for the queue';

exports.execute = async (ctx) => {
    const queue = musicManager.getQueue(ctx.guild.id);
    
    if (!queue || queue.songs.length === 0) {
        return {
            content: '❌ No songs in queue to shuffle!',
            ephemeral: true
        };
    }

    const isShuffling = musicManager.toggleShuffle(ctx.guild.id);
    
    return {
        content: `🔀 Shuffle mode ${isShuffling ? '**enabled**' : '**disabled**'}.`
    };
};
