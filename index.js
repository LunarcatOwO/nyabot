require("dotenv").config();
require("./instrument.js");
const { Client, GatewayIntentBits, Partials } = require("discord.js");

// Import database functions
const { initializeDB, closeDB } = require('./helpers/db/init');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.GuildMembers,
    Partials.Reaction,
    Partials.GuildScheduledEvent,
    Partials.ThreadMember,
  ],
  allowedMentions: { parse: ["users", "roles", "everyone"] },
});

// Load helpers and commands
const helpers = require("./helpers/load.js");
const commands = require("./commands/load.js");
const { registerSlashCommands } = require("./commands/slashCommandLoader.js");
const { loadInteractions, handleInteraction } = require("./interactions/load.js");

// Slash command interaction handler
client.on("interactionCreate", async (interaction) => {
  if (interaction.isCommand()) {
    const command = commands[interaction.commandName];
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: "There was an error executing that command.", ephemeral: true });
    }
  } else if (interaction.isButton()) {
    // Handle button interactions
    await handleInteraction(interaction);
  }
});

// Message command handler prefix
const prefix = "n+";

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.content.startsWith(prefix)) return;
  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const commandName = args.shift().toLowerCase();
  const command = commands[commandName];
  if (!command) return;
  try {
    await command.execute(message, args);
  } catch (err) {
    console.error(err);
    await message.channel.send("There was an error executing that command.");
  }
});

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  
  // Initialize database connection and schema
  await initializeDB();
  
  // Load interaction handlers
  loadInteractions();
  
  // Register slash commands
  await registerSlashCommands();
  helpers.status.setStatus.startStatusRotation(client); // Start status rotation every 10 seconds
});

// Graceful shutdown handling
const shutdown = async (signal) => {
  console.log(`Received ${signal}, shutting down gracefully...`);
  await closeDB();
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

client.login(process.env.TOKEN);
