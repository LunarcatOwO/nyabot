const mariadb = require('mariadb');
require('dotenv').config();

// Parse database URL
function parseDbUrl(url) {
  try {
    // Handle mariadb:// URLs
    const urlObj = new URL(url.replace('mariadb://', 'mysql://'));
    
    return {
      host: urlObj.hostname || 'localhost',
      port: urlObj.port || 3306,
      user: urlObj.username,
      password: urlObj.password,
      database: urlObj.pathname.slice(1), // Remove leading '/'
    };
  } catch (error) {
    console.error('Error parsing database URL:', error.message);
    throw new Error('Invalid database URL format');
  }
}

// Parse the database configuration from URL
const dbConfig = parseDbUrl(process.env.DB_URL);

// Create connection pool
const pool = mariadb.createPool({
  ...dbConfig,
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
  charset: 'utf8mb4',
  timezone: 'UTC'
});

// Test database connection
async function testConnection() {
  let conn;
  try {
    conn = await pool.getConnection();
    console.log('MariaDB connection established successfully');
    console.log(`Connected to database: ${dbConfig.database} on ${dbConfig.host}:${dbConfig.port}`);
    return true;
  } catch (err) {
    console.error('MariaDB connection failed:', err.message);
    console.log('Application will continue without database functionality');
    return false;
  } finally {
    if (conn) conn.release();
  }
}

// Generic read function - execute SELECT queries
async function readFromDB(query, params = []) {
  let conn;
  try {
    conn = await pool.getConnection();
    const results = await conn.query(query, params);
    return results;
  } catch (err) {
    console.error('Error reading from database:', err.message);
    throw err;
  } finally {
    if (conn) conn.release();
  }
}

// Generic write function - execute INSERT, UPDATE, DELETE queries
async function writeToDB(query, params = []) {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(query, params);
    return result;
  } catch (err) {
    console.error('Error writing to database:', err.message);
    throw err;
  } finally {
    if (conn) conn.release();
  }
}

// Transaction helper - execute multiple queries in a transaction
async function executeTransaction(queries) {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    
    const results = [];
    for (const { query, params = [] } of queries) {
      const result = await conn.query(query, params);
      results.push(result);
    }
    
    await conn.commit();
    return results;
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('Transaction failed:', err.message);
    throw err;
  } finally {
    if (conn) conn.release();
  }
}

// Setup database schema for Discord bot
async function setupDatabase() {
  console.log('Setting up database schema...');
  
  try {
    // Create users table for Discord user data
    await writeToDB(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT PRIMARY KEY,
        username VARCHAR(32) NOT NULL,
        display_name VARCHAR(32),
        avatar VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_username (username),
        INDEX idx_display_name (display_name)
      )
    `);
    
    // Create guilds table for Discord server data
    await writeToDB(`
      CREATE TABLE IF NOT EXISTS guilds (
        id BIGINT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        icon VARCHAR(255),
        owner_id BIGINT,
        member_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_name (name),
        INDEX idx_owner (owner_id)
      )
    `);
    
    // Create user_data table for bot-specific user settings/data
    await writeToDB(`
      CREATE TABLE IF NOT EXISTS user_data (
        user_id BIGINT,
        guild_id BIGINT,
        data_key VARCHAR(50),
        data_value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        PRIMARY KEY (user_id, guild_id, data_key),
        INDEX idx_user_guild (user_id, guild_id),
        INDEX idx_data_key (data_key)
      )
    `);
    
    // Create command_logs table for tracking command usage
    await writeToDB(`
      CREATE TABLE IF NOT EXISTS command_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT NOT NULL,
        guild_id BIGINT,
        command_name VARCHAR(50) NOT NULL,
        success BOOLEAN DEFAULT TRUE,
        error_message TEXT,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_user (user_id),
        INDEX idx_guild (guild_id),
        INDEX idx_command (command_name),
        INDEX idx_executed_at (executed_at)
      )
    `);
    
    // Create bot_config table for storing bot configuration
    await writeToDB(`
      CREATE TABLE IF NOT EXISTS bot_config (
        config_key VARCHAR(50) PRIMARY KEY,
        config_value TEXT,
        description VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // Create bans table for tracking user bans across servers
    await writeToDB(`
      CREATE TABLE IF NOT EXISTS bans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT NOT NULL,
        guild_id BIGINT NOT NULL,
        banned_by BIGINT NOT NULL,
        reason TEXT,
        banned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        unbanned_at TIMESTAMP NULL,
        is_active BOOLEAN DEFAULT TRUE,
        
        UNIQUE KEY unique_active_ban (user_id, guild_id, is_active),
        INDEX idx_user_id (user_id),
        INDEX idx_guild_id (guild_id),
        INDEX idx_banned_by (banned_by),
        INDEX idx_banned_at (banned_at),
        INDEX idx_is_active (is_active)
      )
    `);
    
    console.log('Database schema setup completed successfully');
  } catch (error) {
    console.error('Database schema setup failed:', error.message);
    throw error;
  }
}

