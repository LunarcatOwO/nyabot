const { EmbedBuilder } = require('discord.js');

exports.name = 'music';
exports.description = 'Music player commands';
exports.category = 'Music';

exports.execute = async (ctx) => {
    const embed = new EmbedBuilder()
        .setColor('#FF6B9D')
        .setTitle('🎵 Music Commands')
        .setDescription('Use the music player to play **songs and music tracks** from SoundCloud and Spotify!')
        .addFields(
            { name: 'Playback', value: '`/music play <song>` - Play or search for music tracks\n`/music pause` - Pause playback\n`/music resume` - Resume playback\n`/music stop` - Stop and clear queue\n`/music skip` - Skip current song', inline: false },
            { name: 'Queue', value: '`/music queue` - Show the music queue\n`/music shuffle` - Toggle shuffle mode\n`/music loop` - Toggle loop mode', inline: false },
            { name: 'Controls', value: '`/music controls` - Interactive player controls\n`/music nowplaying` - Show current song\n`/music volume <0-100>` - Set volume\n`/music leave` - Leave voice channel', inline: false }
        )
        .setFooter({ text: 'YouTube URLs will find alternatives on SoundCloud/Spotify automatically!' });

    return { embeds: [embed] };
};
