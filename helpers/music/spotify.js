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
            // Use spotdl to search Spotify
            const { stdout } = await execAsync(`spotdl search "${query}" --output-format json --max-results ${limit}`);
            const results = JSON.parse(stdout);
            
            return results.map(track => ({
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
