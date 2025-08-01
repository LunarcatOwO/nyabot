const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class SpotifySearcher {
    async getTrackInfo(url) {
        try {
            // Use spotdl to get track info and YouTube equivalent
            const { stdout } = await execAsync(`spotdl search "${url}" --output-format json --max-results 1`);
            const results = JSON.parse(stdout);
            
            if (results.length > 0) {
                const track = results[0];
                return {
                    title: `${track.artists.join(', ')} - ${track.name}`,
                    url: url, // Original Spotify URL
                    youtubeUrl: track.youtube_url, // Exact YouTube equivalent
                    duration: this.formatDuration(track.duration * 1000),
                    thumbnail: track.cover_url,
                    source: 'spotify',
                    id: track.id,
                    searchQuery: `${track.artists.join(' ')} ${track.name}`
                };
            }
            
            return null;
        } catch (error) {
            console.error('SpotDL track info error:', error);
            return null;
        }
    }

    async search(query, limit = 5) {
        try {
            // Enhance query for music content
            const musicQuery = this.enhanceQueryForMusic(query);
            
            // Use spotdl to search Spotify with music-specific filters
            const { stdout } = await execAsync(`spotdl search "${musicQuery}" --output-format json --max-results ${limit} --audio-format mp3 --audio-quality best`);
            const results = JSON.parse(stdout);
            
            // Filter to ensure we only get music tracks
            const musicTracks = this.filterMusicTracks(results);
            
            return musicTracks.slice(0, limit).map(track => ({
                title: `${track.artists.join(', ')} - ${track.name}`,
                url: track.url,
                youtubeUrl: track.youtube_url,
                duration: this.formatDuration(track.duration * 1000),
                thumbnail: track.cover_url,
                source: 'spotify',
                id: track.id
            }));
        } catch (error) {
            if (error.message.includes('spotdl')) {
                console.log('SpotDL not installed - Spotify search unavailable');
                console.log('Install SpotDL for Spotify support: pip install spotdl');
            } else {
                console.error('Spotify search error:', error);
            }
            return [];
        }
    }

    enhanceQueryForMusic(query) {
        // Don't modify if it's already a Spotify URL
        if (query.includes('spotify.com')) {
            return query;
        }
        
        // Spotify is music-focused, but we can filter for songs vs podcasts
        const trackTerms = ['song', 'track', 'music', 'single', 'album'];
        const hasTrack = trackTerms.some(term => query.toLowerCase().includes(term));
        
        if (!hasTrack) {
            // Add track context to avoid podcasts/audiobooks
            return `track:"${query}"`;
        }
        
        return query;
    }

    filterMusicTracks(tracks) {
        return tracks.filter(track => {
            // Filter out non-music content
            const trackName = track.name?.toLowerCase() || '';
            const artistNames = track.artists?.join(' ').toLowerCase() || '';
            const albumName = track.album_name?.toLowerCase() || '';
            
            // Keywords that indicate non-music content
            const nonMusicKeywords = [
                'podcast', 'audiobook', 'interview', 'talk', 'speech',
                'commentary', 'review', 'meditation', 'sleep', 'nature sounds',
                'white noise', 'rain sounds', 'ocean sounds', 'asmr'
            ];
            
            // Check if it's likely non-music content
            const hasNonMusic = nonMusicKeywords.some(keyword => 
                trackName.includes(keyword) || 
                artistNames.includes(keyword) || 
                albumName.includes(keyword)
            );
            
            if (hasNonMusic) {
                return false;
            }
            
            // Filter by duration - typical music tracks
            if (track.duration) {
                // Too short (likely intro/outro/sound effect)
                if (track.duration < 30) {
                    return false;
                }
                // Too long (likely podcast/audiobook/compilation)
                if (track.duration > 15 * 60) { // 15 minutes
                    return false;
                }
            }
            
            return true;
        }).sort((a, b) => {
            // Prioritize tracks with higher popularity if available
            const aPopularity = a.popularity || 0;
            const bPopularity = b.popularity || 0;
            return bPopularity - aPopularity;
        });
    }

    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
        }
        return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
    }

    isSpotifyUrl(url) {
        return url.includes('spotify.com/track/') || url.includes('open.spotify.com/track/');
    }
}

module.exports = new SpotifySearcher();
