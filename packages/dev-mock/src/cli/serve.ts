#!/usr/bin/env node
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createMockQelos } from '../server/create-mock-qelos.js';
import { MANAGEMENT_PREFIX } from '../routes/management.js';

interface ServeArgs {
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

export async function serve(argv: string[]) {
  const args = parseServeArgs(argv);
  const mock = createMockQelos({
    enabled: true,
    dataDir: args.dir,
    logger: (m) => console.error(m),
  });
  const server = createServer(async (req, res) => {
    try {
      if (req.url === `${MANAGEMENT_PREFIX}/health`) {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end('{"ok":true}');
        return;
      }
      const origin = `http://${req.headers.host || `${args.host}:${args.port}`}`;
      await send(res, await mock.handle(await toRequest(req, origin)));
    } catch (e: any) {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ code: 'QELOS_MOCK_ERROR', message: e?.message || 'Mock error' }));
    }
  });
  await new Promise<void>((resolve) => server.listen(args.port, args.host, resolve));
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : args.port;
  // machine-readable ready line (parsed by integrators)
  console.log(`QELOS_MOCK_READY http://${args.host}:${port}`);
  const stop = () => server.close(() => process.exit(0));
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

serve(process.argv.slice(2)).catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
