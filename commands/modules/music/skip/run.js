const musicManager = require('../../../../helpers/music');

exports.description = 'Vote to skip the current song';

exports.execute = async (ctx) => {
    // Check if user is in a voice channel
    if (!ctx.member.voice.channel) {
        return {
            content: '❌ You need to be in a voice channel to vote skip!',
            ephemeral: true
        };
    }

    const currentSong = musicManager.getCurrentSong(ctx.guild.id);
    if (!currentSong) {
        return {
            content: '❌ Nothing is currently playing!',
            ephemeral: true
        };
    }

    const result = await musicManager.voteSkip(
        ctx.guild.id, 
        ctx.user.id, 
        ctx.member.voice.channel
    );

    if (result.skipped) {
        return {
            content: `⏭️ Song skipped! (${result.votes}/${result.required} votes)`
        };
    } else {
        return {
            content: `🗳️ Vote registered! (${result.votes}/${result.required} votes needed to skip)`
        };
    }
};
