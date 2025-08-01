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
            const video = await YouTubeSR.getVideo(url);
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
