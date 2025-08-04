const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { MusicManager } = require('../../../../helpers/music');

exports.description = 'Play music from SoundCloud or Spotify';
exports.options = [
    {
        name: 'query',
        type: 3, // STRING
        description: 'Song name, artist, or URL to play',
        required: true
    }
];

exports.execute = async (ctx) => {
    // Check if user is in voice channel
    if (!ctx.member.voice.channel) {
        return {
            content: '❌ You need to join a voice channel first!',
            ephemeral: true
        };
    }

    // Check bot permissions
    const permissions = ctx.member.voice.channel.permissionsFor(ctx.guild.members.me);
    if (!permissions.has(['Connect', 'Speak'])) {
        return {
            content: '❌ I need permission to connect and speak in your voice channel!',
            ephemeral: true
        };
    }

    const query = ctx.isSlashCommand ? ctx.options.getString('query') : ctx.args.join(' ');
    
    if (!query) {
        return {
            content: '❌ Please provide a song name or URL!',
            ephemeral: true
        };
    }

    // Defer reply for search operations
    if (ctx.isSlashCommand) {
        await ctx.deferReply();
    }

    try {
        // Join voice channel if not connected
        if (!MusicManager.isConnected(ctx.guild.id)) {
            await MusicManager.joinChannel(ctx, ctx.member.voice.channel);
        }

        // Search for tracks
        const tracks = await MusicManager.search(query, 5);
        
        if (tracks.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ No Results Found')
                .setDescription('No tracks found for your search. Try different keywords or check the URL.')
                .addFields({
                    name: '💡 Tip',
                    value: 'Make sure you\'re using SoundCloud or Spotify URLs, or try more specific search terms.',
                    inline: false
                });
                
            return ctx.isSlashCommand 
                ? { embeds: [embed] }
                : { embeds: [embed] };
        }

        // If only one track found, add it directly
        if (tracks.length === 1) {
            return await addTrackToQueue(ctx, tracks[0]);
        }

        // Multiple tracks - show selection menu
        return await showTrackSelection(ctx, tracks);

    } catch (error) {
        console.error('Play command error:', error);
        
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ Error')
            .setDescription('An error occurred while processing your request. Please try again.')
            .addFields({
                name: 'Error Details',
                value: error.message || 'Unknown error',
                inline: false
            });
            
        return ctx.isSlashCommand 
            ? { embeds: [embed] }
            : { embeds: [embed] };
    }
};

async function addTrackToQueue(ctx, track) {
    try {
        // Add track to queue
        const addedTrack = MusicManager.addToQueue(ctx.guild.id, track, ctx.user);
        const queueInfo = MusicManager.getQueueInfo(ctx.guild.id);
        
        // Start playing if this is the first track
        if (queueInfo.totalTracks === 1) {
            const success = await MusicManager.playCurrent(ctx.guild.id);
            if (!success) {
                throw new Error('Failed to start playback');
            }
        }

        // Create response embed
        const isNowPlaying = queueInfo.totalTracks === 1;
        const embed = new EmbedBuilder()
            .setColor(isNowPlaying ? 0x1DB954 : 0x9B59B6)
            .setTitle(isNowPlaying ? '🎵 Now Playing' : '➕ Added to Queue')
            .setDescription(`**[${track.title}](${track.url})**\nby ${track.artist}`)
            .addFields(
                { name: '⏱️ Duration', value: track.duration || 'Unknown', inline: true },
                { name: '🎵 Source', value: track.source.charAt(0).toUpperCase() + track.source.slice(1), inline: true },
                { name: '� Requested by', value: ctx.user.toString(), inline: true }
            )
            .setTimestamp();

        if (!isNowPlaying) {
            embed.addFields({
                name: '📍 Queue Position',
                value: `${queueInfo.totalTracks}`,
                inline: true
            });
        }

        if (track.thumbnail) {
            embed.setThumbnail(track.thumbnail);
        }

        // Add control buttons
        const controls = createMusicControls();

        return {
            embeds: [embed],
            components: [controls]
        };

    } catch (error) {
        console.error('Error adding track to queue:', error);
        throw error;
    }
}

async function showTrackSelection(ctx, tracks) {
    const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('🔍 Search Results')
        .setDescription('Choose a track to play:')
        .setFooter({ text: 'Selection expires in 30 seconds' });

    // Add track fields
    tracks.forEach((track, index) => {
        const sourceIcon = track.source === 'spotify' ? '🎵' : '🎵';
        embed.addFields({
            name: `${index + 1}. ${track.title}`,
            value: `${sourceIcon} ${track.artist} • ⏱️ ${track.duration || 'Unknown'} • 🎼 ${track.source}`,
            inline: false
        });
    });

    // Create selection buttons (max 5 buttons per row)
    const buttons = tracks.map((_, index) => 
        new ButtonBuilder()
            .setCustomId(`music_select_${index}_${ctx.user.id}`)
            .setLabel(`${index + 1}`)
            .setStyle(ButtonStyle.Primary)
    );

    buttons.push(
        new ButtonBuilder()
            .setCustomId(`music_cancel_${ctx.user.id}`)
            .setLabel('❌ Cancel')
            .setStyle(ButtonStyle.Secondary)
    );

    const row = new ActionRowBuilder().addComponents(buttons);

    // Store tracks data for button interaction
    if (!global.musicSelections) {
        global.musicSelections = new Map();
    }
    global.musicSelections.set(ctx.user.id, tracks);

    // Auto-cleanup after 30 seconds
    setTimeout(() => {
        global.musicSelections?.delete(ctx.user.id);
    }, 30000);

    return {
        embeds: [embed],
        components: [row]
    };
}

function createMusicControls() {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('music_pause_resume')
                .setLabel('⏸️ Pause')
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
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('music_loop')
                .setLabel('🔁 Loop')
                .setStyle(ButtonStyle.Secondary)
        );
}
