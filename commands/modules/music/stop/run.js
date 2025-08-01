const musicManager = require('../../../../helpers/music');

exports.description = 'Stop playing and clear the queue';

exports.execute = async (ctx) => {
    // Check if user is in a voice channel
    if (!ctx.member.voice.channel) {
        return {
            content: '❌ You need to be in a voice channel to control music!',
            ephemeral: true
        };
    }

    musicManager.stop(ctx.guild.id);
    return { content: '⏹️ Music stopped and queue cleared.' };
};
