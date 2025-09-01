import {showLogs} from '../../config';

const logger = {
  log: (() => undefined) as ((...data: any[]) => void),
  error: (() => undefined) as ((...data: any[]) => void),
  info: (() => undefined) as ((...data: any[]) => void)
}

if (showLogs) {
  logger.log = console.log;
  logger.error = console.error;
  logger.info = console.info;
}

export default logger;
