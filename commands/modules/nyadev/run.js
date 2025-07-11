exports.name = 'nyadev';
exports.description = 'NyaBot developer commands - Bot owner only';
exports.category = 'NyaBot Staff';
exports.permissions = ['BotOwner'];
exports.ephemeral = true;

exports.execute = async (ctx) => {
    return {
        content: 'Congrats. You seem to have managed to bypassed the permission check but you still caused an error. Report this to LunarcatOwO!'
    };
};
