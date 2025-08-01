const soundcloudSearcher = require('./soundcloud');
const spotifySearcher = require('./spotify');
const youtubeFallback = require('./youtube-fallback');
const streamProvider = require('./stream');
const queueManager = require('./queue');
const voiceManager = require('./voice');

class MusicManager {
    constructor() {
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        // Set up event handlers for all guilds
        // This method will be called when the manager is initialized
    }

    async searchYouTube(query, limit = 5) {
        // YouTube support removed - return empty array
        console.log('YouTube search attempted but not supported. Use SoundCloud or Spotify instead.');
        return [];
    }

    async handleYouTubeUrl(url) {
        // Instead of playing YouTube directly, find alternatives
        try {
            console.log('YouTube URL detected, searching for alternatives...');
            const alternative = await youtubeFallback.findBestAlternative(url);
            return alternative;
        } catch (error) {
            console.error('Failed to find YouTube alternative:', error.message);
            return null;
        }
    }

    async searchSoundCloud(query, limit = 5) {
        return await soundcloudSearcher.search(query, limit);
    }

    async searchSpotify(query, limit = 5) {
        return await spotifySearcher.search(query, limit);
    }

    async getSpotifyTrack(url) {
        return await spotifySearcher.getTrackInfo(url);
    }

    isSpotifyUrl(url) {
        return spotifySearcher.isSpotifyUrl(url);
    }

    async searchAll(query) {
        const results = {
            soundcloud: [],
            spotify: []
        };

        try {
            // For search queries, prioritize Spotify since SpotDL works better with Spotify URLs
            const [spotifyResults, soundcloudResults] = await Promise.allSettled([
                this.searchSpotify(query),
                this.searchSoundCloud(query)
            ]);

            if (spotifyResults.status === 'fulfilled') {
                results.spotify = spotifyResults.value;
            }
            
            if (soundcloudResults.status === 'fulfilled') {
                results.soundcloud = soundcloudResults.value;
            }

            // Combine results with Spotify first (since SpotDL works better with Spotify), then SoundCloud
            const combined = [
                ...results.spotify,
                ...results.soundcloud
            ];

            return combined.slice(0, 10); // Limit to 10 total results
        } catch (error) {
            console.error('Error searching platforms:', error);
            return [];
        }
    }

    async joinChannel(channel, textChannel = null) {
        const connection = await voiceManager.joinChannel(channel);
        // Store the text channel for potential notifications
        if (textChannel) {
            voiceManager.setLastChannel(channel.guild.id, textChannel);
        }
        return connection;
    }

    async play(guildId, skipCount = 0) {
        const currentSong = queueManager.getCurrentSong(guildId);
        if (!currentSong) {
            return false;
        }

        // Prevent infinite recursion if too many songs fail
        if (skipCount > 5) {
            console.error('Too many consecutive songs failed, stopping playback');
            this.stop(guildId);
            return false;
        }

        try {
            console.log(`Attempting to play: ${currentSong.title} (attempt ${skipCount + 1})`);
            const streamUrl = await streamProvider.getStreamUrl(currentSong);
            
            if (!streamUrl) {
                console.error(`Could not get stream URL for song: ${currentSong.title}`);
                console.log('Automatically skipping to next song...');
                
                // Remove the problematic song and try the next one
                const nextAvailable = await this.next(guildId);
                if (nextAvailable) {
                    return this.play(guildId, skipCount + 1);
                } else {
                    console.log('No more songs in queue');
                    return false;
                }
            }

            const queue = queueManager.getQueue(guildId);
            const success = await voiceManager.playStream(guildId, streamUrl, queue.volume);
            
            if (success) {
                console.log(`Successfully started playing: ${currentSong.title}`);
                
                // Set up event handlers for this specific playback
                voiceManager.onPlayerIdle(guildId, () => {
                    if (queue.loop) {
                        this.play(guildId);
                    } else {
                        const hasNext = this.next(guildId);
                        if (!hasNext) {
                            // No more songs, start inactivity timer
                            console.log(`Queue finished for guild ${guildId}, starting inactivity timer`);
                            voiceManager.resetInactivityTimer(guildId);
                        }
                    }
                });

                voiceManager.onPlayerError(guildId, (error) => {
                    console.error('Audio player error:', error);
                    this.next(guildId);
                });
                
                return true;
            } else {
                console.error(`Failed to start audio stream for: ${currentSong.title}`);
                // Try next song if stream failed to start
                const nextAvailable = await this.next(guildId);
                if (nextAvailable) {
                    return this.play(guildId, skipCount + 1);
                }
                return false;
            }
        } catch (error) {
            console.error('Error playing song:', error);
            
            // Try next song on any error
            const nextAvailable = await this.next(guildId);
            if (nextAvailable) {
                return this.play(guildId, skipCount + 1);
            }
            return false;
        }
    }

