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
                const command = `spotdl download "${song.url}" --output "${tempDir}" --format mp3 --bitrate 128k --threads 2 --max-retries 3`;
                console.log(`Executing download command: ${command}`);
                
                const { stdout, stderr } = await execAsync(command, {
                    timeout: 90000 // 90 second timeout for downloads
                });
                
                console.log('SoundCloud download stdout:', stdout);
                if (stderr && stderr.trim() !== '') {
                    console.log('SoundCloud download stderr:', stderr);
                }
                
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
                // Create unique filename to avoid conflicts
                const timestamp = Date.now();
                const cleanTitle = song.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
                const expectedFilename = `${cleanTitle}_${timestamp}.mp3`;
                
                // Download to a temporary directory and get the file path
                const tempDir = '/tmp/nyabot-music';
                const baseCommand = `spotdl download "${song.url}" --output "${tempDir}" --format mp3 --bitrate 128k --threads 2`;
                
                // Try different audio providers in order of preference
                const providers = ['youtube-music', 'youtube', 'soundcloud'];
                
                for (let i = 0; i < providers.length; i++) {
                    const provider = providers[i];
                    const command = `${baseCommand} --audio-provider ${provider}`;
                    console.log(`Trying provider ${provider}: ${command}`);
                    
                    try {
                        const startTime = Date.now();
                        const { stdout, stderr } = await execAsync(command, {
                            timeout: 90000 // 90 second timeout for downloads
                        });
                        const downloadTime = Date.now() - startTime;
                        
                        console.log(`Provider ${provider} completed in ${downloadTime}ms`);
                        console.log(`Stdout: ${stdout}`);
                        if (stderr && stderr.trim() !== '') {
                            console.log(`Stderr: ${stderr}`);
                        }
                        
                        // Look for the downloaded file path in the output
                        const filePath = this.extractFilePathFromOutput(stdout);
                        if (filePath) {
                            console.log(`Successfully downloaded file: ${filePath}`);
                            return filePath;
                        } else {
                            console.log(`No file path found for provider ${provider}`);
                        }
                    } catch (providerError) {
                        console.log(`Provider ${provider} failed: ${providerError.message}`);
                        
                        // If this isn't the last provider, continue to next one
                        if (i < providers.length - 1) {
                            console.log(`Trying next provider...`);
                            continue;
                        }
                    }
                }
                
                // If all providers failed, try without specifying provider
                console.log('All providers failed, trying default provider...');
                try {
                    const fallbackCommand = `${baseCommand} --max-retries 3`;
                    console.log(`Fallback command: ${fallbackCommand}`);
                    
                    const { stdout, stderr } = await execAsync(fallbackCommand, {
                        timeout: 120000 // 2 minute timeout for fallback
                    });
                    
                    console.log(`Fallback stdout: ${stdout}`);
                    if (stderr && stderr.trim() !== '') {
                        console.log(`Fallback stderr: ${stderr}`);
                    }
                    
                    const filePath = this.extractFilePathFromOutput(stdout);
                    if (filePath) {
                        console.log(`Fallback succeeded: ${filePath}`);
                        return filePath;
                    }
                } catch (fallbackError) {
                    console.log(`Fallback also failed: ${fallbackError.message}`);
                }
            }
            
            throw new Error('No stream file found for Spotify track after trying all providers');
        } catch (error) {
            console.error('Failed to get Spotify stream:', error.message);
            if (error.message.includes('timeout')) {
                console.error('Download timed out - this song may not be available or network is slow');
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
                
                // Look for successful download messages with file paths
                if (trimmed.includes('Downloaded:') || trimmed.includes('✓') || trimmed.includes('Saved:')) {
                    const pathMatch = trimmed.match(/([^\s"]+\.(mp3|m4a|wav|flac|ogg))/i);
                    if (pathMatch) {
                        console.log(`Found file path in line: "${trimmed}"`);
                        return pathMatch[1];
                    }
                }
                
                // Look for file extensions in any line that might indicate success
                if (trimmed.includes('.mp3') || trimmed.includes('.m4a') || trimmed.includes('.wav') || trimmed.includes('.flac')) {
                    // Try to extract full path
                    const pathMatch = trimmed.match(/([^\s"]+\.(mp3|m4a|wav|flac|ogg))/i);
                    if (pathMatch) {
                        console.log(`Found potential file path: "${pathMatch[1]}"`);
                        return pathMatch[1];
                    }
                }
                
                // Look for absolute paths starting with /tmp/nyabot-music
                if (trimmed.includes('/tmp/nyabot-music/')) {
                    const pathMatch = trimmed.match(/(\/tmp\/nyabot-music\/[^\s"]+\.(mp3|m4a|wav|flac|ogg))/i);
                    if (pathMatch) {
                        console.log(`Found temp directory file path: "${pathMatch[1]}"`);
                        return pathMatch[1];
                    }
                }
            }
            
            // If no specific success message found, look for any file path mentioned
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.includes('/') && (trimmed.includes('.mp3') || trimmed.includes('.m4a'))) {
                    const pathMatch = trimmed.match(/([^\s"]+\.(mp3|m4a|wav|flac|ogg))/i);
                    if (pathMatch) {
                        console.log(`Found generic file path: "${pathMatch[1]}"`);
                        return pathMatch[1];
                    }
                }
            }
            
            console.log('No file path patterns found in output');
            return null;
        } catch (error) {
            console.error('Error extracting file path:', error);
            return null;
        }
    }
}

module.exports = new StreamProvider();
