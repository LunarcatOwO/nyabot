const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class SpotifySearcher {
    async getTrackInfo(url) {
        try {
            // Use spotdl to get track info and metadata
            const { stdout } = await execAsync(`spotdl save "${url}" --save-file -`, {
                timeout: 30000 // 30 second timeout
            });
            
            if (!stdout || stdout.trim() === '') {
                return null;
            }
            
            // Filter out non-JSON lines (like "Processing..." messages)
            const cleanOutput = this.extractJsonFromOutput(stdout);
            if (!cleanOutput) {
                return null;
            }
            
            const result = JSON.parse(cleanOutput);
            const track = Array.isArray(result) ? result[0] : result;
            
            if (track) {
                return {
                    title: `${track.artists?.join(', ') || 'Unknown Artist'} - ${track.name || 'Unknown Title'}`,
                    url: url, // Original Spotify URL
                    duration: this.formatDuration(track.duration_ms || track.duration * 1000 || 0),
                    thumbnail: track.album?.images?.[0]?.url || track.cover_url,
                    source: 'spotify',
                    id: track.id,
                    searchQuery: `${track.artists?.join(' ') || ''} ${track.name || ''}`.trim(),
                    streamUrl: null // Will be fetched when needed
                };
            }
            
            return null;
        } catch (error) {
            console.error('SpotDL track info error:', error);
            return null;
        }
    }

    async search(query, limit = 5) {
        try {
            // Enhance query for music content
            const musicQuery = this.enhanceQueryForMusic(query);
            
            // Use spotdl to search Spotify with music-specific filters
            const { stdout } = await execAsync(`spotdl save "${musicQuery}" --save-file - --dont-filter-results --max-retries 1`, {
                timeout: 30000 // 30 second timeout
            });
            
            if (!stdout || stdout.trim() === '') {
                return [];
            }
            
            // Filter out non-JSON lines (like "Processing..." messages)
            const cleanOutput = this.extractJsonFromOutput(stdout);
            if (!cleanOutput) {
                return [];
            }
            
            const results = JSON.parse(cleanOutput);
            
            // Handle both single result and array of results
            const tracks = Array.isArray(results) ? results : [results];
            
            // Filter to ensure we only get music tracks
            const musicTracks = this.filterMusicTracks(tracks);
            
            return musicTracks.slice(0, limit).map(track => ({
                title: `${track.artists?.join(', ') || 'Unknown Artist'} - ${track.name || 'Unknown Title'}`,
                url: track.external_urls?.spotify || track.url,
                duration: this.formatDuration(track.duration_ms || track.duration * 1000 || 0),
                thumbnail: track.album?.images?.[0]?.url || track.cover_url,
                source: 'spotify',
                id: track.id,
                streamUrl: null // Will be fetched when needed
            }));
        } catch (error) {
            if (error.message.includes('spotdl')) {
                console.log('SpotDL not installed - Spotify search unavailable');
                console.log('Install SpotDL for Spotify support: pip install spotdl');
            } else {
                console.error('Spotify search error:', error);
            }
            return [];
        }
    }

    extractJsonFromOutput(output) {
        try {
            // Split by lines and find the JSON content
            const lines = output.split('\n');
            
            // Look for lines that start with { or [ (JSON)
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                    // Try to parse this line as JSON
                    try {
                        JSON.parse(trimmed);
                        return trimmed;
                    } catch (e) {
                        // Not valid JSON, continue
                        continue;
                    }
                }
            }
            
            // If no single line works, try to find JSON blocks
            let jsonStart = -1;
            let jsonEnd = -1;
            
            for (let i = 0; i < lines.length; i++) {
                const trimmed = lines[i].trim();
                if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && jsonStart === -1) {
                    jsonStart = i;
                }
                if ((trimmed.endsWith('}') || trimmed.endsWith(']')) && jsonStart !== -1) {
                    jsonEnd = i;
                    break;
                }
            }
            
            if (jsonStart !== -1 && jsonEnd !== -1) {
                const jsonLines = lines.slice(jsonStart, jsonEnd + 1);
                const jsonString = jsonLines.join('\n');
                try {
                    JSON.parse(jsonString);
                    return jsonString;
                } catch (e) {
                    // Not valid JSON
                }
            }
            
            return null;
        } catch (error) {
            console.error('Error extracting JSON:', error);
            return null;
        }
    }

    async getStreamUrl(trackUrl) {
        try {
            // Use SpotDL to get the stream URL for a specific track
            const { stdout } = await execAsync(`spotdl url "${trackUrl}"`, {
                timeout: 30000 // 30 second timeout
            });
            
            const streamUrl = this.extractUrlFromOutput(stdout);
            return streamUrl || null;
        } catch (error) {
            console.error('Spotify stream URL error:', error);
            return null;
        }
    }

    extractUrlFromOutput(output) {
        try {
            // Split by lines and find URLs
            const lines = output.split('\n');
            
            for (const line of lines) {
                const trimmed = line.trim();
                // Look for HTTP/HTTPS URLs
                if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
                    return trimmed;
                }
            }
            
            return null;
        } catch (error) {
            console.error('Error extracting URL:', error);
            return null;
        }
    }

    enhanceQueryForMusic(query) {
        // Don't modify if it's already a Spotify URL
        if (query.includes('spotify.com')) {
            return query;
        }
        
        // Spotify is music-focused, but we can filter for songs vs podcasts
        const trackTerms = ['song', 'track', 'music', 'single', 'album'];
        const hasTrack = trackTerms.some(term => query.toLowerCase().includes(term));
        
        if (!hasTrack) {
            // Add track context to avoid podcasts/audiobooks
            return `track:"${query}"`;
        }
        
        return query;
    }

    filterMusicTracks(tracks) {
        return tracks.filter(track => {
            // Filter out non-music content
            const trackName = (track.name || '').toLowerCase();
            const artistNames = (track.artists?.join(' ') || '').toLowerCase();
            const albumName = (track.album?.name || '').toLowerCase();
            
            // Keywords that indicate non-music content
            const nonMusicKeywords = [
                'podcast', 'audiobook', 'interview', 'talk', 'speech',
                'commentary', 'review', 'meditation', 'sleep', 'nature sounds',
                'white noise', 'rain sounds', 'ocean sounds', 'asmr'
            ];
            
            // Check if it's likely non-music content
            const hasNonMusic = nonMusicKeywords.some(keyword => 
                trackName.includes(keyword) || 
                artistNames.includes(keyword) || 
                albumName.includes(keyword)
            );
            
            if (hasNonMusic) {
                return false;
            }
            
            // Filter by duration - typical music tracks
            const duration = track.duration_ms ? track.duration_ms / 1000 : (track.duration || 0);
            if (duration > 0) {
                // Too short (likely intro/outro/sound effect)
                if (duration < 30) {
                    return false;
                }
                // Too long (likely podcast/audiobook/compilation)
                if (duration > 15 * 60) { // 15 minutes
                    return false;
                }
            }
            
            return true;
        }).sort((a, b) => {
            // Prioritize tracks with higher popularity if available
            const aPopularity = a.popularity || 0;
            const bPopularity = b.popularity || 0;
            return bPopularity - aPopularity;
        });
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

    isSpotifyUrl(url) {
        return url.includes('spotify.com/track/') || url.includes('open.spotify.com/track/');
    }
}

module.exports = new SpotifySearcher();