    async addToQueue(guildId, song) {
        return queueManager.addSong(guildId, song);
    }

    async next(guildId) {
        if (queueManager.next(guildId)) {
            return this.play(guildId);
        } else {
            this.stop(guildId);
            return false;
        }
    }

    async previous(guildId) {
        if (queueManager.previous(guildId)) {
            return this.play(guildId);
        }
        return false;
    }

    async skip(guildId) {
        return this.next(guildId);
    }

    async voteSkip(guildId, userId, voiceChannel) {
        const result = voiceManager.voteSkip(guildId, userId, voiceChannel);
        if (result.skipped) {
            this.next(guildId);
        }
        return result;
    }

    pause(guildId) {
        const success = voiceManager.pause(guildId);
        if (success) {
            // Start inactivity timer when paused
            voiceManager.resetInactivityTimer(guildId);
        }
        return success;
    }

    resume(guildId) {
        const success = voiceManager.resume(guildId);
        if (success) {
            // Reset inactivity timer when music resumes
            voiceManager.resetInactivityTimer(guildId);
        }
        return success;
    }

    stop(guildId) {
        voiceManager.stop(guildId);
        queueManager.clear(guildId);
        return true;
    }

    leave(guildId) {
        voiceManager.leave(guildId);
        queueManager.cleanup(guildId);
    }

    getCurrentSong(guildId) {
        return queueManager.getCurrentSong(guildId);
    }

    getQueueList(guildId, page = 1, pageSize = 10) {
        return queueManager.getQueueList(guildId, page, pageSize);
    }

    getQueue(guildId) {
        return queueManager.getQueue(guildId);
    }

    setVolume(guildId, volume) {
        const normalizedVolume = queueManager.setVolume(guildId, volume);
        voiceManager.setVolume(guildId, normalizedVolume);
        return normalizedVolume;
    }

    toggleLoop(guildId) {
        return queueManager.toggleLoop(guildId);
    }

    toggleShuffle(guildId) {
        return queueManager.toggleShuffle(guildId);
    }

    isPlaying(guildId) {
        return voiceManager.isPlaying(guildId);
    }

    isPaused(guildId) {
        return voiceManager.isPaused(guildId);
    }

    cleanup(guildId) {
        voiceManager.cleanup(guildId);
        queueManager.cleanup(guildId);
    }

    // Check if bot should stay connected (has music queued or is playing)
    shouldStayConnected(guildId) {
        const queue = queueManager.getQueue(guildId);
        const isPlaying = voiceManager.isPlaying(guildId);
        const isPaused = voiceManager.isPaused(guildId);
        
        return (queue && queue.songs.length > 0) || isPlaying || isPaused;
    }

    // Method to be called by voice manager on activity
    onActivity(guildId) {
        if (this.shouldStayConnected(guildId)) {
            voiceManager.resetInactivityTimer(guildId);
        }
    }

    // Expose connections for external access if needed
    get connections() {
        return voiceManager.connections;
    }
}

module.exports = new MusicManager();
