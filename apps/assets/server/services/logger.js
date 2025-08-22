const {showLogs} = require('../../config');

const logger = {
  log: ((...args) => undefined),
  warn: ((...args) => undefined),
  error: ((...args) => undefined),
  info: ((...args) => undefined)
}

if (showLogs) {
  logger.log = console.log;
  logger.warn = console.warn;
  logger.info = console.info;
  logger.error = console.error;
}

module.exports = logger;
