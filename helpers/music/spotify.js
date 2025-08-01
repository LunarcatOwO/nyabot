const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class SpotifySearcher {
    async getTrackInfo(url) {
        try {
            console.log(`Getting Spotify track info for: ${url}`);
            
            // Test different spotdl commands to see what works
            console.log('Testing spotdl commands...');
            
            // Try save command first
            try {
                const saveCommand = `spotdl save "${url}" --save-file -`;
                console.log(`Trying save command: ${saveCommand}`);
                
                const { stdout: saveStdout, stderr: saveStderr } = await execAsync(saveCommand, {
                    timeout: 30000
                });
                
                console.log('Save command stdout:', saveStdout);
                console.log('Save command stderr:', saveStderr);
                
                if (saveStdout && saveStdout.trim() !== '') {
                    // Try to parse as JSON or spotdl format
                    const cleanOutput = this.extractJsonFromOutput(saveStdout);
                    if (cleanOutput) {
                        const result = JSON.parse(cleanOutput);
                        const track = Array.isArray(result) ? result[0] : result;
                        
                        if (track) {
                            const trackInfo = {
                                title: `${track.artists?.join(', ') || 'Unknown Artist'} - ${track.name || 'Unknown Title'}`,
                                url: url,
                                duration: this.formatDuration(track.duration_ms || track.duration * 1000 || 0),
                                thumbnail: track.album?.images?.[0]?.url || track.cover_url,
                                source: 'spotify',
                                id: track.id,
                                searchQuery: `${track.artists?.join(' ') || ''} ${track.name || ''}`.trim(),
                                streamUrl: null
                            };
                            
                            console.log('Successfully parsed track info from save:', trackInfo);
                            return trackInfo;
                        }
                    }
                }
            } catch (saveError) {
                console.log('Save command failed:', saveError.message);
            }
            
            // If save doesn't work, try just downloading metadata
            try {
                const downloadCommand = `spotdl download "${url}" --print-errors --output-format json`;
                console.log(`Trying download command: ${downloadCommand}`);
                
                const { stdout: dlStdout, stderr: dlStderr } = await execAsync(downloadCommand, {
                    timeout: 30000
                });
                
                console.log('Download command stdout:', dlStdout);
                console.log('Download command stderr:', dlStderr);
                
                if (dlStdout && dlStdout.trim() !== '') {
                    const cleanOutput = this.extractJsonFromOutput(dlStdout);
                    if (cleanOutput) {
                        const result = JSON.parse(cleanOutput);
                        const track = Array.isArray(result) ? result[0] : result;
                        
                        if (track) {
                            const trackInfo = {
                                title: `${track.artists?.join(', ') || 'Unknown Artist'} - ${track.name || 'Unknown Title'}`,
                                url: url,
                                duration: this.formatDuration(track.duration_ms || track.duration * 1000 || 0),
                                thumbnail: track.album?.images?.[0]?.url || track.cover_url,
                                source: 'spotify',
                                id: track.id,
                                searchQuery: `${track.artists?.join(' ') || ''} ${track.name || ''}`.trim(),
                                streamUrl: null
                            };
                            
                            console.log('Successfully parsed track info from download:', trackInfo);
                            return trackInfo;
                        }
                    }
                }
            } catch (downloadError) {
                console.log('Download command failed:', downloadError.message);
            }
            
            console.log('All spotdl commands failed to get track info');
            return null;
            
        } catch (error) {
            console.error('SpotDL track info error:', error.message);
            console.error('Full error stack:', error.stack);
            return null;
        }
    }

    async search(query, limit = 5) {
        try {
            // For now, return empty array since SpotDL save is not designed for searching
            // SpotDL works with Spotify URLs, not search queries
            console.log('Spotify search: SpotDL save operation is not suitable for search queries');
            console.log('Recommend implementing Spotify Web API for proper search functionality');
            return [];
            
            /* 
            // This approach doesn't work for search - save is for known URLs
            const musicQuery = this.enhanceQueryForMusic(query);
            const command = `spotdl save "${musicQuery}" --save-file -`;
            console.log(`Spotify search command: ${command}`);
            
            const { stdout, stderr } = await execAsync(command, {
                timeout: 30000 // 30 second timeout
            });
            
            // ... rest of the implementation
            */
        } catch (error) {
            if (error.message.includes('spotdl')) {
                console.log('SpotDL not installed - Spotify search unavailable');
                console.log('Install SpotDL for Spotify support: pip install spotdl');
            } else {
                console.error('Spotify search error:', error.message);
                console.error('Full error:', error);
            }
            return [];
        }
    }

    extractJsonFromOutput(output) {
        try {
            console.log(`Extracting JSON from output (length: ${output.length})`);
            console.log('Raw output sample:', output.substring(0, 200));
            
            // Split by lines and find the JSON content
            const lines = output.split('\n');
            console.log(`Output has ${lines.length} lines`);
            
            // Look for lines that start with { or [ (JSON)
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const trimmed = line.trim();
                console.log(`Line ${i}: "${trimmed.substring(0, 50)}..."`);
                
                if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                    // Try to parse this line as JSON
                    try {
                        JSON.parse(trimmed);
                        console.log(`Found valid JSON on line ${i}`);
                        return trimmed;
                    } catch (e) {
                        console.log(`Line ${i} looks like JSON but failed to parse:`, e.message);
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
                    console.log(`JSON block might start at line ${i}`);
                }
                if ((trimmed.endsWith('}') || trimmed.endsWith(']')) && jsonStart !== -1) {
                    jsonEnd = i;
                    console.log(`JSON block might end at line ${i}`);
                    break;
                }
            }
            
            if (jsonStart !== -1 && jsonEnd !== -1) {
                const jsonLines = lines.slice(jsonStart, jsonEnd + 1);
                const jsonString = jsonLines.join('\n');
                console.log(`Trying to parse JSON block: ${jsonString.substring(0, 100)}...`);
                try {
                    JSON.parse(jsonString);
                    console.log('Successfully parsed JSON block');
                    return jsonString;
                } catch (e) {
                    console.log('JSON block failed to parse:', e.message);
                }
            }
            
            console.log('No valid JSON found in output');
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
