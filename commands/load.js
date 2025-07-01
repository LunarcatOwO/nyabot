
const fs = require('fs');
const path = require('path');

function wrapCommand(cmd) {
    // Wrap the execute/run function to handle both interaction and message
    const original = cmd.execute || cmd.run;
    return {
        ...cmd,
        execute: async (ctx) => {
            const result = await original(ctx);
            if (!result) return;
            // If this is a Discord.js interaction (slash command)
            if (ctx && typeof ctx.reply === 'function') {
                await ctx.reply(result);
            // If this is a message (old message command)
            } else if (ctx && ctx.channel && typeof ctx.channel.send === 'function') {
                await ctx.channel.send(result);
            }
        }
    };
}

function getModules(dir) {
    let modules = {};
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
        if (item.isDirectory()) {
            // Recursively search subfolders
            const subModules = getModules(path.join(dir, item.name));
            modules = { ...modules, ...subModules };
        } else if (item.isFile() && item.name === 'run.js') {
            // Import the run.js file and use the folder name as the key
            const folderName = path.basename(dir);
            const mod = require(path.join(dir, item.name));
            modules[folderName] = wrapCommand(mod);
        }
    }
    return modules;
}

const load = getModules(path.join(__dirname, 'modules'));

module.exports = load;
