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
            await musicManager.joinChannel(ctx.member.voice.channel);
        }

        // Search for songs
        let searchResults = [];
        
        // Check if it's a direct URL
        if (query.includes('youtube.com') || query.includes('youtu.be')) {
            // Direct YouTube URL
            const youtubeSearcher = require('../../../../helpers/music/youtube');
            const video = await youtubeSearcher.getVideo(query);
            if (video) {
                searchResults = [video];
            }
        } else if (query.includes('soundcloud.com')) {
            // Direct SoundCloud URL - add to queue directly
            const song = {
                title: 'SoundCloud Track', // We'll get the real title when we fetch stream info
                url: query,
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
            const spotifyTrack = await musicManager.getSpotifyTrack(query);
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
            // Search all platforms
            searchResults = await musicManager.searchYouTube(query);
            
            // If no YouTube results, try SoundCloud
            if (searchResults.length === 0) {
                searchResults = await musicManager.searchSoundCloud(query);
            }
            
            // If still no results, try Spotify
            if (searchResults.length === 0) {
                searchResults = await musicManager.searchSpotify(query);
            }
        }

        if (searchResults.length === 0) {
            return { content: '❌ No songs found for your search!' };
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
