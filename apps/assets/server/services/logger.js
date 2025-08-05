const {showLogs} = require('../../config');

const logger = {
  log: (() => undefined),
  error: (() => undefined)
}

if (showLogs) {
  logger.log = console.log;
  logger.error = console.error;
}

module.exports = logger;
