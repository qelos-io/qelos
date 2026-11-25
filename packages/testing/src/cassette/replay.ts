import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { jsonResponse } from '../router/router.js';
import type { CassetteExchange } from './types.js';
import { redactBody, redactQuery } from './redact.js';
import { CASSETTE_FILE, hashBody } from './recorder.js';

export interface Cassette {
  readonly exchanges: ReadonlyArray<CassetteExchange>;
  /** Answer a request from the recording, or a 404 `QELOS_MOCK_CASSETTE_MISS` that lists the closest candidates. */
  respond(request: Request): Promise<Response>;
  /** Forget which repeated exchanges were already served. */
  rewind(): void;
}

export function loadCassette(source: string | CassetteExchange[]): Cassette {
  let exchanges: CassetteExchange[];
  if (Array.isArray(source)) exchanges = source;
  else {
    const file = existsSync(source) && statSync(source).isDirectory() ? join(source, CASSETTE_FILE) : source;
    if (!existsSync(file)) throw new Error(`@qelos/testing: cassette not found: ${file}`);
    exchanges = readFileSync(file, 'utf8')
      .split('\n')
      .filter((l) => l.trim())
      .map((line, i) => {
        try {
          return JSON.parse(line) as CassetteExchange;
        } catch {
          throw new Error(`@qelos/testing: ${file}: line ${i + 1} is not valid JSON`);
        }
      });
  }
  const served = new Map<string, number>();
  const keyOf = (e: Pick<CassetteExchange, 'method' | 'path' | 'query' | 'bodyHash'>) =>
    `${e.method} ${e.path}?${e.query} #${e.bodyHash}`;

  return {
    exchanges,
    rewind: () => served.clear(),
    async respond(request) {
      const url = new URL(request.url);
      const text = request.body ? await request.clone().text() : '';
      const probe = {
        method: request.method.toUpperCase(),
        path: url.pathname,
        query: redactQuery(url.searchParams),
        bodyHash: hashBody(redactBody(text).body),
      };
      const key = keyOf(probe);
      const candidates = exchanges.filter((e) => keyOf(e) === key);
      if (candidates.length) {
        const n = served.get(key) ?? 0;
        served.set(key, n + 1);
        const hit = candidates[Math.min(n, candidates.length - 1)];
        const isJson = typeof hit.responseBody === 'object' && hit.responseBody !== null;
        return isJson || hit.responseBody === undefined
          ? jsonResponse(hit.responseBody, hit.status)
          : new Response(String(hit.responseBody), {
              status: hit.status,
              headers: { 'content-type': hit.contentType ?? 'text/plain' },
            });
      }
      const near = exchanges
        .filter((e) => e.path === probe.path || e.method === probe.method)
        .slice(0, 5)
        .map((e) => `${e.method} ${e.path}${e.query ? '?' + e.query : ''}${e.bodyHash ? ` (body ${e.bodyHash})` : ''}`);
      return jsonResponse(
        {
          code: 'QELOS_MOCK_CASSETTE_MISS',
          message: `No recorded exchange for ${probe.method} ${probe.path}${probe.query ? '?' + probe.query : ''}${probe.bodyHash ? ` (body ${probe.bodyHash})` : ''}`,
          closest: near,
        },
        404,
        { 'x-qelos-cassette-miss': '1' },
      );
    },
  };
}
