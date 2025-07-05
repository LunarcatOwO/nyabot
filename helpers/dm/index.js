// DM module exports
const log = require('./log');
const send = require('./send');

module.exports = {
  log,
  send,
  
  // all functions available at root level
  ...log,
  ...send
};
