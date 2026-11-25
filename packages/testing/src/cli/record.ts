import { createServer } from 'node:http';
import type { ServeHandle } from './serve.js';
import { isAllowedHostHeader, isLoopbackHost, send, toRequest } from './serve.js';
import { createRecorder, CASSETTE_FILE } from '../cassette/recorder.js';

export interface RecordArgs {
  target: string;
  port: number;
  host: string;
  out: string;
  include?: string[];
  append: boolean;
  allowUnredacted: boolean;
}

export function parseRecordArgs(argv: string[]): RecordArgs {
  const out: RecordArgs = { target: '', port: 0, host: '127.0.0.1', out: './qelos-fixtures', append: false, allowUnredacted: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const [flag, inline] = a.startsWith('--') && a.includes('=') ? [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)] : [a, undefined];
    const value = () => {
      const v = inline ?? argv[++i];
      if (v === undefined) throw new Error(`${flag} needs a value`);
      return v;
    };
    if (flag === '--target') out.target = value();
    else if (flag === '--port') out.port = Number(value());
    else if (flag === '--host') out.host = value();
    else if (flag === '--out') out.out = value();
    else if (flag === '--include') out.include = value().split(',').map((p) => p.trim()).filter(Boolean);
    else if (flag === '--append') out.append = true;
    else if (flag === '--allow-unredacted') out.allowUnredacted = true;
    else if (flag !== 'record') throw new Error(`Unknown argument: ${a}`);
  }
  if (!out.target) throw new Error('--target <tenant url> is required');
  let url: URL;
  try {
    url = new URL(out.target);
  } catch {
    throw new Error(`--target is not a valid URL: ${out.target}`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('--target must be an http(s) URL');
  out.target = url.origin;
  if (!Number.isInteger(out.port) || out.port < 0 || out.port > 65535) throw new Error('--port must be 0-65535');
  return out;
}

// hop-by-hop headers, and ones fetch recomputes (it also decodes the body, so encoding headers go too)
const DROP_REQUEST = ['host', 'connection', 'content-length', 'accept-encoding', 'transfer-encoding', 'keep-alive', 'upgrade'];
const DROP_RESPONSE = ['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'keep-alive'];

/** A cookie set by the tenant must work on the local proxy origin: drop `Domain` and `Secure`. */
export function localizeCookie(line: string): string {
  return line
    .split(';')
    .filter((part) => !/^\s*(domain=|secure\s*$)/i.test(part))
    .join(';');
}

/**
 * Reverse proxy to a real tenant that records every `/api/**` exchange as a redacted cassette.
 * Point your app (or a browser frontend) at the proxy instead of the tenant.
 */
export async function record(
  argv: string[],
  log: { out: (m: string) => void; err: (m: string) => void } = { out: console.log, err: console.error },
): Promise<ServeHandle & { file: string }> {
  const args = parseRecordArgs(argv);
  if (!isLoopbackHost(args.host)) {
    log.err(`WARNING: the record proxy is bound to ${args.host}. It forwards credentials to ${args.target} for anyone who can reach it.`);
  }
  const recorder = createRecorder({
    out: args.out,
    include: args.include,
    append: args.append,
    allowUnredacted: args.allowUnredacted,
  });

  let boundPort = args.port;
  const server = createServer(async (req, res) => {
    try {
      if (!isAllowedHostHeader(req.headers.host, args.host, boundPort)) {
        res.writeHead(403, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ code: 'QELOS_MOCK_FORBIDDEN_HOST', message: 'Unexpected Host header' }));
        return;
      }
      const incoming = await toRequest(req, args.target);
      const headers = new Headers(incoming.headers);
      DROP_REQUEST.forEach((h) => headers.delete(h));
      const upstream = new Request(incoming.url, {
        method: incoming.method,
        headers,
        body: incoming.body ? await incoming.arrayBuffer() : undefined,
        redirect: 'manual',
      });
      const response = await recorder.fetch(upstream);
      const outHeaders = new Headers();
      response.headers.forEach((v, k) => {
        if (k !== 'set-cookie' && !DROP_RESPONSE.includes(k)) outHeaders.set(k, v);
      });
      for (const c of response.headers.getSetCookie?.() ?? []) outHeaders.append('set-cookie', localizeCookie(c));
      await send(res, new Response(response.status === 204 || response.status === 304 ? null : await response.arrayBuffer(), { status: response.status, headers: outHeaders }));
    } catch (e: any) {
      log.err(`[qelos-testing record] ${req.method} ${req.url}: ${e?.message || e}`);
      if (!res.headersSent) res.writeHead(502, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ code: 'QELOS_RECORD_ERROR', message: e?.message || 'Record proxy error' }));
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(args.port, args.host, resolve);
  });
  boundPort = (server.address() as { port: number }).port;
  const origin = `http://${args.host.includes(':') ? `[${args.host}]` : args.host}:${boundPort}`;
  log.out(`qelos-testing record ready at ${origin} -> ${args.target} (cassette: ${recorder.file})`);
  return {
    server,
    origin,
    file: recorder.file,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections?.();
        server.close(() => resolve());
      }),
  };
}

export { CASSETTE_FILE };
