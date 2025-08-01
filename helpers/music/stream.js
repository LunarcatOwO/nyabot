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
            
            if (song.url && song.url.includes('soundcloud.com')) {
                // Download to a temporary directory and get the file path
                const tempDir = '/tmp/nyabot-music';
                const command = `spotdl download "${song.url}" --output "${tempDir}" --format mp3 --bitrate 128k`;
                console.log(`Executing download command: ${command}`);
                
                const { stdout, stderr } = await execAsync(command, {
                    timeout: 60000 // 60 second timeout for downloads
                });
                
                console.log('SoundCloud download stdout:', stdout);
                console.log('SoundCloud download stderr:', stderr);
                
                const filePath = this.extractFilePathFromOutput(stdout);
                if (filePath) {
                    console.log(`Found downloaded file: ${filePath}`);
                    return filePath;
                } else {
                    console.log('No file path found in download output');
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
            
            // Use SpotDL to download and get the actual audio file path
            if (song.url && song.url.includes('spotify.com')) {
                // Download to a temporary directory and get the file path
                const tempDir = '/tmp/nyabot-music';
                const command = `spotdl download "${song.url}" --output "${tempDir}" --format mp3 --bitrate 128k --threads 4 --max-retries 2`;
                console.log(`Executing download command: ${command}`);
                
                const startTime = Date.now();
                const { stdout, stderr } = await execAsync(command, {
                    timeout: 60000 // 60 second timeout for downloads
                });
                const downloadTime = Date.now() - startTime;
                
                console.log(`Download completed in ${downloadTime}ms`);
                console.log('Spotify download stdout:', stdout);
                if (stderr && stderr.trim() !== '') {
                    console.log('Spotify download stderr:', stderr);
                }
                
                // Look for the downloaded file path in the output
                const filePath = this.extractFilePathFromOutput(stdout);
                if (filePath) {
                    console.log(`Found downloaded file: ${filePath}`);
                    return filePath;
                } else {
                    console.log('No file path found in download output');
                }
            }
            
            throw new Error('No stream file found for Spotify track');
        } catch (error) {
            console.error('Failed to get Spotify stream:', error.message);
            if (error.message.includes('timeout')) {
                console.error('Download timed out - consider increasing timeout or improving network connection');
            }
            return null;
        }
    }

    extractFilePathFromOutput(output) {
        try {
            // Split by lines and find file paths
            const lines = output.split('\n');
            
            for (const line of lines) {
                const trimmed = line.trim();
                // Look for lines that mention successful downloads or file paths
                if (trimmed.includes('.mp3') || trimmed.includes('.m4a') || trimmed.includes('.wav')) {
                    // Extract the file path
                    const pathMatch = trimmed.match(/([^\s]+\.(mp3|m4a|wav|flac))/);
                    if (pathMatch) {
                        return pathMatch[1];
                    }
                }
                
                // Also look for "Downloaded" messages that contain file paths
                if (trimmed.startsWith('Downloaded:') || trimmed.includes('Downloaded')) {
                    const pathMatch = trimmed.match(/([^\s]+\.(mp3|m4a|wav|flac))/);
                    if (pathMatch) {
                        return pathMatch[1];
                    }
                }
            }
            
            return null;
        } catch (error) {
            console.error('Error extracting file path:', error);
            return null;
        }
    }
}

module.exports = new StreamProvider();
