const YTDlpWrap = require('yt-dlp-wrap').default;

class StreamProvider {
    constructor() {
        this.ytDlp = new YTDlpWrap();
    }

    async getStreamUrl(song) {
        try {
            if (song.source === 'youtube') {
                // Use yt-dlp to get stream URL
                const info = await this.ytDlp.execPromise([
                    '--get-url',
                    '--format', 'bestaudio/best',
                    song.url,
                    '--no-warnings'
                ]);
                
                return info.trim();
            } else if (song.source === 'soundcloud') {
                // Use yt-dlp for SoundCloud as well
                const info = await this.ytDlp.execPromise([
                    '--get-url',
                    '--format', 'best',
                    song.url,
                    '--no-warnings'
                ]);
                
                return info.trim();
            } else if (song.source === 'spotify') {
                // For Spotify, use the exact YouTube URL from SpotDL
                if (song.youtubeUrl) {
                    const info = await this.ytDlp.execPromise([
                        '--get-url',
                        '--format', 'bestaudio/best',
                        song.youtubeUrl,
                        '--no-warnings'
                    ]);
                    
                    return info.trim();
                } else {
                    // Fallback: search YouTube for the track
                    const youtubeSearcher = require('./youtube');
                    const youtubeResults = await youtubeSearcher.search(song.searchQuery || song.title, 1);
                    
                    if (youtubeResults.length > 0) {
                        const info = await this.ytDlp.execPromise([
                            '--get-url',
                            '--format', 'bestaudio/best',
                            youtubeResults[0].url,
                            '--no-warnings'
                        ]);
                        
                        return info.trim();
                    }
                }
            }
            return null;
        } catch (error) {
            console.error('Error getting stream URL:', error);
            return null;
        }
    }
}

module.exports = new StreamProvider();
