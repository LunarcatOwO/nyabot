const YouTubeSR = require('youtube-sr').default;

class YouTubeSearcher {
    async search(query, limit = 5) {
        try {
            // Add music-related keywords to improve search results
            const musicQuery = this.enhanceQueryForMusic(query);
            
            const results = await YouTubeSR.search(musicQuery, { limit: limit * 2, type: 'video' });
            
            // Filter results to prioritize music content
            const musicResults = this.filterMusicContent(results);
            
            return musicResults.slice(0, limit).map(video => ({
                title: video.title,
                url: video.url,
                duration: video.durationFormatted,
                thumbnail: video.thumbnail?.url,
                source: 'youtube',
                id: video.id
            }));
        } catch (error) {
            console.error('YouTube search error:', error);
            return [];
        }
    }

    enhanceQueryForMusic(query) {
        // Don't modify if it's already a URL
        if (query.includes('youtube.com') || query.includes('youtu.be')) {
            return query;
        }
        
        // Check if query already contains music-related terms
        const musicTerms = ['song', 'music', 'audio', 'track', 'official', 'lyrics', 'cover', 'acoustic', 'live', 'remix'];
        const hasMusic = musicTerms.some(term => query.toLowerCase().includes(term));
        
        if (!hasMusic) {
            // Add music context to improve results
            return `${query} song music`;
        }
        
        return query;
    }

    filterMusicContent(videos) {
        // Keywords that indicate music content
        const musicKeywords = [
            'official', 'music', 'song', 'audio', 'track', 'album', 'single',
            'lyrics', 'cover', 'acoustic', 'live', 'concert', 'remix', 'version',
            'feat', 'ft', 'featuring', 'artist', 'band', 'singer', 'vocal',
            'instrumental', 'karaoke', 'piano', 'guitar', 'studio', 'sessions'
        ];
        
        // Keywords that indicate non-music content to deprioritize
        const nonMusicKeywords = [
            'tutorial', 'how to', 'review', 'reaction', 'gameplay', 'walkthrough',
            'news', 'interview', 'documentary', 'trailer', 'teaser', 'behind',
            'vlog', 'unboxing', 'cooking', 'diy', 'minecraft', 'fortnite'
        ];
        
        return videos.filter(video => {
            const title = video.title.toLowerCase();
            const channel = video.channel?.name?.toLowerCase() || '';
            
            // Skip videos longer than 15 minutes (likely not music)
            if (video.duration && video.duration > 15 * 60 * 1000) {
                return false;
            }
            
            // Skip very short videos (likely not music)
            if (video.duration && video.duration < 30 * 1000) {
                return false;
            }
            
            // Check for non-music content
            const hasNonMusic = nonMusicKeywords.some(keyword => 
                title.includes(keyword) || channel.includes(keyword)
            );
            
            if (hasNonMusic) {
                return false;
            }
            
            return true;
        }).sort((a, b) => {
            // Prioritize videos with music keywords in title
            const aScore = this.getMusicScore(a.title, a.channel?.name);
            const bScore = this.getMusicScore(b.title, b.channel?.name);
            return bScore - aScore;
        });
    }

    getMusicScore(title, channel) {
        const text = `${title} ${channel || ''}`.toLowerCase();
        const musicKeywords = [
            'official', 'music', 'song', 'audio', 'track', 'album', 'single',
            'lyrics', 'cover', 'acoustic', 'live', 'concert', 'remix', 'version',
            'feat', 'ft', 'featuring', 'artist', 'band', 'singer', 'vocal'
        ];
        
        let score = 0;
        musicKeywords.forEach(keyword => {
            if (text.includes(keyword)) {
                score += keyword === 'official' ? 3 : keyword === 'music' ? 2 : 1;
            }
        });
        
        return score;
    }

    async getVideo(url) {
        try {
            // Clean up the URL and handle different YouTube URL formats
            let videoId = null;
            
            if (url.includes('youtube.com/watch?v=')) {
                videoId = url.split('v=')[1]?.split('&')[0];
            } else if (url.includes('youtu.be/')) {
                videoId = url.split('youtu.be/')[1]?.split('?')[0];
            }
            
            if (!videoId) {
                console.error('Could not extract video ID from URL:', url);
                return null;
            }
            
            const video = await YouTubeSR.getVideo(`https://www.youtube.com/watch?v=${videoId}`);
            if (video) {
                return {
                    title: video.title,
                    url: video.url,
                    duration: video.durationFormatted,
                    thumbnail: video.thumbnail?.url,
                    source: 'youtube',
                    id: video.id
                };
            }
            return null;
        } catch (error) {
            console.error('YouTube video fetch error:', error);
            return null;
        }
    }
}

module.exports = new YouTubeSearcher();
