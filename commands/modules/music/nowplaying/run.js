const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { MusicManager } = require('../../../../helpers/music');

exports.name = 'nowplaying';
exports.description = 'Show what song is currently playing';

exports.execute = async (ctx) => {
    const currentTrack = MusicManager.getNowPlaying(ctx.guild.id);
    
    if (!currentTrack) {
        const embed = new EmbedBuilder()
            .setColor(0x95A5A6)
            .setTitle('🔇 No Music Playing')
            .setDescription('Nothing is currently playing. Use `/play` to start listening!')
            .addFields({
                name: '💡 Tip',
                value: 'You can search for songs by name or paste SoundCloud/Spotify URLs',
                inline: false
            });

        return {
            embeds: [embed],
            ephemeral: true
        };
    }

    const queueInfo = MusicManager.getQueueInfo(ctx.guild.id);
    const isPlaying = MusicManager.isPlaying(ctx.guild.id);
    const isPaused = MusicManager.isPaused(ctx.guild.id);

    const embed = new EmbedBuilder()
        .setColor(isPlaying ? 0x1DB954 : isPaused ? 0xF39C12 : 0x95A5A6)
        .setTitle('🎵 Now Playing')
        .setDescription(`**[${currentTrack.title}](${currentTrack.url})**\nby ${currentTrack.artist}`)
        .addFields(
            { name: '⏱️ Duration', value: currentTrack.duration || 'Unknown', inline: true },
            { name: '🎵 Source', value: currentTrack.source.charAt(0).toUpperCase() + currentTrack.source.slice(1), inline: true },
            { name: '▶️ Status', value: isPlaying ? '🎵 Playing' : isPaused ? '⏸️ Paused' : '⏹️ Stopped', inline: true },
            { name: '🔊 Volume', value: `${queueInfo.volume}%`, inline: true },
            { name: '📍 Position', value: `${queueInfo.currentIndex + 1} of ${queueInfo.totalTracks}`, inline: true },
            { name: '👤 Requested by', value: currentTrack.requestedBy ? `<@${currentTrack.requestedBy.id}>` : 'Unknown', inline: true }
        )
        .setTimestamp();

    if (currentTrack.thumbnail) {
        embed.setThumbnail(currentTrack.thumbnail);
    }

    // Add next song info if available
    const upcomingTracks = queueInfo.tracks.slice(queueInfo.currentIndex + 1, queueInfo.currentIndex + 4);
    if (upcomingTracks.length > 0) {
        const nextUp = upcomingTracks
            .map((track, index) => `${queueInfo.currentIndex + index + 2}. **${track.title}** by ${track.artist}`)
            .join('\n');
        
        embed.addFields({
            name: '⏭️ Up Next',
            value: nextUp,
            inline: false
        });
    } else {
        embed.addFields({
            name: '⏭️ Up Next',
            value: 'No more songs in queue',
            inline: false
        });
    }

    // Add loop and shuffle status
    const loopEmoji = queueInfo.loop === 'off' ? '❌' : (queueInfo.loop === 'track' ? '🔂' : '🔁');
    const shuffleEmoji = queueInfo.shuffle ? '🔀' : '❌';
    
    embed.addFields(
        { name: '🔁 Loop', value: `${loopEmoji} ${queueInfo.loop}`, inline: true },
        { name: '🔀 Shuffle', value: `${shuffleEmoji} ${queueInfo.shuffle ? 'ON' : 'OFF'}`, inline: true }
    );

    // Create control buttons
    const controlRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('music_pause_resume')
                .setLabel(isPlaying ? '⏸️ Pause' : '▶️ Resume')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('music_skip')
                .setLabel('⏭️ Skip')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('music_stop')
                .setLabel('⏹️ Stop')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('music_queue')
                .setLabel('📋 Queue')
                .setStyle(ButtonStyle.Primary)
        );

    return { 
        embeds: [embed],
        components: [controlRow]
    };
};
