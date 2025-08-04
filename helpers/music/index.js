const MusicManagerClass = require('./MusicManager');

// Create singleton instance
const musicManagerInstance = new MusicManagerClass();

// Export both the class and instance for different use cases
module.exports = {
    MusicManager: musicManagerInstance,  // For commands that expect an instance
    MusicManagerClass: MusicManagerClass // For any code that might need the class
};

// Also export the instance directly for require('...music') usage
module.exports.default = musicManagerInstance;
