exports.name = 'help';
exports.description = 'Displays help information.';
exports.execute = async (ctx, args) => {
    return {
        embeds: [
            {
                title: 'Help',
                description: 'Hello',
                color: 0x5865F2
            }
        ]
    };
};
