exports.name = 'reboot';
exports.description = 'Reboot the bot (Bot owner only)';
exports.category = 'NyaBot Staff';
exports.permissions = ['BotOwner'];
exports.ephemeral = true;

exports.execute = async (ctx) => {
    await ctx.reply({
        embeds: [{
            title: 'Rebooting... 🔄',
            description: 'The bot is now rebooting. Please wait a few seconds.',
            color: 0x00bfff
        }]
    });
    // Give Discord time to send the message before exiting
    setTimeout(() => {
        process.exit(0);
    }, 1000);
}; 