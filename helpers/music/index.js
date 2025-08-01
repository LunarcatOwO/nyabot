const youtubeSearcher = require('./youtube');
const soundcloudSearcher = require('./soundcloud');
const spotifySearcher = require('./spotify');
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
        return await youtubeSearcher.search(query, limit);
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
            youtube: [],
            soundcloud: [],
            spotify: []
        };

        try {
            // Search all platforms in parallel
            const [youtubeResults, soundcloudResults, spotifyResults] = await Promise.allSettled([
                this.searchYouTube(query),
                this.searchSoundCloud(query),
                this.searchSpotify(query)
            ]);

            if (youtubeResults.status === 'fulfilled') {
                results.youtube = youtubeResults.value;
            }
            
            if (soundcloudResults.status === 'fulfilled') {
                results.soundcloud = soundcloudResults.value;
            }
            
            if (spotifyResults.status === 'fulfilled') {
                results.spotify = spotifyResults.value;
            }

            // Combine results with YouTube first, then others
            const combined = [
                ...results.youtube,
                ...results.soundcloud,
                ...results.spotify
            ];

            return combined.slice(0, 10); // Limit to 10 total results
        } catch (error) {
            console.error('Error searching all platforms:', error);
            return [];
        }
    }

    async joinChannel(channel) {
        return await voiceManager.joinChannel(channel);
    }

    async play(guildId) {
        const currentSong = queueManager.getCurrentSong(guildId);
        if (!currentSong) {
            return false;
        }

        try {
            const streamUrl = await streamProvider.getStreamUrl(currentSong);
            if (!streamUrl) {
                console.error('Could not get stream URL for song:', currentSong.title);
                // Skip to next song
                return this.next(guildId);
            }

            const queue = queueManager.getQueue(guildId);
            const success = await voiceManager.playStream(guildId, streamUrl, queue.volume);
            
            if (success) {
                // Set up event handlers for this specific playback
                voiceManager.onPlayerIdle(guildId, () => {
                    if (queue.loop) {
                        this.play(guildId);
                    } else {
                        this.next(guildId);
                    }
                });

                voiceManager.onPlayerError(guildId, (error) => {
                    console.error('Audio player error:', error);
                    this.next(guildId);
                });
            }
            
            return success;
        } catch (error) {
            console.error('Error playing song:', error);
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
        return voiceManager.pause(guildId);
    }

    resume(guildId) {
        return voiceManager.resume(guildId);
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

    // Expose connections for external access if needed
    get connections() {
        return voiceManager.connections;
    }
}

module.exports = new MusicManager();
