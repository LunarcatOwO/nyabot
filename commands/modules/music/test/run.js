const streamProvider = require('../../../../helpers/music/stream');

exports.name = 'test';
exports.description = 'Test stream URL extraction for debugging';

exports.execute = async (ctx) => {
    const query = ctx.options?.getString('url') || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    
    const testSong = {
        title: 'Test Song',
        url: query,
        source: 'youtube'
    };

    try {
        const streamUrl = await streamProvider.getStreamUrl(testSong);
        
        if (streamUrl) {
            return {
                content: `✅ **Stream URL extraction successful!**\n\`\`\`\n${streamUrl}\`\`\``,
                ephemeral: true
            };
        } else {
            return {
                content: '❌ **Failed to extract stream URL** - Check console for detailed error logs.',
                ephemeral: true
            };
        }
    } catch (error) {
        return {
            content: `❌ **Error during stream extraction:**\n\`\`\`\n${error.message}\`\`\``,
            ephemeral: true
        };
    }
};
