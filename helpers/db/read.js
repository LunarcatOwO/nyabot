// readFromDB will be imported dynamically to avoid circular dependency

// Get user data by key
async function getUserData(userId, guildId = null, dataKey) {
  const { readFromDB } = require('./init');
  const query = `
    SELECT data_value 
    FROM user_data 
    WHERE user_id = ? AND guild_id = ? AND data_key = ?
  `;
  
  const results = await readFromDB(query, [userId, guildId || 0, dataKey]);
  return results.length > 0 ? results[0].data_value : null;
}

// Get bot configuration value
async function getBotConfig(configKey) {
  const { readFromDB } = require('./init');
  const query = `SELECT config_value FROM bot_config WHERE config_key = ?`;
  const results = await readFromDB(query, [configKey]);
  return results.length > 0 ? results[0].config_value : null;
}

// Get database statistics
async function getDBStats() {
  const { readFromDB } = require('./init');
  try {
    const userCount = await readFromDB('SELECT COUNT(*) as count FROM users');
    const guildCount = await readFromDB('SELECT COUNT(*) as count FROM guilds');
    const commandCount = await readFromDB('SELECT COUNT(*) as count FROM command_logs');
    
    return {
      totalUsers: userCount[0].count,
      totalGuilds: guildCount[0].count,
      totalCommands: commandCount[0].count
    };
  } catch (error) {
    console.error('Error getting database stats:', error.message);
    return null;
  }
}

// Check if user is banned from a specific guild
async function isUserBanned(userId, guildId) {
  const { readFromDB } = require('./init');
  const query = `
    SELECT * FROM bans 
    WHERE user_id = ? AND guild_id = ? AND is_active = TRUE
  `;
  
  const results = await readFromDB(query, [userId, guildId]);
  return results.length > 0 ? results[0] : null;
}

// Get total number of servers a user is banned from
async function getUserBanCount(userId) {
  const { readFromDB } = require('./init');
  const query = `
    SELECT COUNT(*) as count 
    FROM bans 
    WHERE user_id = ? AND is_active = TRUE
  `;
  
  const results = await readFromDB(query, [userId]);
  return results[0].count;
}

// Get all active bans for a user
async function getUserBans(userId) {
  const { readFromDB } = require('./init');
  const query = `
    SELECT b.*, g.name as guild_name, u.username as banned_by_username
    FROM bans b
    LEFT JOIN guilds g ON b.guild_id = g.id
    LEFT JOIN users u ON b.banned_by = u.id
    WHERE b.user_id = ? AND b.is_active = TRUE
    ORDER BY b.banned_at DESC
  `;
  
  return await readFromDB(query, [userId]);
}

// Get guild departure information
async function getGuildDeparture(guildId) {
  const { readFromDB } = require('./init');
  const query = `
    SELECT * FROM guild_departures 
    WHERE guild_id = ?
  `;
  
  const results = await readFromDB(query, [guildId]);
  return results.length > 0 ? results[0] : null;
}

module.exports = {
  getUserData,
  getBotConfig,
  getDBStats,
  isUserBanned,
  getUserBanCount,
  getUserBans,
  getGuildDeparture
};
