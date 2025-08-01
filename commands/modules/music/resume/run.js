const musicManager = require('../../../../helpers/music');

exports.description = 'Resume the paused song';

exports.execute = async (ctx) => {
    // Check if user is in a voice channel
    if (!ctx.member.voice.channel) {
        return {
            content: '❌ You need to be in a voice channel to control music!',
            ephemeral: true
        };
    }

    // Reset inactivity timer on user interaction
    musicManager.onActivity(ctx.guild.id);

    if (musicManager.resume(ctx.guild.id)) {
        return { content: '▶️ Music resumed.' };
    } else {
        return {
            content: '❌ Nothing is currently paused!',
            ephemeral: true
        };
    }
};
