const musicManager = require('../../../../helpers/music');

exports.description = 'Pause the current song';

exports.execute = async (ctx) => {
    // Check if user is in a voice channel
    if (!ctx.member.voice.channel) {
        return {
            content: '❌ You need to be in a voice channel to control music!',
            ephemeral: true
        };
    }

    if (musicManager.pause(ctx.guild.id)) {
        return { content: '⏸️ Music paused.' };
    } else {
        return {
            content: '❌ Nothing is currently playing!',
            ephemeral: true
        };
    }
};
