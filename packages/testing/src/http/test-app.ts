import { createServer, type RequestListener, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { PERSONA_HEADER } from '../routes/actor.js';

/** Anything that can be served: a Node request listener (Express, Connect, ...) or an already created `http.Server`. */
export type TestableApp = RequestListener | Server | { server: Server };

export interface TestAppClient {
  /** Origin the app listens on, e.g. `http://127.0.0.1:41233`. */
  readonly baseUrl: string;
  /** `fetch` against the app; relative paths are resolved against `baseUrl`. Cookies are kept between calls. */
  fetch(path: string, init?: RequestInit): Promise<Response>;
  /** `fetch` + JSON parse; the result keeps the status. */
  json<T = any>(path: string, init?: RequestInit & { json?: unknown }): Promise<{ status: number; ok: boolean; body: T; response: Response }>;
  /** A client on the same app that sends requests as this mock persona (id or email). */
  as(persona: string): TestAppClient;
  /** Sign in through `POST /api/signin` and keep the session cookies. Returns the response. */
  signIn(username: string, password: string): Promise<Response>;
  /** Stop the server (only when this helper started it). */
  close(): Promise<void>;
}

function isServer(app: TestableApp): app is Server {
  return typeof (app as Server).listen === 'function' && typeof (app as Server).address === 'function';
}

function build(baseUrl: string, state: { jar: Map<string, string>; close: () => Promise<void> }, persona?: string): TestAppClient {
  const cookieHeader = () => [...state.jar].map(([k, v]) => `${k}=${v}`).join('; ');
  const client: TestAppClient = {
    baseUrl,
    async fetch(path, init = {}) {
      const headers = new Headers(init.headers);
      if (persona && !headers.has(PERSONA_HEADER)) headers.set(PERSONA_HEADER, persona);
      if (state.jar.size && !headers.has('cookie')) headers.set('cookie', cookieHeader());
      const res = await fetch(new URL(path, baseUrl), { ...init, headers, redirect: init.redirect ?? 'manual' });
      for (const line of res.headers.getSetCookie?.() ?? []) {
        const [pair] = line.split(';');
        const eq = pair.indexOf('=');
        if (eq > 0) {
          const name = pair.slice(0, eq).trim();
          const value = pair.slice(eq + 1).trim();
          if (value) state.jar.set(name, value);
          else state.jar.delete(name);
        }
      }
      return res;
    },
    async json(path, init = {}) {
      const { json, ...rest } = init;
      const headers = new Headers(rest.headers);
      if (json !== undefined) {
        headers.set('content-type', 'application/json');
        rest.body = JSON.stringify(json);
        rest.method ??= 'POST';
      }
      const response = await client.fetch(path, { ...rest, headers });
      const text = await response.text();
      let body: any = text;
      try {
        body = text ? JSON.parse(text) : undefined;
      } catch {
        /* keep text */
      }
      return { status: response.status, ok: response.ok, body, response };
    },
    as: (p) => build(baseUrl, state, p),
    signIn: (username, password) =>
      client.fetch('/api/signin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password }),
      }),
    close: state.close,
  };
  return client;
}

/**
 * Serve an app on an ephemeral local port and get a client for it. Works with any Node HTTP app
 * (Express, Connect, a plain listener, a Fastify/Nest `app.server` after `ready()`).
 *
 * ```ts
 * const client = await testApp(app);
 * const res = await client.as('admin@example.com').json('/api/todos');
 * await client.close();
 * ```
 */
export async function testApp(app: TestableApp): Promise<TestAppClient> {
  const owned = typeof app === 'function';
  const server: Server = owned ? createServer(app) : isServer(app) ? app : (app as { server: Server }).server;
  if (!server.listening) {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => resolve());
    });
  }
  const addr = server.address() as AddressInfo;
  const close = async () => {
    if (!owned) return;
    server.closeAllConnections?.();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  };
  return build(`http://127.0.0.1:${addr.port}`, { jar: new Map(), close });
}
