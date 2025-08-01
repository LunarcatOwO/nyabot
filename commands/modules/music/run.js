exports.name = 'music';
exports.description = 'Music player commands';
exports.category = 'Music';

exports.execute = async (ctx) => {
    return {
        content: 'Please specify a subcommand. Use `/music play <query>` to play music.'
    };
};
