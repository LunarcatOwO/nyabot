// Database module exports
const init = require('./init');
const read = require('./read');
const write = require('./write');

module.exports = {
  // Core database functions
  ...init,
  
  // Organized access
  read,
  write,
  
  // Legacy compatibility - all functions available at root level
  ...read,
  ...write
};
