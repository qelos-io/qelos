import type { NextFunction, Request, Response } from 'express';

/** Latest API version when no `Accept-Version` header and no `/api/vN/` URL prefix. */
export const LATEST_API_VERSION = 'v1';

export const SUPPORTED_API_VERSIONS = new Set<string>([LATEST_API_VERSION]);

/**
 * Strips `/api/vN` from the URL path so existing `/api/...` mounts keep matching.
 * Only applies to paths under `/api/` (not `/internal-api/`).
 */
export function stripApiVersionFromUrl(fullUrl: string): {
  rewritten: string;
  pathVersion?: string;
} {
  const qIndex = fullUrl.indexOf('?');
  const path = qIndex >= 0 ? fullUrl.slice(0, qIndex) : fullUrl;
  const query = qIndex >= 0 ? fullUrl.slice(qIndex) : '';

  const m = path.match(/^\/api\/(v\d+)(\/.*)?$/);
  if (!m) {
    return { rewritten: fullUrl };
  }
  const rest = m[2] ?? '/';
  const rewrittenPath = '/api' + rest;
  return { rewritten: rewrittenPath + query, pathVersion: m[1] };
}

export function normalizeAcceptVersionHeader(raw: string | undefined): string | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  const t = String(raw).trim().toLowerCase();
  if (!t) {
    return undefined;
  }
  if (!/^v\d+$/.test(t)) {
    return undefined;
  }
  return t;
}

export function resolveApiVersion(
  pathVersion: string | undefined,
  acceptHeaderRaw: string | undefined,
  latest: string,
  supported: Set<string>
): { version: string } | { error: string; status: number } {
  const headerVersion = normalizeAcceptVersionHeader(acceptHeaderRaw);
  const headerPresent = typeof acceptHeaderRaw === 'string' && acceptHeaderRaw.trim().length > 0;

  if (headerPresent && !headerVersion) {
    return { error: 'Invalid Accept-Version header', status: 400 };
  }

  if (pathVersion && headerVersion && pathVersion !== headerVersion) {
    return {
      error: 'Accept-Version header does not match URL version prefix',
      status: 400,
    };
  }

  const resolved = pathVersion ?? headerVersion ?? latest;

  if (!supported.has(resolved)) {
    return { error: `Unsupported API version: ${resolved}`, status: 400 };
  }

  return { version: resolved };
}

export type ApiVersionMiddlewareOptions = {
  latest?: string;
  supported?: Set<string>;
};

export function apiVersionMiddleware(options: ApiVersionMiddlewareOptions = {}) {
  const latest = options.latest ?? LATEST_API_VERSION;
  const supported = options.supported ?? SUPPORTED_API_VERSIONS;

  return function handleApiVersion(req: Request, res: Response, next: NextFunction) {
    const { rewritten, pathVersion } = stripApiVersionFromUrl(req.url);
    if (rewritten !== req.url) {
      req.url = rewritten;
    }

    const rawHeader = req.headers['accept-version'];
    const headerStr = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

    const resolved = resolveApiVersion(pathVersion, headerStr, latest, supported);
    if ('error' in resolved) {
      res.status(resolved.status).json({ message: resolved.error }).end();
      return;
    }

    req.apiVersion = resolved.version;
    next();
  };
}

export function setApiVersionResponseHeader(req: Request, res: Response) {
  const version = req.apiVersion ?? LATEST_API_VERSION;
  res.setHeader('X-API-Version', version);
}

/**
 * Use with `http-proxy-middleware` `onProxyRes` so proxied API responses include `X-API-Version`.
 */
export function onProxyResSetApiVersion(
  _proxyRes: NodeJS.ReadableStream,
  req: Request,
  res: Response
) {
  setApiVersionResponseHeader(req, res);
}

declare module 'express-serve-static-core' {
  interface Request {
    /** Resolved API version (e.g. `v1`) after gateway middleware runs. */
    apiVersion?: string;
  }
}
