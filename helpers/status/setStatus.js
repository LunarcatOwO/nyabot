const { ActivityType } = require('discord.js');

// Global state for status rotation
let rotationInterval = null;
let isAutoRotationEnabled = true;
let currentClient = null;

/**
 * Set the bot's status and activity
 * @param {Client} client - The Discord client
 * @param {Object} options - Status options
 * @param {string} options.status - Bot status: 'online', 'idle', 'dnd', 'invisible'
 * @param {string} options.activity - Activity text
 * @param {string} options.type - Activity type: 'PLAYING', 'WATCHING', 'LISTENING', 'STREAMING', 'COMPETING'
 * @param {string} options.url - URL for streaming activity (optional)
 * @param {boolean} options.disableAutoRotation - Whether to disable auto rotation (default: true for manual sets)
 */
function setStatus(client, options = {}) {
    const {
        status = 'online',
        activity = 'with commands | n+ help',
        type = 'PLAYING',
        url = null,
        disableAutoRotation = true // Default to true for manual status sets
    } = options;

    // Store client reference for potential auto-rotation restart
    currentClient = client;

    // Map string types to Discord.js ActivityType enum
    const activityTypeMap = {
        'PLAYING': ActivityType.Playing,
        'WATCHING': ActivityType.Watching,
        'LISTENING': ActivityType.Listening,
        'STREAMING': ActivityType.Streaming,
        'COMPETING': ActivityType.Competing
    };

    const activityType = activityTypeMap[type.toUpperCase()] || ActivityType.Playing;

    try {
        const activityOptions = {
            name: activity,
            type: activityType
        };

        // Add URL for streaming activity
        if (type.toUpperCase() === 'STREAMING' && url) {
            activityOptions.url = url;
        }

        client.user.setPresence({
            status: status,
            activities: [activityOptions]
        });

        // Disable auto rotation if this is a manual status set
        if (disableAutoRotation) {
            stopStatusRotation();
            console.log(`✅ Status set: ${status} | ${type}: ${activity} (Auto-rotation disabled)`);
        } else {
            console.log(`✅ Status set: ${status} | ${type}: ${activity}`);
        }
        
        return true;
    } catch (error) {
        console.error('❌ Failed to set status:', error);
        return false;
    }
}

/**
 * Set a random status from predefined options
 * @param {Client} client - The Discord client
 * @param {boolean} isAutoRotation - Whether this is being called by auto-rotation (default: false)
 */
function setRandomStatus(client, isAutoRotation = false) {
    const statusOptions = [
        { activity: 'with commands | n+ help', type: 'PLAYING' },
        { activity: 'to what you say', type: 'LISTENING' },
        { activity: 'with cozy', type: 'COMPETING' },
        { activity: 'your every move', type: 'WATCHING' },
        { activity: 'The Banlist | n+ banlist', type: 'WATCHING' },
        { activity: 'the world burn', type: 'WATCHING' }
    ];

    const randomStatus = statusOptions[Math.floor(Math.random() * statusOptions.length)];
    
    // Don't disable auto-rotation if this is being called by auto-rotation itself
    // But disable it if manually called
    return setStatus(client, { 
        ...randomStatus, 
        disableAutoRotation: !isAutoRotation 
    });
}

/**
 * Cycle through different statuses every interval
 * @param {Client} client - The Discord client
 * @param {number} interval - Interval in seconds (default: 30 seconds)
 */
function startStatusRotation(client, interval = 30) {
    // Store client reference
    currentClient = client;
    
    // Stop any existing rotation
    stopStatusRotation();
    
    // Set initial status (don't disable auto-rotation since this is auto-rotation starting)
    setRandomStatus(client, true);

    rotationInterval = setInterval(() => {
        if (isAutoRotationEnabled) {
            setRandomStatus(client, true);
        }
    }, interval * 1000);

    isAutoRotationEnabled = true;
    console.log(`🔄 Status rotation started (${interval}s interval)`);
    return rotationInterval;
}

/**
 * Stop status rotation
 */
function stopStatusRotation() {
    if (rotationInterval) {
        clearInterval(rotationInterval);
        rotationInterval = null;
    }
    isAutoRotationEnabled = false;
    console.log(`⏹️ Status rotation stopped`);
}

/**
 * Enable auto status rotation (restart if client is available)
 * @param {number} interval - Interval in seconds (default: 30 seconds)
 */
function enableAutoRotation(interval = 30) {
    if (currentClient) {
        startStatusRotation(currentClient, interval);
        return true;
    } else {
        isAutoRotationEnabled = true;
        console.log('⚠️ Auto-rotation enabled but no client available');
        return false;
    }
}

/**
 * Disable auto status rotation
 */
function disableAutoRotation() {
    stopStatusRotation();
}

/**
 * Check if auto rotation is currently enabled
 */
function isAutoRotationActive() {
    return isAutoRotationEnabled && rotationInterval !== null;
}

/**
 * Get current auto rotation status
 */
function getRotationStatus() {
    return {
        enabled: isAutoRotationEnabled,
        active: rotationInterval !== null,
        hasClient: currentClient !== null
    };
}

module.exports = {
    setStatus,
    setRandomStatus,
    startStatusRotation,
    stopStatusRotation,
    enableAutoRotation,
    disableAutoRotation,
    isAutoRotationActive,
    getRotationStatus
};