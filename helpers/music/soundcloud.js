const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class SoundCloudSearcher {

    async search(query, limit = 5) {
        try {
            // Enhance query for music content on SoundCloud
            const musicQuery = this.enhanceQueryForMusic(query);
            
            // Use SpotDL to get metadata from SoundCloud
            const { stdout } = await execAsync(`spotdl save "${musicQuery}" --save-file - --audio soundcloud --dont-filter-results --max-retries 1`, {
                timeout: 30000 // 30 second timeout
            });
            
            if (!stdout || stdout.trim() === '') {
                return [];
            }

            const results = JSON.parse(stdout);
            
            // Handle both single result and array of results
            const tracks = Array.isArray(results) ? results : [results];
            
            // Filter and prioritize music content
            const musicResults = this.filterMusicContent(tracks);

            return musicResults.slice(0, limit).map(track => ({
                title: track.name || track.title || 'Unknown Title',
                url: track.url || track.external_urls?.spotify || track.external_urls?.soundcloud,
                duration: this.formatDuration((track.duration_ms || track.duration * 1000 || 0)),
                thumbnail: track.album?.images?.[0]?.url || track.cover_url,
                source: 'soundcloud',
                id: track.id || track.url,
                streamUrl: null // Will be fetched when needed
            }));
        } catch (error) {
            console.error('SoundCloud search error:', error);
            // Return empty array if search fails
            return [];
        }
    }

    async getStreamUrl(trackUrl) {
        try {
            // Use SpotDL to get the stream URL for a specific track
            const { stdout } = await execAsync(`spotdl url "${trackUrl}" --audio soundcloud`, {
                timeout: 30000 // 30 second timeout
            });
            
            const streamUrl = stdout.trim();
            return streamUrl || null;
        } catch (error) {
            console.error('SoundCloud stream URL error:', error);
            return null;
        }
    }

    enhanceQueryForMusic(query) {
        // Don't modify if it's already a URL
        if (query.includes('soundcloud.com')) {
            return query;
        }
        
        // SoundCloud is primarily music, but we can still add context
        const musicTerms = ['song', 'music', 'track', 'remix', 'cover', 'mix'];
        const hasMusic = musicTerms.some(term => query.toLowerCase().includes(term));
        
        if (!hasMusic && !query.includes('"')) {
            // Add music context for better results
            return `${query} music`;
        }
        
        return query;
    }

    filterMusicContent(tracks) {
        // Keywords that indicate music content on SoundCloud
        const musicKeywords = [
            'remix', 'mix', 'original', 'edit', 'version', 'cover', 'bootleg',
            'mashup', 'live', 'set', 'track', 'song', 'music', 'beat',
            'instrumental', 'vocals', 'acoustic', 'piano', 'guitar', 'studio'
        ];
        
        // Keywords that indicate non-music content
        const nonMusicKeywords = [
            'podcast', 'interview', 'talk', 'speech', 'commentary', 'review',
            'tutorial', 'lesson', 'comedy', 'audiobook', 'news', 'radio show'
        ];
        
        return tracks.filter(track => {
            const title = (track.name || track.title || '').toLowerCase();
            const description = (track.description || '').toLowerCase();
            const artist = (track.artists?.join(' ') || track.artist || '').toLowerCase();
            
            // Skip very long tracks (likely podcasts/interviews)
            const duration = track.duration_ms ? track.duration_ms / 1000 : (track.duration || 0);
            if (duration > 20 * 60) { // 20 minutes
                return false;
            }
            
            // Skip very short tracks (likely intros/outros)
            if (duration > 0 && duration < 20) { // 20 seconds
                return false;
            }
            
            // Check for non-music content
            const hasNonMusic = nonMusicKeywords.some(keyword => 
                title.includes(keyword) || description.includes(keyword) || artist.includes(keyword)
            );
            
            if (hasNonMusic) {
                return false;
            }
            
            return true;
        }).sort((a, b) => {
            // Prioritize tracks with music keywords
            const aScore = this.getMusicScore(a.name || a.title, a.description, a.artists?.join(' ') || a.artist);
            const bScore = this.getMusicScore(b.name || b.title, b.description, b.artists?.join(' ') || b.artist);
            return bScore - aScore;
        });
    }

    getMusicScore(title, description, uploader) {
        const text = `${title || ''} ${description || ''} ${uploader || ''}`.toLowerCase();
        const musicKeywords = [
            'remix', 'mix', 'original', 'edit', 'version', 'cover', 'bootleg',
            'mashup', 'live', 'set', 'track', 'song', 'music', 'beat'
        ];
        
        let score = 0;
        musicKeywords.forEach(keyword => {
            if (text.includes(keyword)) {
                score += keyword === 'music' ? 2 : keyword === 'remix' ? 3 : 1;
            }
        });
        
        return score;
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
}

module.exports = new SoundCloudSearcher();
