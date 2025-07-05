# DM Helper

This helper provides functionality for logging DMs sent to the bot and sending DMs to users with automatic logging.

## Features

- Automatically logs all incoming DMs to a designated channel in your home server
- Provides functions to send DMs with automatic logging
- Supports both text and embed messages
- Includes error handling and fallback mechanisms

## Setup

1. Set the `HOME_GUILD` environment variable in your `.env` file to your home server's guild ID:
   ```
   HOME_GUILD=YOUR_HOME_GUILD_ID_HERE
   ```

2. Create a channel named `dm-logs` in your home server for optimal logging, or the helper will use the first available text channel.

## Usage

### Logging Incoming DMs

DMs are automatically logged when they are received. The logging is handled in the main `index.js` file.

### Sending DMs

```javascript
const helpers = require('./helpers/load.js');

// Send a simple text DM
await helpers.dm.send.sendDM(user, 'Hello!', client);

// Send a DM with initiator tracking
await helpers.dm.send.sendDM(user, 'Hello!', client, initiatorUser);

// Send a DM by user ID
await helpers.dm.send.sendDMById('123456789012345678', 'Hello!', client);

// Send a DM by user ID with initiator tracking
await helpers.dm.send.sendDMById('123456789012345678', 'Hello!', client, initiatorUser);

// Send a DM with an embed
const embed = new EmbedBuilder()
  .setTitle('Test')
  .setDescription('This is a test embed');
await helpers.dm.send.sendDMEmbed(user, embed, client);

// Send a DM with embed by user ID
await helpers.dm.send.sendDMEmbedById('123456789012345678', embed, client);
```

### Manual Logging

```javascript
// Log an incoming DM manually
await helpers.dm.log.logDM(message, client);

// Log an outgoing DM manually
await helpers.dm.log.logOutgoingDM(user, content, client);

// Log an outgoing DM with initiator tracking
await helpers.dm.log.logOutgoingDM(user, content, client, initiatorUser);
```

## Commands

A `/dm` slash command is included for administrators to send DMs directly. Only users with the ROOT_USR permission can use this command.

## Environment Variables

- `HOME_GUILD`: The guild ID of your home server where DM logs will be sent

## Notes

- All DM logging requires the `HOME_GUILD` environment variable to be set
- If the `dm-logs` channel doesn't exist, logs will be sent to the first available text channel
- Failed DM sends are logged to the console
- All functions include proper error handling and will not crash the bot if they fail
