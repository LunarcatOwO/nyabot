const { 
    joinVoiceChannel, 
    createAudioPlayer, 
    createAudioResource, 
    AudioPlayerStatus,
    VoiceConnectionStatus,
    AudioResource
} = require('@discordjs/voice');
const { EmbedBuilder } = require('discord.js');
const play = require('play-dl');

class MusicManager {
    constructor() {
        this.connections = new Map(); // guildId -> connection
        this.players = new Map(); // guildId -> player
        this.queues = new Map(); // guildId -> queue data
        this.nowPlaying = new Map(); // guildId -> current track
        this.loopModes = new Map(); // guildId -> loop mode (off, track, queue)
        this.shuffleModes = new Map(); // guildId -> boolean
        this.volumes = new Map(); // guildId -> volume (0-100)
        
        // Initialize play-dl
        this.initializePlayDl();
    }

    async initializePlayDl() {
        try {
            // Set up SoundCloud and Spotify tokens if available
            const tokens = {};
            
            if (process.env.SOUNDCLOUD_CLIENT_ID) {
                tokens.soundcloud = {
                    client_id: process.env.SOUNDCLOUD_CLIENT_ID
                };
            }
            
            if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
                tokens.spotify = {
                    client_id: process.env.SPOTIFY_CLIENT_ID,
                    client_secret: process.env.SPOTIFY_CLIENT_SECRET,
                    refresh_token: process.env.SPOTIFY_REFRESH_TOKEN,
                    market: 'US'
                };
            }
            
            if (Object.keys(tokens).length > 0) {
                await play.setToken(tokens);
                console.log('🎵 Music services initialized successfully');
            } else {
                console.log('⚠️ No music service tokens configured, some features may be limited');
            }
        } catch (error) {
            console.error('🚫 Failed to initialize music services:', error.message);
        }
    }

    // Initialize guild data
    initGuild(guildId) {
        if (!this.queues.has(guildId)) {
            this.queues.set(guildId, {
                tracks: [],
                currentIndex: 0
            });
        }
        if (!this.loopModes.has(guildId)) {
            this.loopModes.set(guildId, 'off'); // off, track, queue
        }
        if (!this.shuffleModes.has(guildId)) {
            this.shuffleModes.set(guildId, false);
        }
        if (!this.volumes.has(guildId)) {
            this.volumes.set(guildId, 50);
        }
    }

    async joinChannel(interaction, channel) {
        const guildId = interaction.guild.id;
        this.initGuild(guildId);

        try {
            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: guildId,
                adapterCreator: interaction.guild.voiceAdapterCreator,
            });

            const player = createAudioPlayer();
            this.connections.set(guildId, connection);
            this.players.set(guildId, player);

            connection.subscribe(player);

            // Setup event handlers
            this.setupConnectionEvents(guildId, connection);
            this.setupPlayerEvents(guildId, player);

            return { connection, player };
        } catch (error) {
            console.error('Failed to join voice channel:', error);
            throw error;
        }
    }

    // Search for music
    async search(query, limit = 10) {
        const results = [];

        try {
            // Check if it's a URL first
            if (this.isUrl(query)) {
                return await this.handleUrl(query);
            }

            // Search both platforms
            const [spotifyResults, soundcloudResults] = await Promise.allSettled([
                this.searchSpotify(query, Math.ceil(limit / 2)),
                this.searchSoundCloud(query, Math.ceil(limit / 2))
            ]);

            // Add Spotify results
            if (spotifyResults.status === 'fulfilled') {
                results.push(...spotifyResults.value);
            }

            // Add SoundCloud results
            if (soundcloudResults.status === 'fulfilled') {
                results.push(...soundcloudResults.value);
            }

            return results.slice(0, limit);
        } catch (error) {
            console.error('Search error:', error);
            return [];
        }
    }

    async handleUrl(url) {
        try {
            if (play.sp_validate(url) === 'track') {
                // Spotify track
                const info = await play.spotify(url);
                return [{
                    title: info.name,
                    artist: info.artists.map(a => a.name).join(', '),
                    url: url,
                    duration: this.formatDuration(info.durationInMs),
                    thumbnail: info.thumbnail?.url,
                    source: 'spotify',
                    playable: true
                }];
            } else if (play.so_validate(url) === 'track') {
                // SoundCloud track
                const info = await play.soundcloud(url);
                return [{
                    title: info.name,
                    artist: info.publisher?.name || 'Unknown Artist',
                    url: url,
                    duration: this.formatDuration(info.durationInSec * 1000),
                    thumbnail: info.thumbnail,
                    source: 'soundcloud',
                    playable: true
                }];
            }
        } catch (error) {
            console.error('URL handling error:', error);
        }
        return [];
    }

    async searchSpotify(query, limit = 5) {
        try {
            const results = await play.search(query, {
                source: { spotify: 'track' },
                limit: limit
            });

            return results.map(track => ({
                title: track.title,
                artist: track.artists?.join(', ') || 'Unknown Artist',
                url: track.url,
                duration: this.formatDuration(track.durationInMs),
                thumbnail: track.thumbnail?.url,
                source: 'spotify',
                playable: true
            }));
        } catch (error) {
            console.error('Spotify search error:', error);
            return [];
        }
    }

    async searchSoundCloud(query, limit = 5) {
        try {
            const results = await play.search(query, {
                source: { soundcloud: 'tracks' },
                limit: limit
            });

            return results.map(track => ({
                title: track.title,
                artist: track.publisher?.name || 'Unknown Artist',
                url: track.url,
                duration: this.formatDuration(track.durationInSec * 1000),
                thumbnail: track.thumbnail,
                source: 'soundcloud',
                playable: true
            }));
        } catch (error) {
            console.error('SoundCloud search error:', error);
            return [];
        }
    }

    // Get audio stream for playback
    async getStream(track) {
        try {
            if (track.source === 'spotify') {
                // For Spotify tracks, search for alternatives on SoundCloud
                const searchQuery = `${track.artist} ${track.title}`;
                const soundcloudResults = await this.searchSoundCloud(searchQuery, 1);
                
                if (soundcloudResults.length > 0) {
                    return await play.stream(soundcloudResults[0].url);
                }
                throw new Error('No SoundCloud alternative found for Spotify track');
            } else if (track.source === 'soundcloud') {
                return await play.stream(track.url);
            }
            throw new Error('Unsupported track source');
        } catch (error) {
            console.error('Stream error:', error);
            return null;
        }
    }

    // Play a track
    async play(guildId, track) {
        const player = this.players.get(guildId);
        if (!player) return false;

        try {
            const stream = await this.getStream(track);
            if (!stream) {
                console.error(`Failed to get stream for: ${track.title}`);
                return false;
            }

            const resource = createAudioResource(stream, {
                inputType: stream.type,
                metadata: track
            });

            player.play(resource);
            this.nowPlaying.set(guildId, track);
            
            console.log(`🎵 Now playing: ${track.title} by ${track.artist}`);
            return true;
        } catch (error) {
            console.error('Play error:', error);
            return false;
        }
    }

    // Add track to queue
    addToQueue(guildId, track, requestedBy) {
        this.initGuild(guildId);
        const queue = this.queues.get(guildId);
        
        const trackWithMetadata = {
            ...track,
            requestedBy,
            addedAt: Date.now()
        };
        
        queue.tracks.push(trackWithMetadata);
        return trackWithMetadata;
    }

    // Play next track in queue
    async playNext(guildId) {
        const queue = this.queues.get(guildId);
        if (!queue || queue.tracks.length === 0) {
            this.nowPlaying.delete(guildId);
            return false;
        }

        const loopMode = this.loopModes.get(guildId);
        
        if (loopMode === 'track') {
            // Repeat current track
            const currentTrack = queue.tracks[queue.currentIndex];
            if (currentTrack) {
                return await this.play(guildId, currentTrack);
            }
        } else if (loopMode === 'queue') {
            // Move to next track, loop back to start if at end
            queue.currentIndex = (queue.currentIndex + 1) % queue.tracks.length;
        } else {
            // Normal mode - move to next track
            queue.currentIndex++;
        }

        if (queue.currentIndex < queue.tracks.length) {
            const nextTrack = queue.tracks[queue.currentIndex];
            return await this.play(guildId, nextTrack);
        } else {
            // End of queue
            this.nowPlaying.delete(guildId);
            return false;
        }
    }

    // Play current track (used when starting playback)
    async playCurrent(guildId) {
        const queue = this.queues.get(guildId);
        if (!queue || queue.tracks.length === 0) {
            return false;
        }

        const currentTrack = queue.tracks[queue.currentIndex];
        if (currentTrack) {
            return await this.play(guildId, currentTrack);
        }
        return false;
    }

    // Playback controls
    pause(guildId) {
        const player = this.players.get(guildId);
        if (player && player.state.status === AudioPlayerStatus.Playing) {
            player.pause();
            return true;
        }
        return false;
    }

    resume(guildId) {
        const player = this.players.get(guildId);
        if (player && player.state.status === AudioPlayerStatus.Paused) {
            player.unpause();
            return true;
        }
        return false;
    }

    stop(guildId) {
        const player = this.players.get(guildId);
        if (player) {
            player.stop();
        }
        
        // Clear queue and now playing
        const queue = this.queues.get(guildId);
        if (queue) {
            queue.tracks = [];
            queue.currentIndex = 0;
        }
        this.nowPlaying.delete(guildId);
        return true;
    }

    skip(guildId) {
        const player = this.players.get(guildId);
        if (player) {
            player.stop(); // This will trigger playNext via the event handler
            return true;
        }
        return false;
    }

    // Skip to specific track
    skipTo(guildId, index) {
        const queue = this.queues.get(guildId);
        if (!queue || index < 0 || index >= queue.tracks.length) {
            return false;
        }

        queue.currentIndex = index;
        return this.playCurrent(guildId);
    }

    // Move track in queue
    moveTrack(guildId, from, to) {
        const queue = this.queues.get(guildId);
        if (!queue || from < 0 || from >= queue.tracks.length || to < 0 || to >= queue.tracks.length) {
            return false;
        }

        const track = queue.tracks.splice(from, 1)[0];
        queue.tracks.splice(to, 0, track);

        // Adjust current index if needed
        if (from === queue.currentIndex) {
            queue.currentIndex = to;
        } else if (from < queue.currentIndex && to >= queue.currentIndex) {
            queue.currentIndex--;
        } else if (from > queue.currentIndex && to <= queue.currentIndex) {
            queue.currentIndex++;
        }

        return true;
    }

    // Remove track from queue
    removeTrack(guildId, index) {
        const queue = this.queues.get(guildId);
        if (!queue || index < 0 || index >= queue.tracks.length) {
            return false;
        }

        queue.tracks.splice(index, 1);

        // Adjust current index if needed
        if (index < queue.currentIndex) {
            queue.currentIndex--;
        } else if (index === queue.currentIndex && queue.tracks.length > 0) {
            // If we removed the current track, adjust index
            if (queue.currentIndex >= queue.tracks.length) {
                queue.currentIndex = 0;
            }
        }

        return true;
    }

    // Loop controls
    setLoop(guildId, mode) {
        // mode: 'off', 'track', 'queue'
        if (!['off', 'track', 'queue'].includes(mode)) {
            return false;
        }
        this.loopModes.set(guildId, mode);
        return mode;
    }

    getLoop(guildId) {
        return this.loopModes.get(guildId) || 'off';
    }

    toggleLoop(guildId) {
        const currentMode = this.getLoop(guildId);
        const modes = ['off', 'track', 'queue'];
        const nextIndex = (modes.indexOf(currentMode) + 1) % modes.length;
        return this.setLoop(guildId, modes[nextIndex]);
    }

    // Shuffle controls
    setShuffle(guildId, enabled) {
        this.shuffleModes.set(guildId, enabled);
        
        if (enabled) {
            const queue = this.queues.get(guildId);
            if (queue && queue.tracks.length > 1) {
                // Shuffle remaining tracks (not including current)
                const currentTrack = queue.tracks[queue.currentIndex];
                const remainingTracks = queue.tracks.slice(queue.currentIndex + 1);
                
                // Shuffle the remaining tracks
                for (let i = remainingTracks.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [remainingTracks[i], remainingTracks[j]] = [remainingTracks[j], remainingTracks[i]];
                }
                
                // Reconstruct queue
                queue.tracks = [
                    ...queue.tracks.slice(0, queue.currentIndex + 1),
                    ...remainingTracks
                ];
            }
        }
        
        return enabled;
    }

    getShuffle(guildId) {
        return this.shuffleModes.get(guildId) || false;
    }

    toggleShuffle(guildId) {
        const current = this.getShuffle(guildId);
        return this.setShuffle(guildId, !current);
    }

    // Volume controls (note: actual audio volume control requires additional setup)
    setVolume(guildId, volume) {
        const normalizedVolume = Math.max(0, Math.min(100, volume));
        this.volumes.set(guildId, normalizedVolume);
        return normalizedVolume;
    }

    getVolume(guildId) {
        return this.volumes.get(guildId) || 50;
    }

    // Getter methods
    getQueue(guildId) {
        const queue = this.queues.get(guildId);
        return queue ? queue.tracks : [];
    }

    getQueueInfo(guildId, page = 1, pageSize = 10) {
        const queue = this.queues.get(guildId);
        if (!queue) {
            return {
                tracks: [],
                currentIndex: 0,
                totalTracks: 0,
                page: 1,
                totalPages: 0,
                loop: 'off',
                shuffle: false,
                volume: 50
            };
        }

        const start = (page - 1) * pageSize;
        const end = start + pageSize;

        return {
            tracks: queue.tracks.slice(start, end),
            currentIndex: queue.currentIndex,
            totalTracks: queue.tracks.length,
            page,
            totalPages: Math.ceil(queue.tracks.length / pageSize),
            loop: this.getLoop(guildId),
            shuffle: this.getShuffle(guildId),
            volume: this.getVolume(guildId)
        };
    }

    getCurrentTrack(guildId) {
        const queue = this.queues.get(guildId);
        if (queue && queue.tracks.length > 0) {
            return queue.tracks[queue.currentIndex];
        }
        return null;
    }

    getNowPlaying(guildId) {
        return this.nowPlaying.get(guildId);
    }

    // Event handlers setup
    setupConnectionEvents(guildId, connection) {
        connection.on(VoiceConnectionStatus.Disconnected, () => {
            console.log(`🔌 Disconnected from guild ${guildId}`);
            setTimeout(() => {
                if (connection.state.status === VoiceConnectionStatus.Disconnected) {
                    this.cleanup(guildId);
                }
            }, 5000);
        });

        connection.on(VoiceConnectionStatus.Destroyed, () => {
            console.log(`💥 Connection destroyed for guild ${guildId}`);
            this.cleanup(guildId);
        });
    }

    setupPlayerEvents(guildId, player) {
        player.on(AudioPlayerStatus.Idle, () => {
            // Track ended, play next
            console.log(`⏭️ Track ended in guild ${guildId}, playing next...`);
            setTimeout(() => {
                this.playNext(guildId);
            }, 500);
        });

        player.on(AudioPlayerStatus.Playing, () => {
            console.log(`▶️ Audio started playing in guild ${guildId}`);
        });

        player.on('error', (error) => {
            console.error(`🚫 Audio player error in guild ${guildId}:`, error);
            this.playNext(guildId);
        });
    }

    leave(guildId) {
        const connection = this.connections.get(guildId);
        if (connection) {
            connection.destroy();
        }
        this.cleanup(guildId);
    }

    cleanup(guildId) {
        this.connections.delete(guildId);
        this.players.delete(guildId);
        this.queues.delete(guildId);
        this.nowPlaying.delete(guildId);
        this.loopModes.delete(guildId);
        this.shuffleModes.delete(guildId);
        this.volumes.delete(guildId);
    }

    isUrl(string) {
        try {
            new URL(string);
            return true;
        } catch {
            return false;
        }
    }

    formatDuration(ms) {
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor(ms / (1000 * 60 * 60));

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    isConnected(guildId) {
        return this.connections.has(guildId);
    }

    isPlaying(guildId) {
        const player = this.players.get(guildId);
        return player && player.state.status === AudioPlayerStatus.Playing;
    }

    isPaused(guildId) {
        const player = this.players.get(guildId);
        return player && player.state.status === AudioPlayerStatus.Paused;
    }

    // Create embeds for Discord responses
    createNowPlayingEmbed(track) {
        const embed = new EmbedBuilder()
            .setTitle('🎵 Now Playing')
            .setDescription(`**${track.title}**\nby ${track.artist}`)
            .addFields(
                { name: 'Duration', value: track.duration || 'Unknown', inline: true },
                { name: 'Source', value: track.source.charAt(0).toUpperCase() + track.source.slice(1), inline: true },
                { name: 'Requested by', value: `<@${track.requestedBy.id}>`, inline: true }
            )
            .setColor(0x1DB954)
            .setTimestamp();

        if (track.thumbnail) {
            embed.setThumbnail(track.thumbnail);
        }

        return embed;
    }

    createQueueEmbed(guildId, page = 1) {
        const queueInfo = this.getQueueInfo(guildId, page, 10);
        const embed = new EmbedBuilder()
            .setTitle('🎵 Music Queue')
            .setColor(0x1DB954)
            .setTimestamp();

        if (queueInfo.totalTracks === 0) {
            embed.setDescription('Queue is empty');
            return embed;
        }

        const nowPlaying = this.getNowPlaying(guildId);
        if (nowPlaying) {
            embed.addFields({
                name: '🎵 Now Playing',
                value: `**${nowPlaying.title}** by ${nowPlaying.artist}`,
                inline: false
            });
        }

        if (queueInfo.tracks.length > 0) {
            const trackList = queueInfo.tracks
                .map((track, index) => {
                    const actualIndex = (page - 1) * 10 + index;
                    const isPlaying = actualIndex === queueInfo.currentIndex ? '▶️ ' : '';
                    return `${isPlaying}${actualIndex + 1}. **${track.title}** by ${track.artist}`;
                })
                .join('\n');

            embed.addFields({
                name: '📋 Queue',
                value: trackList,
                inline: false
            });
        }

        embed.addFields(
            { name: 'Total Tracks', value: queueInfo.totalTracks.toString(), inline: true },
            { name: 'Loop', value: queueInfo.loop === 'off' ? '❌' : (queueInfo.loop === 'track' ? '🔂' : '🔁'), inline: true },
            { name: 'Shuffle', value: queueInfo.shuffle ? '🔀' : '❌', inline: true }
        );

        if (queueInfo.totalPages > 1) {
            embed.setFooter({ text: `Page ${page}/${queueInfo.totalPages}` });
        }

        return embed;
    }
}

module.exports = MusicManager;
