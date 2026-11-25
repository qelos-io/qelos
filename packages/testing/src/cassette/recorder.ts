import { createHash } from 'node:crypto';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { CassetteExchange } from './types.js';
import { findSecrets, redactBody, redactQuery } from './redact.js';

export interface RecorderOptions {
  /** folder for `cassette.jsonl` (created). Default `./qelos-fixtures` */
  out?: string;
  /** the real `fetch` to wrap. Default `globalThis.fetch` */
  fetch?: typeof fetch;
  /** Last chance to edit or drop (return `null`) an exchange, after the built-in redaction. */
  redact?: (exchange: CassetteExchange) => CassetteExchange | null;
  /** Write exchanges even when the secret scan still finds something. Default false (the recorder throws instead). */
  allowUnredacted?: boolean;
  /** Allow recording with NODE_ENV=production. Default false. */
  allowInProduction?: boolean;
  /** Keep what is already in the file instead of starting a new cassette. Default false. */
  append?: boolean;
  /** Only record paths starting with one of these prefixes. Default: `['/api/']` */
  include?: string[];
  env?: Record<string, string | undefined>;
}

export interface Recorder {
  /** Drop-in `fetch` for the SDK: `new QelosSDK({ appUrl, fetch: recorder.fetch })`. */
  fetch: typeof fetch;
  /** Absolute-ish path of the cassette file. */
  readonly file: string;
  readonly exchanges: ReadonlyArray<CassetteExchange>;
}

export const CASSETTE_FILE = 'cassette.jsonl';

export const hashBody = (body: unknown): string =>
  body === undefined ? '' : createHash('sha256').update(typeof body === 'string' ? body : JSON.stringify(body)).digest('hex').slice(0, 16);

/**
 * Record real tenant traffic as a redacted cassette. Credentials never reach the file: sensitive headers
 * are not stored at all, secret-looking JSON keys become `[REDACTED]`, and a final scan refuses to write
 * anything that still looks like a token.
 */
export function createRecorder(options: RecorderOptions = {}): Recorder {
  const env = options.env ?? process.env;
  if (env.NODE_ENV === 'production' && !options.allowInProduction) {
    throw new Error('@qelos/testing: refusing to record in production (NODE_ENV=production). Pass allowInProduction to override.');
  }
  const out = options.out ?? './qelos-fixtures';
  const file = join(out, CASSETTE_FILE);
  const base = options.fetch ?? globalThis.fetch;
  const include = options.include ?? ['/api/'];
  const exchanges: CassetteExchange[] = [];
  mkdirSync(dirname(file), { recursive: true });
  if (!options.append) writeFileSync(file, '');

  const recordingFetch = (async (input: any, init?: RequestInit) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    const response = await base(request.clone());
    if (!include.some((p) => url.pathname.startsWith(p))) return response;

    const requestText = request.body ? await request.clone().text() : '';
    const responseText = await response.clone().text();
    const contentType = response.headers.get('content-type') ?? undefined;
    const req = redactBody(requestText);
    const res = contentType && !/json|text/i.test(contentType) ? { body: undefined, json: false } : redactBody(responseText);

    let exchange: CassetteExchange | null = {
      seq: exchanges.length + 1,
      method: request.method.toUpperCase(),
      path: url.pathname,
      query: redactQuery(url.searchParams),
      bodyHash: hashBody(req.body),
      ...(req.body !== undefined ? { requestBody: req.body } : {}),
      status: response.status,
      ...(contentType ? { contentType: contentType.split(';')[0] } : {}),
      ...(res.body !== undefined ? { responseBody: res.body } : {}),
      recordedAt: new Date().toISOString(),
    };
    if (options.redact) exchange = options.redact(exchange);
    if (exchange) {
      const found = findSecrets(exchange);
      if (found.length && !options.allowUnredacted) {
        throw new Error(
          `@qelos/testing: not recording ${exchange.method} ${exchange.path}: the redacted exchange still contains a ${found.join(', ')}. ` +
            'Add a `redact` hook to remove it, or pass allowUnredacted.',
        );
      }
      exchanges.push(exchange);
      appendFileSync(file, JSON.stringify(exchange) + '\n');
    }
    return response;
  }) as typeof fetch;

  return { fetch: recordingFetch, file, exchanges };
}
