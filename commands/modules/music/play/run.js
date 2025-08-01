const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } = require('discord.js');
const musicManager = require('../../../../helpers/music');

exports.description = 'Play a song from YouTube, SoundCloud, or Spotify';
exports.options = [
    {
        name: 'query',
        type: 3, // STRING type
        description: 'Song name, URL, or search term',
        required: true
    }
];

exports.execute = async (ctx) => {
    // Check if user is in a voice channel
    if (!ctx.member.voice.channel) {
        return {
            content: '❌ You need to be in a voice channel to use music commands!',
            ephemeral: true
        };
    }

    // Reset inactivity timer on play command
    musicManager.onActivity(ctx.guild.id);

    // Store the text channel for potential auto-disconnect notifications
    const voiceManager = require('../../../../helpers/music/voice');
    voiceManager.setLastChannel(ctx.guild.id, ctx.channel);

    // Check if bot has permissions
    const botPermissions = ctx.member.voice.channel.permissionsFor(ctx.guild.members.me);
    if (!botPermissions.has(['Connect', 'Speak'])) {
        return {
            content: '❌ I need permission to connect and speak in your voice channel!',
            ephemeral: true
        };
    }

    let query;
    if (ctx.isSlashCommand) {
        query = ctx.options.getString('query');
    } else {
        query = ctx.args.join(' ');
        if (!query) {
            return { content: '❌ Please provide a song name or URL to play!' };
        }
    }

    try {
        // Join voice channel if not already connected
        const connection = musicManager.connections.get(ctx.guild.id);
        if (!connection) {
            await musicManager.joinChannel(ctx.member.voice.channel, ctx.channel);
        }

        // Search for songs
        let searchResults = [];
        
        // Check if it's a YouTube URL and find alternatives
        if (query.includes('youtube.com') || query.includes('youtu.be')) {
            try {
                const alternative = await musicManager.handleYouTubeUrl(query.trim());
                if (alternative) {
                    // Add the best alternative directly to queue
                    const position = await musicManager.addToQueue(ctx.guild.id, alternative);
                    
                    if (position === 1 && !musicManager.isPlaying(ctx.guild.id)) {
                        await musicManager.play(ctx.guild.id);
                        return { content: `🎵 **YouTube alternative found!** Now playing: **${alternative.title}** from ${alternative.platform} (${Math.round(alternative.similarity * 100)}% match)` };
                    } else {
                        return { content: `➕ **YouTube alternative found!** Added to queue (position ${position}): **${alternative.title}** from ${alternative.platform} (${Math.round(alternative.similarity * 100)}% match)` };
                    }
                } else {
                    return { content: '❌ YouTube links are not supported. Could not find this song on SoundCloud or Spotify. Please search directly or use a SoundCloud/Spotify link.' };
                }
            } catch (error) {
                return { content: '❌ YouTube links are not supported. Could not find this song on SoundCloud or Spotify. Please search directly or use a SoundCloud/Spotify link.' };
            }
        } else if (query.includes('soundcloud.com')) {
            // Direct SoundCloud URL - add to queue directly
            const song = {
                title: 'SoundCloud Track', // We'll get the real title when we fetch stream info
                url: query.trim(),
                duration: 'Unknown',
                thumbnail: null,
                source: 'soundcloud',
                id: Date.now().toString()
            };
            
            const position = await musicManager.addToQueue(ctx.guild.id, song);
            
            if (position === 1 && !musicManager.isPlaying(ctx.guild.id)) {
                await musicManager.play(ctx.guild.id);
                return { content: `🎵 Now playing: **${song.title}**` };
            } else {
                return { content: `➕ Added to queue (position ${position}): **${song.title}**` };
            }
        } else if (musicManager.isSpotifyUrl(query)) {
            // Direct Spotify URL
            const spotifyTrack = await musicManager.getSpotifyTrack(query.trim());
            if (spotifyTrack) {
                const position = await musicManager.addToQueue(ctx.guild.id, spotifyTrack);
                
                if (position === 1 && !musicManager.isPlaying(ctx.guild.id)) {
                    await musicManager.play(ctx.guild.id);
                    return { content: `🎵 Now playing: **${spotifyTrack.title}** (${spotifyTrack.duration}) from Spotify` };
                } else {
                    return { content: `➕ Added to queue (position ${position}): **${spotifyTrack.title}** (${spotifyTrack.duration}) from Spotify` };
                }
            } else {
                return { content: '❌ Could not fetch Spotify track information!' };
            }
        } else {
            // Search Spotify first (SpotDL works better with Spotify), then SoundCloud
            searchResults = await musicManager.searchSpotify(query);
            
            // If no Spotify results, try SoundCloud
            if (searchResults.length === 0) {
                searchResults = await musicManager.searchSoundCloud(query);
            }
        }

        if (searchResults.length === 0) {
            return { 
                content: '❌ **Search functionality is currently limited.**\n\n' +
                        '**To play music, please use direct links:**\n' +
                        '• Spotify track links (e.g., `https://open.spotify.com/track/...`)\n' +
                        '• SoundCloud track links (e.g., `https://soundcloud.com/...`)\n\n' +
                        '**Example:** `/play https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh`\n\n' +
                        '*Search by song name will be available soon with proper API integration.*'
            };
        }

        // If only one result or direct URL, add it immediately
        if (searchResults.length === 1) {
            const song = searchResults[0];
            const position = await musicManager.addToQueue(ctx.guild.id, song);
            
            if (position === 1 && !musicManager.isPlaying(ctx.guild.id)) {
                await musicManager.play(ctx.guild.id);
                return { content: `🎵 Now playing: **${song.title}** (${song.duration})` };
            } else {
                return { content: `➕ Added to queue (position ${position}): **${song.title}** (${song.duration})` };
            }
        }

        // Show selection menu for multiple results (only for slash commands)
        if (ctx.isSlashCommand) {
            return await showSearchResults(ctx, searchResults);
        } else {
            // For message commands, just add the first result
            const song = searchResults[0];
            const position = await musicManager.addToQueue(ctx.guild.id, song);
            
            if (position === 1 && !musicManager.isPlaying(ctx.guild.id)) {
                await musicManager.play(ctx.guild.id);
                return { content: `🎵 Now playing: **${song.title}** (${song.duration})` };
            } else {
                return { content: `➕ Added to queue (position ${position}): **${song.title}** (${song.duration})` };
            }
        }

    } catch (error) {
        console.error('Play command error:', error);
        return { content: '❌ An error occurred while trying to play the song.' };
    }
};

