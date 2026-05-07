/**
 * Low-level HTTP + cookie helpers shared by the integrator e2e suite.
 *
 * `node:fetch` does NOT auto-jar cookies, and integrators set cookies on the
 * gateway domain rather than localhost, so each follow-up call must extract
 * `Set-Cookie` from the previous response and rebuild a `Cookie:` header
 * manually. Use {@link parseSetCookies} → {@link buildCookieHeader} for that.
 */
import * as http from 'node:http';
import { AddressInfo } from 'node:net';

export interface ListenHandle {
  url: string;
  server: http.Server;
  close: () => Promise<void>;
}

/** Bind an `http.Server` to a free localhost port and return its base URL. */
export async function listen(server: http.Server): Promise<ListenHandle> {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
  const addr = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${addr.port}`,
    server,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

export interface FetchAllResponse {
  status: number;
  body: any;
  setCookies: string[];
  headers: Headers;
}

/**
 * `fetch` wrapper that always reads the body (parsing JSON when possible) and
 * surfaces `Set-Cookie` as a string array, regardless of the runtime's
 * `getSetCookie()` availability.
 */
export async function fetchJson(
  url: string,
  init?: RequestInit,
): Promise<FetchAllResponse> {
  const res = await fetch(url, init);
  let body: any = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return {
    status: res.status,
    body,
    setCookies: readSetCookies(res.headers),
    headers: res.headers,
  };
}

/**
 * Read all `Set-Cookie` values from a `Headers` object as a string array.
 * Prefers the spec'd `getSetCookie()` (Node 20+, undici); falls back to a
 * comma-aware split for runtimes that fold cookies into a single header.
 */
export function readSetCookies(headers: Headers): string[] {
  const h = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof h.getSetCookie === 'function') {
    return h.getSetCookie();
  }
  const single = headers.get('set-cookie');
  if (!single) return [];
  // Cookies fold with `, ` between entries, but attributes (Expires) can
  // contain commas — split only when followed by a token-shaped name=.
  return single.split(/,\s*(?=[A-Za-z0-9!#$%&'*+\-.^_`|~]+=)/);
}

/**
 * Parse an array of `Set-Cookie` header values into a `name → value` record.
 * Strips attributes (`Path`, `HttpOnly`, `Expires`, etc.) and URL-decodes
 * values. Last-write-wins when the same cookie is set more than once, which
 * matches browser behaviour.
 */
export function parseSetCookies(setCookies: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const raw of setCookies) {
    if (!raw) continue;
    const semi = raw.indexOf(';');
    const pair = semi === -1 ? raw : raw.slice(0, semi);
    const eq = pair.indexOf('=');
    if (eq === -1) continue;
    const name = pair.slice(0, eq).trim();
    if (!name) continue;
    const value = pair.slice(eq + 1).trim();
    try {
      result[name] = decodeURIComponent(value);
    } catch {
      result[name] = value;
    }
  }
  return result;
}

/**
 * Build a `Cookie:` request header from a `name → value` map. Skips empty
 * values so cleared cookies don't bleed into follow-up requests.
 */
export function buildCookieHeader(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

/**
 * Look up a single cookie value from raw `Set-Cookie` strings. Thin wrapper
 * over {@link parseSetCookies} kept for the existing test files.
 */
export function findCookie(
  setCookies: string[],
  name: string,
): string | undefined {
  return parseSetCookies(setCookies)[name];
}
