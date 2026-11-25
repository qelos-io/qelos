import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { createMockQelos } from '../server/create-mock-qelos.js';
import { MANAGEMENT_PREFIX } from '../routes/management.js';

export interface ServeArgs {
  dir?: string;
  port: number;
  host: string;
}

export function parseServeArgs(argv: string[]): ServeArgs {
  const out: ServeArgs = { port: 0, host: '127.0.0.1' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const [flag, inline] = a.startsWith('--') && a.includes('=') ? [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)] : [a, undefined];
    const value = () => inline ?? argv[++i];
    if (flag === '--dir') out.dir = value();
    else if (flag === '--port') out.port = Number(value());
    else if (flag === '--host') out.host = value();
    else if (flag !== 'serve') throw new Error(`Unknown argument: ${a}`);
  }
  if (!Number.isInteger(out.port) || out.port < 0 || out.port > 65535) throw new Error('--port must be 0-65535');
  return out;
}

async function toRequest(req: IncomingMessage, origin: string): Promise<Request> {
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (Array.isArray(v)) v.forEach((x) => headers.append(k, x));
    else if (v !== undefined) headers.set(k, v);
  }
  const method = req.method || 'GET';
  const hasBody = method !== 'GET' && method !== 'HEAD';
  const chunks: Buffer[] = [];
  if (hasBody) for await (const c of req) chunks.push(c as Buffer);
  return new Request(new URL(req.url || '/', origin), {
    method,
    headers,
    body: hasBody && chunks.length ? Buffer.concat(chunks) : undefined,
  });
}

async function send(res: ServerResponse, response: Response) {
  const headers: Record<string, string | string[]> = {};
  response.headers.forEach((v, k) => {
    if (k !== 'set-cookie') headers[k] = v;
  });
  const cookies = response.headers.getSetCookie?.() ?? [];
  if (cookies.length) headers['set-cookie'] = cookies;
  res.writeHead(response.status, headers);
  res.end(Buffer.from(await response.arrayBuffer()));
}

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

export function isLoopbackHost(host: string): boolean {
  return LOOPBACK_HOSTS.has(host.toLowerCase()) || host.startsWith('127.');
}

/**
 * Only accept requests whose `Host` header targets the bound address (blocks DNS rebinding).
 * Loopback binds also accept the other loopback names on the bound port.
 */
export function isAllowedHostHeader(header: string | undefined, host: string, port: number): boolean {
  if (!header) return false;
  const h = header.toLowerCase();
  const bound = host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;
  if (h === `${bound.toLowerCase()}:${port}`) return true;
  if (!isLoopbackHost(host)) return false;
  return [`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`].includes(h);
}

export interface ServeHandle {
  server: Server;
  origin: string;
  close(): Promise<void>;
}

export async function serve(
  argv: string[],
  log: { out: (m: string) => void; err: (m: string) => void } = { out: console.log, err: console.error },
): Promise<ServeHandle> {
  const args = parseServeArgs(argv);
  if (!isLoopbackHost(args.host)) {
    log.err(
      `WARNING: @qelos/dev-mock is bound to ${args.host}. The mock has NO authentication: anyone who can reach it can read and write its state.`,
    );
  }
  const mock = createMockQelos({
    enabled: true,
    dataDir: args.dir,
    logger: (m) => log.err(m),
  });
  let boundPort = args.port;
  const server = createServer(async (req, res) => {
    try {
      if (!isAllowedHostHeader(req.headers.host, args.host, boundPort)) {
        res.writeHead(403, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ code: 'QELOS_MOCK_FORBIDDEN_HOST', message: 'Unexpected Host header' }));
        return;
      }
      if (req.url === `${MANAGEMENT_PREFIX}/health`) {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end('{"ok":true}');
        return;
      }
      const origin = `http://${req.headers.host}`;
      await send(res, await mock.handle(await toRequest(req, origin)));
    } catch (e: any) {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ code: 'QELOS_MOCK_ERROR', message: e?.message || 'Mock error' }));
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(args.port, args.host, resolve);
  });
  const addr = server.address();
  boundPort = typeof addr === 'object' && addr ? addr.port : args.port;
  const origin = `http://${args.host.includes(':') ? `[${args.host}]` : args.host}:${boundPort}`;
  // machine-readable ready line (parsed by integrators)
  log.out(`QELOS_MOCK_READY ${origin}`);
  return {
    server,
    origin,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
