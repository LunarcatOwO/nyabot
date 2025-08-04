const { MusicManager } = require('../../../../helpers/music');

exports.description = 'Stop playing and clear the queue';

exports.execute = async (ctx) => {
    // Check if user is in a voice channel
    if (!ctx.member.voice.channel) {
        return {
            content: '❌ You need to be in a voice channel to control music!',
            ephemeral: true
        };
    }

    // Check if bot is connected to a voice channel in this guild
    if (!MusicManager.isConnected(ctx.guild.id)) {
        return {
            content: '❌ I\'m not playing any music right now!',
            ephemeral: true
        };
    }

    try {
        MusicManager.stop(ctx.guild.id);
        return { content: '⏹️ Music stopped and queue cleared.' };
    } catch (error) {
        console.error('Stop command error:', error);
        return {
            content: '❌ An error occurred while stopping music.',
            ephemeral: true
        };
    }
};
