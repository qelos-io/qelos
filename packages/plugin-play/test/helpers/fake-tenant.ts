import { createServer, type Server } from 'node:http';

export interface FakeTenant {
  url: string;
  /** every request the tenant received, as `METHOD /path` */
  log: string[];
  /** bodies of the received requests, in order */
  bodies: Array<{ method: string; path: string; body: any; headers: Record<string, any> }>;
  users: Map<string, any>;
  encrypted: Map<string, any>;
  events: any[];
  close(): Promise<void>;
}

/**
 * A small fake Qelos tenant with just the endpoints the plugin runtime uses:
 * sign in, users (list / get / create / update), encrypted user data and events.
 * `pluginRoleFor` decides which usernames sign in as plugin users.
 */
export async function fakeTenant(options: { pluginRoleFor?: (username: string) => boolean } = {}): Promise<FakeTenant> {
  const state: FakeTenant = { url: '', log: [], bodies: [], users: new Map(), encrypted: new Map(), events: [], close: async () => {} };
  let nextId = 1;
  const server: Server = createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const url = new URL(req.url!, 'http://x');
      const method = req.method!.toUpperCase();
      const body = raw ? JSON.parse(raw) : undefined;
      state.log.push(`${method} ${url.pathname}`);
      state.bodies.push({ method, path: url.pathname, body, headers: req.headers });
      const send = (status: number, payload: unknown) => {
        res.statusCode = status;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify(payload));
      };

      if (url.pathname === '/api/signin' && method === 'POST') {
        const roles = options.pluginRoleFor?.(body.username) ? ['plugin'] : ['admin'];
        return send(200, { payload: { token: 'tok', refreshToken: 'ref', user: { _id: 'admin-1', email: body.username, username: body.username, roles } } });
      }
      if (url.pathname === '/api/users' && method === 'GET') {
        const username = url.searchParams.get('username');
        return send(200, [...state.users.values()].filter((u) => !username || u.username === username));
      }
      if (url.pathname === '/api/users' && method === 'POST') {
        const user = { _id: `user-${nextId++}`, ...body };
        state.users.set(user._id, user);
        return send(200, user);
      }
      const userMatch = url.pathname.match(/^\/api\/users\/([^/]+)(\/encrypted)?$/);
      if (userMatch) {
        const [, id, encrypted] = userMatch;
        if (encrypted) {
          if (method === 'POST') {
            state.encrypted.set(id, body);
            return send(200, {});
          }
          return state.encrypted.has(id) ? send(200, state.encrypted.get(id)) : send(404, { message: 'no data' });
        }
        if (method === 'GET') return state.users.has(id) ? send(200, state.users.get(id)) : send(404, { message: 'no user' });
        if (method === 'PUT') {
          const updated = { ...state.users.get(id), ...body };
          state.users.set(id, updated);
          return send(200, updated);
        }
      }
      if (url.pathname === '/api/events' && method === 'POST') {
        state.events.push(body);
        return send(200, {});
      }
      send(404, { message: `fake tenant: no route for ${method} ${url.pathname}` });
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  state.url = `http://127.0.0.1:${(server.address() as any).port}`;
  state.close = () =>
    new Promise<void>((r) => {
      server.closeAllConnections?.();
      server.close(() => r());
    });
  return state;
}
