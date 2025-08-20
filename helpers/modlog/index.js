// Modlog module exports
const log = require('./log');

module.exports = {
  log,
  
  // Export all functions at root level for convenience
  ...log
};