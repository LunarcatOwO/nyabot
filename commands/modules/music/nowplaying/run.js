const { EmbedBuilder } = require('discord.js');
const musicManager = require('../../../../helpers/music');

exports.name = 'nowplaying';
exports.description = 'Show what song is currently playing';

exports.execute = async (ctx) => {
    const currentSong = musicManager.getCurrentSong(ctx.guild.id);
    
    if (!currentSong) {
        return {
            content: '❌ Nothing is currently playing!',
            ephemeral: true
        };
    }

    const queue = musicManager.getQueue(ctx.guild.id);
    const isPlaying = musicManager.isPlaying(ctx.guild.id);
    const isPaused = musicManager.isPaused(ctx.guild.id);

    const embed = new EmbedBuilder()
        .setColor('#FF6B9D')
        .setTitle('🎵 Now Playing')
        .setDescription(currentSong.title)
        .addFields(
            { name: 'Duration', value: currentSong.duration, inline: true },
            { name: 'Source', value: currentSong.source.toUpperCase(), inline: true },
            { name: 'Status', value: isPlaying ? '▶️ Playing' : isPaused ? '⏸️ Paused' : '⏹️ Stopped', inline: true },
            { name: 'Volume', value: `${Math.round(queue.volume * 100)}%`, inline: true },
            { name: 'Queue Position', value: `${queue.currentIndex + 1} of ${queue.songs.length}`, inline: true },
            { name: 'Next Up', value: queue.songs[queue.currentIndex + 1]?.title || 'No more songs', inline: true }
        );

    if (currentSong.thumbnail) {
        embed.setThumbnail(currentSong.thumbnail);
    }

    return { embeds: [embed] };
};
