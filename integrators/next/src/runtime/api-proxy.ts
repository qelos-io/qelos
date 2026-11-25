import { type NextRequest, NextResponse } from 'next/server';
import { rewriteSetCookieDomain } from '../cookies';
import { getQelosMock } from '../mock';
import { resolveQelosProxyTarget } from '../proxy-target';
import type { QelosNextConfig } from '../types';

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
]);

function buildUpstreamHeaders(req: NextRequest): Headers {
  const out = new Headers();
  req.headers.forEach((value, key) => {
    const lk = key.toLowerCase();
    if (HOP_BY_HOP.has(lk)) return;
    if (lk === 'host') return;
    out.append(key, value);
  });
  return out;
}

async function serveFromMock(
  req: NextRequest,
  config: QelosNextConfig,
): Promise<Response> {
  try {
    const instance = await getQelosMock(config).get();
    if (!instance) throw new Error('Qelos mock is not active');
    const originalHost = req.headers.get('host');
    // NextRequest is a web Request: hand it to the mock as-is.
    const response = await instance.handle(req);
    const outHeaders = new Headers();
    response.headers.forEach((value, key) => {
      const lk = key.toLowerCase();
      if (lk === 'set-cookie' || HOP_BY_HOP.has(lk)) return;
      outHeaders.append(key, value);
    });
    for (const c of response.headers.getSetCookie?.() ?? []) {
      outHeaders.append('set-cookie', rewriteSetCookieDomain(c, originalHost ?? undefined));
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: outHeaders,
    });
  } catch (err) {
    return NextResponse.json(
      { code: 'QELOS_MOCK_ERROR', message: (err as Error).message },
      { status: 500 },
    );
  }
}

async function proxyRequest(
  req: NextRequest,
  config: QelosNextConfig
): Promise<Response> {
  if (getQelosMock(config).active) return serveFromMock(req, config);

  const base = resolveQelosProxyTarget(config);
  if (!base) {
    return NextResponse.json(
      {
        error:
          '[@qelos/integrator-next] Qelos API proxy is not configured. Set appUrl (or NEXT_QELOS_PROXY_TARGET / QELOS_IP / QELOS_API_IP in development).',
      },
      { status: 503 },
    );
  }

  const pathWithSearch = req.nextUrl.pathname + req.nextUrl.search;
  const targetUrl = `${base.replace(/\/+$/, '')}${pathWithSearch}`;
  const originalHost = req.headers.get('host');

  const init: RequestInit & { duplex?: 'half' } = {
    method: req.method,
    headers: buildUpstreamHeaders(req),
    redirect: 'manual',
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = req.body;
    init.duplex = 'half';
  }

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, init);
  } catch {
    return NextResponse.json({ error: 'upstream fetch failed' }, { status: 502 });
  }

  const outHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    const lk = key.toLowerCase();
    if (lk === 'set-cookie') return;
    if (HOP_BY_HOP.has(lk)) return;
    outHeaders.append(key, value);
  });

  const rawCookies = upstream.headers.getSetCookie?.() ?? [];
  for (const c of rawCookies) {
    outHeaders.append(
      'set-cookie',
      rewriteSetCookieDomain(c, originalHost ?? undefined),
    );
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: outHeaders,
  });
}

/**
 * Handlers for a catch-all App Router route (e.g. `app/api/[...qelos]/route.ts`)
 * that reverse-proxies every `/api/**` call to Qelos with `Set-Cookie` domain
 * rewriting. Use `export const runtime = 'nodejs'`.
 */
export function createQelosApiProxyHandlers(config: QelosNextConfig) {
  async function handle(req: NextRequest): Promise<Response> {
    return proxyRequest(req, config);
  }

  return {
    runtime: 'nodejs' as const,
    /** Mock controller (`mock.active`, `await mock.get()`). */
    mock: getQelosMock(config),
    GET: handle,
    POST: handle,
    PUT: handle,
    PATCH: handle,
    DELETE: handle,
    OPTIONS: handle,
  };
}
