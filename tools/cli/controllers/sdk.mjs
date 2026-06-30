import process from 'node:process';
import { initializeSdk } from '../services/config/sdk.mjs';
import { invokeSdk, SdkPathError } from '../services/sdk/invoke.mjs';
import { readStdinArgs } from '../services/sdk/stdin.mjs';
import { logger } from '../services/utils/logger.mjs';

/**
 * @param {unknown} value
 * @param {{ compact?: boolean }} [options]
 */
function formatOutput(value, options = {}) {
  if (value === undefined) {
    return '';
  }

  if (value === null) {
    return 'null';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (value instanceof ReadableStream) {
    throw new SdkPathError('Streaming SDK responses are not supported by `qelos sdk` yet');
  }

  const space = options.compact ? 0 : 2;
  return JSON.stringify(value, null, space);
}

/**
 * @param {import('yargs').ArgumentsCamelCase<{ path?: string[]; compact?: boolean }>} argv
 */
export default async function sdkController(argv) {
  const path = argv.path ?? [];

  try {
    if (path.length === 0) {
      throw new SdkPathError('Provide an SDK path, e.g. `qelos sdk blueprints getList`');
    }

    const sdk = await initializeSdk();
    const stdinArgs = await readStdinArgs();
    const result = await invokeSdk(sdk, path, stdinArgs);
    const output = formatOutput(result, { compact: argv.compact });

    if (output) {
      console.log(output);
    }
  } catch (error) {
    if (error instanceof SdkPathError) {
      logger.error(error.message);
      process.exit(1);
    }

    if (error?.response?.status) {
      const body = error.response?.data ?? error.message;
      logger.error(`SDK request failed (${error.response.status})`, error);
      if (body && typeof body === 'object') {
        console.error(JSON.stringify(body, null, 2));
      } else if (body) {
        console.error(body);
      }
      process.exit(1);
    }

    logger.error('SDK invocation failed', error);
    process.exit(1);
  }
}
