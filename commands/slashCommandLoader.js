
const { REST, Routes } = require('discord.js');
const load = require('./load');
const fs = require('fs');
const path = require('path');

// You need to set these values for your bot

const CLIENT_ID = process.env.CLIENT_ID;
const TOKEN = process.env.TOKEN;
// Prepare commands for registration
const commands = Object.values(load).map(cmd => ({
    name: cmd.name,
    description: cmd.description || 'No description',
}));

const rest = new REST({ version: '10' }).setToken(TOKEN);

async function registerSlashCommands() {
    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands },
        );
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
}

module.exports = { registerSlashCommands };
