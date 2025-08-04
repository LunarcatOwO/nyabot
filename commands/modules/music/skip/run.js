const { EmbedBuilder } = require('discord.js');
const { MusicManager } = require('../../../../helpers/music');

exports.description = 'Skip the current song';

exports.execute = async (ctx) => {
    // Check if user is in voice channel
    if (!ctx.member.voice.channel) {
        return {
            content: '❌ You need to be in a voice channel to skip music!',
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

    const currentTrack = MusicManager.getNowPlaying(ctx.guild.id);
    if (!currentTrack) {
        return {
            content: '❌ Nothing is currently playing!',
            ephemeral: true
        };
    }

    // Skip the current track
    if (MusicManager.skip(ctx.guild.id)) {
        const embed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle('⏭️ Song Skipped')
            .setDescription(`**${currentTrack.title}** by ${currentTrack.artist}`)
            .addFields({
                name: '👤 Skipped by',
                value: ctx.user.toString(),
                inline: true
            })
            .setTimestamp();

        if (currentTrack.thumbnail) {
            embed.setThumbnail(currentTrack.thumbnail);
        }

        // Check if there's a next song
        const nextTrack = MusicManager.getNowPlaying(ctx.guild.id);
        if (nextTrack) {
            embed.addFields({
                name: '⏭️ Now Playing',
                value: `**${nextTrack.title}** by ${nextTrack.artist}`,
                inline: false
            });
        } else {
            embed.addFields({
                name: '� Queue Status',
                value: 'Queue is now empty',
                inline: false
            });
        }

        return {
            embeds: [embed]
        };
    } else {
        return {
            content: '❌ Failed to skip track!',
            ephemeral: true
        };
    }
};
