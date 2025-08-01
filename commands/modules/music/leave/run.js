const musicManager = require('../../../../helpers/music');

exports.description = 'Leave the voice channel';

exports.execute = async (ctx) => {
    // Check if user is in a voice channel
    if (!ctx.member.voice.channel) {
        return {
            content: '❌ You need to be in a voice channel to use this command!',
            ephemeral: true
        };
    }

    musicManager.leave(ctx.guild.id);
    return { content: '👋 Left the voice channel and cleared the queue.' };
};
