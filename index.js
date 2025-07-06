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
  } else if (interaction.isButton() || interaction.isStringSelectMenu()) {
    // Handle button and select menu interactions
    await handleInteraction(interaction);
  }
});

// Message command handler prefix
const prefix = "n+";

client.on("messageCreate", async (message) => {
  // Handle DMs
  if (message.channel.type === 1) { // DM channel
    if (!message.author.bot) {
      // Check if the message is a command (starts with prefix)
      const isCommand = message.content.startsWith(prefix);
      
      // Only log DMs that are not commands
      if (!isCommand) {
        await helpers.dm.log.logDM(message, client);
      }
    }
    return; // Don't process DMs as commands
  }
  
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
  
  // Start periodic guild data cleanup (check every hour)
  if (helpers.guild && helpers.guild.cleanup) {
    helpers.guild.cleanup.startPeriodicCleanup(60); // 60 minutes
  }
  
  // Start periodic guild data synchronization (check every hour)
  if (helpers.guild && helpers.guild.sync) {
    helpers.guild.sync.startPeriodicSync(client, 60); // 60 minutes = 1 hour
  }
});

// Guild join event - cancel any pending data purge
client.on("guildCreate", async (guild) => {
  console.log(`✅ Joined guild: ${guild.name} (${guild.id})`);
  
  // Store guild information in database using sync helper
  try {
    if (helpers.guild && helpers.guild.sync) {
      await helpers.guild.sync.syncGuildData(guild);
    } else {
      // Fallback to direct database write if sync helper not available
      const db = require('./helpers/db');
      await db.write.upsertGuild(guild.id, {
        name: guild.name,
        icon: guild.iconURL(),
        ownerId: guild.ownerId,
        memberCount: guild.memberCount
      });
    }
    
    // Cancel any pending data purge for this guild (in case we rejoined)
    if (helpers.guild && helpers.guild.cleanup) {
      await helpers.guild.cleanup.cancelGuildDeparture(guild.id);
    }
  } catch (error) {
    console.error('❌ Error handling guild join:', error.message);
  }
});

// Guild leave event - schedule data purge after 48 hours
client.on("guildDelete", async (guild) => {
  console.log(`❌ Left guild: ${guild.name} (${guild.id})`);
  
  // Record the departure and schedule data purge
  try {
    if (helpers.guild && helpers.guild.cleanup) {
      await helpers.guild.cleanup.recordGuildDeparture(guild);
    }
  } catch (error) {
    console.error('❌ Error handling guild departure:', error.message);
  }
});

// Guild update event - sync guild data when guild information changes
client.on("guildUpdate", async (oldGuild, newGuild) => {
  console.log(`🔄 Guild updated: ${newGuild.name} (${newGuild.id})`);
  
  // Check if relevant data changed
  const relevantChange = (
    oldGuild.name !== newGuild.name ||
    oldGuild.iconURL() !== newGuild.iconURL() ||
    oldGuild.ownerId !== newGuild.ownerId ||
    oldGuild.memberCount !== newGuild.memberCount
  );
  
  if (relevantChange) {
    try {
      if (helpers.guild && helpers.guild.sync) {
        await helpers.guild.sync.syncGuildData(newGuild);
      }
    } catch (error) {
      console.error('❌ Error syncing guild update:', error.message);
    }
  }
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
