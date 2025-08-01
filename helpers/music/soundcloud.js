const YTDlpWrap = require('yt-dlp-wrap').default;

class SoundCloudSearcher {
    constructor() {
        this.ytDlp = new YTDlpWrap();
    }

    async search(query, limit = 5) {
        try {
            // Use yt-dlp to search SoundCloud
            const searchResults = await this.ytDlp.execPromise([
                '--flat-playlist',
                '--dump-json',
                `ytsearch${limit}:${query} site:soundcloud.com`,
                '--no-warnings'
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
                .slice(0, limit);

            return results.map(track => ({
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
