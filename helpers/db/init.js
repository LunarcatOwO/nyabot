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
    throw new Error(`Database connection failed: ${err.message}`);
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
      throw new Error(`Database initialization failed: ${error.message}`);
    }
  } else {
    throw new Error('Database connection failed - cannot start bot');
  }
}

// Utility functions for common Discord bot operations

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
  closeDB
};