const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class StreamProvider {
    async getStreamUrl(song) {
        try {
            console.log(`Getting stream URL for: ${song.title} (${song.source})`);
            
            if (song.source === 'soundcloud') {
                return await this.getSoundCloudStream(song);
            } else if (song.source === 'spotify') {
                return await this.getSpotifyStream(song);
            }
            
            throw new Error(`Unsupported source: ${song.source}`);
        } catch (error) {
            console.error('Error getting stream URL:', error.message);
            return null;
        }
    }

    async getSoundCloudStream(song) {
        // Use SpotDL for SoundCloud streaming
        try {
            if (song.url && (song.url.includes('soundcloud.com') || song.url.includes('open.spotify.com'))) {
                // Try SpotDL to get the streaming URL
                const { stdout } = await execAsync(`spotdl url "${song.url}" --audio soundcloud`, {
                    timeout: 30000 // 30 second timeout
                });
                
                const streamUrl = this.extractUrlFromOutput(stdout);
                if (streamUrl && streamUrl.startsWith('http')) {
                    return streamUrl;
                }
            }
        } catch (error) {
            console.log('SpotDL failed for SoundCloud stream:', error.message);
        }
        
        // Fallback - return null if can't get stream
        return null;
    }

    async getSpotifyStream(song) {
        try {
            // Use SpotDL to get the streaming URL for Spotify tracks
            if (song.url && song.url.includes('spotify.com')) {
                const { stdout } = await execAsync(`spotdl url "${song.url}"`, {
                    timeout: 30000 // 30 second timeout
                });
                
                const streamUrl = this.extractUrlFromOutput(stdout);
                if (streamUrl && streamUrl.startsWith('http')) {
                    return streamUrl;
                }
            }
            
            throw new Error('No stream URL found for Spotify track');
        } catch (error) {
            console.error('Failed to get Spotify stream:', error.message);
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
}

module.exports = new StreamProvider();
