const YTDlpWrap = require('yt-dlp-wrap').default;

class StreamProvider {
    constructor() {
        this.ytDlp = new YTDlpWrap();
    }

    // Validate that URLs are music-related
    validateMusicUrl(url, source) {
        // For YouTube, check if it's from music channels or has music indicators
        if (source === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be')) {
            // Allow music-related channels and keywords
            const musicIndicators = [
                'music', 'vevo', 'records', 'entertainment', 'audio',
                'song', 'track', 'album', 'single', 'artist', 'band'
            ];
            
            // Check URL parameters for music context
            if (url.includes('list=') && !url.includes('music')) {
                console.log('Filtering out non-music playlist');
                return false;
            }
            
            return true; // Allow YouTube URLs (will be filtered by format)
        }
        
        // SoundCloud is primarily music
        if (source === 'soundcloud' || url.includes('soundcloud.com')) {
            return true;
        }
        
        // Spotify is music-focused
        if (source === 'spotify' || url.includes('spotify.com')) {
            return url.includes('/track/') || url.includes('/album/') || url.includes('/artist/');
        }
        
        return true;
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
                    
                    // Try without cookies on subsequent attempts
                    if (attempt === 1) {
                        console.log('Cookies failed, will try without cookies on next attempt');
                    }
                    continue;
                }
                
                // If it's not a bot detection error, don't retry for the same method
                if (attempt === 1) {
                    break;
                }
            }
        }

        console.error('All attempts failed, trying fallback method...');
        
        // Additional fallback: Try with different yt-dlp options
        try {
            console.log('Attempting advanced fallback with minimal options...');
            const fallbackArgs = [
                '--get-url',
                '--format', 'bestaudio/best',
                '--extractor-args', 'youtube:player_client=tv_embedded,skip=webpage,skip=dash',
                '--no-warnings',
                '--no-check-certificates',
                '--ignore-errors',
                url
            ];
            
            const fallbackUrl = await this.ytDlp.execPromise(fallbackArgs);
            if (fallbackUrl && fallbackUrl.trim()) {
                console.log('Advanced fallback successful');
                return fallbackUrl.trim();
            }
        } catch (advancedError) {
            console.log('Advanced fallback failed, trying song search...');
        }
        
        // Fallback: Try to get a different video if this was from Spotify
        if (song.source === 'spotify' && (song.searchQuery || song.title)) {
            try {
                console.log('Attempting Spotify fallback - searching for alternative YouTube video...');
                const youtubeSearcher = require('./youtube');
                const results = await youtubeSearcher.search(song.searchQuery || song.title, 5);
                
                // Try the first few results
                for (const result of results) {
                    try {
                        // Try a simple approach for alternative videos
                        const simpleArgs = [
                            '--get-url',
                            '--format', 'bestaudio/best',
                            '--no-warnings',
                            '--extractor-args', 'youtube:skip=webpage',
                            result.url
                        ];
                        
                        const fallbackUrl = await this.ytDlp.execPromise(simpleArgs);
                        if (fallbackUrl && fallbackUrl.trim()) {
                            console.log('Fallback successful with alternative video:', result.title);
                            return fallbackUrl.trim();
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
        
        // Final fallback: Try searching for a similar song on YouTube
        if (song.title && !song.title.includes('Unknown')) {
            try {
                console.log('Final fallback - searching for similar song...');
                const youtubeSearcher = require('./youtube');
                
                // Extract artist and song name for better search
                let searchQuery = song.title;
                if (song.title.includes(' - ')) {
                    searchQuery = song.title.replace(' - ', ' ');
                }
                
                const results = await youtubeSearcher.search(`${searchQuery} official audio`, 3);
                
                for (const result of results) {
                    try {
                        const simpleArgs = [
                            '--get-url',
                            '--format', 'worstaudio',
                            '--no-warnings',
                            '--ignore-errors',
                            result.url
                        ];
                        
                        const fallbackUrl = await this.ytDlp.execPromise(simpleArgs);
                        if (fallbackUrl && fallbackUrl.trim()) {
                            console.log('Final fallback successful with:', result.title);
                            return fallbackUrl.trim();
                        }
                    } catch (finalError) {
                        continue;
                    }
                }
            } catch (finalError) {
                console.error('Final fallback failed:', finalError);
            }
        }

        console.log('All yt-dlp methods failed, trying alternative YouTube methods...');
        
        // Try using youtube-dl as a last resort
        try {
            console.log('Attempting youtube-dl fallback...');
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);
            
            const youtubeDlResult = await execAsync(`youtube-dl --get-url --format bestaudio "${url}"`);
            if (youtubeDlResult.stdout && youtubeDlResult.stdout.trim()) {
                console.log('youtube-dl fallback successful');
                return youtubeDlResult.stdout.trim();
            }
        } catch (youtubeDlError) {
            console.log('youtube-dl not available or failed');
        }

        console.error('All methods exhausted, returning null');
        return null;
    }

    async _getStreamUrlForSource(song, attempt) {
        let url = song.url;
        
        // Validate that this is music-related content
        if (!this.validateMusicUrl(url, song.source)) {
            throw new Error('URL does not appear to be music content');
        }
        
        // For Spotify, prefer the YouTube URL
        if (song.source === 'spotify' && song.youtubeUrl) {
            url = song.youtubeUrl;
        }

        // Different strategies for different attempts
        const baseArgs = ['--get-url', '--no-warnings', '--no-playlist'];
        let formatArgs = [];
        let extraArgs = [];

        switch (attempt) {
            case 1:
                // First attempt: Try with cookies, fallback gracefully if they fail
                formatArgs = ['--format', 'bestaudio[ext=m4a]/bestaudio[ext=mp3]/bestaudio/best[height<=480]/best'];
                extraArgs = [
                    '--extract-audio',
                    '--audio-format', 'mp3',
                    '--audio-quality', '0',
                    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    '--referer', 'https://www.youtube.com/',
                    '--sleep-interval', '1',
                    '--max-sleep-interval', '3'
                ];
                
                // Try to add cookies, but don't fail if they're not available
                try {
                    extraArgs.push('--cookies-from-browser', 'chrome');
                } catch (cookieError) {
                    console.log('Chrome cookies not available, continuing without');
                }
                break;
            case 2:
                // Second attempt: Android client without cookies + audio-only
                formatArgs = ['--format', 'bestaudio[filesize<50M]/worstaudio'];
                extraArgs = [
                    '--extract-audio',
                    '--audio-format', 'm4a',
                    '--extractor-args', 'youtube:player_client=android,skip=webpage',
                    '--user-agent', 'com.google.android.youtube/17.31.35 (Linux; U; Android 11) gzip',
                    '--no-check-certificates',
                    '--sleep-interval', '2',
                    '--max-sleep-interval', '5'
                ];
                break;
            case 3:
                // Third attempt: TV embedded client (often bypasses restrictions)
                formatArgs = ['--format', 'worstaudio/worst'];
                extraArgs = [
                    '--extract-audio',
                    '--audio-format', 'mp3',
                    '--audio-quality', '9',
                    '--extractor-args', 'youtube:player_client=tv_embedded,skip=webpage',
                    '--user-agent', 'Mozilla/5.0 (SMART-TV; Linux; Tizen 2.4.0) AppleWebKit/538.1 (KHTML, like Gecko) SamsungBrowser/1.1 TV Safari/538.1',
                    '--no-check-certificates',
                    '--ignore-errors',
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
