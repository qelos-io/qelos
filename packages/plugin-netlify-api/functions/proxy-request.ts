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

export function publicHostForUpstream(
  event: Pick<HandlerEvent, 'headers' | 'rawUrl'>,
  fallbackHost: string,
): string {
  const forwarded = pickHeader(event.headers, 'x-forwarded-host');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const host = pickHeader(event.headers, 'host');
  if (host) {
    return host;
  }
  try {
    return new URL(event.rawUrl, 'http://qelos.local').hostname;
  } catch {
    return fallbackHost;
  }
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

/**
 * Preserve the inbound query string when forwarding to the Qelos API.
 * Netlify may provide `rawQuery`, embed search in `rawUrl`, or only expose
 * `queryStringParameters` — OAuth social-login flows require `redirectUrl`.
 */
export function buildTargetPath(
  event: Pick<HandlerEvent, 'rawUrl' | 'rawQuery' | 'queryStringParameters'>,
): string {
  const parsed = new URL(event.rawUrl || '/', 'http://qelos.local');
  const pathname = parsed.pathname;

  const fromRawQuery = event.rawQuery?.trim();
  if (fromRawQuery) {
    return `${pathname}?${fromRawQuery}`;
  }
  if (parsed.search) {
    return `${pathname}${parsed.search}`;
  }

  const fromParams = queryStringFromParameters(event.queryStringParameters);
  return fromParams ? `${pathname}?${fromParams}` : pathname;
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
