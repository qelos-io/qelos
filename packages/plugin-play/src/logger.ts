import config from './config';

const showLogs = config.dev || process.env.VERBOSE_LOGS;
const logger = {
  log: (() => undefined) as ((...data: any[]) => void),
  error: (() => undefined) as ((...data: any[]) => void)
}

if (showLogs) {
  logger.log = console.log;
  logger.error = console.error;
}

export default logger;