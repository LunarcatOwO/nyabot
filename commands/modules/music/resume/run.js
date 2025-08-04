const { EmbedBuilder } = require('discord.js');
const { MusicManager } = require('../../../../helpers/music');

exports.description = 'Resume the paused music';

exports.execute = async (ctx) => {
    // Check if user is in voice channel
    if (!ctx.member.voice.channel) {
        return {
            content: '❌ You need to be in a voice channel to use music controls!',
            ephemeral: true
        };
    }

    // Check if bot is connected
    if (!MusicManager.isConnected(ctx.guild.id)) {
        return {
            content: '❌ I\'m not connected to any voice channel!',
            ephemeral: true
        };
    }

    // Check if music is paused
    if (!MusicManager.isPaused(ctx.guild.id)) {
        if (MusicManager.isPlaying(ctx.guild.id)) {
            return {
                content: '❌ Music is already playing!',
                ephemeral: true
            };
        } else {
            return {
                content: '❌ Nothing is currently paused!',
                ephemeral: true
            };
        }
    }

    // Resume the music
    if (MusicManager.resume(ctx.guild.id)) {
        const currentTrack = MusicManager.getNowPlaying(ctx.guild.id);
        
        const embed = new EmbedBuilder()
            .setColor(0x1DB954)
            .setTitle('▶️ Music Resumed')
            .setDescription(currentTrack ? 
                `**${currentTrack.title}** by ${currentTrack.artist}` : 
                'Music has been resumed')
            .setTimestamp();

        if (currentTrack?.thumbnail) {
            embed.setThumbnail(currentTrack.thumbnail);
        }

        return {
            embeds: [embed]
        };
    } else {
        return {
            content: '❌ Failed to resume music!',
            ephemeral: true
        };
    }
};
