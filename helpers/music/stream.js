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
        // Use SpotDL for SoundCloud if possible, otherwise direct URL
        try {
            if (song.url.includes('soundcloud.com')) {
                // Try SpotDL for better quality
                const { stdout } = await execAsync(`spotdl url "${song.url}" --print-url --audio-format mp3`);
                if (stdout && stdout.trim()) {
                    return stdout.trim();
                }
            }
        } catch (error) {
            console.log('SpotDL failed for SoundCloud, using direct URL');
        }
        
        // Fallback to direct URL
        return song.url;
    }

    async getSpotifyStream(song) {
        try {
            // Use SpotDL to get the YouTube equivalent for Spotify tracks
            if (song.youtubeUrl) {
                const { stdout } = await execAsync(`spotdl url "${song.url}" --print-url --audio-format mp3`);
                if (stdout && stdout.trim()) {
                    return stdout.trim();
                }
            }
            
            throw new Error('No YouTube equivalent found for Spotify track');
        } catch (error) {
            console.error('Failed to get Spotify stream:', error.message);
            return null;
        }
    }
}

module.exports = new StreamProvider();

module.exports = new StreamProvider();
