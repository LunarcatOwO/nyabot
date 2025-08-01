const YTDlpWrap = require('yt-dlp-wrap').default;

class StreamProvider {
    constructor() {
        this.ytDlp = new YTDlpWrap();
    }

    async getStreamUrl(song) {
        const maxRetries = 3;
        let lastError = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Attempt ${attempt}/${maxRetries} to get stream URL for: ${song.title}`);
                
                const streamUrl = await this._getStreamUrlForSource(song, attempt);
                if (streamUrl) {
                    console.log(`Successfully got stream URL on attempt ${attempt}`);
                    return streamUrl;
                }
            } catch (error) {
                lastError = error;
                console.error(`Attempt ${attempt} failed:`, error.message);
                
                // If it's a bot detection error, try different approaches
                if (error.message.includes('Sign in to confirm') || error.message.includes('bot')) {
                    console.log('Bot detection encountered, trying alternative approach...');
                    continue;
                }
                
                // If it's not a bot detection error, don't retry
                if (attempt === 1) {
                    break;
                }
            }
        }

        console.error('All attempts failed, trying fallback method...');
        
        // Fallback: Try to get a different video if this was from Spotify
        if (song.source === 'spotify' && (song.searchQuery || song.title)) {
            try {
                console.log('Attempting Spotify fallback - searching for alternative YouTube video...');
                const youtubeSearcher = require('./youtube');
                const results = await youtubeSearcher.search(song.searchQuery || song.title, 3);
                
                // Try the first few results
                for (const result of results) {
                    try {
                        const fallbackUrl = await this._getStreamUrlForSource({
                            ...song,
                            url: result.url,
                            source: 'youtube'
                        }, 1);
                        
                        if (fallbackUrl) {
                            console.log('Fallback successful with alternative video');
                            return fallbackUrl;
                        }
                    } catch (fallbackError) {
                        console.log('Fallback attempt failed, trying next result...');
                        continue;
                    }
                }
            } catch (fallbackError) {
                console.error('Fallback method also failed:', fallbackError);
            }
        }

        console.error('All methods exhausted, returning null');
        return null;
    }

    async _getStreamUrlForSource(song, attempt) {
        let url = song.url;
        
        // For Spotify, prefer the YouTube URL
        if (song.source === 'spotify' && song.youtubeUrl) {
            url = song.youtubeUrl;
        }

        // Different strategies for different attempts
        const baseArgs = ['--get-url', '--no-warnings'];
        let formatArgs = [];
        let extraArgs = [];

        switch (attempt) {
            case 1:
                // First attempt: Standard approach with user agent
                formatArgs = ['--format', 'bestaudio[ext=m4a]/bestaudio/best[height<=480]'];
                extraArgs = [
                    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    '--referer', 'https://www.youtube.com/',
                    '--sleep-interval', '1',
                    '--max-sleep-interval', '3'
                ];
                break;
            case 2:
                // Second attempt: Different format and extractor args
                formatArgs = ['--format', 'worst[height<=360]/worst'];
                extraArgs = [
                    '--extractor-args', 'youtube:player_client=android',
                    '--user-agent', 'com.google.android.youtube/17.31.35 (Linux; U; Android 11) gzip',
                    '--sleep-interval', '2',
                    '--max-sleep-interval', '5'
                ];
                break;
            case 3:
                // Third attempt: iOS client
                formatArgs = ['--format', 'worst'];
                extraArgs = [
                    '--extractor-args', 'youtube:player_client=ios',
                    '--user-agent', 'com.google.ios.youtube/17.31.4 (iPhone14,2; U; CPU iOS 15_6 like Mac OS X)',
                    '--sleep-interval', '3',
                    '--max-sleep-interval', '7'
                ];
                break;
        }

        const args = [...baseArgs, ...formatArgs, ...extraArgs, url];
        console.log(`Executing yt-dlp with args (attempt ${attempt}):`, args.join(' '));

        const info = await this.ytDlp.execPromise(args);
        return info.trim();
    }
}

module.exports = new StreamProvider();
