const { EmbedBuilder } = require('discord.js');
const { MusicManager } = require('../../../../helpers/music');

exports.description = 'Pause the currently playing music';

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

    // Check if music is playing
    if (!MusicManager.isPlaying(ctx.guild.id)) {
        if (MusicManager.isPaused(ctx.guild.id)) {
            return {
                content: '❌ Music is already paused! Use `/resume` to continue.',
                ephemeral: true
            };
        } else {
            return {
                content: '❌ Nothing is currently playing!',
                ephemeral: true
            };
        }
    }

    // Pause the music
    if (MusicManager.pause(ctx.guild.id)) {
        const currentTrack = MusicManager.getNowPlaying(ctx.guild.id);
        
        const embed = new EmbedBuilder()
            .setColor(0xF39C12)
            .setTitle('⏸️ Music Paused')
            .setDescription(currentTrack ? 
                `**${currentTrack.title}** by ${currentTrack.artist}` : 
                'Music has been paused')
            .addFields({
                name: '💡 Tip',
                value: 'Use `/resume` or the ▶️ button to continue playback',
                inline: false
            })
            .setTimestamp();

        if (currentTrack?.thumbnail) {
            embed.setThumbnail(currentTrack.thumbnail);
        }

        return {
            embeds: [embed]
        };
    } else {
        return {
            content: '❌ Failed to pause music!',
            ephemeral: true
        };
    }
};
