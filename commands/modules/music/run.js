const { EmbedBuilder } = require('discord.js');

exports.name = 'music';
exports.description = 'Advanced music player with YouTube support';
exports.category = 'Music';

exports.execute = async (ctx) => {
    const embed = new EmbedBuilder()
        .setColor('#FF6B9D')
        .setTitle('🎵 Music Player Commands')
        .setDescription('**Professional music bot with YouTube, SoundCloud & Spotify support!**')
        .addFields(
            { 
                name: '🎯 Playback Controls', 
                value: '`/play <song>` - Play or search for music\n`/pause` - Pause current track\n`/resume` - Resume playback\n`/skip` - Skip to next track\n`/stop` - Stop and clear queue\n`/leave` - Leave voice channel', 
                inline: false 
            },
            { 
                name: '📋 Queue Management', 
                value: '`/queue` - Show current queue\n`/nowplaying` - Show current track\n`/remove <position>` - Remove track from queue\n`/clear` - Clear entire queue\n`/shuffle` - Shuffle the queue', 
                inline: false 
            },
            { 
                name: '🔧 Settings', 
                value: '`/volume <1-200>` - Set volume level\n`/loop <off/track/queue>` - Set loop mode\n`/seek <time>` - Seek to specific time\n`/lyrics` - Get lyrics for current song', 
                inline: false 
            },
            { 
                name: '🌟 Features', 
                value: '✅ YouTube, SoundCloud & Spotify\n✅ High quality audio\n✅ Queue management\n✅ Loop & shuffle modes\n✅ Volume control (up to 200%)\n✅ Auto-disconnect after 5min inactivity', 
                inline: false 
            }
        )
        .setFooter({ text: 'Use /help music for detailed command information' })
        .setTimestamp();

    return { embeds: [embed] };
};
