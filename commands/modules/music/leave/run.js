const { MusicManager } = require('../../../../helpers/music');

exports.description = 'Leave the voice channel';

exports.execute = async (ctx) => {
    // Check if user is in a voice channel
    if (!ctx.member.voice.channel) {
        return {
            content: '❌ You need to be in a voice channel to use this command!',
            ephemeral: true
        };
    }

    // Check if bot is connected to a voice channel in this guild
    if (!MusicManager.isConnected(ctx.guild.id)) {
        return {
            content: '❌ I\'m not connected to any voice channel!',
            ephemeral: true
        };
    }

    try {
        MusicManager.leave(ctx.guild.id);
        return { content: '👋 Left the voice channel and cleared the queue.' };
    } catch (error) {
        console.error('Leave command error:', error);
        return {
            content: '❌ An error occurred while leaving the voice channel.',
            ephemeral: true
        };
    }
};
