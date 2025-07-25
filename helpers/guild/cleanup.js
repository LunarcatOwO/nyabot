const { writeToDB, readFromDB, executeTransaction } = require('../db/init');

/**
 * Record when the bot leaves a guild
 * @param {Guild} guild - The Discord guild object
 */
async function recordGuildDeparture(guild) {
  try {
    const purgeScheduledAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours from now
    
    await writeToDB(`
      INSERT INTO guild_departures (guild_id, guild_name, left_at, purge_scheduled_at)
      VALUES (?, ?, CURRENT_TIMESTAMP, ?)
      ON DUPLICATE KEY UPDATE
        guild_name = VALUES(guild_name),
        left_at = CURRENT_TIMESTAMP,
        purge_scheduled_at = VALUES(purge_scheduled_at)
    `, [guild.id, guild.name, purgeScheduledAt]);
    
    console.log(`✅ Recorded departure from guild: ${guild.name} (${guild.id}). Data will be purged after 48 hours.`);
  } catch (error) {
    console.error('❌ Failed to record guild departure:', error.message);
  }
}

/**
 * Remove guild departure record if the bot rejoins within 48 hours
 * @param {string} guildId - The guild ID
 */
async function cancelGuildDeparture(guildId) {
  try {
    // First check if there's a pending departure
    const existingDeparture = await readFromDB(`
      SELECT * FROM guild_departures 
      WHERE guild_id = ?
    `, [guildId]);

    if (existingDeparture.length > 0) {
      console.log(`🔍 Found pending departure for guild ${guildId}:`, JSON.stringify(existingDeparture[0], (key, value) => 
        typeof value === 'bigint' ? value.toString() : value, 2));
    }

    const result = await writeToDB(`
      DELETE FROM guild_departures 
      WHERE guild_id = ?
    `, [guildId]);
    
    if (result.affectedRows > 0) {
      console.log(`✅ Cancelled scheduled data purge for guild: ${guildId} (rejoined within grace period)`);
    }
  } catch (error) {
    console.error('❌ Failed to cancel guild departure:', error.message);
  }
}

/**
 * Purge all data related to a specific guild
 * @param {string} guildId - The guild ID to purge data for
 */
async function purgeGuildData(guildId) {
  try {
    console.log(`🗑️ Starting data purge for guild: ${guildId}`);
    
    // First, collect data counts to show what will be purged
    const dataDump = {
      userData: await readFromDB('SELECT COUNT(*) as count FROM user_data WHERE guild_id = ?', [guildId]),
      commandLogs: await readFromDB('SELECT COUNT(*) as count FROM command_logs WHERE guild_id = ?', [guildId]),
      bans: await readFromDB('SELECT COUNT(*) as count FROM bans WHERE guild_id = ?', [guildId]),
      warnings: await readFromDB('SELECT COUNT(*) as count FROM warnings WHERE guild_id = ?', [guildId]),
      guildInfo: await readFromDB('SELECT COUNT(*) as count FROM guilds WHERE id = ?', [guildId])
    };

    const queries = [
      // Remove user data for this guild
      {
        query: 'DELETE FROM user_data WHERE guild_id = ?',
        params: [guildId]
      },
      // Remove command logs for this guild
      {
        query: 'DELETE FROM command_logs WHERE guild_id = ?',
        params: [guildId]
      },
      // Remove bans for this guild
      {
        query: 'DELETE FROM bans WHERE guild_id = ?',
        params: [guildId]
      },
      // Remove warnings for this guild
      {
        query: 'DELETE FROM warnings WHERE guild_id = ?',
        params: [guildId]
      },
      // Remove guild information
      {
        query: 'DELETE FROM guilds WHERE id = ?',
        params: [guildId]
      },
      // Remove the departure record (no need to mark as purged since we're deleting everything)
      {
        query: 'DELETE FROM guild_departures WHERE guild_id = ?',
        params: [guildId]
      }
    ];

    await executeTransaction(queries);
    
    console.log(`✅ Successfully purged all data for guild: ${guildId}`);
    console.log(`📋 Summary: Deleted ${dataDump.userData[0].count} user data, ${dataDump.commandLogs[0].count} command logs, ${dataDump.bans[0].count} bans, ${dataDump.warnings[0].count} warnings, ${dataDump.guildInfo[0].count} guild info records`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to purge data for guild ${guildId}:`, error.message);
    return false;
  }
}

/**
 * Check for and purge expired guild data (called periodically)
 */
async function checkAndPurgeExpiredGuilds() {
  try {
    // Find guilds that are ready for purging (48+ hours after departure)
    const expiredGuilds = await readFromDB(`
      SELECT guild_id, guild_name, left_at, purge_scheduled_at
      FROM guild_departures 
      WHERE purge_scheduled_at <= CURRENT_TIMESTAMP
    `);

    if (expiredGuilds.length === 0) {
      console.log('🔍 No expired guild data found for purging');
      return;
    }

    console.log(`🗑️ Found ${expiredGuilds.length} guild(s) with expired data, starting purge process...`);

    let successCount = 0;
    let failureCount = 0;

    for (const guild of expiredGuilds) {
      console.log(`🗑️ Purging data for guild: ${guild.guild_name} (${guild.guild_id})`);
      
      const success = await purgeGuildData(guild.guild_id);
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    console.log(`✅ Guild data purge completed: ${successCount} succeeded, ${failureCount} failed`);
  } catch (error) {
    console.error('❌ Error during expired guild check:', error.message);
  }
}

/**
 * Get statistics about pending guild departures
 */
async function getGuildDepartureStats() {
  try {
    const stats = await readFromDB(`
      SELECT 
        COUNT(*) as pending_departures,
        MIN(purge_scheduled_at) as next_purge_scheduled
      FROM guild_departures
    `);

    return stats[0] || {
      pending_departures: 0,
      next_purge_scheduled: null
    };
  } catch (error) {
    console.error('❌ Error getting guild departure stats:', error.message);
    return null;
  }
}

/**
 * Start the periodic cleanup job
 * @param {number} intervalMinutes - How often to check for expired data (in minutes)
 */
function startPeriodicCleanup(intervalMinutes = 60) { // Check every hour
  console.log(`🔄 Starting periodic guild data cleanup (checking every ${intervalMinutes} minutes)`);
  
  // Run immediately on startup
  setTimeout(() => {
    checkAndPurgeExpiredGuilds();
  }, 30000); // Wait 30 seconds after bot startup
  
  // Then run periodically
  setInterval(() => {
    checkAndPurgeExpiredGuilds();
  }, intervalMinutes * 60 * 1000);
}

module.exports = {
  recordGuildDeparture,
  cancelGuildDeparture,
  purgeGuildData,
  checkAndPurgeExpiredGuilds,
  getGuildDepartureStats,
  startPeriodicCleanup
};
