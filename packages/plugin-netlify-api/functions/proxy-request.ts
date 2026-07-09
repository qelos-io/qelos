import type { HandlerEvent } from '@netlify/functions';

const OAUTH_PROVIDER_HOSTS = new Set([
  'linkedin.com',
  'www.linkedin.com',
  'accounts.google.com',
  'www.facebook.com',
  'github.com',
]);

export function pickHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const want = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== want) continue;
    if (value == null) continue;
    const normalized = Array.isArray(value) ? value[0] : value;
    if (typeof normalized === 'string' && normalized.length > 0) {
      return normalized;
    }
  }
  return undefined;
}

export function isUpstreamApiHost(host: string, upstreamFallback: string): boolean {
  const normalized = host.split(',')[0].trim().split(':')[0].toLowerCase();
  if (!normalized) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(normalized)) return true;
  if (normalized.includes('auth-service') || normalized.includes('gateway')) return true;

  const upstream = upstreamFallback.trim();
  if (!upstream) return false;

  try {
    const upstreamHost = (
      upstream.includes('://') ? new URL(upstream).hostname : upstream.split('/')[0].split(':')[0]
    ).toLowerCase();
    return normalized === upstreamHost;
  } catch {
    return normalized === upstream.toLowerCase();
  }
}

export function publicHostForUpstream(
  event: Pick<HandlerEvent, 'headers' | 'rawUrl'>,
  fallbackHost: string,
): string {
  const forwarded = pickHeader(event.headers, 'x-forwarded-host');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  try {
    const fromRawUrl = new URL(event.rawUrl || '/', 'http://qelos.local').host;
    if (fromRawUrl && !isUpstreamApiHost(fromRawUrl, fallbackHost)) {
      return fromRawUrl;
    }
  } catch {
    // fall through
  }

  const host = pickHeader(event.headers, 'host');
  if (host && !isUpstreamApiHost(host, fallbackHost)) {
    return host;
  }

  return fallbackHost;
}

function queryStringFromParameters(
  params: Record<string, string | undefined> | null | undefined,
): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null) search.append(key, value);
  }
  return search.toString();
}

function queryStringFromMultiValue(
  params: Record<string, string[] | undefined> | null | undefined,
): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, values] of Object.entries(params)) {
    if (!values) continue;
    for (const value of values) {
      if (value != null) search.append(key, value);
    }
  }
  return search.toString();
}

function queryFromPath(path: string | undefined): { pathname: string; query: string } {
  if (!path) return { pathname: '', query: '' };
  const qIndex = path.indexOf('?');
  if (qIndex === -1) return { pathname: path, query: '' };
  return {
    pathname: path.slice(0, qIndex),
    query: path.slice(qIndex + 1),
  };
}

/**
 * Preserve the inbound query string when forwarding to the Qelos API.
 * Netlify may provide `rawQuery`, embed search in `rawUrl` or `path`, or only expose
 * `queryStringParameters` — OAuth social-login flows require `redirectUrl`.
 */
export function buildTargetPath(
  event: Pick<
    HandlerEvent,
    'path' | 'rawUrl' | 'rawQuery' | 'queryStringParameters' | 'multiValueQueryStringParameters'
  >,
): string {
  const fromPath = queryFromPath(typeof event.path === 'string' ? event.path : '');
  const parsed = new URL(event.rawUrl || '/', 'http://qelos.local');

  const pathname =
    (fromPath.pathname.startsWith('/api') ? fromPath.pathname : '') ||
    (parsed.pathname.startsWith('/api') ? parsed.pathname : '') ||
    fromPath.pathname ||
    parsed.pathname;

  const query =
    event.rawQuery?.trim() ||
    fromPath.query ||
    (parsed.search ? parsed.search.slice(1) : '') ||
    queryStringFromParameters(event.queryStringParameters) ||
    queryStringFromMultiValue(event.multiValueQueryStringParameters);

  return query ? `${pathname}?${query}` : pathname;
}

export function isExternalOAuthLocation(location: string): boolean {
  try {
    const host = new URL(location).hostname.toLowerCase();
    if (OAUTH_PROVIDER_HOSTS.has(host)) return true;
    return host.endsWith('.linkedin.com')
      || host.endsWith('.google.com')
      || host.endsWith('.facebook.com')
      || host.endsWith('.github.com');
  } catch {
    return false;
  }
}

export function buildHtmlRedirectResponse(location: string) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${escapeHtmlAttribute(location)}"><script>location.replace(${JSON.stringify(location)})</script></head><body>Redirecting…</body></html>`;
  return {
    statusCode: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
    body: html,
  };
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
