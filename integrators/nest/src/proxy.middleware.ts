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

@Injectable()
export class QelosProxyMiddleware implements NestMiddleware {
  constructor(
    @Inject(QELOS_MODULE_OPTIONS)
    private readonly options: QelosModuleOptions,
  ) {}

  use(req: unknown, res: unknown, _next: (err?: unknown) => void): void {
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
