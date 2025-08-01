const YouTubeSR = require('youtube-sr').default;

class YouTubeSearcher {
    async search(query, limit = 5) {
        try {
            const results = await YouTubeSR.search(query, { limit, type: 'video' });
            return results.map(video => ({
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
