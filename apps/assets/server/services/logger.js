const {showLogs} = require('../../config');

const logger = {
  log: ((...args) => undefined),
  error: ((...args) => undefined)
}

if (showLogs) {
  logger.log = console.log;
  logger.error = console.error;
}

module.exports = logger;
