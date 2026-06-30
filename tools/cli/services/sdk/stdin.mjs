import { parseArg } from './parse-value.mjs';

/**
 * Read piped stdin as a single method argument when stdin is not a TTY.
 * @returns {Promise<unknown[]>}
 */
export async function readStdinArgs() {
  if (process.stdin.isTTY) {
    return [];
  }

  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }

  const text = Buffer.concat(chunks).toString('utf8').trim();
  if (!text) {
    return [];
  }

  return [parseArg(text)];
}
