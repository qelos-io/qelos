import type { IncomingHttpHeaders } from 'node:http';
import * as http from 'node:http';
import * as https from 'node:https';
import { URL } from 'node:url';
import type { Request, RequestHandler, Response } from 'express';
import { rewriteSetCookieDomain } from './cookies';
import { getQelosMock, type QelosMockController } from './mock';
import { resolveQelosProxyTarget } from './proxy-target';
import type { QelosExpressConfig } from './types';

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
  out['host'] = targetHost;
  return out;
}

async function readRequestBody(req: Request): Promise<Buffer | undefined> {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  if (req.readableEnded || (req as { _body?: boolean })._body === true) {
    // a body parser already consumed the stream
    const parsed = (req as { body?: unknown }).body;
    if (parsed === undefined || parsed === null) return undefined;
    if (Buffer.isBuffer(parsed)) return parsed;
    if (typeof parsed === 'string') return Buffer.from(parsed);
    if (typeof parsed === 'object' && Object.keys(parsed).length === 0) return undefined;
    return Buffer.from(JSON.stringify(parsed));
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

async function serveFromMock(
  mock: QelosMockController,
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const instance = await mock.get();
    if (!instance) throw new Error('Qelos mock is not active');
    if (req.app?.locals) req.app.locals.qelosMock = mock;
    const originalHost = req.headers.host;
    const headers = new Headers();
    for (const [name, value] of Object.entries(req.headers)) {
      if (value === undefined || HOP_BY_HOP.has(name.toLowerCase())) continue;
      if (Array.isArray(value)) value.forEach((v) => headers.append(name, v));
      else headers.set(name, value);
    }
    const body = await readRequestBody(req);
    const url = `${req.protocol || 'http'}://${originalHost || 'localhost'}${req.originalUrl || req.url}`;
    const response = await instance.handle(
      new Request(url, { method: req.method, headers, body: body as unknown as BodyInit | undefined }),
    );

    res.status(response.status);
    response.headers.forEach((value, name) => {
      const lower = name.toLowerCase();
      if (HOP_BY_HOP.has(lower) || lower === 'set-cookie') return;
      res.setHeader(name, value);
    });
    const cookies = response.headers.getSetCookie?.() ?? [];
    if (cookies.length) {
      res.setHeader('set-cookie', cookies.map((v) => rewriteSetCookieDomain(v, originalHost)));
    }
    if (!response.body) {
      res.end();
      return;
    }
    const reader = response.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ code: 'QELOS_MOCK_ERROR', message: (err as Error).message });
    } else {
      res.end();
    }
  }
}

export interface CreateProxyOptions {
  config: QelosExpressConfig;
}

/**
 * Catch-all `/api/**` reverse proxy. Forwards the inbound request to the
 * configured Qelos origin, streaming bodies in both directions and rewriting
 * the `Domain=` attribute of every upstream `Set-Cookie` header to the
 * inbound request's host so the cookie becomes first-party.
 *
 * Responds with `503` when no proxy target is configured. Does not proxy
 * WebSocket upgrades.
 */
export function createQelosProxy(options: CreateProxyOptions): RequestHandler {
  const { config } = options;
  const mock = getQelosMock(config);

  return function qelosApiProxy(req: Request, res: Response): void | Promise<void> {
    if (mock.active) return serveFromMock(mock, req, res);

    const base = resolveQelosProxyTarget(config);
    if (!base) {
      res.status(503).json({
        code: 'QELOS_PROXY_NOT_CONFIGURED',
        message:
          '[@qelos/integrator-express] Qelos API proxy is not configured. ' +
          'Set config.appUrl (or QELOS_PROXY_TARGET / QELOS_IP / QELOS_API_IP in development).',
      });
      return;
    }

    let target: URL;
    try {
      const baseUrl = new URL(base);
      target = new URL(req.originalUrl || req.url, baseUrl);
    } catch {
      res.status(502).json({
        code: 'QELOS_PROXY_BAD_TARGET',
        message: '[@qelos/integrator-express] Invalid proxy target URL.',
      });
      return;
    }

    const client = target.protocol === 'https:' ? https : http;
    const originalHost = req.headers.host;
    const forwardedHeaders = buildForwardedHeaders(req.headers, target.host);

    const upstreamReq = client.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || (target.protocol === 'https:' ? 443 : 80),
        method: req.method,
        path: target.pathname + target.search,
        headers: forwardedHeaders,
      },
      (upstreamRes) => {
        const status = upstreamRes.statusCode ?? 502;
        for (const [name, value] of Object.entries(upstreamRes.headers)) {
          if (value === undefined) continue;
          const lower = name.toLowerCase();
          if (HOP_BY_HOP.has(lower)) continue;
          if (lower === 'set-cookie') {
            const values = Array.isArray(value) ? value : [value];
            res.setHeader(
              'set-cookie',
              values.map((v) => rewriteSetCookieDomain(v, originalHost)),
            );
            continue;
          }
          res.setHeader(name, value);
        }
        res.status(status);
        upstreamRes.pipe(res);
      },
    );

    upstreamReq.on('error', (err) => {
      if (!res.headersSent) {
        res.status(502).json({
          code: 'QELOS_PROXY_UPSTREAM_ERROR',
          message: err.message,
        });
      } else {
        res.end();
      }
    });

    req.on('aborted', () => upstreamReq.destroy());
    req.pipe(upstreamReq);
  };
}

export type QelosProxyHandler = ReturnType<typeof createQelosProxy>;
