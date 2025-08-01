const YTDlpWrap = require('yt-dlp-wrap').default;

class SoundCloudSearcher {
    constructor() {
        this.ytDlp = new YTDlpWrap();
    }

    async search(query, limit = 5) {
        try {
            // Enhance query for music content on SoundCloud
            const musicQuery = this.enhanceQueryForMusic(query);
            
            // Use yt-dlp to search SoundCloud with music-specific parameters
            const searchResults = await this.ytDlp.execPromise([
                '--flat-playlist',
                '--dump-json',
                `ytsearch${limit * 2}:${musicQuery} site:soundcloud.com`,
                '--no-warnings',
                '--extractor-args', 'soundcloud:client_id=null' // Use default client
            ]);
            
            const results = searchResults.split('\n')
                .filter(line => line.trim())
                .map(line => {
                    try {
                        return JSON.parse(line);
                    } catch {
                        return null;
                    }
                })
                .filter(result => result && result.url)
                .slice(0, limit * 2);

            // Filter and prioritize music content
            const musicResults = this.filterMusicContent(results);

            return musicResults.slice(0, limit).map(track => ({
                title: track.title || 'Unknown Title',
                url: track.url,
                duration: this.formatDuration((track.duration || 0) * 1000),
                thumbnail: track.thumbnail,
                source: 'soundcloud',
                id: track.id || track.url
            }));
        } catch (error) {
            console.error('SoundCloud search error:', error);
            return [];
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
            const title = track.title?.toLowerCase() || '';
            const description = track.description?.toLowerCase() || '';
            const uploader = track.uploader?.toLowerCase() || '';
            
            // Skip very long tracks (likely podcasts/interviews)
            if (track.duration && track.duration > 20 * 60) { // 20 minutes
                return false;
            }
            
            // Skip very short tracks (likely intros/outros)
            if (track.duration && track.duration < 20) { // 20 seconds
                return false;
            }
            
            // Check for non-music content
            const hasNonMusic = nonMusicKeywords.some(keyword => 
                title.includes(keyword) || description.includes(keyword) || uploader.includes(keyword)
            );
            
            if (hasNonMusic) {
                return false;
            }
            
            return true;
        }).sort((a, b) => {
            // Prioritize tracks with music keywords
            const aScore = this.getMusicScore(a.title, a.description, a.uploader);
            const bScore = this.getMusicScore(b.title, b.description, b.uploader);
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
