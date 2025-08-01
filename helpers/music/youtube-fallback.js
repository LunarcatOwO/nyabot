const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class YouTubeFallback {
    async extractTitleFromUrl(url) {
        try {
            console.log('Extracting title from YouTube URL for alternative search...');
            
            // Try to get video title using yt-dlp without downloading
            const { stdout } = await execAsync(`python3 -c "
import re
import urllib.request
import json

url = '${url}'
video_id = None

if 'youtube.com/watch?v=' in url:
    video_id = url.split('v=')[1].split('&')[0]
elif 'youtu.be/' in url:
    video_id = url.split('youtu.be/')[1].split('?')[0]

if video_id:
    try:
        # Try to get basic info from YouTube's oEmbed API
        oembed_url = f'https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v={video_id}'
        with urllib.request.urlopen(oembed_url) as response:
            data = json.loads(response.read())
            title = data.get('title', '')
            author = data.get('author_name', '')
            print(f'{author} - {title}' if author and title else title)
    except:
        # Fallback: extract from URL if possible
        print('Unknown YouTube Video')
else:
    print('Invalid YouTube URL')
"`);
            
            const extractedTitle = stdout.trim();
            if (extractedTitle && extractedTitle !== 'Unknown YouTube Video' && extractedTitle !== 'Invalid YouTube URL') {
                return this.cleanTitle(extractedTitle);
            }
            
            return null;
        } catch (error) {
            console.error('Failed to extract YouTube title:', error.message);
            return null;
        }
    }

    cleanTitle(title) {
        // Clean up common YouTube title patterns to improve search
        let cleaned = title
            .replace(/\(Official.*?\)/gi, '') // Remove (Official Video), (Official Audio), etc.
            .replace(/\[Official.*?\]/gi, '') // Remove [Official Video], [Official Audio], etc.
            .replace(/\(.*?Video.*?\)/gi, '') // Remove (Music Video), (Lyric Video), etc.
            .replace(/\[.*?Video.*?\]/gi, '') // Remove [Music Video], [Lyric Video], etc.
            .replace(/\(HD\)/gi, '') // Remove (HD)
            .replace(/\[HD\]/gi, '') // Remove [HD]
            .replace(/\(4K\)/gi, '') // Remove (4K)
            .replace(/\[4K\]/gi, '') // Remove [4K]
            .replace(/\(Lyrics?\)/gi, '') // Remove (Lyrics) or (Lyric)
            .replace(/\[Lyrics?\]/gi, '') // Remove [Lyrics] or [Lyric]
            .replace(/ft\.?/gi, 'feat') // Normalize featuring
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();

        return cleaned;
    }

    calculateSimilarity(str1, str2) {
        // Simple similarity calculation using Levenshtein distance
        const s1 = str1.toLowerCase().replace(/[^a-z0-9\s]/g, '');
        const s2 = str2.toLowerCase().replace(/[^a-z0-9\s]/g, '');
        
        const matrix = [];
        const len1 = s1.length;
        const len2 = s2.length;

        for (let i = 0; i <= len1; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= len2; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                if (s1[i - 1] === s2[j - 1]) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        const maxLen = Math.max(len1, len2);
        return maxLen === 0 ? 1 : (maxLen - matrix[len1][len2]) / maxLen;
    }

    async findBestAlternative(youtubeUrl) {
        try {
            const originalTitle = await this.extractTitleFromUrl(youtubeUrl);
            if (!originalTitle) {
                throw new Error('Could not extract title from YouTube URL');
            }

            console.log(`YouTube fallback: Searching for "${originalTitle}" on alternative platforms...`);

            // Search both SoundCloud and Spotify
            const soundcloudSearcher = require('./soundcloud');
            const spotifySearcher = require('./spotify');

            const [soundcloudResults, spotifyResults] = await Promise.allSettled([
                soundcloudSearcher.search(originalTitle, 5),
                spotifySearcher.search(originalTitle, 5)
            ]);

            const allResults = [];

            // Add SoundCloud results with similarity scores
            if (soundcloudResults.status === 'fulfilled') {
                soundcloudResults.value.forEach(track => {
                    const similarity = this.calculateSimilarity(originalTitle, track.title);
                    allResults.push({ ...track, similarity, platform: 'SoundCloud' });
                });
            }

            // Add Spotify results with similarity scores
            if (spotifyResults.status === 'fulfilled') {
                spotifyResults.value.forEach(track => {
                    const similarity = this.calculateSimilarity(originalTitle, track.title);
                    allResults.push({ ...track, similarity, platform: 'Spotify' });
                });
            }

            if (allResults.length === 0) {
                throw new Error('No alternatives found on SoundCloud or Spotify');
            }

            // Sort by similarity (highest first)
            allResults.sort((a, b) => b.similarity - a.similarity);

            const bestMatch = allResults[0];
            console.log(`Best alternative found: "${bestMatch.title}" on ${bestMatch.platform} (${Math.round(bestMatch.similarity * 100)}% similarity)`);

            return bestMatch;

        } catch (error) {
            console.error('YouTube fallback failed:', error.message);
            throw error;
        }
    }
}

module.exports = new YouTubeFallback();
