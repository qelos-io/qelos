import {
  Inject,
  Injectable,
  type NestMiddleware,
} from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import * as http from 'node:http';
import * as https from 'node:https';
import { URL } from 'node:url';
import { QELOS_MODULE_OPTIONS } from './constants';
import { rewriteSetCookieDomain } from './cookies';
import { getQelosMock, type QelosMockController } from './mock';
import { resolveQelosProxyTarget } from './proxy-target';
import type { AnyRequest, AnyResponse, QelosModuleOptions } from './types';

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
]);

function getIncomingMessage(req: unknown): http.IncomingMessage {
  if (
    req &&
    typeof req === 'object' &&
    'raw' in req &&
    (req as { raw?: http.IncomingMessage }).raw &&
    typeof (req as { raw: http.IncomingMessage }).raw.pipe === 'function'
  ) {
    return (req as { raw: http.IncomingMessage }).raw;
  }
  return req as http.IncomingMessage;
}

function getServerResponse(res: unknown): http.ServerResponse {
  if (
    res &&
    typeof res === 'object' &&
    'raw' in res &&
    (res as { raw?: http.ServerResponse }).raw &&
    typeof (res as { raw: http.ServerResponse }).raw.setHeader === 'function'
  ) {
    return (res as { raw: http.ServerResponse }).raw;
  }
  return res as http.ServerResponse;
}

function getRequestUrl(req: unknown): string {
  const r = req as Record<string, unknown>;
  if (typeof r.originalUrl === 'string') return r.originalUrl;
  if (typeof r.url === 'string') return r.url;
  return '';
}

function buildForwardedHeaders(
  source: IncomingHttpHeaders,
  targetHost: string,
): http.OutgoingHttpHeaders {
  const out: http.OutgoingHttpHeaders = {};
  for (const [name, value] of Object.entries(source)) {
    if (value === undefined) continue;
    if (HOP_BY_HOP.has(name.toLowerCase())) continue;
    out[name] = value;
  }
  out.host = targetHost;
  return out;
}

function sendJsonError(res: unknown, status: number, body: object): void {
  const framework = res as AnyResponse & {
    status?: (code: number) => unknown;
    json?: (b: unknown) => unknown;
  };
  if (typeof framework.status === 'function' && typeof framework.json === 'function') {
    framework.status(status);
    framework.json(body);
    return;
  }
  const raw = getServerResponse(res);
  if (!raw.headersSent) {
    raw.statusCode = status;
    raw.setHeader('content-type', 'application/json');
    raw.end(JSON.stringify(body));
  }
}

