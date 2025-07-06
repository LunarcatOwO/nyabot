// writeToDB will be imported dynamically to avoid circular dependency

// Store/update user information
async function upsertUser(userId, userData) {
  const { writeToDB } = require('./init');
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
  const { writeToDB } = require('./init');
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

// Set user data by key
async function setUserData(userId, guildId = null, dataKey, dataValue) {
  const { writeToDB } = require('./init');
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
  const { writeToDB } = require('./init');
  const query = `
    INSERT INTO command_logs (user_id, guild_id, command_name, success, error_message)
    VALUES (?, ?, ?, ?, ?)
  `;
  
  return await writeToDB(query, [userId, guildId, commandName, success, errorMessage]);
}

// Set bot configuration value
async function setBotConfig(configKey, configValue, description = null) {
  const { writeToDB } = require('./init');
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

// Log a ban action
async function logBan(userId, guildId, bannedBy, reason = 'No reason provided') {
  const { writeToDB } = require('./init');
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
  const { writeToDB } = require('./init');
  const query = `
    UPDATE bans 
    SET unbanned_at = CURRENT_TIMESTAMP, is_active = FALSE
    WHERE user_id = ? AND guild_id = ? AND is_active = TRUE
  `;
  
  return await writeToDB(query, [userId, guildId]);
}

// Log a warning action
async function logWarning(userId, guildId, warnedBy, reason = 'No reason provided') {
  const { writeToDB } = require('./init');
  const query = `
    INSERT INTO warnings (user_id, guild_id, warned_by, reason)
    VALUES (?, ?, ?, ?)
  `;
  
  return await writeToDB(query, [userId, guildId, warnedBy, reason]);
}

// Remove a warning (make it inactive)
async function removeWarning(warningId, guildId) {
  const { writeToDB } = require('./init');
  const query = `
    UPDATE warnings 
    SET is_active = FALSE
    WHERE id = ? AND guild_id = ?
  `;
  
  return await writeToDB(query, [warningId, guildId]);
}

module.exports = {
  upsertUser,
  upsertGuild,
  setUserData,
  logCommand,
  setBotConfig,
  logBan,
  logUnban,
  logWarning,
  removeWarning
};
