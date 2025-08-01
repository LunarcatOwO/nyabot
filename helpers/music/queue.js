class QueueManager {
    constructor() {
        this.queues = new Map(); // guildId -> queue object
    }

    getQueue(guildId) {
        if (!this.queues.has(guildId)) {
            this.queues.set(guildId, {
                songs: [],
                currentIndex: 0,
                loop: false,
                shuffle: false,
                volume: 1.0
            });
        }
        return this.queues.get(guildId);
    }

    addSong(guildId, song) {
        const queue = this.getQueue(guildId);
        queue.songs.push(song);
        return queue.songs.length;
    }

    getCurrentSong(guildId) {
        const queue = this.getQueue(guildId);
        return queue.songs[queue.currentIndex] || null;
    }

    next(guildId) {
        const queue = this.getQueue(guildId);
        
        if (queue.shuffle) {
            // Pick a random song from the remaining songs
            const remainingSongs = queue.songs.length - queue.currentIndex - 1;
            if (remainingSongs > 0) {
                const randomIndex = queue.currentIndex + 1 + Math.floor(Math.random() * remainingSongs);
                // Swap current next song with randomly selected song
                [queue.songs[queue.currentIndex + 1], queue.songs[randomIndex]] = 
                [queue.songs[randomIndex], queue.songs[queue.currentIndex + 1]];
            }
        }

        queue.currentIndex++;
        
        if (queue.currentIndex >= queue.songs.length) {
            return false; // End of queue
        }

        return true;
    }

    previous(guildId) {
        const queue = this.getQueue(guildId);
        
        if (queue.currentIndex > 0) {
            queue.currentIndex--;
            return true;
        }
        
        return false;
    }

    clear(guildId) {
        const queue = this.getQueue(guildId);
        queue.songs = [];
        queue.currentIndex = 0;
    }

    getQueueList(guildId, page = 1, pageSize = 10) {
        const queue = this.getQueue(guildId);
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        
        return {
            songs: queue.songs.slice(start, end),
            currentIndex: queue.currentIndex,
            totalSongs: queue.songs.length,
            page: page,
            totalPages: Math.ceil(queue.songs.length / pageSize)
        };
    }

    setVolume(guildId, volume) {
        const queue = this.getQueue(guildId);
        volume = Math.max(0, Math.min(1, volume));
        queue.volume = volume;
        return volume;
    }

    toggleLoop(guildId) {
        const queue = this.getQueue(guildId);
        queue.loop = !queue.loop;
        return queue.loop;
    }

    toggleShuffle(guildId) {
        const queue = this.getQueue(guildId);
        queue.shuffle = !queue.shuffle;
        return queue.shuffle;
    }

    cleanup(guildId) {
        this.queues.delete(guildId);
    }
}

module.exports = new QueueManager();
