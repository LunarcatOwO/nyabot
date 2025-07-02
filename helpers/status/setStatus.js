const { ActivityType } = require('discord.js');

/**
 * Set the bot's status and activity
 * @param {Client} client - The Discord client
 * @param {Object} options - Status options
 * @param {string} options.status - Bot status: 'online', 'idle', 'dnd', 'invisible'
 * @param {string} options.activity - Activity text
 * @param {string} options.type - Activity type: 'PLAYING', 'WATCHING', 'LISTENING', 'STREAMING', 'COMPETING'
 * @param {string} options.url - URL for streaming activity (optional)
 */
function setStatus(client, options = {}) {
    const {
        status = 'online',
        activity = 'with commands | n+help',
        type = 'PLAYING',
        url = null
    } = options;

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

        console.log(`✅ Status set: ${status} | ${type}: ${activity}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to set status:', error);
        return false;
    }
}

/**
 * Set a random status from predefined options
 * @param {Client} client - The Discord client
 */
function setRandomStatus(client) {
    const statusOptions = [
        { activity: 'with commands | n+help', type: 'PLAYING' },
        { activity: 'over the server', type: 'WATCHING' },
        { activity: 'to music', type: 'LISTENING' },
        { activity: 'with Discord.js', type: 'PLAYING' },
        { activity: 'with cozy', type: 'COMPETING' },
        { activity: 'user commands', type: 'WATCHING' }
    ];

    const randomStatus = statusOptions[Math.floor(Math.random() * statusOptions.length)];
    return setStatus(client, randomStatus);
}

/**
 * Cycle through different statuses every interval
 * @param {Client} client - The Discord client
 * @param {number} interval - Interval in milliseconds (default: 30 seconds)
 */
function startStatusRotation(client, interval = 30000) {
    setRandomStatus(client); // Set initial status

    const rotationInterval = setInterval(() => {
        setRandomStatus(client);
    }, interval);

    console.log(`🔄 Status rotation started (${interval}ms interval)`);
    return rotationInterval;
}

module.exports = {
    setStatus,
    setRandomStatus,
    startStatusRotation
};