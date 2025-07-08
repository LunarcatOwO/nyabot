const { readFromDB } = require('../db/init');
const db = require('../db');

/**
 * Sync all guild data for guilds the bot is currently in
 * @param {Client} client - The Discord client instance
 */
async function syncAllGuilds(client) {
  try {
    console.log('🔄 Starting guild data synchronization...');
    
    const guilds = client.guilds.cache;
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const [guildId, guild] of guilds) {
      try {
        await syncGuildData(guild);
        updatedCount++;
      } catch (error) {
        console.error(`❌ Failed to sync guild ${guild.name} (${guildId}):`, error.message);
        errorCount++;
      }
    }
    
    console.log(`✅ Guild sync completed: ${updatedCount} updated, ${errorCount} errors`);
    return { updated: updatedCount, errors: errorCount };
  } catch (error) {
    console.error('❌ Error during guild synchronization:', error.message);
    throw error;
  }
}

/**
 * Sync data for a specific guild
 * @param {Guild} guild - The Discord guild object
 */
async function syncGuildData(guild) {
  try {
    const guildData = {
      name: guild.name,
      icon: guild.iconURL(),
      ownerId: guild.ownerId,
      memberCount: guild.memberCount
    };
    
    await db.write.upsertGuild(guild.id, guildData);
    console.log(`✅ Synced guild: ${guild.name} (${guild.id})`);
  } catch (error) {
    console.error(`❌ Failed to sync guild ${guild.name} (${guild.id}):`, error.message);
    throw error;
  }
}

/**
 * Check for guilds in database that the bot is no longer in and mark for cleanup
 * @param {Client} client - The Discord client instance
 */
async function checkForLeftGuilds(client) {
  try {
    console.log('🔍 Checking for guilds the bot has left...');
    
    // Get all guilds from database
    const dbGuilds = await readFromDB('SELECT id, name FROM guilds');
    const currentGuildIds = new Set(client.guilds.cache.keys());
    
    let leftGuilds = [];
    
    for (const dbGuild of dbGuilds) {
      // Ensure both IDs are strings for comparison (database returns BigInt, Discord uses strings)
      const dbGuildId = String(dbGuild.id);
      if (!currentGuildIds.has(dbGuildId)) {
        leftGuilds.push(dbGuild);
      }
    }
    
    if (leftGuilds.length === 0) {
      console.log('✅ All database guilds match current guilds');
      return { leftGuilds: [] };
    }
    
    console.log(`📋 Found ${leftGuilds.length} guild(s) that the bot has left:`);
    
    for (const guild of leftGuilds) {
      console.log(`  - ${guild.name} (${guild.id})`);
      
      // Create a mock guild object for the cleanup system
      const mockGuild = {
        id: guild.id,
        name: guild.name
      };
      
      // Record the departure if not already recorded
      const helpers = require('../load.js');
      if (helpers.guild && helpers.guild.cleanup) {
        await helpers.guild.cleanup.recordGuildDeparture(mockGuild);
      }
    }
    
    return { leftGuilds };
  } catch (error) {
    console.error('❌ Error checking for left guilds:', error.message);
    throw error;
  }
}

/**
 * Check for guilds that are incorrectly marked for purging but bot is still in them
 * @param {Client} client - The Discord client instance
 */
async function checkForIncorrectlyMarkedGuilds(client) {
  try {
    console.log('🔍 Checking for incorrectly marked guilds...');
    
    // Get all guilds marked for departure
    const markedGuilds = await readFromDB('SELECT guild_id, guild_name FROM guild_departures');
    const currentGuildIds = new Set(client.guilds.cache.keys());
    
    let incorrectlyMarked = [];
    
    for (const markedGuild of markedGuilds) {
      // Ensure both IDs are strings for comparison (database returns BigInt, Discord uses strings)
      const markedGuildId = String(markedGuild.guild_id);
      if (currentGuildIds.has(markedGuildId)) {
        incorrectlyMarked.push(markedGuild);
      }
    }
    
    if (incorrectlyMarked.length === 0) {
      console.log('✅ No incorrectly marked guilds found');
      return { canceledDepartures: [] };
    }
    
    console.log(`📋 Found ${incorrectlyMarked.length} guild(s) incorrectly marked for departure:`);
    
    for (const guild of incorrectlyMarked) {
      console.log(`  - ${guild.guild_name} (${guild.guild_id})`);
      
      // Cancel the departure record since we're still in the guild
      const helpers = require('../load.js');
      if (helpers.guild && helpers.guild.cleanup) {
        await helpers.guild.cleanup.cancelGuildDeparture(String(guild.guild_id));
      }
    }
    
    return { canceledDepartures: incorrectlyMarked };
  } catch (error) {
    console.error('❌ Error checking for incorrectly marked guilds:', error.message);
    throw error;
  }
}

/**
 * Get guild sync statistics
 * @param {Client} client - The Discord client instance
 */
async function getGuildSyncStats(client) {
  try {
    const currentGuilds = client.guilds.cache.size;
    const dbGuildsResult = await readFromDB('SELECT COUNT(*) as count FROM guilds');
    const dbGuilds = dbGuildsResult[0]?.count || 0;
    
    return {
      currentGuilds,
      dbGuilds,
      outdatedGuilds: 0, // Removed outdated guild tracking
      syncNeeded: currentGuilds !== dbGuilds
    };
  } catch (error) {
    console.error('❌ Error getting guild sync stats:', error.message);
    return null;
  }
}

/**
 * Start periodic guild synchronization
 * @param {Client} client - The Discord client instance
 * @param {number} intervalMinutes - How often to sync (in minutes, default: 60 = 1 hour)
 */
function startPeriodicSync(client, intervalMinutes = 60) {
  console.log(`🔄 Starting periodic guild synchronization (every ${intervalMinutes} minutes)`);
  
  // Run initial sync after 2 minutes (to let bot fully initialize)
  setTimeout(async () => {
    try {
      await syncAllGuilds(client);
      await checkForLeftGuilds(client);
      await checkForIncorrectlyMarkedGuilds(client);
    } catch (error) {
      console.error('❌ Error during initial guild sync:', error.message);
    }
  }, 2 * 60 * 1000);
  
  // Then run periodically
  setInterval(async () => {
    try {
      await syncAllGuilds(client);
      await checkForLeftGuilds(client);
      await checkForIncorrectlyMarkedGuilds(client);
    } catch (error) {
      console.error('❌ Error during periodic guild sync:', error.message);
    }
  }, intervalMinutes * 60 * 1000);
}

/**
 * Perform a full guild audit - sync all guilds and check for discrepancies
 * @param {Client} client - The Discord client instance
 */
async function performFullGuildAudit(client) {
  try {
    console.log('🔍 Starting full guild audit...');
    
    const stats = await getGuildSyncStats(client);
    console.log('📊 Guild Stats:', stats);
    
    // Sync all current guilds
    const syncResult = await syncAllGuilds(client);
    
    // Check for left guilds
    const leftResult = await checkForLeftGuilds(client);
    
    // Check for incorrectly marked guilds
    const incorrectResult = await checkForIncorrectlyMarkedGuilds(client);
    
    console.log('✅ Full guild audit completed');
    return {
      stats,
      syncResult,
      leftResult,
      incorrectResult
    };
  } catch (error) {
    console.error('❌ Error during full guild audit:', error.message);
    throw error;
  }
}

module.exports = {
  syncAllGuilds,
  syncGuildData,
  checkForLeftGuilds,
  checkForIncorrectlyMarkedGuilds,
  getGuildSyncStats,
  startPeriodicSync,
  performFullGuildAudit
};