async function readRequestBody(req: http.IncomingMessage): Promise<Buffer | undefined> {
  const parsed = (req as { body?: unknown }).body;
  if (parsed !== undefined && parsed !== null) {
    if (Buffer.isBuffer(parsed)) return parsed;
    if (typeof parsed === 'string') return Buffer.from(parsed);
    return Buffer.from(JSON.stringify(parsed));
  }
  if (req.readableEnded) return undefined;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

async function serveFromMock(
  mock: QelosMockController,
  req: unknown,
  res: unknown,
): Promise<void> {
  try {
    const instance = await mock.get();
    if (!instance) throw new Error('Qelos mock is not active');
    const nodeReq = getIncomingMessage(req);
    const rawRes = getServerResponse(res);
    const originalHost = nodeReq.headers.host;
    const headers = new Headers();
    for (const [name, value] of Object.entries(nodeReq.headers)) {
      if (value === undefined || HOP_BY_HOP.has(name.toLowerCase())) continue;
      if (Array.isArray(value)) value.forEach((v) => headers.append(name, v));
      else headers.set(name, value);
    }
    const method = nodeReq.method || 'GET';
    let body: Buffer | undefined;
    if (method !== 'GET' && method !== 'HEAD') {
      body = await readRequestBody(nodeReq);
      if (body && (req as { body?: unknown }).body !== undefined && typeof (req as { body?: unknown }).body === 'object' && !Buffer.isBuffer((req as { body?: unknown }).body)) {
        headers.set('content-type', 'application/json');
      }
    }
    const encrypted = (nodeReq.socket as { encrypted?: boolean } | undefined)?.encrypted;
    const url = `${encrypted ? 'https' : 'http'}://${originalHost || 'localhost'}${getRequestUrl(req)}`;
    const response = await instance.handle(
      new Request(url, { method, headers, body: body as unknown as BodyInit | undefined }),
    );

    rawRes.statusCode = response.status;
    response.headers.forEach((value, name) => {
      const lower = name.toLowerCase();
      if (HOP_BY_HOP.has(lower) || lower === 'set-cookie') return;
      rawRes.setHeader(name, value);
    });
    const cookies = response.headers.getSetCookie?.() ?? [];
    if (cookies.length) {
      rawRes.setHeader('set-cookie', cookies.map((v) => rewriteSetCookieDomain(v, originalHost)));
    }
    rawRes.end(Buffer.from(await response.arrayBuffer()));
  } catch (err) {
    const rawRes = getServerResponse(res);
    if (!rawRes.headersSent) {
      sendJsonError(res, 500, { code: 'QELOS_MOCK_ERROR', message: (err as Error).message });
    } else {
      rawRes.end();
    }
  }
}

@Injectable()
export class QelosProxyMiddleware implements NestMiddleware {
  constructor(
    @Inject(QELOS_MODULE_OPTIONS)
    private readonly options: QelosModuleOptions,
  ) {}

  use(req: unknown, res: unknown, _next: (err?: unknown) => void): void {
    const mock = getQelosMock(this.options.config);
    if (mock.active) {
      void serveFromMock(mock, req, res);
      return;
    }
    const request = req as AnyRequest;
    const base = resolveQelosProxyTarget(this.options.config);
    if (!base) {
      sendJsonError(res, 503, {
        code: 'QELOS_PROXY_NOT_CONFIGURED',
        message:
          '[@qelos/integrator-nest] Qelos API proxy is not configured. ' +
          'Set config.appUrl (or QELOS_PROXY_TARGET / QELOS_IP / QELOS_API_IP in development).',
      });
      return;
    }

    let target: URL;
    try {
      const baseUrl = new URL(base);
      const incomingUrl = getRequestUrl(request);
      target = new URL(incomingUrl, baseUrl);
    } catch {
      sendJsonError(res, 502, {
        code: 'QELOS_PROXY_BAD_TARGET',
        message: '[@qelos/integrator-nest] Invalid proxy target URL.',
      });
      return;
    }

    const client = target.protocol === 'https:' ? https : http;
    const hostHeader = request.headers.host;
    const originalHost =
      typeof hostHeader === 'string'
        ? hostHeader
        : Array.isArray(hostHeader)
          ? hostHeader[0]
          : undefined;

    const nodeReq = getIncomingMessage(req);
    const forwardedHeaders = buildForwardedHeaders(nodeReq.headers, target.host);

    const upstreamReq = client.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || (target.protocol === 'https:' ? 443 : 80),
        method: nodeReq.method,
        path: target.pathname + target.search,
        headers: forwardedHeaders,
      },
      (upstreamRes) => {
        const rawRes = getServerResponse(res);
        const status = upstreamRes.statusCode ?? 502;
        for (const [name, value] of Object.entries(upstreamRes.headers)) {
          if (value === undefined) continue;
          const lower = name.toLowerCase();
          if (HOP_BY_HOP.has(lower)) continue;
          if (lower === 'set-cookie') {
            const values = Array.isArray(value) ? value : [value];
            rawRes.setHeader(
              'set-cookie',
              values.map((v) => rewriteSetCookieDomain(v, originalHost)),
            );
            continue;
          }
          rawRes.setHeader(name, value);
        }
        rawRes.statusCode = status;
        upstreamRes.pipe(rawRes);
      },
    );

    upstreamReq.on('error', (err) => {
      const rawRes = getServerResponse(res);
      if (!rawRes.headersSent) {
        sendJsonError(res, 502, {
          code: 'QELOS_PROXY_UPSTREAM_ERROR',
          message: err.message,
        });
      } else {
        rawRes.end();
      }
    });

    nodeReq.on('aborted', () => upstreamReq.destroy());
    nodeReq.pipe(upstreamReq);
  }
}
