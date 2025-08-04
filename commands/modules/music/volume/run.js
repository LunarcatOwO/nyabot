const { MusicManager } = require('../../../../helpers/music');

exports.description = 'Set the volume (0-100)';
exports.options = [
    {
        name: 'level',
        type: 4, // INTEGER type
        description: 'Volume level (0-100)',
        required: true,
        min_value: 0,
        max_value: 100
    }
];

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

    let level;
    if (ctx.isSlashCommand) {
        level = ctx.options.getInteger('level');
    } else {
        if (ctx.args.length === 0) {
            return { content: '❌ Please provide a volume level (0-100)!' };
        }
        level = parseInt(ctx.args[0]);
        if (isNaN(level) || level < 0 || level > 100) {
            return { content: '❌ Volume must be a number between 0 and 100!' };
        }
    }

    try {
        const volume = MusicManager.setVolume(ctx.guild.id, level / 100);
        return { content: `🔊 Volume set to ${Math.round(volume * 100)}%` };
    } catch (error) {
        console.error('Volume command error:', error);
        return {
            content: '❌ An error occurred while setting volume.',
            ephemeral: true
        };
    }
};
