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
    }

    async joinChannel(channel) {
        try {
            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
            });

            this.connections.set(channel.guild.id, connection);
            
            // Handle connection events
            connection.on(VoiceConnectionStatus.Disconnected, () => {
                this.cleanup(channel.guild.id);
            });

            return connection;
        } catch (error) {
            console.error('Error joining voice channel:', error);
            throw error;
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
        this.players.delete(guildId);
        this.connections.delete(guildId);
        this.skipVotes.delete(guildId);
    }
}

module.exports = new VoiceManager();