// Initialize database connection and schema
async function initializeDB() {
  console.log('🔧 Initializing database...');
  const connected = await testConnection();
  
  if (connected) {
    try {
      await setupDatabase();
      console.log('✅ Database connected and ready');
      return true;
    } catch (error) {
      console.error('❌ Database initialization failed:', error.message);
      console.log('⚠️ Running without database functionality');
      return false;
    }
  } else {
    console.log('⚠️ Running without database functionality');
    return false;
  }
}

// Utility functions for common Discord bot operations

// Store/update user information
async function upsertUser(userId, userData) {
  const query = `
    INSERT INTO users (id, username, display_name, avatar)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      username = VALUES(username),
      display_name = VALUES(display_name),
      avatar = VALUES(avatar),
      updated_at = CURRENT_TIMESTAMP
  `;
  
  return await writeToDB(query, [
    userId,
    userData.username,
    userData.displayName || userData.username,
    userData.avatar
  ]);
}

// Store/update guild information
async function upsertGuild(guildId, guildData) {
  const query = `
    INSERT INTO guilds (id, name, icon, owner_id, member_count)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      icon = VALUES(icon),
      owner_id = VALUES(owner_id),
      member_count = VALUES(member_count),
      updated_at = CURRENT_TIMESTAMP
  `;
  
  return await writeToDB(query, [
    guildId,
    guildData.name,
    guildData.icon,
    guildData.ownerId,
    guildData.memberCount
  ]);
}

// Get user data by key
async function getUserData(userId, guildId = null, dataKey) {
  const query = `
    SELECT data_value 
    FROM user_data 
    WHERE user_id = ? AND guild_id = ? AND data_key = ?
  `;
  
  const results = await readFromDB(query, [userId, guildId || 0, dataKey]);
  return results.length > 0 ? results[0].data_value : null;
}

// Set user data by key
async function setUserData(userId, guildId = null, dataKey, dataValue) {
  const query = `
    INSERT INTO user_data (user_id, guild_id, data_key, data_value)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      data_value = VALUES(data_value),
      updated_at = CURRENT_TIMESTAMP
  `;
  
  return await writeToDB(query, [userId, guildId || 0, dataKey, dataValue]);
}

// Log command execution
async function logCommand(userId, guildId, commandName, success = true, errorMessage = null) {
  const query = `
    INSERT INTO command_logs (user_id, guild_id, command_name, success, error_message)
    VALUES (?, ?, ?, ?, ?)
  `;
  
  return await writeToDB(query, [userId, guildId, commandName, success, errorMessage]);
}

// Get bot configuration value
async function getBotConfig(configKey) {
  const query = `SELECT config_value FROM bot_config WHERE config_key = ?`;
  const results = await readFromDB(query, [configKey]);
  return results.length > 0 ? results[0].config_value : null;
}

// Set bot configuration value
async function setBotConfig(configKey, configValue, description = null) {
  const query = `
    INSERT INTO bot_config (config_key, config_value, description)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE
      config_value = VALUES(config_value),
      description = VALUES(description),
      updated_at = CURRENT_TIMESTAMP
  `;
  
  return await writeToDB(query, [configKey, configValue, description]);
}

// Get database statistics
async function getDBStats() {
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

// Log a ban action
async function logBan(userId, guildId, bannedBy, reason = 'No reason provided') {
  const query = `
    INSERT INTO bans (user_id, guild_id, banned_by, reason)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      banned_by = VALUES(banned_by),
      reason = VALUES(reason),
      banned_at = CURRENT_TIMESTAMP,
      is_active = TRUE
  `;
  
  return await writeToDB(query, [userId, guildId, bannedBy, reason]);
}

// Log an unban action
async function logUnban(userId, guildId) {
  const query = `
    UPDATE bans 
    SET unbanned_at = CURRENT_TIMESTAMP, is_active = FALSE
    WHERE user_id = ? AND guild_id = ? AND is_active = TRUE
  `;
  
  return await writeToDB(query, [userId, guildId]);
}

// Check if user is banned from a specific guild
async function isUserBanned(userId, guildId) {
  const query = `
    SELECT * FROM bans 
    WHERE user_id = ? AND guild_id = ? AND is_active = TRUE
  `;
  
  const results = await readFromDB(query, [userId, guildId]);
  return results.length > 0 ? results[0] : null;
}

// Get total number of servers a user is banned from
async function getUserBanCount(userId) {
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

// Graceful shutdown
async function closeDB() {
  console.log('🔄 Shutting down database...');
  try {
    await pool.end();
    console.log('✅ Database connection closed');
  } catch (err) {
    console.error('❌ Error closing database:', err.message);
  }
}

module.exports = {
  pool,
  testConnection,
  initializeDB,
  readFromDB,
  writeToDB,
  executeTransaction,
  setupDatabase,
  closeDB,
  
  // Discord bot utility functions
  upsertUser,
  upsertGuild,
  getUserData,
  setUserData,
  logCommand,
  getBotConfig,
  setBotConfig,
  getDBStats,
  
  // Ban tracking functions
  logBan,
  logUnban,
  isUserBanned,
  getUserBanCount,
  getUserBans
};