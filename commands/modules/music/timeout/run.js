const musicManager = require('../../../../helpers/music');

exports.name = 'timeout';
exports.description = 'Show time until auto-disconnect or manually trigger timeout for testing';
exports.options = [
    {
        name: 'action',
        type: 3, // STRING type
        description: 'Action to perform',
        required: false,
        choices: [
            { name: 'status', value: 'status' },
            { name: 'trigger', value: 'trigger' },
            { name: 'reset', value: 'reset' }
        ]
    }
];

exports.execute = async (ctx) => {
    const action = ctx.options?.getString('action') || 'status';
    const voiceManager = require('../../../../helpers/music/voice');
    
    if (action === 'trigger') {
        // Manually trigger auto-disconnect for testing
        voiceManager.autoDisconnect(ctx.guild.id);
        return { content: '🔕 **Manually triggered auto-disconnect**' };
    } else if (action === 'reset') {
        // Reset the inactivity timer
        if (musicManager.shouldStayConnected(ctx.guild.id)) {
            voiceManager.resetInactivityTimer(ctx.guild.id);
            return { content: '🔄 **Inactivity timer reset** - Bot will auto-disconnect in 5 minutes if inactive' };
        } else {
            return { content: '❌ Bot is not connected or has no reason to stay connected' };
        }
    } else {
        // Show status
        const hasTimer = voiceManager.inactivityTimers.has(ctx.guild.id);
        const isConnected = voiceManager.connections.has(ctx.guild.id);
        const shouldStay = musicManager.shouldStayConnected(ctx.guild.id);
        
        let status = `**Auto-Disconnect Status:**\n`;
        status += `🔗 Connected: ${isConnected ? 'Yes' : 'No'}\n`;
        status += `⏰ Timer Active: ${hasTimer ? 'Yes' : 'No'}\n`;
        status += `🎵 Should Stay: ${shouldStay ? 'Yes' : 'No'}\n`;
        status += `\n*Bot will auto-disconnect after 5 minutes of inactivity*`;
        
        return { content: status, ephemeral: true };
    }
};
