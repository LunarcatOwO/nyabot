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
      if (!currentGuildIds.has(dbGuild.id)) {
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
 * Get guild sync statistics
 * @param {Client} client - The Discord client instance
 */
async function getGuildSyncStats(client) {
  try {
    const currentGuilds = client.guilds.cache.size;
    const dbGuildsResult = await readFromDB('SELECT COUNT(*) as count FROM guilds');
    const dbGuilds = dbGuildsResult[0]?.count || 0;
    
    // Get outdated guilds (guilds that haven't been updated in the last 24 hours)
    const outdatedGuildsResult = await readFromDB(`
      SELECT COUNT(*) as count FROM guilds 
      WHERE updated_at < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 24 HOUR)
    `);
    const outdatedGuilds = outdatedGuildsResult[0]?.count || 0;
    
    return {
      currentGuilds,
      dbGuilds,
      outdatedGuilds,
      syncNeeded: currentGuilds !== dbGuilds || outdatedGuilds > 0
    };
  } catch (error) {
    console.error('❌ Error getting guild sync stats:', error.message);
    return null;
  }
}

/**
 * Start periodic guild synchronization
 * @param {Client} client - The Discord client instance
 * @param {number} intervalMinutes - How often to sync (in minutes, default: 360 = 6 hours)
 */
function startPeriodicSync(client, intervalMinutes = 60) {
  console.log(`🔄 Starting periodic guild synchronization (every ${intervalMinutes} minutes)`);
  
  // Run initial sync after 2 minutes (to let bot fully initialize)
  setTimeout(async () => {
    try {
      await syncAllGuilds(client);
      await checkForLeftGuilds(client);
    } catch (error) {
      console.error('❌ Error during initial guild sync:', error.message);
    }
  }, 1 * 60 * 1000);
  
  // Then run periodically
  setInterval(async () => {
    try {
      await syncAllGuilds(client);
      await checkForLeftGuilds(client);
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
    
    console.log('✅ Full guild audit completed');
    return {
      stats,
      syncResult,
      leftResult
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
  getGuildSyncStats,
  startPeriodicSync,
  performFullGuildAudit
};
