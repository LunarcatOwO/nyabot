const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const musicManager = require('../../../helpers/music');

exports.name = 'player';
exports.description = 'Show interactive music player controls';
exports.category = 'Music';

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
        .setTitle('🎵 Music Player')
        .addFields(
            { name: 'Now Playing', value: currentSong.title, inline: false },
            { name: 'Duration', value: currentSong.duration, inline: true },
            { name: 'Source', value: currentSong.source.toUpperCase(), inline: true },
            { name: 'Status', value: isPlaying ? '▶️ Playing' : isPaused ? '⏸️ Paused' : '⏹️ Stopped', inline: true },
            { name: 'Volume', value: `${Math.round(queue.volume * 100)}%`, inline: true },
            { name: 'Loop', value: queue.loop ? '🔄 On' : '❌ Off', inline: true },
            { name: 'Shuffle', value: queue.shuffle ? '🔀 On' : '❌ Off', inline: true },
            { name: 'Queue', value: `${queue.songs.length} songs`, inline: true }
        );

    if (currentSong.thumbnail) {
        embed.setThumbnail(currentSong.thumbnail);
    }

    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('music_previous')
                .setLabel('⏮️')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(isPaused ? 'music_resume' : 'music_pause')
                .setLabel(isPaused ? '▶️' : '⏸️')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('music_stop')
                .setLabel('⏹️')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('music_skip')
                .setLabel('⏭️')
                .setStyle(ButtonStyle.Secondary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('music_volume_down')
                .setLabel('🔉')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('music_loop')
                .setLabel('🔄')
                .setStyle(queue.loop ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('music_shuffle')
                .setLabel('🔀')
                .setStyle(queue.shuffle ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('music_volume_up')
                .setLabel('🔊')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('music_queue_show')
                .setLabel('📋')
                .setStyle(ButtonStyle.Secondary)
        );

    return {
        embeds: [embed],
        components: [row1, row2]
    };
};
