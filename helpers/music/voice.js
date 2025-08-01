const { 
    createAudioPlayer, 
    createAudioResource, 
    joinVoiceChannel, 
    VoiceConnectionStatus, 
    AudioPlayerStatus
} = require('@discordjs/voice');

class VoiceManager {
    constructor() {
        this.players = new Map(); // guildId -> audio player
        this.connections = new Map(); // guildId -> voice connection
        this.skipVotes = new Map(); // guildId -> Set of user IDs who voted to skip
        this.inactivityTimers = new Map(); // guildId -> timeout ID
        this.lastChannels = new Map(); // guildId -> last text channel for notifications
        this.INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds
    }

    async joinChannel(channel) {
        try {
            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
            });

            this.connections.set(channel.guild.id, connection);
            
            // Start inactivity timer
            this.resetInactivityTimer(channel.guild.id);
            
            // Handle connection events
            connection.on(VoiceConnectionStatus.Disconnected, () => {
                console.log(`Voice connection disconnected for guild ${channel.guild.id}`);
                this.handleDisconnection(channel.guild.id);
            });

            connection.on(VoiceConnectionStatus.Destroyed, () => {
                console.log(`Voice connection destroyed for guild ${channel.guild.id}`);
                this.handleDisconnection(channel.guild.id);
            });

            connection.on('error', (error) => {
                console.error(`Voice connection error for guild ${channel.guild.id}:`, error);
                this.handleDisconnection(channel.guild.id);
            });

            return connection;
        } catch (error) {
            console.error('Error joining voice channel:', error);
            throw error;
        }
    }

    handleDisconnection(guildId) {
        console.log(`Handling disconnection for guild ${guildId}`);
        
        // Stop music and clear queue
        const musicManager = require('./index');
        musicManager.stop(guildId);
        
        // Clean up all resources
        this.cleanup(guildId);
    }

    resetInactivityTimer(guildId) {
        // Clear existing timer
        if (this.inactivityTimers.has(guildId)) {
            clearTimeout(this.inactivityTimers.get(guildId));
        }

        // Set new timer
        const timer = setTimeout(() => {
            console.log(`Auto-disconnecting from guild ${guildId} due to inactivity`);
            this.autoDisconnect(guildId);
        }, this.INACTIVITY_TIMEOUT);

        this.inactivityTimers.set(guildId, timer);
    }

    autoDisconnect(guildId) {
        const connection = this.connections.get(guildId);
        if (connection) {
            console.log(`Auto-leaving voice channel in guild ${guildId} after 5 minutes of inactivity`);
            
            // Send notification if we have a channel stored
            const lastChannel = this.lastChannels.get(guildId);
            if (lastChannel) {
                try {
                    lastChannel.send('🔕 **Left voice channel due to 5 minutes of inactivity**');
                } catch (error) {
                    console.error('Failed to send auto-disconnect message:', error);
                }
            }
            
            // Stop music and clean up
            const musicManager = require('./index');
            musicManager.stop(guildId);
            
            // Disconnect
            connection.destroy();
        }
    }

    // Store last text channel for notifications
    setLastChannel(guildId, channel) {
        this.lastChannels.set(guildId, channel);
    }

    clearInactivityTimer(guildId) {
        if (this.inactivityTimers.has(guildId)) {
            clearTimeout(this.inactivityTimers.get(guildId));
            this.inactivityTimers.delete(guildId);
        }
    }

    async playStream(guildId, streamUrl, volume = 1.0) {
        const connection = this.connections.get(guildId);
        
        if (!connection || !streamUrl) {
            return false;
        }

        try {
            const resource = createAudioResource(streamUrl, {
                inputType: 'arbitrary',
                inlineVolume: true
            });

            if (resource.volume) {
                resource.volume.setVolume(volume);
            }

            let player = this.players.get(guildId);
            if (!player) {
                player = createAudioPlayer();
                this.players.set(guildId, player);
                connection.subscribe(player);
            }

            player.play(resource);
            
            // Clear skip votes when a new song starts
            this.skipVotes.delete(guildId);
            
            // Reset inactivity timer since music is playing
            this.resetInactivityTimer(guildId);
            
            return true;
        } catch (error) {
            console.error('Error playing stream:', error);
            return false;
        }
    }

    pause(guildId) {
        const player = this.players.get(guildId);
        if (player) {
            player.pause();
            return true;
        }
        return false;
    }

    resume(guildId) {
        const player = this.players.get(guildId);
        if (player) {
            player.unpause();
            return true;
        }
        return false;
    }

    stop(guildId) {
        const player = this.players.get(guildId);
        if (player) {
            player.stop();
            // Start inactivity timer when music stops
            this.resetInactivityTimer(guildId);
            return true;
        }
        return false;
    }

    leave(guildId) {
        const connection = this.connections.get(guildId);
        if (connection) {
            connection.destroy();
        }
        this.cleanup(guildId);
    }

    voteSkip(guildId, userId, voiceChannel) {
        if (!this.skipVotes.has(guildId)) {
            this.skipVotes.set(guildId, new Set());
        }

        const votes = this.skipVotes.get(guildId);
        votes.add(userId);

        const membersInChannel = voiceChannel.members.filter(member => !member.user.bot).size;
        const requiredVotes = Math.ceil(membersInChannel / 2);

        if (votes.size >= requiredVotes) {
            this.skipVotes.delete(guildId);
            return { skipped: true, votes: votes.size, required: requiredVotes };
        }

        return { skipped: false, votes: votes.size, required: requiredVotes };
    }

    setVolume(guildId, volume) {
        const player = this.players.get(guildId);
        
        if (player && player.state.resource && player.state.resource.volume) {
            player.state.resource.volume.setVolume(volume);
            return true;
        }
        
        return false;
    }

    isPlaying(guildId) {
        const player = this.players.get(guildId);
        return player && player.state.status === AudioPlayerStatus.Playing;
    }

    isPaused(guildId) {
        const player = this.players.get(guildId);
        return player && player.state.status === AudioPlayerStatus.Paused;
    }

    onPlayerIdle(guildId, callback) {
        const player = this.players.get(guildId);
        if (player) {
            player.on(AudioPlayerStatus.Idle, callback);
        }
    }

    onPlayerError(guildId, callback) {
        const player = this.players.get(guildId);
        if (player) {
            player.on('error', callback);
        }
    }

    cleanup(guildId) {
        // Clear inactivity timer
        this.clearInactivityTimer(guildId);
        
        // Clean up resources
        this.players.delete(guildId);
        this.connections.delete(guildId);
        this.skipVotes.delete(guildId);
        this.lastChannels.delete(guildId);
    }
}

module.exports = new VoiceManager();
