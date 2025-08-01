const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class StreamProvider {
    async getStreamUrl(song) {
        try {
            console.log(`Getting stream URL for: ${song.title} (${song.source})`);
            console.log(`Song data:`, JSON.stringify(song, null, 2));
            
            if (song.source === 'soundcloud') {
                const result = await this.getSoundCloudStream(song);
                console.log(`SoundCloud stream result: ${result}`);
                return result;
            } else if (song.source === 'spotify') {
                const result = await this.getSpotifyStream(song);
                console.log(`Spotify stream result: ${result}`);
                return result;
            }
            
            throw new Error(`Unsupported source: ${song.source}`);
        } catch (error) {
            console.error('Error getting stream URL:', error.message);
            console.error('Full error stack:', error.stack);
            return null;
        }
    }

    async getSoundCloudStream(song) {
        // Use SpotDL for SoundCloud streaming
        try {
            console.log(`Getting SoundCloud stream for: ${song.title}`);
            console.log(`SoundCloud URL: ${song.url}`);
            
            if (song.url && (song.url.includes('soundcloud.com') || song.url.includes('open.spotify.com'))) {
                // Try SpotDL to get the streaming URL
                const command = `spotdl url "${song.url}"`;
                console.log(`Executing stream command: ${command}`);
                
                const { stdout, stderr } = await execAsync(command, {
                    timeout: 30000 // 30 second timeout
                });
                
                console.log('SoundCloud stream stdout:', stdout);
                console.log('SoundCloud stream stderr:', stderr);
                
                const streamUrl = this.extractUrlFromOutput(stdout);
                if (streamUrl && streamUrl.startsWith('http')) {
                    console.log(`Found stream URL: ${streamUrl}`);
                    return streamUrl;
                } else {
                    console.log('No valid stream URL found in output');
                }
            }
        } catch (error) {
            console.log('SpotDL failed for SoundCloud stream:', error.message);
            console.error('Full error stack:', error.stack);
        }
        
        // Fallback - return null if can't get stream
        return null;
    }

    async getSpotifyStream(song) {
        try {
            console.log(`Getting Spotify stream for: ${song.title}`);
            console.log(`Spotify URL: ${song.url}`);
            
            // Use SpotDL to get the streaming URL for Spotify tracks
            if (song.url && song.url.includes('spotify.com')) {
                const command = `spotdl url "${song.url}"`;
                console.log(`Executing stream command: ${command}`);
                
                const { stdout, stderr } = await execAsync(command, {
                    timeout: 30000 // 30 second timeout
                });
                
                console.log('Spotify stream stdout:', stdout);
                console.log('Spotify stream stderr:', stderr);
                
                const streamUrl = this.extractUrlFromOutput(stdout);
                if (streamUrl && streamUrl.startsWith('http')) {
                    console.log(`Found stream URL: ${streamUrl}`);
                    return streamUrl;
                } else {
                    console.log('No valid stream URL found in output');
                }
            }
            
            throw new Error('No stream URL found for Spotify track');
        } catch (error) {
            console.error('Failed to get Spotify stream:', error.message);
            console.error('Full error stack:', error.stack);
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