async function showSearchResults(ctx, results) {
    if (results.length === 0) {
        return { 
            content: '❌ **Search functionality is currently limited.**\n\n' +
                    '**To play music, please use direct links:**\n' +
                    '• Spotify track links (e.g., `https://open.spotify.com/track/...`)\n' +
                    '• SoundCloud track links (e.g., `https://soundcloud.com/...`)\n\n' +
                    '**Example:** `/play https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh`\n\n' +
                    '*Search by song name will be available soon with proper API integration.*'
        };
    }

    const embed = new EmbedBuilder()
        .setColor('#FF6B9D')
        .setTitle('🔍 Search Results')
        .setDescription('Select a song to play:')
        .setFooter({ text: 'Selection expires in 30 seconds' });

    const buttons = [];
    
    results.slice(0, 5).forEach((song, index) => {
        embed.addFields({
            name: `${index + 1}. ${song.title}`,
            value: `Duration: ${song.duration} | Source: ${song.source.toUpperCase()}`,
            inline: false
        });

        buttons.push(
            new ButtonBuilder()
                .setCustomId(`music_select_${index}`)
                .setLabel(`${index + 1}`)
                .setStyle(ButtonStyle.Primary)
        );
    });

    buttons.push(
        new ButtonBuilder()
            .setCustomId('music_select_cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
    );

    const row = new ActionRowBuilder().addComponents(buttons);

    return {
        embeds: [embed],
        components: [row]
    };
}
